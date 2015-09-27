var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');
var expectPartEql = require('./utils').expectPartialEqual;
var ValidationError = require('../../lib/ValidationError');

module.exports = function (session) {
  var Model1 = session.models.Model1;
  var Model2 = session.models.Model2;

  describe('Model update queries', function () {

    describe('.query().update()', function () {

      beforeEach(function () {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1',
          model1Relation2: [{
            idCol: 1,
            model2Prop1: 'text 1',
            model2Prop2: 2
          }, {
            idCol: 2,
            model2Prop1: 'text 2',
            model2Prop2: 1
          }]
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }, {
          id: 3,
          model1Prop1: 'hello 3'
        }]);
      });

      it('should update a model (1)', function () {
        // Should ignore the id.
        var model = Model1.fromJson({id: 666, model1Prop1: 'updated text'});

        return Model1
          .query()
          .update(model)
          .where('id', '=', 2)
          .then(function (updated) {
            expect(updated).to.be.a(Model1);
            expect(updated.$beforeUpdateCalled).to.equal(true);
            expect(updated.$afterUpdateCalled).to.equal(true);
            expectPartEql(updated, {model1Prop1: 'updated text'});
            return session.knex('Model1').orderBy('id');
          })
          .then(function (rows) {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should accept json', function () {
        return Model1
          .query()
          .update({id: 666, model1Prop1: 'updated text'})
          .where('id', '=', 2)
          .then(function (updated) {
            expect(updated).to.be.a(Model1);
            expect(updated.$beforeUpdateCalled).to.equal(true);
            expect(updated.$afterUpdateCalled).to.equal(true);
            expectPartEql(updated, {model1Prop1: 'updated text'});
            return session.knex('Model1').orderBy('id');
          })
          .then(function (rows) {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should update a model (2)', function () {
        // Should ignore the id.
        var model = Model2.fromJson({idCol: 666, model2Prop1: 'updated text'});

        return Model2
          .query()
          .update(model)
          .where('id_col', '=', 1)
          .then(function (updated) {
            expect(updated).to.be.a(Model2);
            expectPartEql(updated, {model2Prop1: 'updated text'});
            return session.knex('model_2').orderBy('id_col');
          })
          .then(function (rows) {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id_col: 1, model_2_prop_1: 'updated text', model_2_prop_2: 2});
            expectPartEql(rows[1], {id_col: 2, model_2_prop_1: 'text 2', model_2_prop_2: 1});
          });
      });

      it('should update multiple', function () {
        return Model1
          .query()
          .update({id: 666, model1Prop1: 'updated text'})
          .where('model1Prop1', '<', 'hello 3')
          .then(function (updated) {
            expect(updated).to.be.a(Model1);
            expect(updated.$beforeUpdateCalled).to.equal(true);
            expect(updated.$afterUpdateCalled).to.equal(true);
            expectPartEql(updated, {model1Prop1: 'updated text'});
            return session.knex('Model1').orderBy('id');
          })
          .then(function (rows) {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should validate (1)', function (done) {
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
          .update({model1Prop1: 666})
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(function (err) {
            expect(err).to.be.a(ValidationError);
            return session.knex(Model1.tableName);
          })
          .then(function (rows) {
            expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
            done();
          });
      });

      it('should validate (2)', function (done) {
        var ModelWithSchema = subClassWithSchema(Model1, {
          type: 'object',
          required: ['model1Prop2'],
          properties: {
            id: {type: ['number', 'null']},
            model1Prop1: {type: 'string'},
            model1Prop2: {type: 'number'}
          }
        });

        ModelWithSchema
          .query()
          .update({model1Prop1: 'text'})
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(function (err) {
            expect(err).to.be.a(ValidationError);
            return session.knex(Model1.tableName);
          })
          .then(function (rows) {
            expect(_.pluck(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
            done();
          });
      });

    });

    describe('.$query().update()', function () {

      beforeEach(function () {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1'
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }]);
      });

      it('should update a model (1)', function () {
        return Model1
          .fromJson({id: 1})
          .$query()
          .update({model1Prop1: 'updated text'})
          .then(function (updated) {
            expect(updated).to.be.a(Model1);
            expect(updated.$beforeUpdateCalled).to.equal(true);
            expect(updated.$afterUpdateCalled).to.equal(true);
            expectPartEql(updated, {model1Prop1: 'updated text'});
            return session.knex('Model1').orderBy('id');
          })
          .then(function (rows) {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
          });
      });

      it('should update a model (2)', function () {
        var model = Model1.fromJson({id: 1, model1Prop1: 'updated text'});

        return model
          .$query()
          .update()
          .then(function (updated) {
            expect(updated).to.be.a(Model1);
            expect(updated.$beforeUpdateCalled).to.equal(true);
            expect(updated.$afterUpdateCalled).to.equal(true);
            expectPartEql(updated, {model1Prop1: 'updated text'});
            return session.knex('Model1').orderBy('id');
          })
          .then(function (rows) {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
          });
      });

      it('model edits in $beforeUpdate should get into database query', function () {
        var model = Model1.fromJson({id: 1});

        model.$beforeUpdate = function () {
          var self = this;
          return Promise.delay(1).then(function () {
            self.model1Prop1 = 'updated text';
          });
        };

        return model
          .$query()
          .update()
          .then(function (updated) {
            expect(updated).to.be.a(Model1);
            expectPartEql(updated, {model1Prop1: 'updated text'});
            return session.knex('Model1').orderBy('id');
          })
          .then(function (rows) {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
          });
      });

    });

    describe('.$relatedQuery().update()', function () {

      describe('one to one relation', function () {
        var parent1;
        var parent2;

        beforeEach(function () {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation1: {
              id: 2,
              model1Prop1: 'hello 2'
            }
          }, {
            id: 3,
            model1Prop1: 'hello 3',
            model1Relation1: {
              id: 4,
              model1Prop1: 'hello 4'
            }
          }]);
        });

        beforeEach(function () {
          return Model1
            .query()
            .then(function (parents) {
              parent1 = _.find(parents, {id: 1});
              parent2 = _.find(parents, {id: 3});
            });
        });

        it('should update a related object (1)', function () {
          return parent1
            .$relatedQuery('model1Relation1')
            .update({model1Prop1: 'updated text'})
            .then(function (updated) {
              expect(updated).to.be.a(Model1);
              expect(updated.$beforeUpdateCalled).to.equal(true);
              expect(updated.$afterUpdateCalled).to.equal(true);
              expectPartEql(updated, {model1Prop1: 'updated text'});
              return session.knex('Model1').orderBy('id');
            })
            .then(function (rows) {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'hello 4'});
            });
        });

        it('should update a related object (2)', function () {
          return parent2
            .$relatedQuery('model1Relation1')
            .update({model1Prop1: 'updated text', model1Prop2: 1000})
            .then(function (updated) {
              expect(updated).to.be.a(Model1);
              expectPartEql(updated, {model1Prop1: 'updated text'});
              return session.knex('Model1').orderBy('id');
            })
            .then(function (rows) {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'updated text', model1Prop2: 1000});
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
            }, {
              idCol: 2,
              model2Prop1: 'text 2',
              model2Prop2: 5
            }, {
              idCol: 3,
              model2Prop1: 'text 3',
              model2Prop2: 4
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 4,
              model2Prop1: 'text 4',
              model2Prop2: 3
            }, {
              idCol: 5,
              model2Prop1: 'text 5',
              model2Prop2: 2
            }, {
              idCol: 6,
              model2Prop1: 'text 6',
              model2Prop2: 1
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

        it('should update a related object', function () {
          return parent1
            .$relatedQuery('model1Relation2')
            .update({model2Prop1: 'updated text'})
            .where('id_col', 2)
            .then(function (updated) {
              expect(updated).to.be.a(Model2);
              expect(updated.$beforeUpdateCalled).to.equal(true);
              expect(updated.$afterUpdateCalled).to.equal(true);
              expectPartEql(updated, {model2Prop1: 'updated text'});
              return session.knex('model_2').orderBy('id_col');
            })
            .then(function (rows) {
              expect(rows).to.have.length(6);
              expectPartEql(rows[0], {id_col: 1, model_2_prop_1: 'text 1'});
              expectPartEql(rows[1], {id_col: 2, model_2_prop_1: 'updated text', model_2_prop_2: 5});
              expectPartEql(rows[2], {id_col: 3, model_2_prop_1: 'text 3'});
              expectPartEql(rows[3], {id_col: 4, model_2_prop_1: 'text 4'});
              expectPartEql(rows[4], {id_col: 5, model_2_prop_1: 'text 5'});
              expectPartEql(rows[5], {id_col: 6, model_2_prop_1: 'text 6'});
            });
        });

        it('should update multiple related objects', function () {
          return parent1
            .$relatedQuery('model1Relation2')
            .update({model2Prop1: 'updated text'})
            .where('model_2_prop_2', '<', 6)
            .where('model_2_prop_1', 'like', 'text %')
            .then(function (updated) {
              expect(updated).to.be.a(Model2);
              expectPartEql(updated, {model2Prop1: 'updated text'});
              return session.knex('model_2').orderBy('id_col');
            })
            .then(function (rows) {
              expect(rows).to.have.length(6);
              expectPartEql(rows[0], {id_col: 1, model_2_prop_1: 'text 1'});
              expectPartEql(rows[1], {id_col: 2, model_2_prop_1: 'updated text', model_2_prop_2: 5});
              expectPartEql(rows[2], {id_col: 3, model_2_prop_1: 'updated text', model_2_prop_2: 4});
              expectPartEql(rows[3], {id_col: 4, model_2_prop_1: 'text 4'});
              expectPartEql(rows[4], {id_col: 5, model_2_prop_1: 'text 5'});
              expectPartEql(rows[5], {id_col: 6, model_2_prop_1: 'text 6'});
            });
        });

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
              }, {
                id: 4,
                model1Prop1: 'blaa 2',
                model1Prop2: 5
              }, {
                id: 5,
                model1Prop1: 'blaa 3',
                model1Prop2: 4
              }]
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 2,
              model2Prop1: 'text 2',
              model2Relation1: [{
                id: 6,
                model1Prop1: 'blaa 4',
                model1Prop2: 3
              }, {
                id: 7,
                model1Prop1: 'blaa 5',
                model1Prop2: 2
              }, {
                id: 8,
                model1Prop1: 'blaa 6',
                model1Prop2: 1
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

        it('should update a related object', function () {
          return parent1
            .$relatedQuery('model2Relation1')
            .update({model1Prop1: 'updated text'})
            .where('Model1.id', 5)
            .then(function (updated) {
              expect(updated).to.be.a(Model1);
              expect(updated.$beforeUpdateCalled).to.equal(true);
              expect(updated.$afterUpdateCalled).to.equal(true);
              expectPartEql(updated, {model1Prop1: 'updated text'});
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(function (rows) {
              expect(rows).to.have.length(8);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'blaa 1'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'blaa 2'});
              expectPartEql(rows[4], {id: 5, model1Prop1: 'updated text'});
              expectPartEql(rows[5], {id: 6, model1Prop1: 'blaa 4'});
              expectPartEql(rows[6], {id: 7, model1Prop1: 'blaa 5'});
              expectPartEql(rows[7], {id: 8, model1Prop1: 'blaa 6'});
            });
        });

        it('should update multiple objects (1)', function () {
          return parent2
            .$relatedQuery('model2Relation1')
            .update({model1Prop1: 'updated text', model1Prop2: 123})
            .where('model1Prop1', 'like', 'blaa 4')
            .orWhere('model1Prop1', 'like', 'blaa 6')
            .then(function (updated) {
              expect(updated).to.be.a(Model1);
              expectPartEql(updated, {model1Prop1: 'updated text'});
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(function (rows) {
              expect(rows).to.have.length(8);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'blaa 1'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'blaa 2'});
              expectPartEql(rows[4], {id: 5, model1Prop1: 'blaa 3'});
              expectPartEql(rows[5], {id: 6, model1Prop1: 'updated text', model1Prop2: 123});
              expectPartEql(rows[6], {id: 7, model1Prop1: 'blaa 5'});
              expectPartEql(rows[7], {id: 8, model1Prop1: 'updated text', model1Prop2: 123});
            });
        });

        it('should update multiple objects (2)', function () {
          return parent1
            .$relatedQuery('model2Relation1')
            .update({model1Prop1: 'updated text', model1Prop2: 123})
            .where('model1Prop2', '<', 6)
            .then(function (updated) {
              expect(updated).to.be.a(Model1);
              expectPartEql(updated, {model1Prop1: 'updated text'});
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(function (rows) {
              expect(rows).to.have.length(8);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'blaa 1'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'updated text', model1Prop2: 123});
              expectPartEql(rows[4], {id: 5, model1Prop1: 'updated text', model1Prop2: 123});
              expectPartEql(rows[5], {id: 6, model1Prop1: 'blaa 4'});
              expectPartEql(rows[6], {id: 7, model1Prop1: 'blaa 5'});
              expectPartEql(rows[7], {id: 8, model1Prop1: 'blaa 6'});
            });
        });
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
