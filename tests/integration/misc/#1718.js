const _ = require('lodash');
const expect = require('expect.js');
const { Model } = require('../../../');
const { AjvValidator } = require('../../../lib/model/AjvValidator');
const { ValidationError } = require('../../../lib/model/ValidationError');

module.exports = (session) => {
  describe('Pass through data in exceptions when Ajv verbose option is enabled #1718', () => {
    class MyModel extends Model {
      static get tableName() {
        return 'MyModel';
      }

      static createValidator() {
        return new AjvValidator({
          options: {
            allErrors: true,
            validateSchema: false,
            ownProperties: true,
            v5: true,
            verbose: true,
          },
        });
      }

      static get jsonSchema() {
        return {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        };
      }
    }

    beforeEach(() => {
      return session.knex.schema
        .dropTableIfExists('MyModel')
        .createTable('MyModel', (table) => {
          table.integer('id').primary();
        })
        .then(() => {
          return Promise.all([session.knex('MyModel').insert({ id: 1 })]);
        });
    });

    afterEach(() => {
      return session.knex.schema.dropTableIfExists('MyModel');
    });

    it('test', () => {
      return MyModel.query(session.knex)
        .insert({ id: 2 })
        .catch((err) => {
          expect(err).to.be.an(ValidationError);
          expect(err.data).to.be.an('object');
          expect(err.data.id).to.be.an('array');
          expect(err.data).to.eql({
            id: [
              {
                message: 'must be integer',
                keyword: 'type',
                params: { type: 'integer' },
                data: '2',
              },
            ],
          });
        });
    });
  });
};
