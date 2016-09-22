import HasManyRelation from '../hasMany/HasManyRelation';

export default class HasOneRelation extends HasManyRelation {

  isOneToOne() {
    return true;
  }

  createRelationProp(owners, related) {
    const relatedByOwnerId = Object.create(null);

    for (let i = 0, l = related.length; i < l; ++i) {
      const rel = related[i];
      const key = rel.$propKey(this.relatedProp);

      relatedByOwnerId[key] = rel;
    }

    for (let i = 0, l = owners.length; i < l; ++i) {
      const own = owners[i];
      const key = own.$propKey(this.ownerProp);

      own[this.name] = relatedByOwnerId[key] || null;
    }
  }

  appendRelationProp(owner, related) {
    owner[this.name] = related[0] || null;
  }
}