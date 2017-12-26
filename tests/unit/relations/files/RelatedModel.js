const Model = require('../../../../').Model;

class RelatedModel extends Model {
  static get tableName() {
    return this.name;
  }
}

module.exports = RelatedModel;
