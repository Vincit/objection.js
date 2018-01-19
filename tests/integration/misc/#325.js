const expect = require('expect.js');
const Model = require('../../../').Model;

module.exports = session => {
  describe('Default values not set with .insertGraph() in 0.7.2 #325', () => {
    let TestModel;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('default_values_note_set_test')
        .createTable('default_values_note_set_test', table => {
          table.increments('id').primary();
          table.string('value1');
          table.string('value2');
        });
    });

    after(() => {
      return session.knex.schema.dropTableIfExists('default_values_note_set_test');
    });

    before(() => {
      TestModel = class TestModel extends Model {
        static get tableName() {
          return 'default_values_note_set_test';
        }

        static get jsonSchema() {
          return {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              value1: { type: 'string', default: 'foo' },
              value2: { type: 'string', default: 'bar' }
            }
          };
        }
      };

      TestModel.knex(session.knex);
    });

    beforeEach(() => {
      return TestModel.query().delete();
    });

    it('insert should set the defaults', () => {
      return TestModel.query()
        .insert({ value1: 'hello' })
        .then(model => {
          expect(model.value1).to.equal('hello');
          expect(model.value2).to.equal('bar');
          return session.knex(TestModel.getTableName());
        })
        .then(rows => {
          expect(rows[0].value1).to.equal('hello');
          expect(rows[0].value2).to.equal('bar');
        });
    });

    it('insertGraph should set the defaults', () => {
      return TestModel.query()
        .insertGraph({ value1: 'hello' })
        .then(model => {
          expect(model.value1).to.equal('hello');
          expect(model.value2).to.equal('bar');
          return session.knex(TestModel.getTableName());
        })
        .then(rows => {
          expect(rows[0].value1).to.equal('hello');
          expect(rows[0].value2).to.equal('bar');
        });
    });
  });
};
