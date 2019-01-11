const expect = require('expect.js');
const { Model } = require('../../../');

module.exports = session => {
  describe('upsertGraph with compound key in relation #517', () => {
    let knex = session.knex;
    let Users;
    let Preferences;

    before(() => {
      return knex.schema
        .dropTableIfExists('Users')
        .dropTableIfExists('Preferences')
        .createTable('Users', table => {
          table.integer('id').primary();
        })
        .createTable('Preferences', table => {
          table.integer('userId');
          table.string('category', 16);
          table.string('setting');
          table.primary(['userId', 'category']);
        });
    });

    after(() => {
      return knex.schema.dropTableIfExists('Preferences').dropTableIfExists('Users');
    });

    before(() => {
      Users = class Users extends Model {
        static get tableName() {
          return 'Users';
        }

        static get relationMappings() {
          return {
            preferences: {
              relation: Model.HasManyRelation,
              modelClass: Preferences,
              join: {
                from: 'Preferences.userId',
                to: 'Users.id'
              }
            }
          };
        }
      };

      Preferences = class Preferences extends Model {
        static get tableName() {
          return 'Preferences';
        }

        static get idColumn() {
          return ['userId', 'category'];
        }
      };

      Users.knex(knex);
      Preferences.knex(knex);
    });

    before(() => {
      return Users.query().insert({
        id: 1
      });
    });

    it('test', () => {
      const preferences = [
        {
          category: 'sms',
          setting: 'off'
        },
        {
          category: 'sound',
          setting: 'off'
        }
      ];

      return Users.query()
        .upsertGraph({ id: 1, preferences }, { insertMissing: true })
        .then(() => {
          return Users.query()
            .eager('preferences')
            .modifyEager('preferences', qb => qb.orderBy('category'));
        })
        .then(users => {
          expect(users).to.eql([
            {
              id: 1,

              preferences: [
                {
                  category: 'sms',
                  setting: 'off',
                  userId: 1
                },
                {
                  category: 'sound',
                  setting: 'off',
                  userId: 1
                }
              ]
            }
          ]);
        });
    });
  });
};
