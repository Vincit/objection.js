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
  }
};
