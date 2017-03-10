import HasManyRelation from '../hasMany/HasManyRelation';

export default class HasOneRelation extends HasManyRelation {

  isOneToOne() {
    return true;
  }
}