const expect = require('expect.js');
const Promise = require('bluebird');
const Model = require('../../').Model;

module.exports = session => {
  // TODO igor PR test

  if (session.isPostgres()) {
    describe('table names with postgres schema', () => {
      class Person extends Model {
        static get tableName() {
          return 'public.Person';
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Animal,
              join: {
                from: 'public.Person.id',
                to: 'public.Animal.ownerId'
              }
            }
          };
        }
      }

      class Animal extends Model {
        static get tableName() {
          return 'public.Animal';
        }
      }

      before(() => {
        return session.knex.schema
          .dropTableIfExists('Animal')
          .dropTableIfExists('Person')
          .createTable('Person', table => {
            table.increments('id').primary();
            table.string('name');
          })
          .createTable('Animal', table => {
            table.increments('id').primary();
            table.string('name');
            table.integer('ownerId').references('Person.id');
          });
      });

      after(() => {
        return session.knex.schema.dropTableIfExists('Animal').dropTableIfExists('Person');
      });

      beforeEach(() => {
        const knex = session.knex;

        return Promise.coroutine(function*() {
          yield Animal.query(knex).delete();
          yield Person.query(knex).delete();
          yield Person.query(knex).insertGraph({
            id: 1,
            name: 'Arnold',

            pets: [
              {
                id: 1,
                name: 'Fluffy'
              }
            ]
          });
        })();
      });

      it('simple find query', () => {
        return Person.query(session.knex).then(people => {
          expect(people).to.eql([
            {
              id: 1,
              name: 'Arnold'
            }
          ]);
        });
      });

      it('join eager', () => {
        return Person.query(session.knex)
          .joinEager('pets')
          .then(people => {
            expect(people).to.eql([
              {
                id: 1,
                name: 'Arnold',

                pets: [
                  {
                    id: 1,
                    name: 'Fluffy',
                    ownerId: 1
                  }
                ]
              }
            ]);
          });
      });

      it('columnInfo', () => {
        return Person.query(session.knex)
          .columnInfo()
          .then(info => {
            expect(info instanceof Model).to.equal(false);
            expect(info).to.eql({
              id: {
                type: 'integer',
                maxLength: null,
                nullable: false,
                defaultValue: `nextval('"Person_id_seq"'::regclass)`
              },
              name: {
                type: 'character varying',
                maxLength: 255,
                nullable: true,
                defaultValue: null
              }
            });
          });
      });
    });

    describe('related tables across non-public postgres schemas', () => {
      class Person extends Model {
        static get tableName() {
          return 'homoSapiens.Person';
        }

        static get relationMappings() {
          return {
            pets: {
              relation: Model.HasManyRelation,
              modelClass: Animal,
              join: {
                from: 'homoSapiens.Person.id',
                to: 'canisFamiliar.Animal.ownerId'
              }
            }
          };
        }
      }

      class Animal extends Model {
        static get tableName() {
          return 'canisFamiliar.Animal';
        }

        static get relationMappings() {
          return {
            owner: {
              relation: Model.BelongsToOneRelation,
              modelClass: Person,
              join: {
                from: 'canisFamiliar.Animal.ownerId',
                to: 'homoSapiens.Person.id'
              }
            }
          };
        }
      }

      before(() => {
        return session.knex.schema
          .createSchema('homoSapiens')
          .then(() => {
            return session.knex.schema.createSchema('canisFamiliar');
          })
          .then(() => {
            return session.knex.schema
              .withSchema('homoSapiens')
              .dropTableIfExists('Person')
              .createTable('Person', table => {
                table.increments('id').primary();
                table.string('name');
              });
          })
          .then(() => {
            return session.knex.schema
              .withSchema('canisFamiliar')
              .dropTableIfExists('Animal')
              .createTable('Animal', table => {
                table.increments('id').primary();
                table.string('name');
                table
                  .integer('ownerId')
                  .references('id')
                  .inTable('homoSapiens.Person');
              });
          });
      });

      after(() => {
        return session.knex.schema
          .withSchema('canisFamiliar')
          .dropTableIfExists('Animal')
          .then(() => {
            return session.knex.schema.withSchema('homoSapiens').dropTableIfExists('Person');
          })
          .then(() => {
            return session.knex.schema.dropSchema('canisFamiliar');
          })
          .then(() => {
            return session.knex.schema.dropSchema('homoSapiens');
          });
      });

      beforeEach(() => {
        const knex = session.knex;

        return Promise.coroutine(function*() {
          yield Animal.query(knex).delete();
          yield Person.query(knex).delete();
          yield Person.query(knex).insertGraph({
            id: 1,
            name: 'Arnold',

            pets: [
              {
                id: 1,
                name: 'Fluffy'
              }
            ]
          });
        })();
      });

      it('simple find query (parent)', () => {
        return Person.query(session.knex).then(people => {
          expect(people).to.eql([
            {
              id: 1,
              name: 'Arnold'
            }
          ]);
        });
      });

      it('simple find query (child)', () => {
        return Animal.query(session.knex).then(animals => {
          expect(animals).to.eql([
            {
              id: 1,
              name: 'Fluffy',
              ownerId: 1
            }
          ]);
        });
      });

      it('join eager', () => {
        return Person.query(session.knex)
          .joinEager('pets')
          .then(people => {
            expect(people).to.eql([
              {
                id: 1,
                name: 'Arnold',

                pets: [
                  {
                    id: 1,
                    name: 'Fluffy',
                    ownerId: 1
                  }
                ]
              }
            ]);
          });
      });

      it('join eager (inverse)', () => {
        return Animal.query(session.knex)
          .joinEager('owner')
          .then(animals => {
            expect(animals).to.eql([
              {
                id: 1,
                name: 'Fluffy',
                ownerId: 1,

                owner: {
                  id: 1,
                  name: 'Arnold'
                }
              }
            ]);
          });
      });

      it('columnInfo', () => {
        return Person.query(session.knex)
          .columnInfo()
          .then(info => {
            expect(info instanceof Model).to.equal(false);
            expect(info).to.eql({
              id: {
                type: 'integer',
                maxLength: null,
                nullable: false,
                defaultValue: `nextval('"homoSapiens"."Person_id_seq"'::regclass)`
              },
              name: {
                type: 'character varying',
                maxLength: 255,
                nullable: true,
                defaultValue: null
              }
            });
          });
      });
    });
  }
};
