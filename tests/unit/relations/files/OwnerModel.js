const { Model } = require('../../../../');

class OwnerModel extends Model {
  static get tableName() {
    return this.name;
  }
}

module.exports = OwnerModel;
