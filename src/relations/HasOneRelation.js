import _ from 'lodash';
import HasManyRelation from './HasManyRelation';

export default class HasOneRelation extends HasManyRelation {

  createRelationProp(owners, related) {
    let relatedByOwnerId = _.indexBy(related, related => related.$values(this.relatedProp));

    _.each(owners, owner => {
      let ownerId = owner.$values(this.ownerProp);
      owner[this.name] = relatedByOwnerId[ownerId] || null;
    });
  }

  appendRelationProp(owner, related) {
    owner[this.name] = related[0] || null;
  }
}