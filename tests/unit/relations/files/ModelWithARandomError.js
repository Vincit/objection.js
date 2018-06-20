const Model = require('../../../../').Model;

throw new Error('some random error');
class TestModel extends Model {
  static get tableName() {
    return 'test';
  }
}
