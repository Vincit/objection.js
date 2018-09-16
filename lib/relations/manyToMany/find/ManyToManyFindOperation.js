const RelationFindOperation = require('../../RelationFindOperation');
const { getTempColumn } = require('../../../utils/tmpColumnUtils');
const { uniqBy } = require('../../../utils/objectUtils');

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

    this.relation.findQuery(builder, {
      ownerIds: uniqBy(ids, join)
    });

    if (!builder.has(builder.constructor.SelectSelector)) {
      const table = builder.tableRefFor(relatedModelClass.getTableName());

      // If the user hasn't specified a select clause, select the related model's columns.
      // If we don't do this we also get the join table's columns.
      builder.select(`${table}.*`);

      // Also select all extra columns.
      for (let i = 0, l = this.relation.joinTableExtras.length; i < l; ++i) {
        const extra = this.relation.joinTableExtras[i];
        const joinTable = builder.tableRefFor(this.relation.joinTable);

        builder.select(`${joinTable}.${extra.joinTableCol} as ${extra.aliasCol}`);
      }
    }

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

      for (let i = 0, l = this.owners.length; i < l; ++i) {
        const own = this.owners[i];
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
}

function join(arr) {
  return arr.join();
}

module.exports = ManyToManyFindOperation;
