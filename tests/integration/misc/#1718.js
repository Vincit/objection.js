const _ = require('lodash');
const expect = require('expect.js');
const { Model } = require('../../../');
const { AjvValidator } = require('../../../lib/model/AjvValidator');
const { ValidationError } = require('../../../lib/model/ValidationError');

module.exports = (session) => {
  describe('When Ajv verbose is enabled, pass through the data field in exception #1718', () => {
    class A extends Model {
      static get tableName() {
        return 'a';
      }

      static createValidator() {
        return new AjvValidator({
          onCreateAjv: (ajv) => {
            // Here you can modify the `Ajv` instance.
          },
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
        .dropTableIfExists('a')
        .createTable('a', (table) => {
          table.integer('id').primary();
        })
        .then(() => {
          return Promise.all([session.knex('a').insert({ id: 1 })]);
        });
    });

    afterEach(() => {
      return session.knex.schema.dropTableIfExists('a');
    });

    it('the test', () => {
      return A.query(session.knex)
        .insert({ id: '2' })
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
