'use strict';

const { getModel } = require('../../../model/getModel');
const { GraphAction } = require('../GraphAction');
const { isInternalProp } = require('../../../utils/internalPropUtils');
const { difference, isObject, jsonEquals } = require('../../../utils/objectUtils');
const promiseUtils = require('../../../utils/promiseUtils');

class GraphPatchAction extends GraphAction {
  constructor(graphData, { nodes }) {
    super(graphData);
    // Nodes to patch.
    this.nodes = nodes;
  }

  run(builder) {
    return promiseUtils.map(this.nodes, (node) => this._runForNode(builder, node), {
      concurrency: this._getConcurrency(builder, this.nodes),
    });
  }

  _runForNode(builder, node) {
    const shouldPatch = this.graphOptions.shouldPatch(node, this.graphData);
    const shouldUpdate = this.graphOptions.shouldUpdate(node, this.graphData);

    // BelongsToOneRelation inserts and relates change the parent object's
    // properties. That's why we handle them here.
    const changedPropsBecauseOfBelongsToOneInsert = this._handleBelongsToOneInserts(node);

    // BelongsToOneRelation deletes and unrelates change the parent object's
    // properties. That's why we handle them here.
    const changePropsBecauseOfBelongsToOneDelete = this._handleBelongsToOneDeletes(node);

    const handleUpdate = () => {
      const { changedProps, unchangedProps } = this._findChanges(node);
      const allProps = [...changedProps, ...unchangedProps];

      const propsToUpdate = difference(
        shouldPatch || shouldUpdate
          ? changedProps
          : [...changedPropsBecauseOfBelongsToOneInsert, ...changePropsBecauseOfBelongsToOneDelete],

        // Remove id properties from the props to update. With upsertGraph
        // it never makes sense to change the id.
        node.modelClass.getIdPropertyArray(),
      );

      const update = propsToUpdate.length > 0;
      if (update) {
        // Don't update the fields that we know not to change.
        node.obj.$omitFromDatabaseJson(difference(allProps, propsToUpdate));
        node.userData.updated = true;
      }

      return update;
    };

    const Model = getModel();
    // See if the model defines a beforeUpdate or $beforeUpdate hook. If it does
    // not, we can check for updated properties now and drop out immediately if
    // there is nothing to update. Otherwise, we need to wait for the hook to be
    // called before calling handleUpdate, but only if the node contains changes
    // that aren't id properties (relates). See issues #2233, #2605.
    const hasBeforeUpdate =
      node.obj.constructor.beforeUpdate !== Model.beforeUpdate ||
      node.obj.$beforeUpdate !== Model.prototype.$beforeUpdate;

    if (
      (hasBeforeUpdate && !this._hasNonIdPropertyChanges(node)) ||
      (!hasBeforeUpdate && !handleUpdate())
    ) {
      return null;
    }

    delete node.obj[node.modelClass.uidProp];
    delete node.obj[node.modelClass.uidRefProp];
    delete node.obj[node.modelClass.dbRefProp];

    node.obj.$validate(null, {
      dataPath: node.dataPathKey,
      patch: shouldPatch || (!shouldPatch && !shouldUpdate),
    });

    const updateBuilder = this._createBuilder(node)
      .childQueryOf(builder, childQueryOptions())
      .copyFrom(builder, GraphAction.ReturningAllSelector);

    if (hasBeforeUpdate) {
      updateBuilder.internalContext().runBefore.push((result, builder) => {
        // Call handleUpdate in the runBefore hook which runs after the
        // $beforeUpdate hook, allowing it to modify the object before the
        // updated properties are determined. See issue #2233.
        if (hasBeforeUpdate && !handleUpdate()) {
          builder.internalOptions().returnImmediatelyValue = null;
        }
        return result;
      });
    }

    if (shouldPatch) {
      updateBuilder.patch(node.obj);
    } else {
      updateBuilder.update(node.obj);
    }

    return updateBuilder.execute().then((result) => {
      if (isObject(result) && result.$isObjectionModel) {
        // Handle returning('*').
        node.obj.$set(result);
      }

      return result;
    });
  }

  _handleBelongsToOneInserts(node) {
    const currentNode = this.currentGraph.nodeForNode(node);
    const updatedProps = [];

    for (const edge of node.edges) {
      if (
        edge.isOwnerNode(node) &&
        edge.relation &&
        edge.relation.isObjectionBelongsToOneRelation &&
        edge.relation.relatedProp.hasProps(edge.relatedNode.obj)
      ) {
        const { relation } = edge;

        relation.ownerProp.forEach((i) => {
          const currentValue = currentNode && relation.ownerProp.getProp(currentNode.obj, i);
          const relatedValue = relation.relatedProp.getProp(edge.relatedNode.obj, i);

          if (currentValue != relatedValue) {
            relation.ownerProp.setProp(node.obj, i, relatedValue);
            updatedProps.push(relation.ownerProp.props[i]);
          }
        });
      }
    }

    return updatedProps;
  }

  _handleBelongsToOneDeletes(node) {
    const currentNode = this.currentGraph.nodeForNode(node);
    const updatedProps = [];

    if (!currentNode) {
      return updatedProps;
    }

    for (const edge of currentNode.edges) {
      if (
        edge.isOwnerNode(currentNode) &&
        edge.relation.isObjectionBelongsToOneRelation &&
        node.obj[edge.relation.name] === null &&
        this.graphOptions.shouldDeleteOrUnrelate(edge.relatedNode, this.graphData)
      ) {
        const { relation } = edge;

        relation.ownerProp.forEach((i) => {
          const currentValue = relation.ownerProp.getProp(currentNode.obj, i);

          if (currentValue != null) {
            relation.ownerProp.setProp(node.obj, i, null);
            updatedProps.push(relation.ownerProp.props[i]);
          }
        });
      }
    }

    return updatedProps;
  }

  _findChanges(node) {
    const obj = node.obj;
    const currentNode = this.currentGraph.nodeForNode(node);
    const currentObj = (currentNode && currentNode.obj) || {};
    const relationNames = node.modelClass.getRelationNames();

    const unchangedProps = [];
    const changedProps = [];

    for (const prop of Object.keys(obj)) {
      if (isInternalProp(prop) || relationNames.includes(prop)) {
        continue;
      }

      const value = obj[prop];
      const currentValue = currentObj[prop];

      // If the current object doesn't have the property, we have to assume
      // it changes (we cannot know if it will). If the object does have the
      // property, we test non-strict equality. See issue #732.
      if (currentValue === undefined || !nonStrictEquals(currentValue, value)) {
        changedProps.push(prop);
      } else {
        unchangedProps.push(prop);
      }
    }

    // We cannot know if the query properties cause changes to the values.
    // We must assume that they do.
    if (obj.$$queryProps) {
      changedProps.push(...Object.keys(obj.$$queryProps));
    }

    return {
      changedProps,
      unchangedProps,
    };
  }

  _hasNonIdPropertyChanges(node) {
    const idProps = node.modelClass.getIdPropertyArray();
    return this._findChanges(node).changedProps.some((prop) => !idProps.includes(prop));
  }

  _createBuilder(node) {
    if (node.parentEdge && !node.parentEdge.relation.isObjectionHasManyRelation) {
      return this._createRelatedBuilder(node);
    } else {
      return this._createRootBuilder(node);
    }
  }

  _createRelatedBuilder(node) {
    return node.parentNode.obj
      .$relatedQuery(node.parentEdge.relation.name)
      .findById(node.obj.$id());
  }

  _createRootBuilder(node) {
    return node.obj.$query();
  }
}

function childQueryOptions() {
  return {
    fork: true,
    isInternalQuery: true,
  };
}

function nonStrictEquals(val1, val2) {
  if (val1 == val2) {
    return true;
  }

  return jsonEquals(val1, val2);
}

module.exports = {
  GraphPatchAction,
};
