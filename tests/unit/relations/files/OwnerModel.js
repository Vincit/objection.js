const Model = require('../../../../').Model;

class OwnerModel extends Model {
  static get tableName() {
    return this.name;
  }
}

module.exports = OwnerModel;
