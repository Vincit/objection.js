'use strict';

const _ = require('lodash');
const expect = require('expect.js');
const Promise = require('bluebird');
const inheritModel = require('../../lib/model/inheritModel');
const expectPartEql = require('./../../testUtils/testUtils').expectPartialEqual;
const ValidationError = require('../../').ValidationError;

module.exports = (session) => {
  const Model1 = session.models.Model1;
  const Model2 = session.models.Model2;

  describe('Model patch queries', () => {

    describe('.query().patch()', () => {

      beforeEach(() => {
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

      it('should patch a model (1)', () => {
        let model = Model1.fromJson({model1Prop1: 'updated text'});

        return Model1
          .query()
          .patch(model)
          .where('id', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(model.$beforeUpdateCalled).to.equal(1);
            expect(model.$beforeUpdateOptions).to.eql({patch: true});
            expect(model.$afterUpdateCalled).to.equal(1);
            expect(model.$afterUpdateOptions).to.eql({patch: true});
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should patch a model (2)', () => {
        let model = Model2.fromJson({model2Prop1: 'updated text'});

        return Model2
          .query()
          .patch(model)
          .where('id_col', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('model_2').orderBy('id_col');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id_col: 1, model_2_prop_1: 'updated text', model_2_prop_2: 2});
            expectPartEql(rows[1], {id_col: 2, model_2_prop_1: 'text 2', model_2_prop_2: 1});
          });
      });

      it('should accept json', () => {
        return Model1
          .query()
          .patch({model1Prop1: 'updated text'})
          .where('id', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should accept subqueries and raw expressions (1)', () => {
        return Model1
          .query()
          .patch({
            model1Prop1: Model2.raw('(select max(??) from ??)', ["model_2_prop_1", "model_2"]),
            model1Prop2: Model2.query().sum('model_2_prop_2')
          })
          .where('id', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'text 2', model1Prop2: 3});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should accept subqueries and raw expressions (2)', () => {
        return Model1
          .query()
          .patch({
            model1Prop1: 'Morten',
            model1Prop2: Model2.knexQuery().sum('model_2_prop_2')
          })
          .where('id', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'Morten', model1Prop2: 3});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should patch multiple', () => {
        return Model1
          .query()
          .patch({model1Prop1: 'updated text'})
          .where('model1Prop1', '<', 'hello 3')
          .then(numUpdated => {
            expect(numUpdated).to.equal(2);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('increment should create patch', () => {
        return Model2
          .query()
          .increment('model2Prop2', 10)
          .where('id_col', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('model_2').orderBy('id_col');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id_col: 1, model_2_prop_2: 2});
            expectPartEql(rows[1], {id_col: 2, model_2_prop_2: 11});
          });
      });

      it('decrement should create patch', () => {
        return Model2
          .query()
          .decrement('model2Prop2', 10)
          .where('id_col', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('model_2').orderBy('id_col');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id_col: 1, model_2_prop_2: 2});
            expectPartEql(rows[1], {id_col: 2, model_2_prop_2: -9});
          });
      });

      it('should validate (1)', done => {
        let ModelWithSchema = subClassWithSchema(Model1, {
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
          .patch({model1Prop1: 100})
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err).to.be.a(ValidationError);
            return session.knex(Model1.tableName);
          })
          .then(rows => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
            done();
          })
          .catch(done);
      });

      it('should skip requirement validation', done => {
        let ModelWithSchema = subClassWithSchema(Model1, {
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
          .patch({model1Prop1: 'text'})
          .then(() => {
            return session.knex(Model1.tableName);
          })
          .then(rows => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['text', 'text', 'text']);
            done();
          })
          .catch(done)
      });

    });

    describe('.query().patchAndFetchById()', () => {

      beforeEach(() => {
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

      it('should patch and fetch a model', () => {
        let model = Model1.fromJson({model1Prop1: 'updated text'});

        return Model1
          .query()
          .patchAndFetchById(2, model)
          .then(fetchedModel => {
            expect(fetchedModel).to.equal(model);
            expect(fetchedModel).eql({
              id: 2,
              model1Prop1: 'updated text',
              model1Prop2: null,
              model1Id: null,
              $beforeUpdateCalled: true,
              $beforeUpdateOptions: {patch: true},
              $afterUpdateCalled: true,
              $afterUpdateOptions: {patch: true}
            });
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should fetch nothing if nothing is updated', () => {
        return Model1
          .query()
          .patchAndFetchById(2, {model1Prop1: 'updated text'})
          .where('id', -1)
          .then(fetchedModel => {
            expect(fetchedModel).to.equal(undefined);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
            expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
          });
      });
    });

    describe('.$query().patch()', () => {

      beforeEach(() => {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1'
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }]);
      });

      it('should patch a model (1)', () => {
        let model = Model1.fromJson({id: 1});

        return model
          .$query()
          .patch({model1Prop1: 'updated text', undefinedShouldBeIgnored: undefined})
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(model.model1Prop1).to.equal('updated text');
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
          });
      });

      it('should patch a model (2)', () => {
        return Model1
          .fromJson({id: 1, model1Prop1: 'updated text'})
          .$query()
          .patch()
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
          });
      });

      it('should pass the old values to $beforeUpdate and $afterUpdate hooks in options.old', () => {
        let patch = Model1.fromJson({model1Prop1: 'updated text'});

        return Model1
          .fromJson({id: 1})
          .$query()
          .patch(patch)
          .then(() => {
            expect(patch.$beforeUpdateCalled).to.equal(1);
            expect(patch.$beforeUpdateOptions).to.eql({patch: true, old: {id: 1}});
            expect(patch.$afterUpdateCalled).to.equal(1);
            expect(patch.$afterUpdateOptions).to.eql({patch: true, old: {id: 1}});
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
          });
      });

      it('omitting a field should remove it from the patch', () => {
        return Model1
          .fromJson({id: 1, model1Prop1: 'updated text', thisShouldBeRemoved: 1000})
          .$omit('thisShouldBeRemoved')
          .$query()
          .patch()
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
          });
      });

      it('model edits in $beforeUpdate should get into database query', () => {
        let model = Model1.fromJson({id: 1});

        model.$beforeUpdate = function () {
          let self = this;
          return Promise.delay(1).then(() => {
            self.model1Prop1 = 'updated text';
          });
        };

        return model
          .$query()
          .patch()
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'updated text'});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
          });
      });

    });

    describe('.$query().patchAndFetch()', () => {

      beforeEach(() => {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1'
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }]);
      });

      it('should patch and fetch a model', () => {
        let model = Model1.fromJson({id: 1});

        return model
          .$query()
          .patchAndFetch({model1Prop2: 10, undefinedShouldBeIgnored: undefined})
          .then(updated => {
            expect(updated.id).to.equal(1);
            expect(updated.model1Id).to.equal(null);
            expect(updated.model1Prop1).to.equal('hello 1');
            expect(updated.model1Prop2).to.equal(10);
            expectPartEql(model, {id: 1, model1Prop1: 'hello 1', model1Prop2: 10, model1Id: null});
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1', model1Prop2: 10});
            expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2', model1Prop2: null});
          });
      });

    });

    describe('.$relatedQuery().patch()', () => {

      describe('belongs to one relation', () => {
        let parent1;
        let parent2;

        beforeEach(() => {
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

        beforeEach(() => {
          return Model1
            .query()
            .then(parents => {
              parent1 = _.find(parents, {id: 1});
              parent2 = _.find(parents, {id: 3});
            });
        });

        it('should patch a related object (1)', () => {
          return parent1
            .$relatedQuery('model1Relation1')
            .patch({model1Prop1: 'updated text'})
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('Model1').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'updated text'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'hello 4'});
            });
        });

        it('should patch a related object (2)', () => {
          return parent2
            .$relatedQuery('model1Relation1')
            .patch({model1Prop1: 'updated text', model1Prop2: 1000})
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('Model1').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'hello 3'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'updated text', model1Prop2: 1000});
            });
        });

      });

      describe('has many relation', () => {
        let parent1;
        let parent2;

        beforeEach(() => {
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

        beforeEach(() => {
          return Model1
            .query()
            .then(parents => {
              parent1 = _.find(parents, {id: 1});
              parent2 = _.find(parents, {id: 2});
            });
        });

        it('should patch a related object', () => {
          return parent1
            .$relatedQuery('model1Relation2')
            .patch({model2Prop1: 'updated text'})
            .where('id_col', 2)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('model_2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              expectPartEql(rows[0], {id_col: 1, model_2_prop_1: 'text 1'});
              expectPartEql(rows[1], {id_col: 2, model_2_prop_1: 'updated text', model_2_prop_2: 5});
              expectPartEql(rows[2], {id_col: 3, model_2_prop_1: 'text 3'});
              expectPartEql(rows[3], {id_col: 4, model_2_prop_1: 'text 4'});
              expectPartEql(rows[4], {id_col: 5, model_2_prop_1: 'text 5'});
              expectPartEql(rows[5], {id_col: 6, model_2_prop_1: 'text 6'});
            });
        });

        it('should patch multiple related objects', () => {
          return parent1
            .$relatedQuery('model1Relation2')
            .patch({model2Prop1: 'updated text'})
            .where('model_2_prop_2', '<', 6)
            .where('model_2_prop_1', 'like', 'text %')
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex('model_2').orderBy('id_col');
            })
            .then(rows => {
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

      describe('many to many relation', () => {
        let parent1;
        let parent2;

        beforeEach(() => {
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

        beforeEach(() => {
          return Model2
            .query()
            .then(parents => {
              parent1 = _.find(parents, {idCol: 1});
              parent2 = _.find(parents, {idCol: 2});
            });
        });

        it('should patch a related object', () => {
          return parent1
            .$relatedQuery('model2Relation1')
            .patch({model1Prop1: 'updated text'})
            .where('Model1.id', 5)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
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

        it('should patch multiple objects (1)', () => {
          return parent2
            .$relatedQuery('model2Relation1')
            .patch({model1Prop1: 'updated text', model1Prop2: 123})
            .where('model1Prop1', 'like', 'blaa 4')
            .orWhere('model1Prop1', 'like', 'blaa 6')
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
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

        it('should patch multiple objects (2)', () => {
          return parent1
            .$relatedQuery('model2Relation1')
            .patch({model1Prop1: 'updated text', model1Prop2: 123})
            .where('model1Prop2', '<', 6)
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
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

      describe('has one through relation', () => {
        let parent;

        beforeEach(() => {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [{
              idCol: 1,
              model2Prop1: 'text 1',

              model2Relation2: {
                id: 3,
                model1Prop1: 'blaa 1',
                model1Prop2: 6
              }
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 2,
              model2Prop1: 'text 2',

              model2Relation2: {
                id: 7,
                model1Prop1: 'blaa 5',
                model1Prop2: 2
              }
            }]
          }]);
        });

        beforeEach(() => {
          return Model2
            .query()
            .then(parents => {
              parent = _.find(parents, {idCol: 1});
            });
        });

        it('should patch the related object', () => {
          return parent
            .$relatedQuery('model2Relation2')
            .patch({model1Prop1: 'updated text'})
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'updated text'});
              expectPartEql(rows[3], {id: 7, model1Prop1: 'blaa 5'});
            });
        });
      });

    });

    function subClassWithSchema(Model, schema) {
      let SubModel = inheritModel(Model);
      SubModel.jsonSchema = schema;
      return SubModel;
    }

  });
};
