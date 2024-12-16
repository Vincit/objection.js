'use strict';

const { isObject, asArray, asSingle, uniqBy } = require('../utils/objectUtils');
const { normalizeIds } = require('../utils/normalizeIds');

const Type = {
  Models: 'Models',
  Reference: 'Reference',
  QueryBuilder: 'QueryBuilder',
  Identifiers: 'Identifiers',
};

class RelationOwner {
  constructor(owner) {
    this.owner = owner;
    this.type = detectType(owner);
  }

  static create(owner) {
    return new RelationOwner(owner);
  }

  static createParentReference(builder, relation) {
    return this.create(relation.ownerProp.refs(findFirstNonPartialAncestorQuery(builder)));
  }

  get isModels() {
    return this.type === Type.Models;
  }

  get isReference() {
    return this.type === Type.Reference;
  }

  get isQueryBuilder() {
    return this.type === Type.QueryBuilder;
  }

  get isIdentifiers() {
    return this.type === Type.Identifiers;
  }

  get modelArray() {
    return asArray(this.owner);
  }

  get model() {
    return asSingle(this.owner);
  }

  get reference() {
    return this.owner;
  }

  get queryBuilder() {
    return this.owner;
  }

  get identifiers() {
    return this.owner;
  }

  buildFindQuery(builder, relation, relatedRefs) {
    if (this.isReference) {
      relatedRefs.forEach((relatedRef, i) => {
        builder.where(relatedRef, this.reference[i]);
      });
    } else if (this.isModels || this.isIdentifiers || this.isQueryBuilder) {
      const values = this.getProps(relation);

      if (values) {
        builder.whereInComposite(relatedRefs, values);
      } else {
        builder.where(false).resolve([]);
      }
    } else {
      builder.where(false).resolve([]);
    }

    return builder;
  }

  getProps(relation, ownerProp = relation.ownerProp) {
    if (this.isModels) {
      return this._getPropsFromModels(ownerProp);
    } else if (this.isIdentifiers) {
      return this._getPropsFromIdentifiers(relation, ownerProp);
    } else if (this.isQueryBuilder) {
      return this._getPropsFromQuery(relation, ownerProp);
    }
  }

  getSplitProps(builder, relation, ownerProp = relation.ownerProp) {
    const values = this.getProps(relation, relation.ownerProp);

    if (isQueryBuilder(values)) {
      if (ownerProp.size === 1) {
        return [[values]];
      } else {
        // For composite keys, we need to create a query builder for each
        // key. Each query builder only select that key.
        return [
          Array.from({ length: ownerProp.size }).map((_, i) => {
            return values.clone().clearSelect().select(ownerProp.ref(builder, i));
          }),
        ];
      }
    } else {
      return values;
    }
  }

  getNormalizedIdentifiers(ownerProp) {
    return normalizeIds(this.identifiers, ownerProp, {
      arrayOutput: true,
    });
  }

  _getPropsFromModels(ownerProp) {
    const props = this.modelArray.map((owner) => ownerProp.getProps(owner));

    if (!containsNonNull(props)) {
      return null;
    }

    return uniqBy(props, join);
  }

  _getPropsFromIdentifiers(relation, ownerProp) {
    const ids = this.getNormalizedIdentifiers(ownerProp);

    if (isIdProp(ownerProp)) {
      return ids;
    } else {
      const query = relation.ownerModelClass.query();

      query.findByIds(ids);
      query.select(ownerProp.refs(query));

      return query;
    }
  }

  _getPropsFromQuery(relation, ownerProp) {
    const query = this.queryBuilder.clone();

    if (isOwnerModelClassQuery(query, relation)) {
      query.clearSelect();
      query.select(ownerProp.refs(query));
    }

    return query;
  }
}

function detectType(owner) {
  if (isModel(owner) || isModelArray(owner)) {
    return Type.Models;
  } else if (isReferenceArray(owner)) {
    return Type.Reference;
  } else if (isQueryBuilder(owner)) {
    return Type.QueryBuilder;
  } else {
    return Type.Identifiers;
  }
}

function isModel(item) {
  return isObject(item) && !!item.$isObjectionModel;
}

function isModelArray(item) {
  return Array.isArray(item) && isModel(item[0]);
}

function isReference(item) {
  return isObject(item) && !!item.isObjectionReferenceBuilder;
}

function isReferenceArray(item) {
  return Array.isArray(item) && isReference(item[0]);
}

function isQueryBuilder(item) {
  return isObject(item) && !!item.isObjectionQueryBuilder;
}

function findFirstNonPartialAncestorQuery(builder) {
  builder = builder.parentQuery();
  if (!builder)
    throw Error(
      'query method `for` ommitted outside a subquery, can not figure out relation target',
    );
  while (builder.isPartial()) {
    if (!builder.parentQuery()) {
      break;
    }

    builder = builder.parentQuery();
  }

  return builder;
}

function containsNonNull(arr) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    const val = arr[i];

    if (Array.isArray(val)) {
      if (containsNonNull(val)) {
        return true;
      }
    } else if (val !== null && val !== undefined) {
      return true;
    }
  }

  return false;
}

function join(id) {
  return id.map((x) => (Buffer.isBuffer(x) ? x.toString('hex') : x)).join(',');
}

function isIdProp(relationProp) {
  const idProp = relationProp.modelClass.getIdRelationProperty();
  return idProp.props.every((prop, i) => prop === relationProp.props[i]);
}

function isOwnerModelClassQuery(query, relation) {
  return query.modelClass().getTableName() === relation.ownerModelClass.getTableName();
}

module.exports = {
  RelationOwner,
};
