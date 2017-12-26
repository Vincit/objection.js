const Model = require('../../../../').Model;

class JoinModel extends Model {
  static get tableName() {
    return this.name;
  }
}

module.exports = JoinModel;
