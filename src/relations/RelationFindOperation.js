const _ = require('lodash');
const FindOperation = require('../queryBuilder/operations/FindOperation');

module.exports = class RelationFindOperation extends FindOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owners = opt.owners;
    this.alwaysReturnArray = false;
    this.omitProps = [];
  }

  clone(...args) {
    const copy = super.clone(...args);

    copy.relation = this.relation;
    copy.owners = this.owners;
    copy.alwaysReturnArray = this.alwaysReturnArray;
    copy.omitProps = this.omitProps;

    return copy;
  }

  onBeforeBuild(builder) {
    let ids = new Array(this.owners.length);

    for (let i = 0, l = this.owners.length; i < l; ++i) {
      ids[i] = this.owners[i].$values(this.relation.ownerProp);
    }

    this.relation.findQuery(builder, {
      ownerIds: _.uniqBy(ids, join)
    });

    this.selectMissingJoinColumns(builder);
  }

  onAfter(builder, related) {
    this.omitImplicitJoinProps(related);
    return super.onAfter(builder, related);
  }

  onAfterInternal(builder, related) {
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
        own[this.relation.name] = (related && related[0]) || null;
      } else {
        own[this.relation.name] = related || [];
      }
    }

    if (!this.alwaysReturnArray && this.relation.isOneToOne() && related.length <= 1) {
      return related[0] || undefined;
    } else {
      return related;
    }
  }

  selectMissingJoinColumns(builder) {
    const addedSelects = {};
    const cols = this.relation.fullRelatedCol();

    for (let c = 0, lc = cols.length; c < lc; ++c) {
      const col = cols[c];

      if (!builder.hasSelection(col) && !addedSelects[col]) {
        this.omitProps.push(this.relation.relatedProp[c]);
        addedSelects[col] = true;
      }
    }

    const selects = Object.keys(addedSelects);

    if (selects.length) {
      builder.select(selects);
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