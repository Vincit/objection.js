'use strict';

const { RelationFindOperation } = require('../../RelationFindOperation');
const { getTempColumn } = require('../../../utils/tmpColumnUtils');

class ManyToManyFindOperation extends RelationFindOperation {
  constructor(name, opt) {
    super(name, opt);

    this.ownerJoinColumnAlias = new Array(this.relation.joinTableOwnerProp.size);

    for (let i = 0, l = this.ownerJoinColumnAlias.length; i < l; ++i) {
      this.ownerJoinColumnAlias[i] = getTempColumn(i);
    }
  }

  onBuild(builder) {
    const relatedModelClass = this.relation.relatedModelClass;

    this.maybeApplyAlias(builder);
    this.relation.findQuery(builder, this.owner);

    if (!builder.has(builder.constructor.SelectSelector)) {
      const table = builder.tableRefFor(relatedModelClass);

      // If the user hasn't specified a select clause, select the related model's columns.
      // If we don't do this we also get the join table's columns.
      builder.select(`${table}.*`);

      // Also select all extra columns.
      for (const extra of this.relation.joinTableExtras) {
        const joinTable = builder.tableRefFor(this.relation.joinTable);
        builder.select(`${joinTable}.${extra.joinTableCol} as ${extra.aliasCol}`);
      }
    }

    if (this.assignResultToOwner && this.owner.isModels) {
      this.selectMissingJoinColumns(builder);
    }
  }

  onAfter2(_, related) {
    const isOneToOne = this.relation.isOneToOne();

    if (this.assignResultToOwner && this.owner.isModels) {
      const owners = this.owner.modelArray;
      const ownerProp = this.relation.ownerProp;
      const relatedByOwnerId = new Map();

      for (let i = 0, l = related.length; i < l; ++i) {
        const rel = related[i];
        const key = rel.$propKey(this.ownerJoinColumnAlias);
        let arr = relatedByOwnerId.get(key);

        if (!arr) {
          arr = [];
          relatedByOwnerId.set(key, arr);
        }

        arr.push(rel);
      }

      for (let i = 0, l = owners.length; i < l; ++i) {
        const own = owners[i];
        const key = ownerProp.propKey(own);
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

  clone() {
    const clone = super.clone();
    clone.ownerJoinColumnAlias = this.ownerJoinColumnAlias.slice();
    return clone;
  }

  selectMissingJoinColumns(builder) {
    const { relatedModelClass, joinTableOwnerProp } = this.relation;

    // We must select the owner join columns so that we know for which owner model the related
    // models belong to after the requests.
    joinTableOwnerProp.forEach((i) => {
      const joinTableOwnerRef = joinTableOwnerProp.ref(builder, i);
      const propName = relatedModelClass.columnNameToPropertyName(this.ownerJoinColumnAlias[i]);

      builder.select(joinTableOwnerRef.as(this.ownerJoinColumnAlias[i]));
      // Mark them to be omitted later.
      this.omitProps.push(propName);
    });

    super.selectMissingJoinColumns(builder);
  }
}

module.exports = {
  ManyToManyFindOperation,
};
