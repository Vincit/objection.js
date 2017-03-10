import Relation from '../Relation';

import HasManyInsertOperation from './HasManyInsertOperation';
import HasManyRelateOperation from './HasManyRelateOperation';
import HasManyUnrelateOperation from './HasManyUnrelateOperation';

export default class HasManyRelation extends Relation {

  insert(builder, owner) {
    return new HasManyInsertOperation('insert', {
      relation: this,
      owner: owner
    });
  }

  relate(builder, owner) {
    return new HasManyRelateOperation('relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    return new HasManyUnrelateOperation('unrelate', {
      relation: this,
      owner: owner
    });
  }
}

