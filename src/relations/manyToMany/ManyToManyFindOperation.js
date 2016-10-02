import _ from 'lodash';
import FindOperation from '../../queryBuilder/operations/FindOperation';

const ownerJoinColumnAliasPrefix = 'objectiontmpjoin';

export default class ManyToManyFindOperation extends FindOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owners = opt.owners;

    this.relatedIdxByOwnerId = null;
    this.ownerJoinColumnAlias = new Array(this.relation.joinTableOwnerCol.length);

    for (let i = 0, l = this.relation.joinTableOwnerCol.length; i < l; ++i) {
      this.ownerJoinColumnAlias[i] = ownerJoinColumnAliasPrefix + i;
    }
  }

  onBeforeBuild(builder) {
    const ids = new Array(this.owners.length);

    for (let i = 0, l = this.owners.length; i < l; ++i) {
      ids[i] = this.owners[i].$values(this.relation.ownerProp);
    }

    if (!builder.has(/select/)) {
      // If the user hasn't specified a select clause, select the related model's columns.
      // If we don't do this we also get the join table's columns.
      builder.select(this.relation.relatedModelClass.tableName + '.*');

      const extraCols = this.relation.fullJoinTableExtraCols();
      // Also select all extra columns.
      for (let i = 0, l = extraCols.length; i < l; ++i) {
        builder.select(extraCols[i]);
      }
    }

    this.relation.findQuery(builder, {
      ownerIds: _.uniqBy(ids, join)
    });

    const fullJoinTableOwnerCol = this.relation.fullJoinTableOwnerCol();
    // We must select the owner join columns so that we know for which owner model the related
    // models belong to after the requests.
    for (let i = 0, l = fullJoinTableOwnerCol.length; i < l; ++i) {
      builder.select(fullJoinTableOwnerCol[i] + ' as ' + this.ownerJoinColumnAlias[i]);
    }
  }

  onRawResult(builder, rows) {
    const relatedIdxByOwnerId = Object.create(null);
    const propKey = this.relation.relatedModelClass.prototype.$propKey;

    for (let i = 0, l = rows.length; i < l; ++i) {
      const row = rows[i];
      const key = propKey.call(row, this.ownerJoinColumnAlias);
      let arr = relatedIdxByOwnerId[key];

      if (!arr) {
        arr = [];
        relatedIdxByOwnerId[key] = arr;
      }

      for (let j = 0, lc = this.ownerJoinColumnAlias.length; j < lc; ++j) {
        delete row[this.ownerJoinColumnAlias[j]];
      }

      arr.push(i);
    }

    this.relatedIdxByOwnerId = relatedIdxByOwnerId;
    return rows;
  }

  onAfterInternal(builder, related) {
    for (let i = 0, l = this.owners.length; i < l; ++i) {
      const own = this.owners[i];
      const key = own.$propKey(this.relation.ownerProp);
      const idx = this.relatedIdxByOwnerId[key];

      if (idx) {
        const arr = new Array(idx.length);

        for (let j = 0, lr = idx.length; j < lr; ++j) {
          arr[j] = related[idx[j]];
        }

        own[this.relation.name] = arr;
      } else {
        own[this.relation.name] = [];
      }
    }

    return related;
  }
}

function join(arr) {
  return arr.join();
}