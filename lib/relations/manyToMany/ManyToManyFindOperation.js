'use strict';

const uniqBy = require('lodash/uniqBy');
const RelationFindOperation = require('../RelationFindOperation');
const getTempColumn = require('../../utils/tmpColumnUtils').getTempColumn;

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
    const joinTableOwnerProp = this.relation.joinTableOwnerProp;
    const ownerProp = this.relation.ownerProp;
    const ids = new Array(this.owners.length);

    for (let i = 0, l = this.owners.length; i < l; ++i) {
      ids[i] = ownerProp.getProps(this.owners[i]);
    }

    if (!builder.has(builder.constructor.SelectSelector)) {
      const table = builder.tableRefFor(relatedModelClass);

      // If the user hasn't specified a select clause, select the related model's columns.
      // If we don't do this we also get the join table's columns.
      builder.select(`${table}.*`);

      // Also select all extra columns.
      for (let i = 0, l = this.relation.joinTableExtras.length; i < l; ++i) {
        const extra = this.relation.joinTableExtras[i];
        const joinTable = this.relation.joinTable;

        builder.select(`${joinTable}.${extra.joinTableCol} as ${extra.aliasCol}`);
      }
    }

    this.relation.findQuery(builder, {
      ownerIds: uniqBy(ids, join)
    });

    // We must select the owner join columns so that we know for which owner model the related
    // models belong to after the requests.
    for (let i = 0, l = joinTableOwnerProp.size; i < l; ++i) {
      const joinTableOwnerRef = joinTableOwnerProp.ref(builder, i);
      const propName = relatedModelClass.columnNameToPropertyName(this.ownerJoinColumnAlias[i]);

      builder.select(joinTableOwnerRef.as(this.ownerJoinColumnAlias[i]));
      // Mark them to be omitted later.
      this.omitProps.push(propName);
    }

    this.selectMissingJoinColumns(builder);
  }

  onAfter2(builder, related) {
    const isOneToOne = this.relation.isOneToOne();

    if (this.assignResultToOwner) {
      const ownerProp = this.relation.ownerProp;
      const relatedByOwnerId = Object.create(null);

      for (let i = 0, l = related.length; i < l; ++i) {
        const rel = related[i];
        const key = rel.$propKey(this.ownerJoinColumnAlias);
        let arr = relatedByOwnerId[key];

        if (!arr) {
          arr = [];
          relatedByOwnerId[key] = arr;
        }

        arr.push(rel);
      }

      for (let i = 0, l = this.owners.length; i < l; ++i) {
        const own = this.owners[i];
        const key = ownerProp.propKey(own);
        const related = relatedByOwnerId[key];

        if (isOneToOne) {
          own[this.relationProperty] = (related && related[0]) || null;
        } else {
          own[this.relationProperty] = related || [];
        }
      }
    }

    return related;
  }
}

function join(arr) {
  return arr.join();
}

module.exports = ManyToManyFindOperation;
