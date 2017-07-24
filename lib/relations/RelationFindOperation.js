'use strict';

const uniqBy = require('lodash/uniqBy');
const FindOperation = require('../queryBuilder/operations/FindOperation');

class RelationFindOperation extends FindOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owners = opt.owners;
    this.alwaysReturnArray = false;
    this.relationProperty = opt.relationProperty || this.relation.name;
    this.omitProps = [];
  }

  clone(props) {
    const copy = super.clone(props);

    copy.relation = this.relation;
    copy.owners = this.owners;
    copy.alwaysReturnArray = this.alwaysReturnArray;
    copy.relationProperty = this.relationProperty;
    copy.omitProps = this.omitProps;

    return copy;
  }

  onBuild(builder) {
    let ids = new Array(this.owners.length);

    for (let i = 0, l = this.owners.length; i < l; ++i) {
      ids[i] = this.owners[i].$values(this.relation.ownerProp);
    }

    this.relation.findQuery(builder, {
      ownerIds: uniqBy(ids, join)
    });

    this.selectMissingJoinColumns(builder);
  }

  onAfter2(builder, related) {
    const owners = this.owners;
    const isOneToOne = this.relation.isOneToOne();
    const relatedByOwnerId = Object.create(null);

    for (let i = 0, l = related.length; i < l; ++i) {
      const rel = related[i];
      const key = rel.$propKey(this.relation.relatedProp);
      let arr = relatedByOwnerId[key];

      if (!arr) {
        arr = [];
        relatedByOwnerId[key] = arr;
      }

      arr.push(rel);
    }

    for (let i = 0, l = owners.length; i < l; ++i) {
      const own = owners[i];
      const key = own.$propKey(this.relation.ownerProp);
      const related = relatedByOwnerId[key];

      if (isOneToOne) {
        own[this.relationProperty] = (related && related[0]) || null;
      } else {
        own[this.relationProperty] = related || [];
      }
    }

    if (!this.alwaysReturnArray && this.relation.isOneToOne() && related.length <= 1) {
      return related[0] || undefined;
    } else {
      return related;
    }
  }

  onAfter3(builder, related) {
    const intOpt = builder.internalOptions();

    if (!intOpt.keepImplicitJoinProps) {
      this.omitImplicitJoinProps(related);
    }

    return super.onAfter3(builder, related);
  }

  selectMissingJoinColumns(builder) {
    const cols = this.relation.fullRelatedCol(builder);
    const addedSelects = [];

    for (let c = 0, lc = cols.length; c < lc; ++c) {
      const col = cols[c];

      if (!builder.hasSelectionAs(col, this.relation.relatedCol[c]) && addedSelects.indexOf(col) === -1) {
        this.omitProps.push(this.relation.relatedProp[c]);
        addedSelects.push(col);
      }
    }

    if (addedSelects.length) {
      builder.select(addedSelects);
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
}

function join(arr) {
  return arr.join();
}

module.exports = RelationFindOperation;