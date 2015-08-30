var _ = require('lodash');
var utils = require('../../lib/utils')
var expect = require('expect.js');
var ValidationError = require('../../lib/ValidationError');

module.exports = function (session) {
  var Model1 = session.models.Model1;
  var Model2 = session.models.Model2;

  describe('Model insert queries', function () {

    describe('.query().insert()', function () {

      beforeEach(function () {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1'
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }]);
      });

      it('should insert new model', function () {
        var model = Model1.fromJson({model1Prop1: 'hello 3'});

        return Model1
          .query()
          .insert(model)
          .then(function (inserted) {
            expect(inserted).to.be.a(Model1);
            expect(inserted.$beforeInsertCalled).to.equal(true);
            expect(inserted.$afterInsertCalled).to.equal(true);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.tableName);
          })
          .then(function (rows) {
            expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      if (utils.isPostgres(session.knex)) {
        it('should accept an array', function () {
          var models = [Model1.fromJson({model1Prop1: 'hello 3'}), Model1.fromJson({model1Prop1: 'hello 4'})];

          return Model1
            .query()
            .insert(models)
            .then(function (inserted) {
              expect(inserted[0]).to.be.a(Model1);
              expect(inserted[1]).to.be.a(Model1);
              expect(inserted[0].$beforeInsertCalled).to.equal(true);
              expect(inserted[0].$afterInsertCalled).to.equal(true);
              expect(inserted[1].$beforeInsertCalled).to.equal(true);
              expect(inserted[1].$afterInsertCalled).to.equal(true);
              expect(_.pluck(inserted, 'id').sort()).to.eql([3, 4]);
              expect(_.pluck(inserted, 'model1Prop1').sort()).to.eql(['hello 3', 'hello 4']);
              return session.knex(Model1.tableName);
            })
            .then(function (rows) {
              expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3', 'hello 4']);
              expect(_.pluck(rows, 'id').sort()).to.eql([1, 2, 3, 4]);
            });
        });
      }

      it('should accept json', function () {
        return Model1
          .query()
          .insert({model1Prop1: 'hello 3'})
          .then(function (inserted) {
            expect(inserted).to.be.a(Model1);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.tableName);
          })
          .then(function (rows) {
            expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      if (utils.isPostgres(session.knex)) {
        it('should accept a json array', function () {
          return Model1
            .query()
            .insert([{model1Prop1: 'hello 3'}, {model1Prop1: 'hello 4'}])
            .then(function (inserted) {
              expect(inserted[0]).to.be.a(Model1);
              expect(inserted[1]).to.be.a(Model1);
              expect(_.pluck(inserted, 'id').sort()).to.eql([3, 4]);
              expect(_.pluck(inserted, 'model1Prop1').sort()).to.eql(['hello 3', 'hello 4']);
              return session.knex(Model1.tableName);
            })
            .then(function (rows) {
              expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3', 'hello 4']);
              expect(_.pluck(rows, 'id').sort()).to.eql([1, 2, 3, 4]);
            });
        });

        it('returning(\'*\') should return all columns', function () {
          return Model1
            .query()
            .insert({model1Prop1: 'hello 3'})
            .returning('*')
            .then(function (inserted) {
              expect(inserted).to.be.a(Model1);
              expect(inserted.$toJson()).to.eql({id: 3, model1Id: null, model1Prop1: 'hello 3', model1Prop2: null});
              return session.knex(Model1.tableName);
            })
            .then(function (rows) {
              expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
              expect(_.pluck(rows, 'id').sort()).to.eql([1, 2, 3]);
            });
        });

        it('returning(\'someColumn\', \'someOtherColumn\') should fail if the identifier is not in the list', function (done) {
          return Model1
            .query()
            .insert({model1Prop1: 'hello 3'})
            .returning(['model1Prop1', 'model1Prop2'])
            .then(function () {
              done(new Error('should not get here'));
            })
            .catch(function (err) {
              done();
            });
        });
      }

      it('should validate', function (done) {
        var ModelWithSchema = subClassWithSchema(Model1, {
          type: 'object',
          properties: {
            id: {type: ['number', 'null']},
            model1Prop1: {type: 'string'},
            model1Prop2: {type: 'number'}
          }
        });

        ModelWithSchema
          .query()
          .insert({model1Prop1: 666})
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(function (err) {
            expect(err).to.be.a(ValidationError);
            return session.knex(Model1.tableName);
          })
          .then(function (rows) {
            expect(_.pluck(rows, 'id').sort()).to.eql([1, 2]);
            done();
          });
      });

    });

    describe('.$query().insert()', function () {

      beforeEach(function () {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1'
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }]);
      });

      it('should insert new model', function () {
        return Model1
          .fromJson({model1Prop1: 'hello 3'})
          .$query()
          .insert()
          .then(function (inserted) {
            expect(inserted).to.be.a(Model1);
            expect(inserted.$beforeInsertCalled).to.equal(true);
            expect(inserted.$afterInsertCalled).to.equal(true);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.tableName);
          })
          .then(function (rows) {
            expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

    });

    describe('.$relatedQuery().insert()', function () {

      describe('one to one relation', function () {
        var parent1;
        var parent2;

        beforeEach(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1'
          }, {
            id: 2,
            model1Prop1: 'hello 3'
          }]);
        });

        beforeEach(function () {
          return Model1
            .query()
            .then(function (parents) {
              parent1 = _.find(parents, {id: 1});
              parent2 = _.find(parents, {id: 2});
            });
        });

        it('should insert a related object', function () {
          var inserted = null;

          // First check that there is nothing in the relation.
          return parent1
            .$relatedQuery('model1Relation1')
            .then(function (model) {
              expect(parent1.model1Id).to.equal(null);
              expect(model).to.eql([]);

              return parent1
                .$relatedQuery('model1Relation1')
                .insert(Model1.fromJson({model1Prop1: 'test'}));
            })
            .then(function ($inserted) {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(true);
              expect(inserted.$afterInsertCalled).to.equal(true);
              expect(inserted.id).to.equal(3);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              expect(parent1.model1Relation1).to.equal(inserted);
              return session.knex('Model1');
            })
            .then(function (rows) {
              expect(rows).to.have.length(3);
              expect(_.find(rows, {id: parent1.id}).model1Id).to.equal(3);
              expect(_.find(rows, {id: inserted.id}).model1Prop1).to.equal('test');
            });
        });

        it('should accept json', function () {
          var inserted = null;
          return parent1
            .$relatedQuery('model1Relation1')
            .insert({model1Prop1: 'inserted'})
            .then(function ($inserted) {
              inserted = $inserted;
              expect(inserted.id).to.equal(3);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('inserted');
              expect(parent1.model1Relation1).to.equal(inserted);
              return session.knex('Model1');
            })
            .then(function (rows) {
              expect(rows).to.have.length(3);
              expect(_.find(rows, {id: parent1.id}).model1Id).to.equal(3);
              expect(_.find(rows, {id: inserted.id}).model1Prop1).to.equal('inserted');
            });
        });

        it('insert replaces old related object, but doesn\'t remove it', function () {
          var inserted = null;
          return parent1
            .$relatedQuery('model1Relation1')
            .insert({model1Prop1: 'inserted'})
            .then(function () {
              return parent1
                .$relatedQuery('model1Relation1')
                .insert({model1Prop1: 'inserted 2'});
            })
            .then(function ($inserted) {
              inserted = $inserted;
              expect(inserted).to.be.a(Model1);
              expect(inserted.id).to.equal(4);
              expect(inserted.model1Prop1).to.equal('inserted 2');
              expect(parent1.model1Relation1).to.equal(inserted);
              return session.knex('Model1');
            })
            .then(function (rows) {
              expect(rows).to.have.length(4);
              expect(_.find(rows, {id: parent1.id}).model1Id).to.equal(4);
              expect(_.find(rows, {id: inserted.id}).model1Prop1).to.equal('inserted 2');
            });
        });

      });

      describe('one to many relation', function () {
        var parent1;
        var parent2;

        beforeEach(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [{
              idCol: 1,
              model2Prop1: 'text 1',
              model2Prop2: 6
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 2,
              model2Prop1: 'text 4',
              model2Prop2: 3
            }]
          }]);
        });

        beforeEach(function () {
          return Model1
            .query()
            .then(function (parents) {
              parent1 = _.find(parents, {id: 1});
              parent2 = _.find(parents, {id: 2});
            });
        });

        it('should insert a related object', function () {
          var inserted = null;
          var originalRelated = null;

          return parent1
            .$relatedQuery('model1Relation2')
            .then(function (models) {
              originalRelated = models;
              expect(models).to.have.length(1);

              return parent1
                .$relatedQuery('model1Relation2')
                .insert(Model2.fromJson({model2Prop1: 'test'}));
            })
            .then(function ($inserted) {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(true);
              expect(inserted.$afterInsertCalled).to.equal(true);
              expect(inserted.idCol).to.equal(3);
              expect(inserted).to.be.a(Model2);
              expect(inserted.model2Prop1).to.equal('test');
              expect(inserted.model1Id).to.equal(parent1.id);
              expect(parent1.model1Relation2).to.eql(_.flatten([originalRelated, inserted]));
              return session.knex('model_2');
            })
            .then(function (rows) {
              expect(rows).to.have.length(3);
              expect(_.find(rows, {id_col: inserted.idCol}).model_1_id).to.equal(parent1.id);
              expect(_.find(rows, {id_col: inserted.idCol}).model_2_prop_1).to.equal('test');
            });
        });

        it('should accept json', function () {
          var inserted = null;
          var originalRelated = null;

          return parent1
            .$relatedQuery('model1Relation2')
            .then(function (models) {
              originalRelated = models;
              expect(models).to.have.length(1);

              return parent1
                .$relatedQuery('model1Relation2')
                .insert({model2Prop1: 'test'});
            })
            .then(function ($inserted) {
              inserted = $inserted;
              expect(inserted.idCol).to.equal(3);
              expect(inserted).to.be.a(Model2);
              expect(inserted.model2Prop1).to.equal('test');
              expect(inserted.model1Id).to.equal(parent1.id);
              expect(parent1.model1Relation2).to.eql(_.flatten([originalRelated, inserted]));
              return session.knex('model_2');
            })
            .then(function (rows) {
              expect(rows).to.have.length(3);
              expect(_.find(rows, {id_col: inserted.idCol}).model_1_id).to.equal(parent1.id);
              expect(_.find(rows, {id_col: inserted.idCol}).model_2_prop_1).to.equal('test');
            });
        });

        if (utils.isPostgres(session.knex)) {
          it('should accept an array', function () {
            var inserted = null;
            var originalRelated = null;

            return parent1
              .$relatedQuery('model1Relation2')
              .then(function (models) {
                originalRelated = models;
                expect(models).to.have.length(1);

                return parent1
                  .$relatedQuery('model1Relation2')
                  .insert([
                    Model2.fromJson({model2Prop1: 'test 1'}),
                    Model2.fromJson({model2Prop1: 'test 2'})
                  ]);
              })
              .then(function ($inserted) {
                inserted = $inserted;
                expect(inserted[0].idCol).to.equal(3);
                expect(inserted[1].idCol).to.equal(4);
                expect(inserted[0]).to.be.a(Model2);
                expect(inserted[1]).to.be.a(Model2);
                expect(inserted[0].model2Prop1).to.equal('test 1');
                expect(inserted[1].model2Prop1).to.equal('test 2');
                expect(inserted[0].model1Id).to.equal(parent1.id);
                expect(inserted[1].model1Id).to.equal(parent1.id);
                expect(parent1.model1Relation2).to.eql(_.flatten([originalRelated, inserted]));
                return session.knex('model_2');
              })
              .then(function (rows) {
                expect(rows).to.have.length(4);
                expect(_.find(rows, {id_col: inserted[0].idCol}).model_1_id).to.equal(parent1.id);
                expect(_.find(rows, {id_col: inserted[0].idCol}).model_2_prop_1).to.equal('test 1');
                expect(_.find(rows, {id_col: inserted[1].idCol}).model_1_id).to.equal(parent1.id);
                expect(_.find(rows, {id_col: inserted[1].idCol}).model_2_prop_1).to.equal('test 2');
              });
          });

          it('should accept a json array', function () {
            var inserted = null;
            var originalRelated = null;

            return parent1
              .$relatedQuery('model1Relation2')
              .then(function (models) {
                originalRelated = models;
                expect(models).to.have.length(1);

                return parent1
                  .$relatedQuery('model1Relation2')
                  .insert([
                    {model2Prop1: 'test 1'},
                    {model2Prop1: 'test 2'}
                  ]);
              })
              .then(function ($inserted) {
                inserted = $inserted;
                expect(inserted[0].idCol).to.equal(3);
                expect(inserted[1].idCol).to.equal(4);
                expect(inserted[0]).to.be.a(Model2);
                expect(inserted[1]).to.be.a(Model2);
                expect(inserted[0].model2Prop1).to.equal('test 1');
                expect(inserted[1].model2Prop1).to.equal('test 2');
                expect(inserted[0].model1Id).to.equal(parent1.id);
                expect(inserted[1].model1Id).to.equal(parent1.id);
                expect(parent1.model1Relation2).to.eql(_.flatten([originalRelated, inserted]));
                return session.knex('model_2');
              })
              .then(function (rows) {
                expect(rows).to.have.length(4);
                expect(_.find(rows, {id_col: inserted[0].idCol}).model_1_id).to.equal(parent1.id);
                expect(_.find(rows, {id_col: inserted[0].idCol}).model_2_prop_1).to.equal('test 1');
                expect(_.find(rows, {id_col: inserted[1].idCol}).model_1_id).to.equal(parent1.id);
                expect(_.find(rows, {id_col: inserted[1].idCol}).model_2_prop_1).to.equal('test 2');
              });
          });
        }

      });

      describe('many to many relation', function () {
        var parent1;
        var parent2;

        beforeEach(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [{
              idCol: 1,
              model2Prop1: 'text 1',
              model2Relation1: [{
                id: 3,
                model1Prop1: 'blaa 1',
                model1Prop2: 6
              }]
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 2,
              model2Prop1: 'text 2',
              model2Relation1: [{
                id: 4,
                model1Prop1: 'blaa 2',
                model1Prop2: 3
              }]
            }]
          }]);
        });

        beforeEach(function () {
          return Model2
            .query()
            .then(function (parents) {
              parent1 = _.find(parents, {idCol: 1});
              parent2 = _.find(parents, {idCol: 2});
            });
        });

        it('should insert a related object', function () {
          var inserted = null;
          var originalRelated = null;

          return parent1
            .$relatedQuery('model2Relation1')
            .then(function (models) {
              originalRelated = models;
              expect(models).to.have.length(1);

              return parent1
                .$relatedQuery('model2Relation1')
                .insert(Model1.fromJson({model1Prop1: 'test'}));
            })
            .then(function ($inserted) {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(true);
              expect(inserted.$afterInsertCalled).to.equal(true);
              expect(inserted.id).to.equal(5);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              expect(parent1.model2Relation1).to.eql(_.flatten([originalRelated, inserted]));
              return session.knex('Model1');
            })
            .then(function (rows) {
              expect(rows).to.have.length(5);
              expect(_.find(rows, {id: inserted.id}).model1Prop1).to.equal('test');
              return session.knex('Model1Model2');
            })
            .then(function (rows) {
              expect(rows).to.have.length(3);
              expect(_.where(rows, {model1Id: inserted.id, model2Id: parent1.idCol})).to.have.length(1);
            });
        });

        it('should accept json', function () {
          var inserted = null;
          var originalRelated = null;

          return parent1
            .$relatedQuery('model2Relation1')
            .then(function (models) {
              originalRelated = models;
              expect(models).to.have.length(1);

              return parent1
                .$relatedQuery('model2Relation1')
                .insert({model1Prop1: 'test'});
            })
            .then(function ($inserted) {
              inserted = $inserted;
              expect(inserted.id).to.equal(5);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              expect(parent1.model2Relation1).to.eql(_.flatten([originalRelated, inserted]));
              return session.knex('Model1');
            })
            .then(function (rows) {
              expect(rows).to.have.length(5);
              expect(_.find(rows, {id: inserted.id}).model1Prop1).to.equal('test');
              return session.knex('Model1Model2');
            })
            .then(function (rows) {
              expect(rows).to.have.length(3);
              expect(_.where(rows, {model1Id: inserted.id, model2Id: parent1.idCol})).to.have.length(1);
            });
        });

        if (utils.isPostgres(session.knex)) {

          it('should accept an array', function () {
            var inserted = null;
            var originalRelated = null;

            return parent1
              .$relatedQuery('model2Relation1')
              .then(function (models) {
                originalRelated = models;
                expect(models).to.have.length(1);

                return parent1
                  .$relatedQuery('model2Relation1')
                  .insert([
                    Model1.fromJson({model1Prop1: 'test 1'}),
                    Model1.fromJson({model1Prop1: 'test 2'})
                  ]);
              })
              .then(function ($inserted) {
                inserted = $inserted;
                expect(inserted[0].id).to.equal(5);
                expect(inserted[1].id).to.equal(6);
                expect(inserted[0]).to.be.a(Model1);
                expect(inserted[1]).to.be.a(Model1);
                expect(inserted[0].model1Prop1).to.equal('test 1');
                expect(inserted[1].model1Prop1).to.equal('test 2');
                expect(parent1.model2Relation1).to.eql(_.flatten([originalRelated, inserted]));
                return session.knex('Model1');
              })
              .then(function (rows) {
                expect(rows).to.have.length(6);
                expect(_.find(rows, {id: inserted[0].id}).model1Prop1).to.equal('test 1');
                expect(_.find(rows, {id: inserted[1].id}).model1Prop1).to.equal('test 2');
                return session.knex('Model1Model2');
              })
              .then(function (rows) {
                expect(rows).to.have.length(4);
                expect(_.where(rows, {model1Id: inserted[0].id, model2Id: parent1.idCol})).to.have.length(1);
                expect(_.where(rows, {model1Id: inserted[1].id, model2Id: parent1.idCol})).to.have.length(1);
              });
          });

          it('should accept a json array', function () {
            var inserted = null;
            var originalRelated = null;

            return parent1
              .$relatedQuery('model2Relation1')
              .then(function (models) {
                originalRelated = models;
                expect(models).to.have.length(1);

                return parent1
                  .$relatedQuery('model2Relation1')
                  .insert([
                    {model1Prop1: 'test 1'},
                    {model1Prop1: 'test 2'}
                  ]);
              })
              .then(function ($inserted) {
                inserted = $inserted;
                expect(inserted[0].id).to.equal(5);
                expect(inserted[1].id).to.equal(6);
                expect(inserted[0]).to.be.a(Model1);
                expect(inserted[1]).to.be.a(Model1);
                expect(inserted[0].model1Prop1).to.equal('test 1');
                expect(inserted[1].model1Prop1).to.equal('test 2');
                expect(parent1.model2Relation1).to.eql(_.flatten([originalRelated, inserted]));
                return session.knex('Model1');
              })
              .then(function (rows) {
                expect(rows).to.have.length(6);
                expect(_.find(rows, {id: inserted[0].id}).model1Prop1).to.equal('test 1');
                expect(_.find(rows, {id: inserted[1].id}).model1Prop1).to.equal('test 2');
                return session.knex('Model1Model2');
              })
              .then(function (rows) {
                expect(rows).to.have.length(4);
                expect(_.where(rows, {model1Id: inserted[0].id, model2Id: parent1.idCol})).to.have.length(1);
                expect(_.where(rows, {model1Id: inserted[1].id, model2Id: parent1.idCol})).to.have.length(1);
              });
          });

        }

      });

    });

    function subClassWithSchema(Model, schema) {
      function SubModel() {
        Model.apply(this, arguments);
      }
      Model.extend(SubModel);
      SubModel.jsonSchema = schema;
      return SubModel;
    }

  });
};
