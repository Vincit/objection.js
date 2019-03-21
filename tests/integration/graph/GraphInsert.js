const mockKnexFactory = require('../../../testUtils/mockKnex');

const { expect } = require('chai');
const { Model, raw } = require('../../../');
const { ModelGraph } = require('../../../lib/model/graph/ModelGraph');
const { GraphInsert } = require('../../../lib/queryBuilder/graph/insert/GraphInsert');
const { GraphOptions } = require('../../../lib/queryBuilder/graph/GraphOptions');
const { asArray } = require('../../../lib/utils/objectUtils');

module.exports = session => {
  const ID_NOT_IN_DB = 1000000;

  describe('GraphInsert tests', () => {
    let Pet = null;
    let Person = null;
    let mockKnex = null;
    let numExecutedQueries = 0;

    before(createSchema);
    beforeEach(createModels);
    beforeEach(() => {
      return session
        .knex('relatives')
        .delete()
        .then(() => session.knex('pets').delete())
        .then(() => session.knex('persons').delete());
    });

    after(dropSchema);

    it('should insert one object', () => {
      return test({
        modelClass: Person,

        graphIn: {
          name: 'Brad'
        },

        queryOut: query => query,

        graphOut: [
          {
            name: 'Brad'
          }
        ],

        postgresNumQueries: 1
      });
    });

    it('should insert nested relations', () => {
      return test({
        modelClass: Person,

        graphIn: [
          {
            '#id': 'matti',
            name: 'Matti',

            pets: [
              {
                name: 'Mooses',

                favoritePerson: {
                  '#ref': 'matti'
                }
              },
              {
                name: 'Sara',

                favoritePerson: {
                  name: 'Liisa',

                  relatives: [
                    {
                      '#ref': 'sami'
                    },
                    {
                      '#ref': 'marika'
                    }
                  ]
                }
              }
            ],

            relatives: [
              {
                '#id': 'sami',
                name: 'Sami',
                isChild: true
              },
              {
                '#id': 'marika',
                name: 'Marika',
                isChild: true
              },
              {
                name: 'Samuel',

                relatives: [
                  {
                    '#ref': 'anja',
                    isChild: true
                  }
                ]
              }
            ]
          },
          {
            '#id': 'anja',
            name: 'Anja',

            relatives: [
              {
                name: 'Marjukka',
                isChild: true
              }
            ]
          }
        ],

        queryOut: query =>
          query
            .eager(
              '[pets.favoritePerson.relatives(orderByName), relatives(orderByName).relatives(orderByName)]'
            )
            .whereIn('name', ['Matti', 'Anja'])
            .orderBy('name'),

        graphOut: [
          {
            name: 'Matti',

            pets: [
              {
                name: 'Mooses',

                favoritePerson: {
                  name: 'Matti'
                }
              },
              {
                name: 'Sara',

                favoritePerson: {
                  name: 'Liisa',

                  relatives: [
                    {
                      name: 'Marika'
                    },
                    {
                      name: 'Sami'
                    }
                  ]
                }
              }
            ],

            relatives: [
              {
                name: 'Marika',
                isChild: true
              },
              {
                name: 'Sami',
                isChild: true
              },
              {
                name: 'Samuel',
                isChild: false,

                relatives: [
                  {
                    name: 'Anja',
                    isChild: true
                  }
                ]
              }
            ]
          },
          {
            name: 'Anja',

            relatives: [
              {
                name: 'Marjukka',
                isChild: true
              }
            ]
          }
        ],

        postgresNumQueries: 3
      });
    });

    describe('references inside (nested) properties', () => {
      it('should resolve references inside properties', () => {
        return test({
          modelClass: Person,

          graphIn: {
            '#id': 'liisa',
            name: 'Liisa',

            data: {
              someNumber: 42
            },

            pets: [
              {
                name: 'Sara #ref{liisa.data.someNumber}'
              }
            ],

            relatives: [
              {
                name: 'Sami',

                data: {
                  motherName: '#ref{liisa.name}',
                  someNumber: '#ref{liisa.data.someNumber}'
                }
              }
            ]
          },

          queryOut: query => query.where('name', 'Liisa').eager('[relatives, pets]'),

          graphOut: [
            {
              name: 'Liisa',

              pets: [
                {
                  name: 'Sara 42'
                }
              ],

              relatives: [
                {
                  name: 'Sami',

                  data: {
                    motherName: 'Liisa',
                    someNumber: 42
                  }
                }
              ]
            }
          ],

          postgresNumQueries: 4
        });
      });
    });

    describe('with existing graph', () => {
      let matti;
      let sami;

      beforeEach(() => {
        return Person.query()
          .insert({ name: 'Matti' })
          .then(model => {
            matti = model;

            return Promise.all([
              matti
                .$relatedQuery('relatives')
                .insert({ name: 'Sami', isChild: true })
                .then(model => {
                  sami = model;
                })
            ]);
          });
      });

      it("should only insert rows that don't exists in db", () => {
        return test({
          modelClass: Person,

          graphIn: {
            id: matti.id,

            relatives: [
              {
                id: sami.id
              },
              {
                name: 'Marika'
              }
            ],

            pets: [
              {
                name: 'Mooses',

                favoritePerson: {
                  '#dbRef': matti.id
                }
              }
            ]
          },

          queryOut: query => query.eager('[relatives, pets.favoritePerson]').findById(matti.id),

          graphOut: {
            id: matti.id,

            relatives: [
              {
                id: sami.id,
                isChild: true,
                isParent: false
              },
              {
                name: 'Marika'
              }
            ],

            pets: [
              {
                name: 'Mooses',

                favoritePerson: {
                  id: matti.id,
                  name: 'Matti'
                }
              }
            ]
          },

          postgresNumQueries: 3
        });
      });
    });

    describe('belongs to one relation', () => {
      it('should insert one object in a belongs to one relation', () => {
        return test({
          modelClass: Pet,

          graphIn: {
            name: 'Doggo',

            favoritePerson: {
              name: 'Brad'
            }
          },

          queryOut: query => query.eager('favoritePerson'),

          graphOut: [
            {
              name: 'Doggo',

              favoritePerson: {
                name: 'Brad'
              }
            }
          ],

          postgresNumQueries: 2
        });
      });

      it('should insert one object in a belongs to one relation with existing identifiers', () => {
        return test({
          modelClass: Pet,

          graphIn: {
            id: 1,
            name: 'Doggo',

            favoritePerson: {
              id: 1,
              name: 'Brad'
            }
          },

          queryOut: query => query.eager('favoritePerson'),

          graphOut: [
            {
              id: 1,
              name: 'Doggo',

              favoritePerson: {
                id: 1,
                name: 'Brad'
              }
            }
          ],

          postgresNumQueries: 2
        });
      });

      it('should insert belongs to one relation using #ref', () => {
        return test({
          modelClass: Person,

          graphIn: {
            '#id': 'brad',
            name: 'Brad',

            pets: [
              {
                name: 'Doggo',

                favoritePerson: {
                  '#ref': 'brad'
                }
              }
            ]
          },

          queryOut: query => query.eager('pets.favoritePerson'),

          graphOut: [
            {
              name: 'Brad',

              pets: [
                {
                  name: 'Doggo',

                  favoritePerson: {
                    name: 'Brad'
                  }
                }
              ]
            }
          ],

          postgresNumQueries: 2,

          check(graph) {
            expect(graph[0].id).to.equal(graph[0].pets[0].favoritePerson.id);
          }
        });
      });

      describe('should relate belongs to one relation using `relate` option', () => {
        beforeEach(() => {
          return Person.query().insert({
            id: ID_NOT_IN_DB,
            name: 'Brad'
          });
        });

        it('should relate belongs to one relation using `relate: ["relation.path"]` option', () => {
          return test({
            modelClass: Pet,

            graphIn: {
              name: 'Doggo',

              favoritePerson: {
                id: ID_NOT_IN_DB
              }
            },

            graphOptions: {
              relate: ['favoritePerson']
            },

            queryOut: query => query.eager('favoritePerson'),

            graphOut: [
              {
                name: 'Doggo',

                favoritePerson: {
                  name: 'Brad'
                }
              }
            ],

            postgresNumQueries: 1
          });
        });

        it('should relate belongs to one relation using `relate: true` option', () => {
          return test({
            modelClass: Pet,

            graphIn: {
              name: 'Doggo',

              favoritePerson: {
                id: ID_NOT_IN_DB
              }
            },

            graphOptions: {
              relate: true
            },

            queryOut: query => query.eager('favoritePerson'),

            graphOut: [
              {
                name: 'Doggo',

                favoritePerson: {
                  name: 'Brad'
                }
              }
            ],

            postgresNumQueries: 1
          });
        });
      });

      describe('should relate belongs to one relation using #dbRef', () => {
        beforeEach(() => {
          return Person.query().insert({
            id: ID_NOT_IN_DB,
            name: 'Brad'
          });
        });

        it('should insert belongs to one relation with #dbRef', () => {
          return test({
            modelClass: Pet,

            graphIn: {
              name: 'Doggo',

              favoritePerson: {
                '#dbRef': ID_NOT_IN_DB
              }
            },

            queryOut: query => query.eager('favoritePerson'),

            graphOut: [
              {
                name: 'Doggo',

                favoritePerson: {
                  name: 'Brad'
                }
              }
            ],

            postgresNumQueries: 1
          });
        });
      });
    });

    describe('many to many relation', () => {
      it('should insert objects in a many to many relation', () => {
        return test({
          modelClass: Person,

          graphIn: {
            name: 'Brad',

            relatives: [
              {
                name: 'Nick'
              },
              {
                name: 'Sandra'
              }
            ]
          },

          queryOut: query => query.eager('relatives').where('name', 'Brad'),

          graphOut: [
            {
              name: 'Brad',

              relatives: [
                {
                  name: 'Nick',
                  isFriend: false
                },
                {
                  name: 'Sandra',
                  isChild: false
                }
              ]
            }
          ],

          postgresNumQueries: 2
        });
      });

      it('should insert objects in a many to many relation with existing ids', () => {
        return test({
          modelClass: Person,

          graphIn: {
            id: 1,
            name: 'Brad',

            relatives: [
              {
                id: 2,
                name: 'Nick'
              },
              {
                id: 3,
                name: 'Sandra'
              }
            ]
          },

          queryOut: query => query.eager('relatives').where('name', 'Brad'),

          graphOut: [
            {
              id: 1,
              name: 'Brad',

              relatives: [
                {
                  id: 2,
                  name: 'Nick',
                  isFriend: false
                },
                {
                  id: 3,
                  name: 'Sandra',
                  isChild: false
                }
              ]
            }
          ],

          postgresNumQueries: 2
        });
      });

      it('should insert objects in a many to many relation with extra properties', () => {
        return test({
          modelClass: Person,

          graphIn: {
            name: 'Brad',

            relatives: [
              {
                name: 'Nick',
                isFriend: raw('1 = 1')
              },
              {
                name: 'Sandra',
                isChild: true
              }
            ]
          },

          queryOut: query => query.eager('relatives').where('name', 'Brad'),

          graphOut: [
            {
              name: 'Brad',

              relatives: [
                {
                  name: 'Nick',
                  isFriend: true,
                  isChild: false
                },
                {
                  name: 'Sandra',
                  isChild: true
                }
              ]
            }
          ],

          postgresNumQueries: 2
        });
      });

      it('should execute beforeInsert hooks for many to many relations', () => {
        return test({
          modelClass: Person,

          graphIn: {
            name: 'Brad',
            data: { foo: 'bar' },

            relatives: [
              {
                name: 'Nick'
              },
              {
                name: 'Sandra',
                isChild: true
              }
            ]
          },

          queryOut: query => query.eager('relatives').where('name', 'Brad'),

          graphOut: [
            {
              name: 'Brad',
              data: { foo: 'bar' },

              relatives: [
                {
                  name: 'Nick',
                  isFriend: false,
                  isChild: false,
                  isParent: true,
                  data: {}
                },
                {
                  name: 'Sandra',
                  isChild: true,
                  // These are set by the beforeInsert hooks.
                  isParent: false,
                  data: {}
                }
              ]
            }
          ],

          postgresNumQueries: 2
        });
      });

      describe('should insert an object using #ref', () => {
        it('should insert an object using #ref', () => {
          return test({
            modelClass: Person,

            graphIn: {
              '#id': 'brad',
              name: 'Brad',

              relatives: [
                {
                  name: 'Nick',
                  isFriend: raw('1 = 1')
                },
                {
                  '#ref': 'brad',
                  isChild: true
                }
              ]
            },

            queryOut: query => query.eager('relatives(orderById)').where('name', 'Brad'),

            graphOut: [
              {
                name: 'Brad',

                relatives: [
                  {
                    name: 'Nick',
                    isFriend: true
                  },
                  {
                    name: 'Brad',
                    isChild: true
                  }
                ]
              }
            ],

            postgresNumQueries: 2,

            check(graphOut) {
              expect(graphOut[0].id).to.equal(graphOut[0].relatives[0].id);
            }
          });
        });
      });

      describe('should relate an object using #dbRef', () => {
        beforeEach(() => {
          return Person.query().insert({
            id: ID_NOT_IN_DB,
            name: 'Vlad'
          });
        });

        it('should relate an object using #dbRef', () => {
          return test({
            modelClass: Person,

            graphIn: {
              name: 'Brad',

              relatives: [
                {
                  '#dbRef': ID_NOT_IN_DB,
                  isFriend: raw('1 = 1')
                },
                {
                  name: 'Sandra',
                  isChild: true
                }
              ]
            },

            queryOut: query => query.eager('relatives(orderById)').where('name', 'Brad'),

            graphOut: [
              {
                name: 'Brad',

                relatives: [
                  {
                    id: ID_NOT_IN_DB,
                    name: 'Vlad',
                    isFriend: true
                  },
                  {
                    name: 'Sandra',
                    isChild: true
                  }
                ]
              }
            ],

            postgresNumQueries: 2
          });
        });

        it('should relate an object using `relate: ["relation.path"]` option', () => {
          return test({
            modelClass: Person,

            graphIn: {
              name: 'Brad',

              relatives: [
                {
                  id: ID_NOT_IN_DB,
                  isFriend: raw('1 = 1')
                },
                {
                  name: 'Sandra',
                  isChild: true
                }
              ]
            },

            graphOptions: {
              relate: ['relatives']
            },

            queryOut: query => query.eager('relatives(orderById)').where('name', 'Brad'),

            graphOut: [
              {
                name: 'Brad',

                relatives: [
                  {
                    id: ID_NOT_IN_DB,
                    name: 'Vlad',
                    isFriend: true
                  },
                  {
                    name: 'Sandra',
                    isChild: true
                  }
                ]
              }
            ],

            postgresNumQueries: 2
          });
        });

        it('should relate an object using `relate: true` option', () => {
          return test({
            modelClass: Person,

            graphIn: {
              name: 'Brad',

              relatives: [
                {
                  id: ID_NOT_IN_DB,
                  isFriend: raw('1 = 1')
                },
                {
                  name: 'Sandra',
                  isChild: true
                }
              ]
            },

            graphOptions: {
              relate: true
            },

            queryOut: query => query.eager('relatives(orderById)').where('name', 'Brad'),

            graphOut: [
              {
                name: 'Brad',

                relatives: [
                  {
                    id: ID_NOT_IN_DB,
                    name: 'Vlad',
                    isFriend: true
                  },
                  {
                    name: 'Sandra',
                    isChild: true
                  }
                ]
              }
            ],

            postgresNumQueries: 2
          });
        });
      });
    });

    describe('has many relation', () => {
      it('should insert objects in a has many relation', () => {
        return test({
          modelClass: Person,

          graphIn: {
            name: 'Matti',

            pets: [
              {
                name: 'Sara'
              },
              {
                name: 'Miina'
              }
            ]
          },

          queryOut: query => query.eager('pets').where('name', 'Matti'),

          graphOut: [
            {
              name: 'Matti',

              pets: [
                {
                  name: 'Sara'
                },
                {
                  name: 'Miina'
                }
              ]
            }
          ],

          postgresNumQueries: 2
        });
      });

      it('should insert objects in a has many relation with existing ids', () => {
        return test({
          modelClass: Person,

          graphIn: {
            id: 1,
            name: 'Matti',

            pets: [
              {
                id: 1,
                name: 'Sara'
              },
              {
                id: 2,
                name: 'Miina'
              }
            ]
          },

          queryOut: query => query.eager('pets').where('name', 'Matti'),

          graphOut: [
            {
              id: 1,
              name: 'Matti',

              pets: [
                {
                  id: 1,
                  name: 'Sara'
                },
                {
                  id: 2,
                  name: 'Miina'
                }
              ]
            }
          ],

          postgresNumQueries: 2
        });
      });
    });

    function test({
      modelClass,
      graphIn,
      graphOptions: rawGraphOptions = {},
      queryOut,
      graphOut,
      postgresNumQueries = null,
      check
    }) {
      const builder = modelClass.query();
      const models = modelClass.ensureModelArray(graphIn, { skipValidation: true });
      rawGraphOptions = Object.assign({}, rawGraphOptions, { insertMissing: true });
      const graphOptions = new GraphOptions(rawGraphOptions);
      const graph = assignDbRefsAsRelateProps(ModelGraph.create(modelClass, models));

      return GraphInsert.fetchCurrentGraph({ builder, graph, graphOptions })
        .then(currentGraph => {
          numExecutedQueries = 0;

          const graphInsert = new GraphInsert({ graph, currentGraph, graphOptions });
          const actions = graphInsert.createActions();
          let promise = Promise.resolve();

          actions.forEach(action => {
            promise = promise.then(() => action.run(builder));
          });

          return promise;
        })
        .then(() => {
          if (session.isPostgres() && postgresNumQueries) {
            expect(numExecutedQueries).to.equal(postgresNumQueries);
          }
        })
        .then(() => queryOut(modelClass.query()))
        .then(result => {
          expect(result).to.containSubset(graphOut);

          if (check) {
            check(result);
          }
        });
    }

    function assignDbRefsAsRelateProps(graph) {
      for (const node of graph.nodes) {
        if (!node.parentEdge || !node.parentEdge.relation || !node.isDbReference) {
          continue;
        }

        node.parentEdge.relation.setRelateProp(node.obj, asArray(node.dbReference));
      }

      return graph;
    }

    function createSchema() {
      return session.knex.schema
        .dropTableIfExists('relatives')
        .dropTableIfExists('pets')
        .dropTableIfExists('persons')
        .createTable('persons', table => {
          table.increments('id');
          table.string('name');
          table.text('data');
        })
        .createTable('pets', table => {
          table.increments('id');
          table.string('name');
          table
            .integer('ownerId')
            .unsigned()
            .references('persons.id');
          table
            .integer('favoritePersonId')
            .unsigned()
            .references('persons.id');
        })
        .createTable('relatives', table => {
          table.increments('id');
          table.boolean('isFriend').defaultTo(false);
          table.boolean('isParent').defaultTo(true);
          table.boolean('isChild').defaultTo(false);
          table
            .integer('personId1')
            .unsigned()
            .references('persons.id');
          table
            .integer('personId2')
            .unsigned()
            .references('persons.id');
          // Disallow duplicates.
          table.unique(['personId1', 'personId2']);
        });
    }

    function dropSchema() {
      return session.knex.schema
        .dropTable('relatives')
        .dropTable('pets')
        .dropTable('persons');
    }

    function createModels() {
      mockKnex = mockKnexFactory(session.knex, function(_, oldImpl, args) {
        ++numExecutedQueries;
        return oldImpl.apply(this, args);
      });

      Person = class PersonModel extends Model {
        static get tableName() {
          return 'persons';
        }

        static get modifiers() {
          return {
            orderById: builder => builder.orderBy('id'),
            orderByName: builder => builder.orderBy('name')
          };
        }

        static get jsonSchema() {
          return {
            type: 'object',
            additionalProperties: false,

            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              data: { type: 'object' },
              isFriend: { type: 'boolean' },
              isChild: { type: 'boolean' },
              isParent: { type: 'boolean' }
            }
          };
        }

        $parseDatabaseJson(json) {
          const jsonSchemaProps = this.constructor.jsonSchema.properties;

          for (const prop of Object.keys(jsonSchemaProps)) {
            const propSchema = jsonSchemaProps[prop];

            if (propSchema.type === 'boolean') {
              json[prop] = !!json[prop];
            }
          }

          return super.$parseDatabaseJson(...arguments);
        }

        static get relationMappings() {
          return {
            relatives: {
              modelClass: Person,
              relation: Model.ManyToManyRelation,

              beforeInsert(obj) {
                obj.data = obj.data || {};
              },

              join: {
                from: 'persons.id',

                through: {
                  extra: ['isFriend', 'isChild', 'isParent'],
                  from: 'relatives.personId1',
                  to: 'relatives.personId2',

                  beforeInsert(obj) {
                    obj.isParent = !obj.isChild;
                  }
                },

                to: 'persons.id'
              }
            },

            pets: {
              modelClass: Pet,
              relation: Model.HasManyRelation,
              join: {
                from: 'persons.id',
                to: 'pets.ownerId'
              }
            }
          };
        }
      };

      Pet = class PetModel extends Model {
        static get tableName() {
          return 'pets';
        }

        static get jsonSchema() {
          return {
            type: 'object',
            additionalProperties: false,

            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              ownerId: { type: ['integer', 'null'] },
              favoritePersonId: { type: ['integer', 'null'] }
            }
          };
        }

        static get relationMappings() {
          return {
            favoritePerson: {
              modelClass: Person,
              relation: Model.BelongsToOneRelation,
              join: {
                from: 'pets.favoritePersonId',
                to: 'persons.id'
              }
            }
          };
        }
      };

      Person.knex(mockKnex);
      Pet.knex(mockKnex);
    }
  });
};
