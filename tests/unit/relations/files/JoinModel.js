const { Model } = require('../../../../');

class JoinModel extends Model {
  static get tableName() {
    return this.name;
  }
}

module.exports = JoinModel;
