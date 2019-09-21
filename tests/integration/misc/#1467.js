const { Model, snakeCaseMappers } = require('../../../');
const chai = require('chai');

module.exports = session => {
  describe('Not CamelCasing ref.column #1467', () => {
    let knex = session.knex;
    let Campaign, Deliverable;

    beforeEach(() => {
      const { knex } = session;

      return Promise.resolve()
        .then(() => knex.schema.dropTableIfExists('cogs'))
        .then(() => knex.schema.dropTableIfExists('campaigns'))
        .then(() => knex.schema.dropTableIfExists('deliverables'))
        .then(() => {
          return knex.schema
            .createTable('campaigns', table => {
              table.increments('id').primary();
            })
            .createTable('deliverables', table => {
              table.increments('id').primary();
            })
            .createTable('cogs', table => {
              table.increments('id').primary();
              table
                .integer('campaign_id')
                .unsigned()
                .references('id')
                .inTable('campaigns');
              table
                .integer('deliverable_id')
                .unsigned()
                .references('id')
                .inTable('deliverables');
            });
        });
    });

    afterEach(() => {
      return Promise.resolve()
        .then(() => knex.schema.dropTableIfExists('cogs'))
        .then(() => knex.schema.dropTableIfExists('campaigns'))
        .then(() => knex.schema.dropTableIfExists('deliverables'));
    });

    beforeEach(() => {
      Campaign = class Campaign extends Model {
        static get tableName() {
          return 'campaigns';
        }

        static get columnNameMappers() {
          return snakeCaseMappers();
        }

        static get jsonSchema() {
          return {
            type: 'object',
            properties: {
              id: { type: 'integer' }
            },
            additionalProperties: false
          };
        }

        static get relationMappings() {
          return {
            cogs: {
              relation: Model.HasManyRelation,
              modelClass: Cog,
              join: {
                from: 'campaigns.id',
                to: 'cogs.campaign_id'
              }
            }
          };
        }
      };

      class Cog extends Model {
        static get tableName() {
          return 'cogs';
        }

        static get columnNameMappers() {
          return snakeCaseMappers();
        }

        static get jsonSchema() {
          return {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              campaignId: { type: ['integer', 'null'] },
              deliverableId: { type: ['integer', 'null'] }
            },
            additionalProperties: false
          };
        }

        static get relationMappings() {
          return {};
        }
      }

      Deliverable = class Deliverable extends Model {
        static get tableName() {
          return 'deliverables';
        }

        static get columnNameMappers() {
          return snakeCaseMappers();
        }

        static get jsonSchema() {
          return {
            type: 'object',
            properties: {
              id: { type: 'integer' }
            },
            additionalProperties: false
          };
        }

        static get relationMappings() {
          return {
            cogs: {
              relation: Model.HasManyRelation,
              modelClass: Cog,
              join: {
                from: 'deliverables.id',
                to: 'cogs.deliverable_id'
              }
            }
          };
        }
      };

      Campaign.knex(session.knex);
      Deliverable.knex(session.knex);
    });

    it('test', () => {
      return Promise.resolve()
        .then(() => {
          return Promise.all([
            Campaign.query().insertGraph({}),
            Deliverable.query().insertGraph({})
          ]);
        })
        .then(([campaign, deliverable]) => {
          return Promise.resolve()
            .then(() => {
              return Campaign.query().upsertGraph(
                { id: campaign.id, cogs: [{ deliverableId: deliverable.id }] },
                { relate: ['cogs'], unrelate: ['cogs'] }
              );
            })
            .then(() => {
              return Campaign.query()
                .findOne({})
                .eager('cogs');
            })
            .then(c1 => {
              chai.expect(c1.cogs.length).to.equal(1);
            })
            .then(() => {
              return Campaign.query().upsertGraph(
                { id: campaign.id, cogs: [] },
                { relate: ['cogs'], unrelate: ['cogs'] }
              );
            })
            .then(() => {
              return Campaign.query()
                .findOne({})
                .eager('cogs');
            })
            .then(c2 => {
              chai.expect(c2.cogs.length).to.equal(0);
            })
            .then(() => {
              return Deliverable.query().upsertGraph(
                { id: deliverable.id, cogs: [{ campaignId: campaign.id }] },
                { relate: ['cogs'], unrelate: ['cogs'] }
              );
            })
            .then(() => {
              return Deliverable.query()
                .findOne({})
                .eager('cogs');
            })
            .then(d1 => {
              chai.expect(d1.cogs.length).to.equal(1);
            })
            .then(() => {
              return Deliverable.query().upsertGraph(
                { id: deliverable.id, cogs: [] },
                { relate: ['cogs'], unrelate: ['cogs'] }
              );
            })
            .then(() => {
              return Deliverable.query()
                .findOne({})
                .eager('cogs');
            })
            .then(d2 => {
              chai.expect(d2.cogs.length).to.equal(0);
            });
        });
    });
  });
};
