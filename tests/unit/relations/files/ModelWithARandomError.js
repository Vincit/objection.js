const { Model } = require('../../../../');

throw new Error('some random error');
class TestModel extends Model {
  static get tableName() {
    return 'test';
  }
}
