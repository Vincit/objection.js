const Model = require('../../../../').Model;

class RelatedModel1 extends Model {
  static get tableName() {
    return this.name;
  }
}

class RelatedModel2 extends Model {
  static get tableName() {
    return this.name;
  }
}

module.exports = {
  someCrap: 42,
  RelatedModel1,
  moreUselessShit: {},
  RelatedModel2
};
