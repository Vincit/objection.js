const { Model, transaction } = require('../../../');
const expect = require('expect.js');

module.exports = session => {
  describe('UpsertGraph deletes rows for relation which is not mentioned in graph #1455', () => {
    let knex = session.knex;
    let Role;

    beforeEach(() => {
      const { knex } = session;

      return knex.schema
        .dropTableIfExists('roles')
        .then(() => knex.schema.dropTableIfExists('sets'))
        .then(() => knex.schema.dropTableIfExists('setsAttributes'))
        .then(() => {
          return knex.schema.createTable('roles', table => {
            table.increments();
            table.string('name').notNullable();
          });
        })
        .then(() => {
          return knex.schema.createTable('sets', table => {
            table.increments();
            table.string('name').notNullable();
            table
              .integer('roleId')
              .unsigned()
              .notNullable();
          });
        })
        .then(() => {
          return knex.schema.createTable('setsAttributes', table => {
            table.increments();
            table.string('name').notNullable();
            table
              .integer('setId')
              .unsigned()
              .notNullable();
          });
        });
    });

    afterEach(() => {
      return knex.schema
        .dropTableIfExists('roles')
        .then(() => knex.schema.dropTableIfExists('sets'))
        .then(() => knex.schema.dropTableIfExists('setsAttributes'));
    });

    beforeEach(() => {
      const { knex } = session;

      class BaseModel extends Model {
        static get useLimitInFirst() {
          return true;
        }

        static get concurrency() {
          return 1;
        }
      }

      class SetAttribute extends BaseModel {
        static get tableName() {
          return 'setsAttributes';
        }
      }

      class Set extends BaseModel {
        static get tableName() {
          return 'sets';
        }

        static get relationMappings() {
          return {
            setAttributes: {
              relation: BaseModel.HasManyRelation,
              modelClass: SetAttribute,
              join: { from: 'sets.id', to: 'setsAttributes.setId' }
            }
          };
        }
      }

      Role = class Role extends BaseModel {
        static get tableName() {
          return 'roles';
        }

        static get relationMappings() {
          return {
            sets: {
              relation: BaseModel.HasManyRelation,
              modelClass: Set,
              join: { from: 'roles.id', to: 'sets.roleId' }
            }
          };
        }
      };

      BaseModel.knex(knex);
    });

    it('test', () => {
      return transaction(Role.knex(), trx =>
        Role.query(trx).insertGraph({
          name: 'First Role',
          sets: [
            {
              name: 'First Set',
              setAttributes: [{ name: 'First SetAttribute' }, { name: 'Second SetAttribute' }]
            }
          ]
        })
      )
        .then(role => {
          return transaction(Role.knex(), trx =>
            Role.query(trx).upsertGraph({
              id: role.id,
              sets: [
                { id: role.sets[0].id },
                {
                  name: 'Second Set',
                  setAttributes: [{ name: 'First SetAttribute' }, { name: 'Second SetAttribute' }]
                }
              ]
            })
          );
        })
        .then(() => {
          return Role.query()
            .first()
            .eager('sets(orderById).setAttributes(orderById)', {
              orderById(query) {
                query.orderBy('id');
              }
            });
        })
        .then(setsAfterUpsertGraph => {
          expect(setsAfterUpsertGraph).to.eql({
            id: 1,
            name: 'First Role',
            sets: [
              {
                id: 1,
                name: 'First Set',
                roleId: 1,

                setAttributes: [
                  { id: 1, name: 'First SetAttribute', setId: 1 },
                  { id: 2, name: 'Second SetAttribute', setId: 1 }
                ]
              },
              {
                id: 2,
                name: 'Second Set',
                roleId: 1,

                setAttributes: [
                  { id: 3, name: 'First SetAttribute', setId: 2 },
                  { id: 4, name: 'Second SetAttribute', setId: 2 }
                ]
              }
            ]
          });
        });
    });
  });
};
