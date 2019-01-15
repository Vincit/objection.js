const { Model } = require('../../../../');

class RelatedModel extends Model {
  static get tableName() {
    return this.name;
  }
}

module.exports = RelatedModel;
