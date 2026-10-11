const { Model, snakeCaseMappers, raw, ref } = require('../../../');
const { expect } = require('chai');

module.exports = (session) => {
  describe('keys with a colon in patch() and update() data', () => {
    let knex = session.knex;
    let Item;

    before(() => {
      return knex.schema
        .dropTableIfExists('field_expression_keys')
        .createTable('field_expression_keys', (table) => {
          table.integer('id').primary();
          table.string('ns:name');
          table.string('ns:foo_bar');

          if (session.isPostgres()) {
            table.jsonb('meta');
          }
        });
    });

    after(() => {
      return knex.schema.dropTableIfExists('field_expression_keys');
    });

    before(() => {
      Item = class Item extends Model {
        static get tableName() {
          return 'field_expression_keys';
        }

        static get jsonSchema() {
          return {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              'ns:name': { type: 'string' },
              meta: {
                type: 'object',
                properties: {
                  size: { type: 'integer' },
                  color: { type: 'string' },
                },
              },
            },
          };
        }
      };

      Item.knex(knex);
    });

    beforeEach(async () => {
      await knex('field_expression_keys').delete();
      await knex('field_expression_keys').insert({
        id: 1,
        'ns:name': 'a',
        ...(session.isPostgres() ? { meta: JSON.stringify({ size: 1 }) } : {}),
      });
    });

    it('patch() should write a declared key with a colon to its column', async () => {
      await Item.query().patch({ 'ns:name': 'b' }).where('id', 1);
      const item = await Item.query().findById(1);
      expect(item['ns:name']).to.equal('b');
    });

    it('update() should write a declared key with a colon to its column', async () => {
      await Item.query().update({ id: 1, 'ns:name': 'c' }).where('id', 1);
      const item = await Item.query().findById(1);
      expect(item['ns:name']).to.equal('c');
    });

    it('update() should write a declared key with a colon given as a query property', async () => {
      await Item.query()
        .update({ id: 1, 'ns:name': raw('?', 'q') })
        .where('id', 1);
      const item = await Item.query().findById(1);
      expect(item['ns:name']).to.equal('q');
    });

    it('patch() should write a declared key with a colon mapped by snakeCaseMappers', async () => {
      class SnakeCaseItem extends Item {
        static get columnNameMappers() {
          return snakeCaseMappers();
        }

        static get jsonSchema() {
          return {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              'ns:foo_bar': { type: 'string' },
            },
          };
        }
      }

      await SnakeCaseItem.query().patch({ 'ns:foo_bar': 'b' }).where('id', 1);
      const row = await knex('field_expression_keys').where('id', 1).first();
      expect(row['ns:foo_bar']).to.equal('b');
    });

    it('patch() should not parse the keys with a colon as database json', async () => {
      class StrictItem extends Item {
        $parseDatabaseJson() {
          throw new Error('unexpected $parseDatabaseJson() call');
        }
      }

      await StrictItem.query().patch({ 'ns:name': 'b' }).where('id', 1);
      const item = await Item.query().findById(1);
      expect(item['ns:name']).to.equal('b');
    });

    if (session.isPostgres()) {
      it('patch() should write an undeclared key with a colon to the json path', async () => {
        await Item.query().patch({ 'ns:name': 'd', 'meta:color': 'red' }).where('id', 1);
        const item = await Item.query().findById(1);
        expect(item['ns:name']).to.equal('d');
        expect(item.meta).to.eql({ size: 1, color: 'red' });
      });

      it('update() should write an undeclared key with a query property to the json path', async () => {
        await Item.query()
          .update({ id: 1, 'ns:name': 'e', 'meta:color': ref('id') })
          .where('id', 1);
        const item = await Item.query().findById(1);
        expect(item.meta).to.eql({ size: 1, color: 1 });
      });

      it('patch() should not parse the keys of models without a schema as database json', async () => {
        class SchemalessItem extends Model {
          static get tableName() {
            return 'field_expression_keys';
          }

          $parseDatabaseJson() {
            throw new Error('unexpected $parseDatabaseJson() call');
          }
        }

        await SchemalessItem.query(knex).patch({ 'meta:color': 'blue' }).where('id', 1);
        const row = await knex('field_expression_keys').where('id', 1).first();
        expect(row.meta).to.eql({ size: 1, color: 'blue' });
      });
    }
  });
};
