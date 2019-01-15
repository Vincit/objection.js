const expect = require('expect.js');
const { Model } = require('../../../');

module.exports = session => {
  describe('model with `length` property', () => {
    let TestModel;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('model_with_length_test')
        .createTable('model_with_length_test', table => {
          table.increments('id');
          table.integer('length');
        });
    });

    after(() => {
      return session.knex.schema.dropTableIfExists('model_with_length_test');
    });

    before(() => {
      TestModel = class TestModel extends Model {
        static get tableName() {
          return 'model_with_length_test';
        }
      };

      TestModel.knex(session.knex);
    });

    it('should insert', () => {
      return TestModel.query()
        .insert({ length: 10 })
        .then(model => {
          expect(model).to.eql({ id: 1, length: 10 });
          return session.knex(TestModel.getTableName());
        })
        .then(rows => {
          expect(rows.length).to.equal(1);
          expect(rows[0]).to.eql({ id: 1, length: 10 });
        });
    });
  });
};
