import _ from 'lodash';
import FindOperation from '../../queryBuilder/operations/FindOperation';

const ownerJoinColumnAliasPrefix = 'objectiontmpjoin';

export default class ManyToManyFindOperation extends FindOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.relation = opt.relation;
    this.owners = opt.owners;

    this.ownerJoinColumnAlias = _.times(this.relation.joinTableOwnerCol.length, idx => {
      return ownerJoinColumnAliasPrefix + idx;
    });

    this.ownerJoinPropertyAlias = _.map(this.ownerJoinColumnAlias, alias => {
      return this.relation.relatedModelClass.columnNameToPropertyName(alias);
    });
  }

  onBeforeBuild(builder) {
    let ids = _(this.owners)
      .map(owner => owner.$values(this.relation.ownerProp))
      .uniqBy(id => id.join())
      .value();

    if (!builder.has(/select/)) {
      // If the user hasn't specified a select clause, select the related model's columns.
      // If we don't do this we also get the join table's columns.
      builder.select(this.relation.relatedModelClass.tableName + '.*');

      // Also select all extra columns.
      _.each(this.relation.fullJoinTableExtraCols(), col => {
        builder.select(col);
      });
    }

    this.relation.findQuery(builder, ids);

    // We must select the owner join columns so that we know for which owner model the related
    // models belong to after the requests.
    _.each(this.relation.fullJoinTableOwnerCol(), (fullJoinTableOwnerCol, idx) => {
      builder.select(fullJoinTableOwnerCol + ' as ' + this.ownerJoinColumnAlias[idx]);
    });
  }

  onAfterInternal(builder, related) {
    let relatedByOwnerId = _.groupBy(related, related => related.$values(this.ownerJoinPropertyAlias));

    _.each(this.owners, owner => {
      owner[this.relation.name] = relatedByOwnerId[owner.$values(this.relation.ownerProp)] || [];
    });

    // Delete the temporary join aliases.
    _.each(related, rel => {
      _.each(this.ownerJoinPropertyAlias, alias => {
        delete rel[alias];
      });
    });

    return related;
  }
}