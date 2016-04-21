import _ from 'lodash';
import Relation from '../Relation';

import HasManyInsertMethod from './HasManyInsertMethod';
import HasManyRelateMethod from './HasManyRelateMethod';
import HasManyUnrelateMethod from './HasManyUnrelateMethod';

export default class HasManyRelation extends Relation {

  createRelationProp(owners, related) {
    let relatedByOwnerId = _.groupBy(related, related => related.$values(this.relatedProp));

    _.each(owners, owner => {
      let ownerId = owner.$values(this.ownerProp);
      owner[this.name] = relatedByOwnerId[ownerId] || [];
    });
  }

  appendRelationProp(owner, related) {
    owner[this.name] = this.mergeModels(owner[this.name], related);
  }

  insert(builder, owner) {
    return new HasManyInsertMethod(builder, 'insert', {
      relation: this,
      owner: owner
    });
  }

  relate(builder, owner) {
    return new HasManyRelateMethod(builder, 'relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    return new HasManyUnrelateMethod(builder, 'unrelate', {
      relation: this,
      owner: owner
    });
  }
}
