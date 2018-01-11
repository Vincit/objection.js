const _ = require('lodash');
const expect = require('expect.js');
const Promise = require('bluebird');
const transaction = require('../../').transaction;
const knexUtils = require('../../lib/utils/knexUtils');

module.exports = session => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('transaction', () => {
    beforeEach(() => {
      return session.populate([]);
    });

    before(() => {
      // Disable unhandled exception logging. Some of the tests _should_ leak an exception
      // but we don't want them to appear in the log.
      session.addUnhandledRejectionHandler(_.noop);
    });

    after(() => {
      session.removeUnhandledRejectionHandler(_.noop);
    });

    it('should resolve an empty transaction', done => {
      transaction(Model1, Model2, () => {
        return { a: 1 };
      }).then(result => {
        expect(result).to.eql({ a: 1 });
        done();
      });
    });

    it('should fail without models', done => {
      transaction(() => {
        return { a: 1 };
      })
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          done();
        });
    });

    it('should fail if one of the model classes is not a subclass of Model', done => {
      transaction(Model1, function() {}, () => {
        return { a: 1 };
      })
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          done();
        });
    });

    it('should fail if all ModelClasses are not bound to the same knex connection', done => {
      transaction(Model1, Model2.bindKnex({}), () => {
        return { a: 1 };
      })
        .then(() => {
          done(new Error('should not get here'));
        })
        .catch(() => {
          done();
        });
    });

    it('should commit transaction if no errors occur (1)', done => {
      transaction(Model1, Model2, (Model1, Model2) => {
        return Model1.query()
          .insert({ model1Prop1: 'test 1' })
          .then(() => {
            return Model1.query().insert({ model1Prop1: 'test 2' });
          })
          .then(() => {
            return Model2.query().insert({ model2Prop1: 'test 3' });
          });
      })
        .then(result => {
          expect(result.model2Prop1).to.equal('test 3');
          return session.knex('Model1');
        })
        .then(rows => {
          expect(rows).to.have.length(2);
          expect(_.map(rows, 'model1Prop1').sort()).to.eql(['test 1', 'test 2']);
          return session.knex('model2');
        })
        .then(rows => {
          expect(rows).to.have.length(1);
          expect(rows[0].model2_prop1).to.equal('test 3');
          done();
        })
        .catch(done);
    });

    it('should commit transaction if no errors occur (2)', done => {
      transaction(Model1, Model1 => {
        return Model1.query().insertGraph([
          {
            model1Prop1: 'a',
            model1Relation1: {
              model1Prop1: 'b'
            },
            model1Relation2: [
              {
                model2Prop1: 'c',
                model2Relation1: [
                  {
                    model1Prop1: 'd'
                  }
                ]
              }
            ]
          }
        ]);
      })
        .then(() => {
          return [
            session.knex('Model1').orderBy('model1Prop1'),
            session.knex('model2'),
            session.knex('Model1Model2')
          ];
        })
        .spread((rows1, rows2, rows3) => {
          expect(rows1).to.have.length(3);
          expect(_.map(rows1, 'model1Prop1')).to.eql(['a', 'b', 'd']);
          expect(rows2).to.have.length(1);
          expect(rows2[0].model2_prop1).to.equal('c');
          expect(rows3).to.have.length(1);
          done();
        })
        .catch(done);
    });

    it('should commit transaction if no errors occur (3)', done => {
      Model1.knex()
        .transaction(trx => {
          return Model1.query(trx).insertGraph([
            {
              model1Prop1: 'a',
              model1Relation1: {
                model1Prop1: 'b'
              },
              model1Relation2: [
                {
                  model2Prop1: 'c',
                  model2Relation1: [
                    {
                      model1Prop1: 'd'
                    }
                  ]
                }
              ]
            }
          ]);
        })
        .then(() => {
          return [
            session.knex('Model1').orderBy('model1Prop1'),
            session.knex('model2'),
            session.knex('Model1Model2')
          ];
        })
        .spread((rows1, rows2, rows3) => {
          expect(rows1).to.have.length(3);
          expect(_.map(rows1, 'model1Prop1')).to.eql(['a', 'b', 'd']);
          expect(rows2).to.have.length(1);
          expect(rows2[0].model2_prop1).to.equal('c');
          expect(rows3).to.have.length(1);
          done();
        })
        .catch(done);
    });

    it('should rollback if an error occurs (1)', done => {
      transaction(Model1, Model2, (Model1, Model2) => {
        return Model1.query()
          .insert({ model1Prop1: 'test 1' })
          .then(() => {
            return Model1.query().insert({ model1Prop1: 'test 2' });
          })
          .then(() => {
            return Model2.query().insert({ model2Prop1: 'test 3' });
          })
          .then(() => {
            throw new Error('whoops');
          });
      })
        .catch(err => {
          expect(err.message).to.equal('whoops');
          return session.knex('Model1');
        })
        .then(rows => {
          expect(rows).to.have.length(0);
          return session.knex('model2');
        })
        .then(rows => {
          expect(rows).to.have.length(0);
          done();
        })
        .catch(done);
    });

    it('should rollback if an error occurs (2)', done => {
      transaction(Model1, Model1 => {
        return Model1.query()
          .insert({ model1Prop1: 'test 1' })
          .then(model => {
            return model.$relatedQuery('model1Relation2').insert({ model2Prop2: 1000 });
          })
          .then(() => {
            throw new Error('whoops');
          });
      })
        .catch(err => {
          expect(err.message).to.equal('whoops');
          return session.knex('Model1');
        })
        .then(rows => {
          expect(rows).to.have.length(0);
          return session.knex('model2');
        })
        .then(rows => {
          expect(rows).to.have.length(0);
          done();
        })
        .catch(done);
    });

    it('should rollback if an error occurs (3)', done => {
      transaction(Model1, Model1 => {
        return Model1.query()
          .insertGraph([
            {
              model1Prop1: 'a',
              model1Relation1: {
                model1Prop1: 'b'
              },
              model1Relation2: [
                {
                  model2Prop1: 'c',
                  model2Relation1: [
                    {
                      model1Prop1: 'd'
                    }
                  ]
                }
              ]
            }
          ])
          .then(() => {
            throw new Error('whoops');
          });
      })
        .catch(err => {
          expect(err.message).to.equal('whoops');

          return [session.knex('Model1'), session.knex('model2'), session.knex('Model1Model2')];
        })
        .spread((rows1, rows2, rows3) => {
          expect(rows1).to.have.length(0);
          expect(rows2).to.have.length(0);
          expect(rows3).to.have.length(0);
          done();
        })
        .catch(done);
    });

    it('should rollback if an error occurs (4)', done => {
      Model1.knex()
        .transaction(trx => {
          return Model1.query(trx)
            .insertGraph([
              {
                model1Prop1: 'a',
                model1Relation1: {
                  model1Prop1: 'b'
                },
                model1Relation2: [
                  {
                    model2Prop1: 'c',
                    model2Relation1: [
                      {
                        model1Prop1: 'd'
                      }
                    ]
                  }
                ]
              }
            ])
            .then(models => {
              return models[0]
                .$relatedQuery('model1Relation2', trx)
                .insert({ model2Prop1: 'e' })
                .return(models);
            })
            .then(models => {
              return models[0]
                .$relatedQuery('model1Relation2')
                .transacting(trx)
                .insert({ model2Prop1: 'f' })
                .return(models);
            })
            .then(models => {
              return Model1.query(trx)
                .findById(models[0].id)
                .then(it => it.$loadRelated('model1Relation1', null, trx))
                .then(it => expect(it.model1Relation1.model1Prop1).to.equal('b'))
                .return(models);
            })
            .then(models => {
              expect(models[0].$query(trx).knex() === trx);
            })
            .then(() => {
              throw new Error('whoops');
            });
        })
        .catch(err => {
          expect(err.message).to.equal('whoops');

          return [session.knex('Model1'), session.knex('model2'), session.knex('Model1Model2')];
        })
        .spread((rows1, rows2, rows3) => {
          expect(rows1).to.have.length(0);
          expect(rows2).to.have.length(0);
          expect(rows3).to.have.length(0);
          done();
        })
        .catch(done);
    });

    it('should rollback if an error occurs (5)', done => {
      transaction(Model1.knex(), trx => {
        return Model1.query(trx)
          .insertGraph([
            {
              model1Prop1: 'a',
              model1Relation1: {
                model1Prop1: 'b'
              },
              model1Relation2: [
                {
                  model2Prop1: 'c',
                  model2Relation1: [
                    {
                      model1Prop1: 'd'
                    }
                  ]
                }
              ]
            }
          ])
          .then(models => {
            return models[0]
              .$relatedQuery('model1Relation2', trx)
              .insert({ model2Prop1: 'e' })
              .return(models);
          })
          .then(models => {
            return models[0]
              .$relatedQuery('model1Relation2')
              .transacting(trx)
              .insert({ model2Prop1: 'f' })
              .return(models);
          })
          .then(models => {
            return Model1.query(trx)
              .findById(models[0].id)
              .then(it => it.$loadRelated('model1Relation1', null, trx))
              .then(it => expect(it.model1Relation1.model1Prop1).to.equal('b'))
              .return(models);
          })
          .then(models => {
            expect(models[0].$query(trx).knex() === trx);
          })
          .then(() => {
            throw new Error('whoops');
          });
      })
        .catch(err => {
          expect(err.message).to.equal('whoops');

          return [session.knex('Model1'), session.knex('model2'), session.knex('Model1Model2')];
        })
        .spread((rows1, rows2, rows3) => {
          expect(rows1).to.have.length(0);
          expect(rows2).to.have.length(0);
          expect(rows3).to.have.length(0);
          done();
        })
        .catch(done);
    });

    it('should rollback if the rollback method is called (no return)', done => {
      transaction(Model1.knex(), trx => {
        Model1.query(trx)
          .insertGraph([
            {
              model1Prop1: 'a',
              model1Relation1: {
                model1Prop1: 'b'
              },
              model1Relation2: [
                {
                  model2Prop1: 'c',
                  model2Relation1: [
                    {
                      model1Prop1: 'd'
                    }
                  ]
                }
              ]
            }
          ])
          .then(models => {
            return models[0]
              .$relatedQuery('model1Relation2', trx)
              .insert({ model2Prop1: 'e' })
              .return(models);
          })
          .then(models => {
            return models[0]
              .$relatedQuery('model1Relation2')
              .transacting(trx)
              .insert({ model2Prop1: 'f' })
              .return(models);
          })
          .then(models => {
            expect(models[0].$query(trx).knex() === trx);
          })
          .then(() => {
            trx.rollback(new Error('whoops'));
          });
      })
        .catch(err => {
          expect(err.message).to.equal('whoops');

          return [session.knex('Model1'), session.knex('model2'), session.knex('Model1Model2')];
        })
        .spread((rows1, rows2, rows3) => {
          expect(rows1).to.have.length(0);
          expect(rows2).to.have.length(0);
          expect(rows3).to.have.length(0);

          done();
        })
        .catch(done);
    });

    it('should rollback if the rollback method is called (with return)', done => {
      transaction(Model1.knex(), trx => {
        return Model1.query(trx)
          .insertGraph([
            {
              model1Prop1: 'a',
              model1Relation1: {
                model1Prop1: 'b'
              },
              model1Relation2: [
                {
                  model2Prop1: 'c',
                  model2Relation1: [
                    {
                      model1Prop1: 'd'
                    }
                  ]
                }
              ]
            }
          ])
          .then(() => {
            return trx.rollback(new Error('whoops'));
          });
      })
        .catch(err => {
          expect(err.message).to.equal('whoops');

          return [session.knex('Model1'), session.knex('model2'), session.knex('Model1Model2')];
        })
        .spread((rows1, rows2, rows3) => {
          expect(rows1).to.have.length(0);
          expect(rows2).to.have.length(0);
          expect(rows3).to.have.length(0);

          done();
        })
        .catch(done);
    });

    it('should skip queries after rollback', done => {
      transaction(Model1, Model1 => {
        return Model1.query()
          .insert({ model1Prop1: '123' })
          .then(() => {
            return Promise.all(
              _.map(_.range(2), i => {
                if (i === 1) {
                  throw new Error();
                }
                return Model1.query()
                  .insert({ model1Prop1: i.toString() })
                  .then();
              })
            );
          });
      })
        .catch(() => {
          return Promise.delay(5).then(() => {
            return session.knex('Model1');
          });
        })
        .then(rows => {
          expect(rows).to.have.length(0);
          return session.knex('model2');
        })
        .then(rows => {
          expect(rows).to.have.length(0);
          done();
        })
        .catch(done);
    });

    it('bound model class should accept unbound model instances', done => {
      let unboundModel = Model1.fromJson({ model1Prop1: '123' });

      transaction(Model1, Model1 => {
        return Model1.query().insert(unboundModel);
      })
        .then(inserted => {
          expect(inserted.model1Prop1).to.equal('123');
          return session.knex('Model1');
        })
        .then(rows => {
          expect(rows).to.have.length(1);
          expect(rows[0].model1Prop1).to.equal('123');
          done();
        })
        .catch(done);
    });

    it('last argument should be the knex transaction object', done => {
      transaction(Model1, Model2, (Model1, Model2, trx) => {
        expect(trx).to.equal(Model1.knex());
      })
        .then(() => {
          done();
        })
        .catch(done);
    });

    it('if knex instance is passed, should be equivalent to knex.transaction()', done => {
      transaction(Model1.knex(), trx => {
        return trx('Model1').insert({ model1Prop1: '1' });
      })
        .then(() => {
          return session.knex('Model1');
        })
        .then(rows => {
          expect(rows).to.have.length(1);
          expect(rows[0].model1Prop1).to.equal('1');
          done();
        })
        .catch(done);
    });

    describe('transaction.start()', () => {
      it('should commit transaction when the commit method is called', done => {
        let trx;
        transaction
          .start(Model1)
          .then(trans => {
            trx = trans;
            return Model1.bindKnex(trx)
              .query()
              .insert({ model1Prop1: 'test 1' });
          })
          .then(() => {
            return Model1.bindKnex(trx)
              .query()
              .insert({ model1Prop1: 'test 2' });
          })
          .then(() => {
            return Model2.bindKnex(trx)
              .query()
              .insert({ model2Prop1: 'test 3' });
          })
          .then(() => {
            return trx.commit();
          })
          .then(() => {
            return session.knex('Model1');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['test 1', 'test 2']);
            return session.knex('model2');
          })
          .then(rows => {
            expect(rows).to.have.length(1);
            expect(rows[0].model2_prop1).to.equal('test 3');
            done();
          })
          .catch(done);
      });

      it(
        'commit should work with yield (and thus async/await)',
        Promise.coroutine(function*() {
          const trx = yield transaction.start(Model1.knex());

          yield Model1.query(trx).insert({ model1Prop1: 'test 1' });
          yield Model1.query(trx).insert({ model1Prop1: 'test 2' });
          yield Model2.query(trx).insert({ model2Prop1: 'test 3' });
          yield trx.commit();

          const model1Rows = yield session.knex('Model1');
          const model2Rows = yield session.knex('model2');

          expect(model1Rows).to.have.length(2);
          expect(_.map(model1Rows, 'model1Prop1').sort()).to.eql(['test 1', 'test 2']);

          expect(model2Rows).to.have.length(1);
          expect(model2Rows[0].model2_prop1).to.equal('test 3');
        })
      );

      it(
        'rollback should work with yield (and thus async/await)',
        Promise.coroutine(function*() {
          const trx = yield transaction.start(Model1.knex());

          yield Model1.query(trx).insert({ model1Prop1: 'test 1' });
          yield Model1.query(trx).insert({ model1Prop1: 'test 2' });
          yield Model2.query(trx).insert({ model2Prop1: 'test 3' });
          yield trx.rollback();

          const model1Rows = yield session.knex('Model1');
          const model2Rows = yield session.knex('model2');

          expect(model1Rows).to.have.length(0);
          expect(model2Rows).to.have.length(0);
        })
      );

      it('should work when a knex connection is passed instead of a model', done => {
        let trx;
        transaction
          .start(Model1.knex())
          .then(trans => {
            trx = trans;
            return Model1.bindTransaction(trx)
              .query()
              .insert({ model1Prop1: 'test 1' });
          })
          .then(() => {
            return Model1.bindTransaction(trx)
              .query()
              .insert({ model1Prop1: 'test 2' });
          })
          .then(() => {
            return Model2.bindTransaction(trx)
              .query()
              .insert({ model2Prop1: 'test 3' });
          })
          .then(() => {
            return trx.commit();
          })
          .then(() => {
            return session.knex('Model1');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['test 1', 'test 2']);
            return session.knex('model2');
          })
          .then(rows => {
            expect(rows).to.have.length(1);
            expect(rows[0].model2_prop1).to.equal('test 3');
            done();
          })
          .catch(done);
      });

      it('should rollback transaction when the rollback method is called', done => {
        let trx;
        transaction
          .start(Model1)
          .then(trans => {
            trx = trans;
            return Model1.bindTransaction(trx)
              .query()
              .insert({ model1Prop1: 'test 1' });
          })
          .then(() => {
            return Model1.bindTransaction(trx)
              .query()
              .insert({ model1Prop1: 'test 2' });
          })
          .then(() => {
            return Model2.bindTransaction(trx)
              .query()
              .insert({ model2Prop1: 'test 3' });
          })
          .then(() => {
            return trx.rollback();
          })
          .then(() => {
            return session.knex('Model1');
          })
          .then(rows => {
            expect(rows).to.have.length(0);
            return session.knex('model2');
          })
          .then(rows => {
            expect(rows).to.have.length(0);
            done();
          })
          .catch(done);
      });

      it('should fail if neither a model or a knex connection is passed', done => {
        transaction
          .start({})
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(() => {
            done();
          });
      });
    });

    describe('model.$transaction() and model.$knex()', () => {
      it("model.$transaction() methods should return the model's transaction", done => {
        transaction
          .start(Model1)
          .then(trx => {
            return Model1.bindTransaction(trx)
              .query()
              .insert({ model1Prop1: 'test 1' });
          })
          .then(model => {
            return Model1.bindTransaction(model.$transaction())
              .query()
              .insert({ model1Prop1: 'test 2' });
          })
          .then(model => {
            return Model2.bindTransaction(model.$transaction())
              .query()
              .insert({ model2Prop1: 'test 3' });
          })
          .then(model => {
            return model.$transaction().rollback();
          })
          .then(() => {
            return session.knex('Model1');
          })
          .then(rows => {
            expect(rows).to.have.length(0);
            return session.knex('model2');
          })
          .then(rows => {
            expect(rows).to.have.length(0);
            done();
          })
          .catch(done);
      });

      it("model.$knex() methods should return the model's transaction", done => {
        transaction
          .start(Model1)
          .then(trx => {
            return Model1.bindTransaction(trx)
              .query()
              .insert({ model1Prop1: 'test 1' });
          })
          .then(model => {
            return Model1.bindTransaction(model.$knex())
              .query()
              .insert({ model1Prop1: 'test 2' });
          })
          .then(model => {
            return Model2.bindTransaction(model.$knex())
              .query()
              .insert({ model2Prop1: 'test 3' });
          })
          .then(model => {
            return model.$knex().rollback();
          })
          .then(() => {
            return session.knex('Model1');
          })
          .then(rows => {
            expect(rows).to.have.length(0);
            return session.knex('model2');
          })
          .then(rows => {
            expect(rows).to.have.length(0);
            done();
          })
          .catch(done);
      });
    });
  });
};
