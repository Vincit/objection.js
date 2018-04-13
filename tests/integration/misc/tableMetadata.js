const expect = require('expect.js');
const Model = require('../../../').Model;
const mockKnexFactory = require('../../../testUtils/mockKnex');

module.exports = session => {
  describe('tableMetadata', () => {
    let knex;
    let queries = [];
    let Table1;
    let UnboundTable1;
    let OverriddenTable1;

    before(() => {
      return session.knex.schema.dropTableIfExists('table1').createTable('table1', table => {
        table.increments('id').primary();
        table.integer('relId');
        table.string('value');
      });
    });

    before(() => {
      knex = mockKnexFactory(session.knex, function(mock, oldImpl, args) {
        queries.push(this.toString());
        return oldImpl.apply(this, args);
      });
    });

    after(() => {
      return Promise.all([session.knex.schema.dropTableIfExists('table1')]);
    });

    beforeEach(() => {
      Table1 = class Table1 extends Model {
        static get tableName() {
          return 'table1';
        }
      };

      OverriddenTable1 = class OverriddenTable1 extends Model {
        static get tableName() {
          return 'table1';
        }

        static get jsonSchema() {
          return {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              relId: { type: 'integer' },
              value: { type: 'string' }
            }
          };
        }

        static tableMetadata() {
          return {
            columns: Object.keys(this.jsonSchema.properties)
          };
        }

        static get relationMappings() {
          return {
            rel: {
              relation: Model.BelongsToOneRelation,
              modelClass: OverriddenTable1,
              join: {
                from: 'table1.relId',
                to: 'table1.id'
              }
            }
          };
        }
      };

      UnboundTable1 = Table1;
      Table1 = Table1.bindKnex(knex);
      queries = [];
    });

    it('should fetch metadata', () => {
      return Promise.all([
        Table1.fetchTableMetadata(),
        Table1.fetchTableMetadata(),
        Table1.fetchTableMetadata(),
        Table1.fetchTableMetadata()
      ])
        .then(metadatas => {
          // Only one query should have been generated.
          expect(queries).to.have.length(1);

          metadatas.forEach(metadata => {
            expect(metadata.columns).to.eql(['id', 'relId', 'value']);
            expect(metadata === metadatas[0]).to.equal(true);
          });

          expect(Table1.tableMetadata()).to.eql({
            columns: ['id', 'relId', 'value']
          });

          return Table1.fetchTableMetadata();
        })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          // Cache should be used the second time.
          expect(queries).to.have.length(1);

          return Table1.fetchTableMetadata({ force: true });
        })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          // Cache should be ignored if `force = true`.
          expect(queries).to.have.length(2);
        });
    });

    it('should accept knex instance as an argument', () => {
      return UnboundTable1.fetchTableMetadata({ knex })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          // Only one query should have been generated.
          expect(queries).to.have.length(1);

          return Table1.fetchTableMetadata({ knex });
        })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          // Cache should be used the second time.
          expect(queries).to.have.length(1);

          return Table1.fetchTableMetadata({ knex, force: true });
        })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          // Cache should be ignored if `force = true`.
          expect(queries).to.have.length(2);
        });
    });

    it('should accept knex instance as an argument', () => {
      return UnboundTable1.fetchTableMetadata({ knex })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          // Only one query should have been generated.
          expect(queries).to.have.length(1);

          return Table1.fetchTableMetadata({ knex });
        })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          // Cache should be used the second time.
          expect(queries).to.have.length(1);

          return Table1.fetchTableMetadata({ knex, force: true });
        })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          // Cache should be ignored if `force = true`.
          expect(queries).to.have.length(2);
        });
    });

    it('fetchTableMetadata should use tableMetadata function if overridden', () => {
      return OverriddenTable1.fetchTableMetadata()
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          expect(queries).to.have.length(0);
          return OverriddenTable1.fetchTableMetadata();
        })
        .then(metadata => {
          expect(metadata.columns).to.eql(['id', 'relId', 'value']);
          expect(queries).to.have.length(0);
        });
    });

    it('joinEager should work with overridden tableMetadata', () => {
      const metadata = OverriddenTable1.tableMetadata();

      expect(metadata).to.eql({
        columns: ['id', 'relId', 'value']
      });

      return OverriddenTable1.query(knex)
        .insertGraph({
          value: '1',
          rel: {
            value: '2',
            rel: {
              value: '3'
            }
          }
        })
        .then(() => {
          return OverriddenTable1.query(knex)
            .joinEager('rel.rel')
            .where('table1.value', '1')
            .pick(['value', 'rel']);
        })
        .then(res => {
          if (session.isPostgres()) {
            expect(queries[queries.length - 1]).to.eql(
              `select "table1"."id" as "id", "table1"."relId" as "relId", "table1"."value" as "value", "rel"."id" as "rel:id", "rel"."relId" as "rel:relId", "rel"."value" as "rel:value", "rel:rel"."id" as "rel:rel:id", "rel:rel"."relId" as "rel:rel:relId", "rel:rel"."value" as "rel:rel:value" from "table1" left join "table1" as "rel" on "rel"."id" = "table1"."relId" left join "table1" as "rel:rel" on "rel:rel"."id" = "rel"."relId" where "table1"."value" = '1'`
            );
          }

          expect(res).to.eql([
            {
              value: '1',
              rel: {
                value: '2',
                rel: {
                  value: '3'
                }
              }
            }
          ]);
        });
    });
  });
};
