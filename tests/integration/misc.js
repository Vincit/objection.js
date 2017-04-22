'use strict';

var _ = require('lodash');
var utils = require('../../lib/utils/knexUtils');
var Model = require('../../').Model;
var expect = require('expect.js');
var inheritModel = require('../../lib/model/inheritModel');
var Promise = require('bluebird');

module.exports = function (session) {

  describe('generated id', function () {
    var TestModel;

    before(function () {
      return session.knex.schema
        .dropTableIfExists('generated_id_test')
        .createTable('generated_id_test', function (table) {
          table.string('idCol').primary();
          table.string('value');
        });
    });

    after(function () {
      return session.knex.schema.dropTableIfExists('generated_id_test');
    });

    before(function () {
      TestModel = function TestModel() {
        Model.apply(this, arguments);
      };

      Model.extend(TestModel);

      TestModel.tableName = 'generated_id_test';
      TestModel.idColumn = 'idCol';
      TestModel.knex(session.knex);

      TestModel.prototype.$beforeInsert = function () {
        this.idCol = 'someRandomId';
      };
    });

    it('should return the generated id when inserted', function () {
      return TestModel.query().insert({value: 'hello'}).then(function (ret) {
        expect(ret.idCol).to.equal('someRandomId');
        return session.knex(TestModel.tableName);
      }).then(function (rows) {
        expect(rows[0]).to.eql({value: 'hello', idCol: 'someRandomId'});
      });
    });

  });

  describe('zero value in relation column', function () {
    var Table1;
    var Table2;

    before(function () {
      return session.knex.schema
        .dropTableIfExists('table1')
        .dropTableIfExists('table2')
        .createTable('table1', function (table) {
          table.increments('id').primary();
          table.integer('value').notNullable();
        })
        .createTable('table2', function (table) {
          table.increments('id').primary();
          table.integer('value').notNullable();
        });
    });

    after(function () {
      return Promise.all([
        session.knex.schema.dropTableIfExists('table1'),
        session.knex.schema.dropTableIfExists('table2')
      ]);
    });

    before(function () {
      Table1 = function TestModel() {
        Model.apply(this, arguments);
      };

      Table2 = function TestModel() {
        Model.apply(this, arguments);
      };

      Model.extend(Table1);
      Model.extend(Table2);

      Table1.tableName = 'table1';
      Table2.tableName = 'table2';

      Table1.knex(session.knex);
      Table2.knex(session.knex);

      Table1.relationMappings = {
        relation: {
          relation: Model.HasManyRelation,
          modelClass: Table2,
          join: {
            from: 'table1.value',
            to: 'table2.value'
          }
        }
      };
    });

    before(function () {
      return Promise.all([
        Table1.query().insert({id: 1, value: 0}),
        Table1.query().insert({id: 2, value: 1}),
        Table2.query().insert({id: 1, value: 0}),
        Table2.query().insert({id: 2, value: 1})
      ])
    });

    it('should work with zero value', function () {
      return Table1
        .query()
        .findById(1)
        .then(function (model) {
          return model.$relatedQuery('relation');
        })
        .then(function (models) {
          expect(models).to.eql([{id: 1, value: 0}]);
        });
    });

  });

  if (session.isMySql()) {
    describe('mysql binary columns', function () {
      var TestModel;

      before(function () {
        return session.knex.schema
          .dropTableIfExists('mysql_binary_test')
          .createTable('mysql_binary_test', function (table) {
            table.increments('id').primary();
            table.binary('binary', 4);
          });
      });

      after(function () {
        return session.knex.schema.dropTableIfExists('mysql_binary_test');
      });

      before(function () {
        TestModel = function TestModel() {
          Model.apply(this, arguments);
        };

        Model.extend(TestModel);

        TestModel.tableName = 'mysql_binary_test';
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

        for (var i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }

        return true;
      }

      it('#insert should insert a buffer', function () {
        return TestModel.query().insert({binary: buffer()}).then(function (ret) {
          expect(bufferEquals(buffer(), ret.binary)).to.equal(true);
          return session.knex(TestModel.tableName);
        }).then(function (rows) {
          expect(bufferEquals(buffer(), rows[0].binary)).to.equal(true);
        });
      });

    });
  }

  describe('model with `length` property', function () {
    var TestModel;

    before(function () {
      return session.knex.schema
        .dropTableIfExists('model_with_length_test')
        .createTable('model_with_length_test', function (table) {
          table.increments('id');
          table.integer('length');
        });
    });

    after(function () {
      return session.knex.schema.dropTableIfExists('model_with_length_test');
    });

    before(function () {
      TestModel = function TestModel() {
        Model.apply(this, arguments);
      };

      Model.extend(TestModel);

      TestModel.tableName = 'model_with_length_test';
      TestModel.knex(session.knex);
    });

    it('should insert', function () {
      return TestModel.query().insert({length: 10}).then(function (model) {
        expect(model).to.eql({id: 1, length: 10});
        return session.knex(TestModel.tableName);
      }).then(function (rows) {
        expect(rows.length).to.equal(1);
        expect(rows[0]).to.eql({id: 1, length: 10});
      });
    });
  });

  describe('aggregate methods with relations', function () {

    beforeEach(function () {
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

    it('count of HasManyRelation', function () {
      return session.models.Model1
        .query()
        .select('Model1.*')
        .count('model1Relation2.id_col as relCount')
        .joinRelation('model1Relation2')
        .groupBy('Model1.id')
        .orderBy('Model1.model1Prop1')
        .then(function (models) {
          expect(models[0].relCount).to.equal(3);
          expect(models[1].relCount).to.equal(2);
        });
    });

  });

  describe('multiple results with a one-to-one relation', function () {

    beforeEach(function () {
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

    it('belongs to one relation', function () {
      return session.models.Model1.query().whereIn('id', [1, 3]).eager('model1Relation1').then(function (models) {
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

    it('has one relation', function () {
      return session.models.Model1.query().whereIn('id', [2, 4]).eager('model1Relation1Inverse').then(function (models) {
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

  describe('using unbound models by passing a knex to query', function () {
    var Model1 = session.unboundModels.Model1;
    var Model2 = session.unboundModels.Model2;

    beforeEach(function () {
      // This tests insertGraph.
      return session.populate([]).then(function () {
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

    it('eager', function () {
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
        ]).then(function (results) {
          results.forEach(function (models) {
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

    describe('$relatedQuery', function () {

      it('fetch', function () {
        return Promise.all([
          Model1.query(session.knex).findById(1).then(function (model) {
            return model.$relatedQuery('model1Relation1', session.knex);
          }),

          Model1.query(session.knex).findById(2).then(function (model) {
            return model.$relatedQuery('model1Relation1Inverse', session.knex);
          }),

          Model1.query(session.knex).findById(1).then(function (model) {
            return model.$relatedQuery('model1Relation2', session.knex);
          }),

          Model2.query(session.knex).findById(2).then(function (model) {
            return model.$relatedQuery('model2Relation1', session.knex);
          })
        ]).then(function (results) {
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

    describe('$query', function () {

      it('fetch', function () {
        return Promise.all([
          Model1.query(session.knex).findById(1).then(function (model) {
            return model.$query(session.knex);
          })
        ]).then(function (model) {
          expect(model).to.eql([{
            id: 1,
            model1Id: 2,
            model1Prop1: 'hello 1',
            model1Prop2: null,
            $afterGetCalled: 1
          }]);
        });
      });

      it('insert', function () {
        return Model1.fromJson({model1Prop1: 'foo', id: 100}).$query(session.knex).insert().then(function (model) {
          expect(model).to.eql({
            id: 100,
            model1Prop1: 'foo',
            $afterInsertCalled: 1,
            $beforeInsertCalled: 1
          });
        });
      });

      it('insertAndFetch', function () {
        return Model1.fromJson({model1Prop1: 'foo', id: 101}).$query(session.knex).insertAndFetch().then(function (model) {
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

    it('joinRelation (BelongsToOneRelation)', function () {
      return Model1
        .query(session.knex)
        .select('Model1.id as id', 'model1Relation1.id as relId')
        .innerJoinRelation('model1Relation1')
        .then(function (models) {
          expect(_.sortBy(models, 'id')).to.eql([
            {id: 1, relId: 2, $afterGetCalled: 1},
            {id: 2, relId: 3, $afterGetCalled: 1},
            {id: 3, relId: 4, $afterGetCalled: 1},
            {id: 6, relId: 7, $afterGetCalled: 1}
          ]);
        });
    });

    it('joinRelation (ManyToManyRelation)', function () {
      return Model1
        .query(session.knex)
        .select('Model1.id as id', 'model1Relation3.id_col as relId')
        .innerJoinRelation('model1Relation3')
        .then(function (models) {
          expect(_.sortBy(models, 'id')).to.eql([
            {id: 5, relId: 2, $afterGetCalled: 1},
            {id: 6, relId: 2, $afterGetCalled: 1}
          ]);
        });
    });

    it('should fail with a descriptive error message if knex is not provided', function () {
      return Promise.all([
        Promise.try(function () {
          return Model1
            .query()
            .findById(1)
            .eager('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]');
        }).reflect(),

        Promise.try(function () {
          return Model1
            .query()
            .findById(1)
            .eagerAlgorithm(Model1.JoinEagerAlgorithm)
            .eager('[model1Relation1, model1Relation2.model2Relation1.[model1Relation1, model1Relation2]]');
        }).reflect(),

        Promise.try(function () {
          return Model1.query();
        }).reflect(),

        Promise.try(function () {
          return Model1.query().where('id', 1);
        }).reflect(),

        Promise.try(function () {
          return Model1.query().joinRelation('model1Relation1');
        }).reflect(),

        Model1.query(session.knex).findById(1).then(function (model) {
          return model.$relatedQuery('model1Relation1');
        }).reflect(),

        Model1.query(session.knex).findById(2).then(function (model) {
          return model.$relatedQuery('model1Relation1Inverse');
        }).reflect(),

        Model1.query(session.knex).findById(1).then(function (model) {
          return model.$relatedQuery('model1Relation2');
        }).reflect(),

        Model2.query(session.knex).findById(2).then(function (model) {
          return model.$relatedQuery('model2Relation1');
        }).reflect(),

        Model1.query(session.knex).findById(1).then(function (model) {
          return model.$query();
        }).reflect(),

      ]).then(function (results) {
        results.forEach(function (result) {
          expect(result.isRejected()).to.equal(true);
          expect(result.reason().message).to.match(/no database connection available for a query for table .*. You need to bind the model class or the query to a knex instance./);
        })
      });
    });

    function sortRelations(models) {
      Model1.traverse(models, function (model) {
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

  describe('Eagerly loaded empty relations seem to short-circuit conversion to internal structure #292', function () {
    function A() {
      Model.apply(this, arguments);
    }

    Model.extend(A);
    A.tableName = 'a';

    function B() {
      Model.apply(this, arguments);
    }

    Model.extend(B);
    B.tableName = 'b';

    function C() {
      Model.apply(this, arguments);
    }

    Model.extend(C);
    C.tableName = 'c';

    function D() {
      Model.apply(this, arguments);
    }

    Model.extend(D);
    D.tableName = 'd';

    A.relationMappings = {
      Bs: {
        relation: Model.HasManyRelation,
        modelClass: B,
        join: {
          from: 'a.id',
          to: 'b.aId',
        },
      },
    };

    B.relationMappings = {
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

    beforeEach(function () {
      return session.knex.schema
        .dropTableIfExists('b_c')
        .dropTableIfExists('b_d')
        .dropTableIfExists('b')
        .dropTableIfExists('a')
        .dropTableIfExists('c')
        .dropTableIfExists('d')
        .createTable('a', function (table) {
          table.integer('id').primary();
        })
        .createTable('b', function (table) {
          table.integer('id').primary();
          table.integer('aId').references('a.id');
        })
        .createTable('c', function (table) {
          table.integer('id').primary();
        })
        .createTable('d', function (table) {
          table.integer('id').primary();
        })
        .createTable('b_c', function (table) {
          table.integer('bId').references('b.id').onDelete('CASCADE');
          table.integer('cId').references('c.id').onDelete('CASCADE');
        })
        .createTable('b_d', function (table) {
          table.integer('bId').references('b.id').onDelete('CASCADE');
          table.integer('dId').references('d.id').onDelete('CASCADE');
        })
        .then(function () {
          return Promise.all([
            session.knex('a').insert({id: 1}),
            session.knex('d').insert({id: 1}),
            session.knex('d').insert({id: 2})
          ]).then(function () {
            return session.knex('b').insert({id: 1, aId: 1});
          }).then(function () {
            return Promise.all([
              session.knex('b_d').insert({bId: 1, dId: 1}),
              session.knex('b_d').insert({bId: 1, dId: 2})
            ]);
          })
        });
    });

    afterEach(function () {
      return session.knex.schema
        .dropTableIfExists('b_c')
        .dropTableIfExists('b_d')
        .dropTableIfExists('b')
        .dropTableIfExists('a')
        .dropTableIfExists('c')
        .dropTableIfExists('d')
    });

    it('the test', function () {
      return A.query(session.knex)
        .eagerAlgorithm(Model.JoinEagerAlgorithm)
        .eager('Bs.[Cs, Ds]')
        .then(function (results) {
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

  describe('Default values not set with .insertGraph() in 0.7.2 #325', function () {
    var TestModel;

    before(function () {
      return session.knex.schema
        .dropTableIfExists('default_values_note_set_test')
        .createTable('default_values_note_set_test', function (table) {
          table.increments('id').primary();
          table.string('value1');
          table.string('value2');
        });
    });

    after(function () {
      return session.knex.schema.dropTableIfExists('default_values_note_set_test');
    });

    before(function () {
      TestModel = function TestModel() {
        Model.apply(this, arguments);
      };

      Model.extend(TestModel);

      TestModel.tableName = 'default_values_note_set_test';
      TestModel.knex(session.knex);

      TestModel.jsonSchema = {
        type: 'object',
        properties: {
          id: {type: 'integer'},
          value1: {type: 'string', default: 'foo'},
          value2: {type: 'string', default: 'bar'},
        }
      }
    });

    beforeEach(function () {
      return TestModel.query().delete();
    });

    it('insert should set the defaults', function () {
      return TestModel
        .query()
        .insert({value1: 'hello'})
        .then(function (model) {
          expect(model.value1).to.equal('hello');
          expect(model.value2).to.equal('bar');
          return session.knex(TestModel.tableName);
        })
        .then(function (rows) {
          expect(rows[0].value1).to.equal('hello');
          expect(rows[0].value2).to.equal('bar');
        });
    });

    it('insertGraph should set the defaults', function () {
      return TestModel
        .query()
        .insertGraph({value1: 'hello'})
        .then(function (model) {
          expect(model.value1).to.equal('hello');
          expect(model.value2).to.equal('bar');
          return session.knex(TestModel.tableName);
        })
        .then(function (rows) {
          expect(rows[0].value1).to.equal('hello');
          expect(rows[0].value2).to.equal('bar');
        });
    });

  });
};
