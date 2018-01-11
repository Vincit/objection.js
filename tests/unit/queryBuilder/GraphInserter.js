const _ = require('lodash'),
  Knex = require('knex'),
  expect = require('expect.js'),
  Promise = require('bluebird'),
  Model = require('../../../').Model,
  knexMocker = require('../../../testUtils/mockKnex'),
  GraphInserter = require('../../../lib/queryBuilder/graphInserter/GraphInserter'),
  RelationExpression = require('../../../').RelationExpression;

describe('GraphInserter', () => {
  let mockKnexQueryResult = [];
  let executedQueries = [];
  let mockKnex = null;

  let Person = null;
  let Animal = null;
  let Movie = null;

  before(() => {
    let knex = Knex({ client: 'pg' });

    mockKnex = knexMocker(knex, function(mock, oldImpl, args) {
      executedQueries.push(this.toString());

      let promise = Promise.resolve(mockKnexQueryResult);
      return promise.then.apply(promise, args);
    });
  });

  beforeEach(() => {
    mockKnexQueryResult = [];
    executedQueries = [];
  });

  beforeEach(() => {
    Person = class Person extends Model {
      static get tableName() {
        return 'Person';
      }

      static get relationMappings() {
        return {
          pets: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            join: {
              from: 'Person.id',
              to: 'Animal.ownerId'
            }
          },

          movies: {
            relation: Model.ManyToManyRelation,
            modelClass: Movie,
            join: {
              from: 'Person.id',
              through: {
                extra: ['role'],
                from: 'Person_Movie.personId',
                to: 'Person_Movie.movieId'
              },
              to: 'Movie.id'
            }
          },

          children: {
            relation: Model.HasManyRelation,
            modelClass: Person,
            join: {
              from: 'Person.id',
              to: 'Person.parentId'
            }
          },

          parent: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'Person.parentId',
              to: 'Person.id'
            }
          }
        };
      }
    };

    Animal = class Animal extends Model {
      static get tableName() {
        return 'Animal';
      }

      static get relationMappings() {
        return {
          owner: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'Animal.ownerId',
              to: 'Person.id'
            }
          }
        };
      }
    };

    Movie = class Movie extends Model {
      static get tableName() {
        return 'Movie';
      }

      static get relationMappings() {
        return {
          actors: {
            relation: Model.ManyToManyRelation,
            modelClass: Person,
            join: {
              from: 'Movie.id',
              through: {
                from: 'Person_Movie.movieId',
                to: 'Person_Movie.personId'
              },
              to: 'Person.id'
            }
          }
        };
      }
    };
  });

  it('one Person', () => {
    let models = [
      {
        name: 'person1'
      }
    ];

    return test({
      models: models,
      modelClass: Person,
      expectedInsertions: [
        {
          tableName: 'Person',
          models: [
            {
              name: 'person1'
            }
          ]
        }
      ]
    });
  });

  it('two Persons', () => {
    let models = [
      {
        name: 'person1'
      },
      {
        name: 'person2'
      }
    ];

    return test({
      models: models,
      modelClass: Person,
      expectedInsertions: [
        {
          tableName: 'Person',
          models: [
            {
              name: 'person1'
            },
            {
              name: 'person2'
            }
          ]
        }
      ]
    });
  });

  it('belongs to one relation', () => {
    let models = [
      {
        name: 'child',
        parent: {
          name: 'parent'
        }
      }
    ];

    return test({
      models: models,
      modelClass: Person,
      // Parent should be inserted first as the child needs the `parentId`
      // to be set before it can be inserted.
      expectedInsertions: [
        {
          tableName: 'Person',
          models: [
            {
              name: 'parent'
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'child',
              parentId: 1
            }
          ]
        }
      ]
    });
  });

  it('has many relation (1)', () => {
    let models = [
      {
        name: 'parent1',
        children: [
          {
            name: 'child11'
          },
          {
            name: 'child12'
          }
        ]
      },
      {
        name: 'parent2',
        children: [
          {
            name: 'child21'
          },
          {
            name: 'child22'
          }
        ]
      }
    ];

    return test({
      models: models,
      modelClass: Person,
      // The both parents should be inserted first as the children need
      // to have `parentId` set before they can be inserted. All the
      // children should be inserted as one batch after the parents.
      expectedInsertions: [
        {
          tableName: 'Person',
          models: [
            {
              name: 'parent1'
            },
            {
              name: 'parent2'
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'child11',
              parentId: 1
            },
            {
              name: 'child12',
              parentId: 1
            },
            {
              name: 'child21',
              parentId: 2
            },
            {
              name: 'child22',
              parentId: 2
            }
          ]
        }
      ]
    });
  });

  it('has many relation (2)', () => {
    let models = [
      {
        name: 'parent1',
        children: [
          {
            name: 'child1'
          },
          {
            name: 'child2'
          }
        ],
        pets: [
          {
            name: 'pet1',
            species: 'dog'
          },
          {
            name: 'pet2',
            species: 'cat'
          }
        ]
      }
    ];

    return test({
      models: models,
      modelClass: Person,
      // Models of different tables need to be inserted in different batches.
      expectedInsertions: [
        {
          tableName: 'Person',
          models: [
            {
              name: 'parent1'
            }
          ]
        },
        {
          tableName: 'Animal',
          models: [
            {
              name: 'pet1',
              species: 'dog',
              ownerId: 1
            },
            {
              name: 'pet2',
              species: 'cat',
              ownerId: 1
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'child1',
              parentId: 1
            },
            {
              name: 'child2',
              parentId: 1
            }
          ]
        }
      ]
    });
  });

  it('many to many relation', () => {
    let models = [
      {
        name: 'parent1',
        movies: [
          {
            name: 'movie1'
          },
          {
            name: 'movie2'
          }
        ]
      }
    ];

    return test({
      models: models,
      modelClass: Person,
      // ManyToMany relation should not create any dependencies as the relations are
      // created using join rows in a separate table. The join rows should be inserted
      // as the last batch.
      expectedInsertions: [
        {
          tableName: 'Person',
          models: [
            {
              name: 'parent1'
            }
          ]
        },
        {
          tableName: 'Movie',
          models: [
            {
              name: 'movie1'
            },
            {
              name: 'movie2'
            }
          ]
        },
        {
          // The join rows.
          tableName: 'Person_Movie',
          models: [
            {
              personId: 1,
              movieId: 2
            },
            {
              personId: 1,
              movieId: 3
            }
          ]
        }
      ]
    });
  });

  describe('allowedRelations', () => {
    let models;
    let expectedInsertions;

    beforeEach(() => {
      models = [
        {
          '#id': 'person_1',
          name: 'person_1',

          parent: {
            name: 'person_1_parent'
          },

          children: [
            {
              name: 'person_1_child_1',

              pets: [
                {
                  name: 'person_1_child_1_pet_1',
                  species: 'cat'
                }
              ]
            },
            {
              name: 'person_1_child_2'
            }
          ],

          pets: [
            {
              name: 'person_1_pet_1',
              species: 'dog'
            }
          ],

          movies: [
            {
              name: 'person_1_movie_1',
              actors: [
                {
                  '#ref': 'person_1'
                },
                {
                  name: 'person_2'
                }
              ]
            },
            {
              name: 'person_1_movie_2'
            }
          ]
        }
      ];

      expectedInsertions = [
        {
          tableName: 'Movie',
          models: [
            {
              name: 'person_1_movie_1'
            },
            {
              name: 'person_1_movie_2'
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'person_2'
            },
            {
              name: 'person_1_parent'
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'person_1',
              parentId: 4
            }
          ]
        },
        {
          tableName: 'Animal',
          models: [
            {
              name: 'person_1_pet_1',
              species: 'dog',
              ownerId: 5
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'person_1_child_1',
              parentId: 5
            },
            {
              name: 'person_1_child_2',
              parentId: 5
            }
          ]
        },
        {
          tableName: 'Animal',
          models: [
            {
              name: 'person_1_child_1_pet_1',
              species: 'cat',
              ownerId: 7
            }
          ]
        },
        {
          tableName: 'Person_Movie',
          models: [
            {
              personId: 5,
              movieId: 1
            },
            {
              personId: 5,
              movieId: 2
            },
            {
              movieId: 1,
              personId: 3
            }
          ]
        }
      ];
    });

    it('should not throw if an allowed model tree is given (1)', () => {
      return test({
        modelClass: Person,
        models: models,
        allowedRelations: '[parent, children.pets, pets, movies.actors]',
        expectedInsertions: expectedInsertions
      });
    });

    it('should not throw if an allowed model tree is given (2)', () => {
      return test({
        modelClass: Person,
        models: models,
        allowedRelations:
          '[parent.children, children.[pets], pets, movies.actors.[pets, children]]',
        expectedInsertions: expectedInsertions
      });
    });

    it('should throw if an unallowed model tree is given (1)', () => {
      return test({
        modelClass: Person,
        models: models,
        // children.pets is missing.
        allowedRelations: '[parent, children, pets, movies.actors]',
        expectError: {
          type: 'UnallowedRelation',
          message: 'trying to insert an unallowed relation'
        }
      });
    });

    it('should throw if an unallowed model tree is given (2)', () => {
      return test({
        modelClass: Person,
        models: models,
        // movies.actors missing.
        allowedRelations: '[parent, children.pets, pets, movies]',
        expectError: {
          type: 'UnallowedRelation',
          message: 'trying to insert an unallowed relation'
        }
      });
    });

    it('should throw if an unallowed model tree is given (3)', () => {
      return test({
        modelClass: Person,
        models: models,
        // parent missing.
        allowedRelations: '[children.pets, pets, movies.actors]',
        expectError: {
          type: 'UnallowedRelation',
          message: 'trying to insert an unallowed relation'
        }
      });
    });
  });

  describe('#ref', () => {
    it('belongs to one relation', () => {
      let models = [
        {
          name: 'child1',
          parent: {
            '#id': 'parent',
            name: 'parent'
          }
        },
        {
          name: 'child2',
          parent: {
            '#ref': 'parent'
          }
        }
      ];

      return test({
        models: models,
        modelClass: Person,
        // Both children have the same parent. The parent should be inserted first
        // and then the children with the same `parentId`.
        expectedInsertions: [
          {
            tableName: 'Person',
            models: [
              {
                name: 'parent'
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                name: 'child1',
                parentId: 1
              },
              {
                name: 'child2',
                parentId: 1
              }
            ]
          }
        ]
      });
    });

    it('has many relation', () => {
      let models = [
        {
          id: 1,
          '#id': 'parent1',
          name: 'parent1',
          children: [
            {
              id: 2,
              name: 'child11'
            }
          ]
        },
        {
          id: 3,
          name: 'parent2',
          children: [
            {
              id: 4,
              name: 'child21',
              children: [
                {
                  id: 6,
                  name: 'grandChild211'
                },
                {
                  '#ref': 'parent1'
                }
              ]
            },
            {
              id: 5,
              name: 'child22'
            }
          ]
        }
      ];

      return test({
        models: models,
        modelClass: Person,
        expectedInsertions: [
          {
            tableName: 'Person',
            models: [
              {
                id: 3,
                name: 'parent2'
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                id: 4,
                name: 'child21',
                parentId: 3
              },
              {
                id: 5,
                name: 'child22',
                parentId: 3
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                id: 1,
                name: 'parent1',
                parentId: 4
              },
              {
                id: 6,
                name: 'grandChild211',
                parentId: 4
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                id: 2,
                name: 'child11',
                parentId: 1
              }
            ]
          }
        ]
      });
    });

    it('many to many relation', () => {
      let model = {
        '#id': 'actor1',
        name: 'actor1',
        movies: [
          {
            '#id': 'movie1',
            name: 'movie1',
            actors: [
              {
                '#ref': 'actor1'
              },
              {
                name: 'actor2',
                parent: {
                  name: 'actor3',
                  movies: [
                    {
                      '#ref': 'movie1'
                    },
                    {
                      '#ref': 'movie2'
                    }
                  ]
                }
              }
            ]
          },
          {
            '#id': 'movie2',
            name: 'movie2'
          }
        ]
      };

      return test({
        modelClass: Person,
        models: model,
        expectedInsertions: [
          {
            tableName: 'Person',
            models: [
              {
                name: 'actor1'
              },
              {
                name: 'actor3'
              }
            ]
          },
          {
            tableName: 'Movie',
            models: [
              {
                name: 'movie1'
              },
              {
                name: 'movie2'
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                name: 'actor2',
                parentId: 2
              }
            ]
          },
          {
            tableName: 'Person_Movie',
            models: [
              {
                personId: 1,
                movieId: 3
              },
              {
                personId: 1,
                movieId: 4
              },
              {
                movieId: 3,
                personId: 5
              },
              {
                personId: 2,
                movieId: 3
              },
              {
                personId: 2,
                movieId: 4
              }
            ]
          }
        ]
      });
    });

    it('many to many relation with extra properties in #ref', () => {
      let model = {
        '#id': 'actor1',
        name: 'actor1',
        movies: [
          {
            '#id': 'movie1',
            name: 'movie1',
            actors: [
              {
                '#ref': 'actor1'
              },
              {
                name: 'actor2',
                parent: {
                  name: 'actor3',
                  movies: [
                    {
                      '#ref': 'movie1',
                      role: 'Henchman #136'
                    },
                    {
                      '#ref': 'movie2'
                    }
                  ]
                }
              }
            ]
          },
          {
            '#id': 'movie2',
            name: 'movie2'
          }
        ]
      };

      return test({
        modelClass: Person,
        models: model,
        expectedInsertions: [
          {
            tableName: 'Person',
            models: [
              {
                name: 'actor1'
              },
              {
                name: 'actor3'
              }
            ]
          },
          {
            tableName: 'Movie',
            models: [
              {
                name: 'movie1'
              },
              {
                name: 'movie2'
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                name: 'actor2',
                parentId: 2
              }
            ]
          },
          {
            tableName: 'Person_Movie',
            models: [
              {
                personId: 1,
                movieId: 3
              },
              {
                personId: 1,
                movieId: 4
              },
              {
                movieId: 3,
                personId: 5
              },
              {
                personId: 2,
                movieId: 3,
                role: 'Henchman #136'
              },
              {
                personId: 2,
                movieId: 4
              }
            ]
          }
        ]
      });
    });

    it('should throw error if model tree contain reference cycles', () => {
      test({
        models: [
          {
            '#id': 'child',
            parent: {
              '#ref': 'child'
            }
          }
        ],
        modelClass: Person,
        expectError: {
          type: 'InvalidGraph',
          message: 'the object graph contains cyclic references'
        }
      });

      test({
        models: [
          {
            '#id': 'child',
            parent: {
              '#id': 'parent',
              parent: {
                '#ref': 'child'
              }
            }
          }
        ],
        modelClass: Person,
        expectError: {
          type: 'InvalidGraph',
          message: 'the object graph contains cyclic references'
        }
      });

      test({
        models: [
          {
            '#id': 'root',
            children: [
              {
                '#id': 'child1'
              },
              {
                '#id': 'child2',
                children: [
                  {
                    '#ref': 'root'
                  },
                  {
                    '#id': 'grandChild1'
                  }
                ]
              }
            ]
          }
        ],
        modelClass: Person,
        expectError: {
          type: 'InvalidGraph',
          message: 'the object graph contains cyclic references'
        }
      });

      test({
        models: [
          {
            '#id': 'child',
            parent: {
              jsonProp: {
                prop1: [
                  {
                    prop2: 'some test around #ref{child.id} the reference'
                  }
                ]
              }
            }
          }
        ],
        modelClass: Person,
        expectError: {
          type: 'InvalidGraph',
          message: 'the object graph contains cyclic references'
        }
      });

      test({
        models: [
          {
            '#id': 'child',
            parent: {
              prop: '#ref{child.id}'
            }
          }
        ],
        modelClass: Person,
        expectError: {
          type: 'InvalidGraph',
          message: 'the object graph contains cyclic references'
        }
      });
    });

    it('should be able to change the reference keys through `Model.uidProp` and `Model.uidRefProp`', () => {
      Person.uidProp = 'myCustomIdKey';
      Person.uidRefProp = 'myCustomRefKey';

      Animal.uidProp = 'myCustomIdKey';
      Animal.uidRefProp = 'myCustomRefKey';

      Movie.uidProp = 'myCustomIdKey';
      Movie.uidRefProp = 'myCustomRefKey';

      let models = [
        {
          myCustomIdKey: 'person_1',
          name: 'person_1',

          parent: {
            name: 'person_1_parent'
          },

          children: [
            {
              name: 'person_1_child_1',

              pets: [
                {
                  name: 'person_1_child_1_pet_1',
                  species: 'cat'
                }
              ]
            },
            {
              name: 'person_1_child_2'
            }
          ],

          pets: [
            {
              name: 'person_1_pet_1',
              species: 'dog'
            }
          ],

          movies: [
            {
              name: 'person_1_movie_1',
              actors: [
                {
                  myCustomRefKey: 'person_1'
                },
                {
                  name: 'person_2'
                }
              ]
            },
            {
              name: 'person_1_movie_2'
            }
          ]
        }
      ];

      let expectedInsertions = [
        {
          tableName: 'Movie',
          models: [
            {
              name: 'person_1_movie_1'
            },
            {
              name: 'person_1_movie_2'
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'person_2'
            },
            {
              name: 'person_1_parent'
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'person_1',
              parentId: 4
            }
          ]
        },
        {
          tableName: 'Animal',
          models: [
            {
              name: 'person_1_pet_1',
              species: 'dog',
              ownerId: 5
            }
          ]
        },
        {
          tableName: 'Person',
          models: [
            {
              name: 'person_1_child_1',
              parentId: 5
            },
            {
              name: 'person_1_child_2',
              parentId: 5
            }
          ]
        },
        {
          tableName: 'Animal',
          models: [
            {
              name: 'person_1_child_1_pet_1',
              species: 'cat',
              ownerId: 7
            }
          ]
        },
        {
          tableName: 'Person_Movie',
          models: [
            {
              personId: 5,
              movieId: 1
            },
            {
              personId: 5,
              movieId: 2
            },
            {
              movieId: 1,
              personId: 3
            }
          ]
        }
      ];

      return test({
        modelClass: Person,
        models: models,
        expectedInsertions: expectedInsertions
      });
    });

    it('should fail if a reference cannot be found from the graph', () => {
      test({
        models: [
          {
            parent: {
              '#ref': 'child'
            }
          }
        ],
        modelClass: Person,
        expectError: {
          message: 'could not resolve reference "child"',
          type: 'InvalidGraph'
        }
      });
    });
  });

  describe('#ref{id.prop}', () => {
    it('should replace references with the inserted values (1)', () => {
      let models = [
        {
          firstName: 'I am the child of #ref{parent.firstName} #ref{parent.lastName}',
          lastName: '#ref{parent.id}',
          parent: {
            '#id': 'parent',
            firstName: 'Parent',
            lastName: 'Parentsson'
          }
        }
      ];

      return test({
        models: models,
        modelClass: Person,
        expectedInsertions: [
          {
            tableName: 'Person',
            models: [
              {
                firstName: 'Parent',
                lastName: 'Parentsson'
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                firstName: 'I am the child of Parent Parentsson',
                lastName: 1,
                parentId: 1
              }
            ]
          }
        ]
      });
    });

    it('should replace references with the inserted values (2)', () => {
      let models = [
        {
          '#id': 'actor',
          name: 'actor',
          metaData: [
            {
              movieNames: ['#ref{movie2.name}']
            }
          ],
          movies: [
            {
              name: 'movie 1',
              metaData: {
                someActorId: '#ref{actor.id}'
              }
            },
            {
              '#id': 'movie2',
              name: 'movie 2'
            },
            {
              name: 'movie 3'
            }
          ]
        }
      ];

      return test({
        models: models,
        modelClass: Person,
        expectedInsertions: [
          {
            tableName: 'Movie',
            models: [
              {
                name: 'movie 2'
              },
              {
                name: 'movie 3'
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                name: 'actor',
                metaData: [
                  {
                    movieNames: ['movie 2']
                  }
                ]
              }
            ]
          },
          {
            tableName: 'Movie',
            models: [
              {
                name: 'movie 1',
                metaData: {
                  someActorId: 3
                }
              }
            ]
          },
          {
            tableName: 'Person_Movie',
            models: [
              {
                personId: 3,
                movieId: 4
              },
              {
                personId: 3,
                movieId: 1
              },
              {
                personId: 3,
                movieId: 2
              }
            ]
          }
        ]
      });
    });

    it('should replace references inside deep json properties with the inserted values', () => {
      let models = [
        {
          firstName: 'Child',
          lastName: 'Childsson',
          jsonProp: {
            data: [
              {
                parentFirstName: '#ref{parent.firstName}',
                parentLastName: '#ref{parent.lastName}'
              }
            ]
          },
          parent: {
            '#id': 'parent',
            firstName: 'Parent',
            lastName: 'Parentsson'
          }
        }
      ];

      return test({
        models: models,
        modelClass: Person,
        expectedInsertions: [
          {
            tableName: 'Person',
            models: [
              {
                firstName: 'Parent',
                lastName: 'Parentsson'
              }
            ]
          },
          {
            tableName: 'Person',
            models: [
              {
                firstName: 'Child',
                lastName: 'Childsson',
                parentId: 1,
                jsonProp: {
                  data: [
                    {
                      parentFirstName: 'Parent',
                      parentLastName: 'Parentsson'
                    }
                  ]
                }
              }
            ]
          }
        ]
      });
    });

    it('should fail if a reference is not found', () => {
      let models = [
        {
          firstName: 'I am the child of #ref{parent.firstName} #ref{parent.lastName}',
          lastName: '#ref{doesNotExist.id}',
          parent: {
            '#id': 'parent',
            firstName: 'Parent',
            lastName: 'Parentsson'
          }
        }
      ];

      test({
        models: models,
        modelClass: Person,
        expectError: {
          type: 'InvalidGraph',
          message: 'could not resolve reference "#ref{doesNotExist.id}"'
        }
      });
    });
  });

  function test(opt) {
    // Convert the input object graph into model graph. The input may be
    // an array of objects or a single object.
    if (_.isArray(opt.models)) {
      opt.models = _.map(opt.models, model => {
        return opt.modelClass.fromJson(model);
      });
    } else {
      opt.models = opt.modelClass.fromJson(opt.models);
    }

    function createInserter() {
      let insertOpt = {
        modelClass: opt.modelClass,
        models: opt.models
      };

      if (opt.allowedRelations) {
        insertOpt.allowedRelations = RelationExpression.parse(opt.allowedRelations);
      }

      return new GraphInserter(insertOpt);
    }

    let inserter;

    if (opt.expectError) {
      expect(createInserter).to.throwException(err => {
        expect(err.type).to.equal(opt.expectError.type);
        expect(err.message).to.eql(opt.expectError.message);
      });
      return;
    } else {
      inserter = createInserter();
    }

    let id = 1;
    let insertions = [];

    return inserter
      .execute(tableInsertion => {
        let models = tableInsertion.items.map(it => it.model);
        let ret = _.clone(models);

        insertions.push({
          tableName: tableInsertion.modelClass.getTableName(),
          models: _.map(models, model => {
            if (model instanceof Model) {
              return model.$toJson({ shallow: true });
            } else {
              return _.clone(model);
            }
          })
        });

        _.each(ret, function(model) {
          if (!model.id) {
            model.id = id++;
          }
        });

        return Promise.resolve(ret);
      })
      .then(() => {
        expect(insertions).to.eql(opt.expectedInsertions);
      });
  }
});
