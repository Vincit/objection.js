import ManyToManyRelation from '../manyToMany/ManyToManyRelation';

export default class HasOneThroughRelation extends ManyToManyRelation {

  isOneToOne() {
    return true;
  }
}