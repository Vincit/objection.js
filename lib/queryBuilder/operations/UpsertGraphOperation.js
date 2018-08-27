const UpsertNode = require('../graphUpserter/UpsertNode');
const UpsertGraph = require('../graphUpserter/UpsertGraph');
const HasManyRelation = require('../../relations/hasMany/HasManyRelation');
const InsertGraphOperation = require('./InsertGraphOperation');
const transformOptionsFromPath = require('../../utils/transformOptionsFromPath');
const promiseUtils = require('../../utils/promiseUtils');

class UpsertGraphOperation extends InsertGraphOperation {
  constructor(name, opt) {
    super(
      name,
      Object.assign({}, opt, {
        opt: {}
      })
    );

    this.graph = null;
    this.upsertOpt = opt.opt || {};
  }

  onBefore1(builder) {
    this.graph = new UpsertGraph(this.models, this.isArray, this.upsertOpt);

    return this.graph.build(builder).then(() => this.delete(builder));
  }

  // This operation inherits from InsertGraphOperation because we use it to perform
  // all the inserts. Before the graph inserter instance is created, this method gets called.
  // We need to set a `dbRefProp` for each `Relate` node so that the graph inserter takes care
  // of most of the relates in an efficient way.
  beforeGraphInserterCreated(builder) {
    for (let i = 0, l = this.graph.nodes.length; i < l; ++i) {
      const node = this.graph.nodes[i];

      // Set `dbRefProp` for the upsertModel so that `insertGraph` takes care of relating models.
      // `insertGraph` cannot relate `HasManyRelation`s, so we ignore those.
      if (node.hasType(UpsertNode.Type.Relate) && !(node.relation instanceof HasManyRelation)) {
        node.upsertModel[node.modelClass.dbRefProp] = node.upsertModel.$values(
          node.relation.relatedProp.props
        );
      }
    }
  }

  // This operation inherits from InsertGraphOperation because we use it to perform
  // all the inserts. After the graph inserter instance is created, this method gets called
  // We need to modify the insert graph so that existing models won't get inserted again.
  afterGraphInserterCreated(builder, graphInserter) {
    const insertNodes = graphInserter.graph.nodes;

    // Go through all insert graph nodes and mark the ones that should not be inserted
    // as inserted so that they are not inserted again.
    for (let i = 0, l = insertNodes.length; i < l; ++i) {
      const insertNode = insertNodes[i];
      const upsertNode = this.graph.nodesByUpsert.get(insertNode.model);

      if ((!upsertNode || !upsertNode.hasType(UpsertNode.Type.Insert)) && !insertNode.handled) {
        // Resolve the nodes that depend on the node's model.
        for (let d = 0, ld = insertNode.isNeededBy.length; d < ld; ++d) {
          insertNode.isNeededBy[d].resolve(insertNode.model);
        }

        if (insertNode.parentNode) {
          const parent = insertNode.parentNode;

          // If this node is in a many-to-many relation we also need to remove it from
          // its parent's manyToManyConnections so that the join row is not inserted.
          parent.manyToManyConnections = parent.manyToManyConnections.filter(
            conn => conn.node !== insertNode
          );
        }

        insertNode.markAsInserted();
      }
    }
  }

  onAfter2(builder, result) {
    return this.relate(builder)
      .then(() => this.update(builder))
      .then(() => this.upsertRecursively(builder))
      .then(() => super.onAfter2(builder, result));
  }

  delete(builder) {
    return promiseUtils.map(
      this.graph.nodes,
      node => {
        const relNames = Object.keys(node.relations);

        return promiseUtils.map(
          relNames,
          relName => {
            const relation = node.modelClass.getRelation(relName);
            const nodes = node.relations[relName].filter(it =>
              it.hasType(UpsertNode.Type.Delete, UpsertNode.Type.Unrelate)
            );
            const ids = nodes.map(it => it.currentModel.$id());

            if (ids.length) {
              const unrelate = nodes[0].hasType(UpsertNode.Type.Unrelate);
              const query = node.upsertModel.$relatedQuery(relName).childQueryOf(builder);

              if (!relation.isOneToOne()) {
                query.whereInComposite(builder.fullIdColumnFor(relation.relatedModelClass), ids);
              }

              if (unrelate) {
                query.unrelate();
              } else {
                query.delete();
              }

              return query;
            }
          },
          { concurrency: 1 }
        );
      },
      { concurrency: this.graph.rootModelClass.getConcurrency(builder.unsafeKnex()) }
    );
  }

  relate(builder) {
    // We only need to relate `HasManyRelations` (and HasOneRelations that inherit HasManyRelation)
    // because the graph inserter took care of the other relates.
    const relateNodes = this.graph.nodes.filter(
      it => it.hasType(UpsertNode.Type.Relate) && it.relation instanceof HasManyRelation
    );

    return promiseUtils.map(
      relateNodes,
      node => {
        return node.parentNode.upsertModel
          .$relatedQuery(node.relationName)
          .childQueryOf(builder, true)
          .relate(node.upsertModel.$id());
      },
      { concurrency: this.graph.rootModelClass.getConcurrency(builder.unsafeKnex()) }
    );
  }

  update(builder) {
    const updateNodes = this.graph.nodes.filter(it =>
      it.hasType(UpsertNode.Type.Update, UpsertNode.Type.Patch)
    );

    return promiseUtils.map(
      updateNodes,
      node => {
        let query = null;
        const patch = node.hasType(UpsertNode.Type.Patch);

        // The models were created by the parent class `InsertGraphOperation` with a
        // skipValidation flag. We need to explicitly call $validate here.
        node.upsertModel.$validate(node.upsertModel, {
          patch: patch,
          dataPath: node.dataPath
        });

        if (node.parentNode) {
          // Call patch through parent's $relatedQuery to make things like many-to-many
          // extra property updates to work.
          query = node.parentNode.upsertModel
            .$relatedQuery(node.relationName)
            .childQueryOf(builder, true)
            .findById(node.upsertModel.$id())
            [patch ? 'patch' : 'update'](node.upsertModel);
        } else {
          query = node.upsertModel
            .$query()
            .childQueryOf(builder, true)
            .patch();
        }

        return query;
      },
      { concurrency: this.graph.rootModelClass.getConcurrency(builder.unsafeKnex()) }
    );
  }

  upsertRecursively(builder) {
    const upsertRecursivelyNodes = this.graph.nodes.filter(it =>
      it.hasType(UpsertNode.Type.UpsertRecursively)
    );

    return promiseUtils.map(
      upsertRecursivelyNodes,
      node => {
        return node.upsertModel.constructor
          .query()
          .upsertGraph(node.upsertModel, transformOptionsFromPath(node.opt, node.relPathFromRoot))
          .childQueryOf(builder, true);
      },
      { concurrency: this.graph.rootModelClass.getConcurrency(builder.unsafeKnex()) }
    );
  }
}

module.exports = UpsertGraphOperation;
