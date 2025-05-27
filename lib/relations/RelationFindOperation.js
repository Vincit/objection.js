'use strict';

const { FindOperation } = require('../queryBuilder/operations/FindOperation');

class RelationFindOperation extends FindOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
    this.alwaysReturnArray = false;
    this.assignResultToOwner = true;
    this.relationProperty = opt.relationProperty || this.relation.name;
    this.omitProps = [];
    this.alias = null;
  }

  onBuild(builder) {
    this.maybeApplyAlias(builder);
    this.relation.findQuery(builder, this.owner);

    if (this.assignResultToOwner && this.owner.isModels) {
      this.selectMissingJoinColumns(builder);
    }
  }

  onAfter2(_, related) {
    const isOneToOne = this.relation.constructor.isOneToOne();

    if (this.assignResultToOwner && this.owner.isModels) {
      const owners = this.owner.modelArray;
      const relatedByOwnerId = new Map();

      for (let i = 0, l = related.length; i < l; ++i) {
        const rel = related[i];
        const key = this.relation.relatedProp.propKey(rel);
        let arr = relatedByOwnerId.get(key);

        if (!arr) {
          arr = [];
          relatedByOwnerId.set(key, arr);
        }

        arr.push(rel);
      }

      for (let i = 0, l = owners.length; i < l; ++i) {
        const own = owners[i];
        const key = this.relation.ownerProp.propKey(own);
        const related = relatedByOwnerId.get(key);

        if (isOneToOne) {
          own[this.relationProperty] = (related && related[0]) || null;
        } else {
          own[this.relationProperty] = related || [];
        }
      }
    }

    return related;
  }

  onAfter3(builder, related) {
    const isOneToOne = this.relation.constructor.isOneToOne();
    const intOpt = builder.internalOptions();

    if (!intOpt.keepImplicitJoinProps) {
      this.omitImplicitJoinProps(related);
    }

    if (!this.alwaysReturnArray && isOneToOne && related.length <= 1) {
      related = related[0] || undefined;
    }

    return super.onAfter3(builder, related);
  }

  selectMissingJoinColumns(builder) {
    const relatedProp = this.relation.relatedProp;
    const addedSelects = [];

    for (let c = 0, lc = relatedProp.size; c < lc; ++c) {
      const fullCol = relatedProp.ref(builder, c).fullColumn(builder);
      const prop = relatedProp.props[c];
      const col = relatedProp.cols[c];

      if (!builder.hasSelectionAs(fullCol, col) && addedSelects.indexOf(fullCol) === -1) {
        this.omitProps.push(prop);
        addedSelects.push(fullCol);
      }
    }

    if (addedSelects.length) {
      builder.select(addedSelects);
    }
  }

  maybeApplyAlias(builder) {
    if (!builder.alias() && this.alias) {
      builder.alias(this.alias);
    }
  }

  omitImplicitJoinProps(related) {
    const relatedModelClass = this.relation.relatedModelClass;

    if (!this.omitProps.length || !related) {
      return related;
    }

    if (!Array.isArray(related)) {
      return this.omitImplicitJoinPropsFromOne(relatedModelClass, related);
    }

    if (!related.length) {
      return related;
    }

    for (let i = 0, l = related.length; i < l; ++i) {
      this.omitImplicitJoinPropsFromOne(relatedModelClass, related[i]);
    }

    return related;
  }

  omitImplicitJoinPropsFromOne(relatedModelClass, model) {
    for (let c = 0, lc = this.omitProps.length; c < lc; ++c) {
      relatedModelClass.omitImpl(model, this.omitProps[c]);
    }

    return model;
  }

  clone() {
    const clone = super.clone();

    clone.alwaysReturnArray = this.alwaysReturnArray;
    clone.assignResultToOwner = this.assignResultToOwner;
    clone.relationProperty = this.relationProperty;
    clone.omitProps = this.omitProps.slice();
    clone.alias = this.alias;

    return clone;
  }
}

module.exports = {
  RelationFindOperation,
};
