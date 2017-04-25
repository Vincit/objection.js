'use strict';

const _ = require('lodash');
const utils = require('../../lib/utils/knexUtils');
const Model = require('../../').Model;
const expect = require('expect.js');
const inheritModel = require('../../lib/model/inheritModel');
const Promise = require('bluebird');

module.exports = (session) => {

  describe('generated id', () => {
    let TestModel;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('generated_id_test')
        .createTable('generated_id_test', table => {
          table.string('idCol').primary();
          table.string('value');
        });
    });

    after(() => {
      return session.knex.schema.dropTableIfExists('generated_id_test');
    });

    before(() => {
      TestModel = class TestModel extends Model {
        static get tableName() {
          return 'generated_id_test';
        }

        static get idColumn() {
          return 'idCol';
        }

        $beforeInsert() {
          this.idCol = 'someRandomId';
        }
      };

      TestModel.knex(session.knex);
    });

    it('should return the generated id when inserted', () => {
      return TestModel.query().insert({value: 'hello'}).then(ret => {
        expect(ret.idCol).to.equal('someRandomId');
        return session.knex(TestModel.tableName);
      }).then(rows => {
        expect(rows[0]).to.eql({value: 'hello', idCol: 'someRandomId'});
      });
    });

  });

  describe('zero value in relation column', () => {
    let Table1;
    let Table2;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('table1')
        .dropTableIfExists('table2')
        .createTable('table1', table => {
          table.increments('id').primary();
          table.integer('value').notNullable();
        })
        .createTable('table2', table => {
          table.increments('id').primary();
          table.integer('value').notNullable();
        });
    });

    after(() => {
      return Promise.all([
        session.knex.schema.dropTableIfExists('table1'),
        session.knex.schema.dropTableIfExists('table2')
      ]);
    });

    before(() => {
      Table1 = class Table1 extends Model {
        static get tableName() {
          return 'table1';
        }

        static get relationMappings() {
          return {
            relation: {
              relation: Model.HasManyRelation,
              modelClass: Table2,
              join: {
                from: 'table1.value',
                to: 'table2.value'
              }
            }
          };
        }
      };

      Table2 = class Table2 extends Model {
        static get tableName() {
          return 'table2';
        }
      };

      Table1.knex(session.knex);
      Table2.knex(session.knex);
    });

    before(() => {
      return Promise.all([
        Table1.query().insert({id: 1, value: 0}),
        Table1.query().insert({id: 2, value: 1}),
        Table2.query().insert({id: 1, value: 0}),
        Table2.query().insert({id: 2, value: 1})
      ])
    });

    it('should work with zero value', () => {
      return Table1
        .query()
        .findById(1)
        .then(model => {
          return model.$relatedQuery('relation');
        })
        .then(models => {
          expect(models).to.eql([{id: 1, value: 0}]);
        });
    });

  });

  if (session.isMySql()) {
    describe('mysql binary columns', () => {
      let TestModel;

      before(() => {
        return session.knex.schema
          .dropTableIfExists('mysql_binary_test')
          .createTable('mysql_binary_test', table => {
            table.increments('id').primary();
            table.binary('binary', 4);
          });
      });

      after(() => {
        return session.knex.schema.dropTableIfExists('mysql_binary_test');
      });

      before(() => {
        TestModel = class TestModel extends Model {
          static get tableName() {
            return 'mysql_binary_test';
          }
        };

        TestModel.knex(session.knex);
      });

      function buffer() {
        return new Buffer([192, 168, 163, 17]);
      }

      function bufferEquals(a, b) {
        if (!Buffer.isBuffer(a)) return false;
        if (!Buffer.isBuffer(b)) return false;
        if (typeof a.equals === 'function') return a.equals(b);
        if (a.length !== b.length) return false;

        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }

        return true;
      }

      it('#insert should insert a buffer', () => {
        return TestModel.query().insert({binary: buffer()}).then(ret => {
          expect(bufferEquals(buffer(), ret.binary)).to.equal(true);
          return session.knex(TestModel.tableName);
        }).then(rows => {
          expect(bufferEquals(buffer(), rows[0].binary)).to.equal(true);
        });
      });

    });
  }

  describe('model with `length` property', () => {
    let TestModel;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('model_with_length_test')
        .createTable('model_with_length_test', table => {
          table.increments('id');
          table.integer('length');
        });
    });

    after(() => {
      return session.knex.schema.dropTableIfExists('model_with_length_test');
    });

    before(() => {
      TestModel = class TestModel extends Model {
        static get tableName() {
          return 'model_with_length_test';
        }
      };

      TestModel.knex(session.knex);
    });

    it('should insert', () => {
      return TestModel.query().insert({length: 10}).then(model => {
        expect(model).to.eql({id: 1, length: 10});
        return session.knex(TestModel.tableName);
      }).then(rows => {
        expect(rows.length).to.equal(1);
        expect(rows[0]).to.eql({id: 1, length: 10});
      });
    });
  });

  describe('aggregate methods with relations', () => {

    beforeEach(() => {
      return session.populate([{
        model1Prop1: 'a',
        model1Relation2: [
          {model_2_prop_1: 'one'},
          {model_2_prop_1: 'two'},
          {model_2_prop_1: 'three'}
        ]
      }, {
        model1Prop1: 'b',
        model1Relation2: [
          {model_2_prop_1: 'four'},
          {model_2_prop_1: 'five'}
        ]
      }]);
    });

    it('count of HasManyRelation', () => {
      return session.models.Model1
        .query()
        .select('Model1.*')
        .count('model1Relation2.id_col as relCount')
        .joinRelation('model1Relation2')
        .groupBy('Model1.id')
        .orderBy('Model1.model1Prop1')
        .then(models => {
          expect(models[0].relCount).to.equal(3);
          expect(models[1].relCount).to.equal(2);
        });
    });

  });

  describe('multiple results with a one-to-one relation', () => {

    beforeEach(() => {
      // This tests insertGraph.
      return session.populate([{
        id: 1,
        model1Prop1: 'hello 1',

        model1Relation1: {
          id: 2,
          model1Prop1: 'hello 2'
        }
      }, {
        id: 3,
        model1Prop1: 'hello 1',

        model1Relation1: {
          id: 4,
          model1Prop1: 'hello 2'
        }
      }]);
    });

    it('belongs to one relation', () => {
      return session.models.Model1.query().whereIn('id', [1, 3]).eager('model1Relation1').then(models => {
        expect(models).to.eql([{
          id: 1,
          model1Id: 2,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterGetCalled: 1,
          model1Relation1: {
            id: 2,
            model1Id: null,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterGetCalled: 1
          }
        }, {
          id: 3,
          model1Id: 4,
          model1Prop1: 'hello 1',
          model1Prop2: null,
          $afterGetCalled: 1,
            model1Relation1: {
            id: 4,
            model1Id: null,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterGetCalled: 1
          }
        }]);
      });
    });

    it('has one relation', () => {
      return session.models.Model1.query().whereIn('id', [2, 4]).eager('model1Relation1Inverse').then(models => {
        expect(models).to.eql([{
          id: 2,
          model1Id: null,
          model1Prop1: 'hello 2',
          model1Prop2: null,
          $afterGetCalled: 1,
          model1Relation1Inverse: {
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1
          }
        }, {
          id: 4,
          model1Id: null,
          model1Prop1: 'hello 2',
          model1Prop2: null,
          $afterGetCalled: 1,
          model1Relation1Inverse: {
            id: 3,
            model1Id: 4,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1
          }
        }]);
      });
    });
  });

  describe('using unbound models by passing a knex to query', () => {
    let Model1 = session.unboundModels.Model1;
    let Model2 = session.unboundModels.Model2;

    beforeEach(() => {
      // This tests insertGraph.
      return session.populate([]).then(() => {
        return Model1
          .query(session.knex)
          .insertGraph([{
            id: 1,
            model1Prop1: 'hello 1',

            model1Relation1: {
              id: 2,
              model1Prop1: 'hello 2',

              model1Relation1: {
                id: 3,
                model1Prop1: 'hello 3',

                model1Relation1: {
                  id: 4,
                  model1Prop1: 'hello 4',
                  model1Relation2: [{
                    idCol: 4,
                    model2Prop1: 'hejsan 4'
                  }]
                }
              }
            },

            model1Relation2: [{
              idCol: 1,
              model2Prop1: 'hejsan 1'
            }, {
              idCol: 2,
              model2Prop1: 'hejsan 2',

              model2Relation1: [{
                id: 5,
                model1Prop1: 'hello 5',
                aliasedExtra: 'extra 5'
              }, {
                id: 6,
                model1Prop1: 'hello 6',
                aliasedExtra: 'extra 6',

                model1Relation1: {
                  id: 7,
                  model1Prop1: 'hello 7'
                },

                model1Relation2: [{
                  idCol: 3,
                  model2Prop1: 'hejsan 3'
                }]
              }]
            }]
          }]);
      });
    });

    it('eager', () => {
        return Promise.all([
          Model1
            .query(session.knex)
            .findById(1)
            .eager('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]'),
          Model1
            .query(session.knex)
            .findById(1)
            .eagerAlgorithm(Model1.JoinEagerAlgorithm)
            .eager('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]')
        ]).then(results => {
          results.forEach(models => {
            expect(sortRelations(models)).to.eql({
              id: 1,
              model1Id: 2,
              model1Prop1: 'hello 1',
              model1Prop2: null,
              $afterGetCalled: 1,

              model1Relation1: {
                id: 2,
                model1Id: 3,
                model1Prop1: 'hello 2',
                model1Prop2: null,
                $afterGetCalled: 1
              },

              model1Relation2: [{
                idCol: 1,
                model1Id: 1,
                model2Prop1: 'hejsan 1',
                model2Prop2: null,
                $afterGetCalled: 1,
                model2Relation1: []
              }, {
                idCol: 2,
                model1Id: 1,
                model2Prop1: 'hejsan 2',
                model2Prop2: null,
                $afterGetCalled: 1,

                model2Relation1: [{
                  id: 5,
                  model1Id: null,
                  model1Prop1: 'hello 5',
                  model1Prop2: null,
                  aliasedExtra: 'extra 5',
                  model1Relation1: null,
                  model1Relation2: [],
                  $afterGetCalled: 1
                }, {
                  id: 6,
                  model1Id: 7,
                  model1Prop1: 'hello 6',
                  model1Prop2: null,
                  aliasedExtra: 'extra 6',
                  $afterGetCalled: 1,

                  model1Relation1: {
                    id: 7,
                    model1Id: null,
                    model1Prop1: 'hello 7',
                    model1Prop2: null,
                    $afterGetCalled: 1,
                  },

                  model1Relation2: [{
                    idCol: 3,
                    model1Id: 6,
                    model2Prop1: 'hejsan 3',
                    model2Prop2: null,
                    $afterGetCalled: 1,
                  }]
                }],
              }],
            });
          });
        });
    });

    describe('$relatedQuery', () => {

      it('fetch', () => {
        return Promise.all([
          Model1.query(session.knex).findById(1).then(model => {
            return model.$relatedQuery('model1Relation1', session.knex);
          }),

          Model1.query(session.knex).findById(2).then(model => {
            return model.$relatedQuery('model1Relation1Inverse', session.knex);
          }),

          Model1.query(session.knex).findById(1).then(model => {
            return model.$relatedQuery('model1Relation2', session.knex);
          }),

          Model2.query(session.knex).findById(2).then(model => {
            return model.$relatedQuery('model2Relation1', session.knex);
          })
        ]).then(results => {
          expect(results[0]).to.eql({
            id: 2,
            model1Id: 3,
            model1Prop1: 'hello 2',
            model1Prop2: null,
            $afterGetCalled: 1
          });

          expect(results[1]).to.eql({
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1
          });

          expect(_.sortBy(results[2], 'idCol')).to.eql([{
            idCol: 1,
            model1Id: 1,
            model2Prop1: 'hejsan 1',
            model2Prop2: null,
            $afterGetCalled: 1
          }, {
            idCol: 2,
            model1Id: 1,
            model2Prop1: 'hejsan 2',
            model2Prop2: null,
            $afterGetCalled: 1
          }]);

          expect(_.sortBy(results[3], 'id')).to.eql([{
            id: 5,
            model1Id: null,
            model1Prop1: 'hello 5',
            model1Prop2: null,
            aliasedExtra: 'extra 5',
            $afterGetCalled: 1
          }, {
            id: 6,
            model1Id: 7,
            model1Prop1: 'hello 6',
            model1Prop2: null,
            aliasedExtra: 'extra 6',
            $afterGetCalled: 1
          }]);
        })
      });

    });

    describe('$query', () => {

      it('fetch', () => {
        return Promise.all([
          Model1.query(session.knex).findById(1).then(model => {
            return model.$query(session.knex);
          })
        ]).then(model => {
          expect(model).to.eql([{
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1
          }]);
        });
      });

      it('insert', () => {
        return Model1.fromJson({model1Prop1: 'foo', id: 100}).$query(session.knex).insert().then(model => {
          expect(model).to.eql({
            id: 100,
            model1Prop1: 'foo',
            $afterInsertCalled: 1,
            $beforeInsertCalled: 1
          });
        });
      });

      it('insertAndFetch', () => {
        return Model1.fromJson({model1Prop1: 'foo', id: 101}).$query(session.knex).insertAndFetch().then(model => {
          expect(model).to.eql({
            id: 101,
            model1Id: null,
            model1Prop1: 'foo',
            model1Prop2: null,
            $afterInsertCalled: 1,
            $beforeInsertCalled: 1
          });
        });
      });

    });

    it('joinRelation (BelongsToOneRelation)', () => {
      return Model1
        .query(session.knex)
        .select('Model1.id as id', 'model1Relation1.id as relId')
        .innerJoinRelation('model1Relation1')
        .then(models => {
          expect(_.sortBy(models, 'id')).to.eql([
            {id: 1, relId: 2, $afterGetCalled: 1},
            {id: 2, relId: 3, $afterGetCalled: 1},
            {id: 3, relId: 4, $afterGetCalled: 1},
            {id: 6, relId: 7, $afterGetCalled: 1}
          ]);
        });
    });

    it('joinRelation (ManyToManyRelation)', () => {
      return Model1
        .query(session.knex)
        .select('Model1.id as id', 'model1Relation3.id_col as relId')
        .innerJoinRelation('model1Relation3')
        .then(models => {
          expect(_.sortBy(models, 'id')).to.eql([
            {id: 5, relId: 2, $afterGetCalled: 1},
            {id: 6, relId: 2, $afterGetCalled: 1}
          ]);
        });
    });

    it('should fail with a descriptive error message if knex is not provided', () => {
      return Promise.all([
        Promise.try(() => {
          return Model1
            .query()
            .findById(1)
            .eager('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]');
        }).reflect(),

        Promise.try(() => {
          return Model1
            .query()
            .findById(1)
            .eagerAlgorithm(Model1.JoinEagerAlgorithm)
            .eager('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]');
        }).reflect(),

        Promise.try(() => {
          return Model1.query();
        }).reflect(),

        Promise.try(() => {
          return Model1.query().where('id', 1);
        }).reflect(),

        Promise.try(() => {
          return Model1.query().joinRelation('model1Relation1');
        }).reflect(),

        Model1.query(session.knex).findById(1).then(model => {
          return model.$relatedQuery('model1Relation1');
        }).reflect(),

        Model1.query(session.knex).findById(2).then(model => {
          return model.$relatedQuery('model1Relation1Inverse');
        }).reflect(),

        Model1.query(session.knex).findById(1).then(model => {
          return model.$relatedQuery('model1Relation2');
        }).reflect(),

        Model2.query(session.knex).findById(2).then(model => {
          return model.$relatedQuery('model2Relation1');
        }).reflect(),

        Model1.query(session.knex).findById(1).then(model => {
          return model.$query();
        }).reflect(),

      ]).then(results => {
        results.forEach(result => {
          expect(result.isRejected()).to.equal(true);
          expect(result.reason().message).to.match(/no database connection available for a query. You need to bind the model class or the query to a knex instance./);
        })
      });
    });

    function sortRelations(models) {
      Model1.traverse(models, model => {
        if (model.model1Relation2) {
          model.model1Relation2 = _.sortBy(model.model1Relation2, 'idCol');
        }

        if (model.model2Relation1) {
          model.model2Relation1 = _.sortBy(model.model2Relation1, 'id');
        }
      });

      return models;
    }

  });

  describe('Eagerly loaded empty relations seem to short-circuit conversion to internal structure #292', () => {
    class A extends Model {
      static get tableName() {
        return 'a';
      }

      static get relationMappings() {
        return {
          Bs: {
            relation: Model.HasManyRelation,
            modelClass: B,
            join: {
              from: 'a.id',
              to: 'b.aId',
            },
          },
        };
      }
    }

    class B extends Model {
      static get tableName() {
        return 'b';
      }

      static get relationMappings() {
        return {
          Cs: {
            relation: Model.ManyToManyRelation,
            modelClass: C,
            join: {
              from: 'b.id',
              through: {
                from: 'b_c.bId',
                to: 'b_c.cId',
              },
              to: 'c.id',
            },
          },
          Ds: {
            relation: Model.ManyToManyRelation,
            modelClass: D,
            join: {
              from: 'b.id',
              through: {
                from: 'b_d.bId',
                to: 'b_d.dId',
              },
              to: 'd.id',
            },
          }
        };
      }
    }

    class C extends Model {
      static get tableName() {
        return 'c';
      }
    }

    class D extends Model {
      static get tableName() {
        return 'd';
      }
    }

    beforeEach(() => {
      return session.knex.schema
        .dropTableIfExists('b_c')
        .dropTableIfExists('b_d')
        .dropTableIfExists('b')
        .dropTableIfExists('a')
        .dropTableIfExists('c')
        .dropTableIfExists('d')
        .createTable('a', table => {
          table.integer('id').primary();
        })
        .createTable('b', table => {
          table.integer('id').primary();
          table.integer('aId').references('a.id');
        })
        .createTable('c', table => {
          table.integer('id').primary();
        })
        .createTable('d', table => {
          table.integer('id').primary();
        })
        .createTable('b_c', table => {
          table.integer('bId').references('b.id').onDelete('CASCADE');
          table.integer('cId').references('c.id').onDelete('CASCADE');
        })
        .createTable('b_d', table => {
          table.integer('bId').references('b.id').onDelete('CASCADE');
          table.integer('dId').references('d.id').onDelete('CASCADE');
        })
        .then(() => {
          return Promise.all([
            session.knex('a').insert({id: 1}),
            session.knex('d').insert({id: 1}),
            session.knex('d').insert({id: 2})
          ]).then(() => {
            return session.knex('b').insert({id: 1, aId: 1});
          }).then(() => {
            return Promise.all([
              session.knex('b_d').insert({bId: 1, dId: 1}),
              session.knex('b_d').insert({bId: 1, dId: 2})
            ]);
          })
        });
    });

    afterEach(() => {
      return session.knex.schema
        .dropTableIfExists('b_c')
        .dropTableIfExists('b_d')
        .dropTableIfExists('b')
        .dropTableIfExists('a')
        .dropTableIfExists('c')
        .dropTableIfExists('d')
    });

    it('the test', () => {
      return A.query(session.knex)
        .eagerAlgorithm(Model.JoinEagerAlgorithm)
        .eager('Bs.[Cs, Ds]')
        .then(results => {
          results[0].Bs[0].Ds = _.sortBy(results[0].Bs[0].Ds, 'id');

          expect(results).to.eql([{
            id: 1,

            Bs: [{
              id: 1,
              aId: 1,
              Cs: [],

              Ds: [{
                id: 1
              }, {
                id: 2
              }]
            }]
          }]);
        });
    });
  });

  describe('Default values not set with .insertGraph() in 0.7.2 #325', () => {
    let TestModel;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('default_values_note_set_test')
        .createTable('default_values_note_set_test', table => {
          table.increments('id').primary();
          table.string('value1');
          table.string('value2');
        });
    });

    after(() => {
      return session.knex.schema.dropTableIfExists('default_values_note_set_test');
    });

    before(() => {
      TestModel = class TestModel extends Model {
        static get tableName() {
          return 'default_values_note_set_test';
        }

        static get jsonSchema() {
          return {
            type: 'object',
            properties: {
              id: {type: 'integer'},
              value1: {type: 'string', default: 'foo'},
              value2: {type: 'string', default: 'bar'},
            }
          };
        }
      };

      TestModel.knex(session.knex);
    });

    beforeEach(() => {
      return TestModel.query().delete();
    });

    it('insert should set the defaults', () => {
      return TestModel
        .query()
        .insert({value1: 'hello'})
        .then(model => {
          expect(model.value1).to.equal('hello');
          expect(model.value2).to.equal('bar');
          return session.knex(TestModel.tableName);
        })
        .then(rows => {
          expect(rows[0].value1).to.equal('hello');
          expect(rows[0].value2).to.equal('bar');
        });
    });

    it('insertGraph should set the defaults', () => {
      return TestModel
        .query()
        .insertGraph({value1: 'hello'})
        .then(model => {
          expect(model.value1).to.equal('hello');
          expect(model.value2).to.equal('bar');
          return session.knex(TestModel.tableName);
        })
        .then(rows => {
          expect(rows[0].value1).to.equal('hello');
          expect(rows[0].value2).to.equal('bar');
        });
    });

  });
};
