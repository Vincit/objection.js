'use strict';

var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('bluebird');
var transaction = require('../../').transaction;

module.exports = function (session) {
  var Model1 = session.models.Model1;
  var Model2 = session.models.Model2;

  describe('transaction', function () {

    beforeEach(function () {
      return session.populate([]);
    });

    before(function () {
      // Disable unhandled exception logging. Some of the tests _should_ leak an exception
      // but we don't want them to appear in the log.
      session.addUnhandledRejectionHandler(_.noop);
    });

    after(function () {
      session.removeUnhandledRejectionHandler(_.noop);
    });

    it('should resolve an empty transaction', function (done) {
      transaction(Model1, Model2, function () {
        return {a: 1};
      }).then(function (result) {
        expect(result).to.eql({a: 1});
        done();
      });
    });

    it('should fail without models', function (done) {
      transaction(function () {
        return {a: 1};
      }).then(function () {
        done(new Error('should not get here'));
      }).catch(function () {
        done();
      });
    });

    it('should fail if one of the model classes is not a subclass of Model', function (done) {
      transaction(Model1, function () {}, function () {
        return {a: 1};
      }).then(function () {
        done(new Error('should not get here'));
      }).catch(function () {
        done();
      });
    });

    it('should fail if all ModelClasses are not bound to the same knex connection', function (done) {
      transaction(Model1, Model2.bindKnex({}), function () {
        return {a: 1};
      }).then(function () {
        done(new Error('should not get here'));
      }).catch(function () {
        done();
      });
    });

    it('should commit transaction if no errors occur (1)', function (done) {
      transaction(Model1, Model2, function (Model1, Model2) {

        return Model1
          .query()
          .insert({model1Prop1: 'test 1'})
          .then(function () {
            return Model1.query().insert({model1Prop1: 'test 2'});
          })
          .then(function () {
            return Model2.query().insert({model2Prop1: 'test 3'});
          });

      }).then(function (result) {
        expect(result.model2Prop1).to.equal('test 3');
        return session.knex('Model1');
      }).then(function (rows) {
        expect(rows).to.have.length(2);
        expect(_.map(rows, 'model1Prop1').sort()).to.eql(['test 1', 'test 2']);
        return session.knex('model_2');
      }).then(function (rows) {
        expect(rows).to.have.length(1);
        expect(rows[0].model_2_prop_1).to.equal('test 3');
        done();
      }).catch(done);

    });

    it('should commit transaction if no errors occur (2)', function (done) {
      transaction(Model1, function (Model1) {

        return Model1
          .query()
          .insertGraph([{
            model1Prop1: 'a',
            model1Relation1: {
              model1Prop1: 'b'
            },
            model1Relation2: [{
              model2Prop1: 'c',
              model2Relation1: [{
                model1Prop1: 'd'
              }]
            }]
          }]);

      }).then(function () {
        return [
          session.knex('Model1').orderBy('model1Prop1'),
          session.knex('model_2'),
          session.knex('Model1Model2')
        ];
      }).spread(function (rows1, rows2, rows3) {
        expect(rows1).to.have.length(3);
        expect(_.map(rows1, 'model1Prop1')).to.eql(['a', 'b', 'd']);
        expect(rows2).to.have.length(1);
        expect(rows2[0].model_2_prop_1).to.equal('c');
        expect(rows3).to.have.length(1);
        done();
      }).catch(done);

    });

    it('should commit transaction if no errors occur (3)', function (done) {
      Model1.knex().transaction(function (trx) {

        return Model1
          .query(trx)
          .insertGraph([{
            model1Prop1: 'a',
            model1Relation1: {
              model1Prop1: 'b'
            },
            model1Relation2: [{
              model2Prop1: 'c',
              model2Relation1: [{
                model1Prop1: 'd'
              }]
            }]
          }]);

      }).then(function () {
        return [
          session.knex('Model1').orderBy('model1Prop1'),
          session.knex('model_2'),
          session.knex('Model1Model2')
        ];
      }).spread(function (rows1, rows2, rows3) {
        expect(rows1).to.have.length(3);
        expect(_.map(rows1, 'model1Prop1')).to.eql(['a', 'b', 'd']);
        expect(rows2).to.have.length(1);
        expect(rows2[0].model_2_prop_1).to.equal('c');
        expect(rows3).to.have.length(1);
        done();
      }).catch(done);

    });

    it('should rollback if an error occurs (1)', function (done) {
      transaction(Model1, Model2, function (Model1, Model2) {

        return Model1
          .query()
          .insert({model1Prop1: 'test 1'})
          .then(function () {
            return Model1.query().insert({model1Prop1: 'test 2'});
          })
          .then(function () {
            return Model2.query().insert({model2Prop1: 'test 3'});
          })
          .then(function () {
            throw new Error('whoops');
          });

      }).catch(function (err) {
        expect(err.message).to.equal('whoops');
        return session.knex('Model1');
      }).then(function (rows) {
        expect(rows).to.have.length(0);
        return session.knex('model_2');
      }).then(function (rows) {
        expect(rows).to.have.length(0);
        done();
      }).catch(done);

    });

    it('should rollback if an error occurs (2)', function (done) {
      transaction(Model1, function (Model1) {

        return Model1
          .query()
          .insert({model1Prop1: 'test 1'})
          .then(function (model) {
            return model.$relatedQuery('model1Relation2').insert({model2Prop2: 1000});
          })
          .then(function () {
            throw new Error('whoops');
          });

      }).catch(function (err) {
        expect(err.message).to.equal('whoops');
        return session.knex('Model1');
      }).then(function (rows) {
        expect(rows).to.have.length(0);
        return session.knex('model_2');
      }).then(function (rows) {
        expect(rows).to.have.length(0);
        done();
      }).catch(done);

    });

    it('should rollback if an error occurs (3)', function (done) {
      transaction(Model1, function (Model1) {

        return Model1
          .query()
          .insertGraph([{
            model1Prop1: 'a',
            model1Relation1: {
              model1Prop1: 'b'
            },
            model1Relation2: [{
              model2Prop1: 'c',
              model2Relation1: [{
                model1Prop1: 'd'
              }]
            }]
          }])
          .then(function () {
            throw new Error('whoops');
          });

      }).catch(function (err) {
        expect(err.message).to.equal('whoops');

        return [
          session.knex('Model1'),
          session.knex('model_2'),
          session.knex('Model1Model2')
        ];
      }).spread(function (rows1, rows2, rows3) {
        expect(rows1).to.have.length(0);
        expect(rows2).to.have.length(0);
        expect(rows3).to.have.length(0);
        done();
      }).catch(done);

    });

    it('should rollback if an error occurs (4)', function (done) {
      Model1.knex().transaction(function (trx) {

        return Model1
          .query(trx)
          .insertGraph([{
            model1Prop1: 'a',
            model1Relation1: {
              model1Prop1: 'b'
            },
            model1Relation2: [{
              model2Prop1: 'c',
              model2Relation1: [{
                model1Prop1: 'd'
              }]
            }]
          }])
          .then(function (models) {
            return models[0]
              .$relatedQuery('model1Relation2', trx)
              .insert({model2Prop1: 'e'})
              .return(models);
          })
          .then(function (models) {
            return models[0]
              .$relatedQuery('model1Relation2')
              .transacting(trx)
              .insert({model2Prop1: 'f'})
              .return(models);
          })
          .then(function (models) {
            expect(models[0].$query(trx).knex() === trx);
          })
          .then(function () {
            throw new Error('whoops');
          });

      }).catch(function (err) {
        expect(err.message).to.equal('whoops');

        return [
          session.knex('Model1'),
          session.knex('model_2'),
          session.knex('Model1Model2')
        ];
      }).spread(function (rows1, rows2, rows3) {
        expect(rows1).to.have.length(0);
        expect(rows2).to.have.length(0);
        expect(rows3).to.have.length(0);
        done();
      }).catch(done);

    });

    it('should skip queries after rollback', function (done) {
      transaction(Model1, function (Model1) {

        return Model1.query().insert({model1Prop1: '123'}).then(function () {
          return Promise.all(_.map(_.range(2), function (i) {
            if (i === 1) {
              throw new Error();
            }
            return Model1.query().insert({model1Prop1: i.toString()}).then();
          }));
        });

      }).catch(function () {
        return Promise.delay(5).then(function () {
          return session.knex('Model1');
        });
      }).then(function (rows) {
        expect(rows).to.have.length(0);
        return session.knex('model_2');
      }).then(function (rows) {
        expect(rows).to.have.length(0);
        done();
      }).catch(done);

    });

    it('bound model class should accept unbound model instances', function (done) {
      var unboundModel = Model1.fromJson({model1Prop1: '123'});

      transaction(Model1, function (Model1) {
        return Model1.query().insert(unboundModel);
      }).then(function (inserted) {
        expect(inserted.model1Prop1).to.equal('123');
        return session.knex('Model1');
      }).then(function (rows) {
        expect(rows).to.have.length(1);
        expect(rows[0].model1Prop1).to.equal('123');
        done();
      }).catch(done);

    });

    it('last argument should be the knex transaction object', function (done) {
      transaction(Model1, Model2,  function (Model1, Model2, trx) {
        expect(trx).to.equal(Model1.knex());
      }).then(function () {
        done();
      }).catch(done);
    });

    it('if knex instance is passed, should be equivalent to knex.transaction()', function (done) {
      transaction(Model1.knex(), function (trx) {
        return trx('Model1').insert({model1Prop1: '1'});
      }).then(function () {
        return session.knex('Model1');
      }).then(function (rows) {
        expect(rows).to.have.length(1);
        expect(rows[0].model1Prop1).to.equal('1');
        done();
      }).catch(done);
    });

    describe('transaction.start()', function () {

      it('should commit transaction when the commit method is called', function (done) {
        var trx;
        transaction.start(Model1).then(function (trans) {
          trx = trans;
          return Model1.bindKnex(trx).query().insert({model1Prop1: 'test 1'});
        }).then(function () {
          return Model1.bindKnex(trx).query().insert({model1Prop1: 'test 2'});
        }).then(function () {
          return Model2.bindKnex(trx).query().insert({model2Prop1: 'test 3'});
        }).then(function () {
          return trx.commit();
        }).then(function () {
          return session.knex('Model1');
        }).then(function (rows) {
          expect(rows).to.have.length(2);
          expect(_.map(rows, 'model1Prop1').sort()).to.eql(['test 1', 'test 2']);
          return session.knex('model_2');
        }).then(function (rows) {
          expect(rows).to.have.length(1);
          expect(rows[0].model_2_prop_1).to.equal('test 3');
          done();
        }).catch(done);
      });

      it('should work when a knex connection is passed instead of a model', function (done) {
        var trx;
        transaction.start(Model1.knex()).then(function (trans) {
          trx = trans;
          return Model1
            .bindTransaction(trx)
            .query()
            .insert({model1Prop1: 'test 1'});
        }).then(function () {
          return Model1
            .bindTransaction(trx)
            .query()
            .insert({model1Prop1: 'test 2'});
        }).then(function () {
          return Model2
            .bindTransaction(trx)
            .query()
            .insert({model2Prop1: 'test 3'});
        }).then(function () {
          return trx.commit();
        }).then(function () {
          return session.knex('Model1');
        }).then(function (rows) {
          expect(rows).to.have.length(2);
          expect(_.map(rows, 'model1Prop1').sort()).to.eql(['test 1', 'test 2']);
          return session.knex('model_2');
        }).then(function (rows) {
          expect(rows).to.have.length(1);
          expect(rows[0].model_2_prop_1).to.equal('test 3');
          done();
        }).catch(done);
      });

      it('should rollback transaction when the rollback method is called', function (done) {
        var trx;
        transaction.start(Model1).then(function (trans) {
          trx = trans;
          return Model1
            .bindTransaction(trx)
            .query()
            .insert({model1Prop1: 'test 1'});
        }).then(function () {
          return Model1
            .bindTransaction(trx)
            .query()
            .insert({model1Prop1: 'test 2'});
        }).then(function () {
          return Model2
            .bindTransaction(trx)
            .query()
            .insert({model2Prop1: 'test 3'});
        }).then(function () {
          return trx.rollback();
        }).then(function () {
          return session.knex('Model1');
        }).then(function (rows) {
          expect(rows).to.have.length(0);
          return session.knex('model_2');
        }).then(function (rows) {
          expect(rows).to.have.length(0);
          done();
        }).catch(done);
      });

      it('should fail if neither a model or a knex connection is passed', function (done) {
        transaction.start({}).then(function () {
          done(new Error('should not get here'));
        }).catch(function () {
          done();
        });
      });

    });

    describe('model.$transaction() and model.$knex()', function () {

      it('model.$transaction() methods should return the model\'s transaction', function (done) {
        transaction.start(Model1).then(function (trx) {
          return Model1
            .bindTransaction(trx)
            .query()
            .insert({model1Prop1: 'test 1'});
        }).then(function (model) {
          return Model1
            .bindTransaction(model.$transaction())
            .query()
            .insert({model1Prop1: 'test 2'});
        }).then(function (model) {
          return Model2
            .bindTransaction(model.$transaction())
            .query()
            .insert({model2Prop1: 'test 3'});
        }).then(function (model) {
          return model.$transaction().rollback();
        }).then(function () {
          return session.knex('Model1');
        }).then(function (rows) {
          expect(rows).to.have.length(0);
          return session.knex('model_2');
        }).then(function (rows) {
          expect(rows).to.have.length(0);
          done();
        }).catch(done);
      });

      it('model.$knex() methods should return the model\'s transaction', function (done) {
        transaction.start(Model1).then(function (trx) {
          return Model1
            .bindTransaction(trx)
            .query()
            .insert({model1Prop1: 'test 1'});
        }).then(function (model) {
          return Model1
            .bindTransaction(model.$knex())
            .query()
            .insert({model1Prop1: 'test 2'});
        }).then(function (model) {
          return Model2
            .bindTransaction(model.$knex())
            .query()
            .insert({model2Prop1: 'test 3'});
        }).then(function (model) {
          return model.$knex().rollback();
        }).then(function () {
          return session.knex('Model1');
        }).then(function (rows) {
          expect(rows).to.have.length(0);
          return session.knex('model_2');
        }).then(function (rows) {
          expect(rows).to.have.length(0);
          done();
        }).catch(done);
      });

    });

  });
};
