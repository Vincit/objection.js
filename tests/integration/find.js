const _ = require('lodash');
const utils = require('../../lib/utils/knexUtils');
const expect = require('expect.js');
const Promise = require('bluebird');

const { TimeoutError } = require('bluebird');
const { raw, ref, lit, Model, QueryBuilderOperation } = require('../..');

module.exports = session => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('Model find queries', () => {
    describe('.query()', () => {
      beforeEach(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'hejsan 1',
                model2Prop2: 30
              },
              {
                idCol: 2,
                model2Prop1: 'hejsan 2',
                model2Prop2: 20
              },
              {
                idCol: 3,
                model2Prop1: 'hejsan 3',
                model2Prop2: 10
              }
            ]
          },
          {
            id: 2,
            model1Prop1: 'hello 2'
          }
        ]);
      });

      it('should return all rows when no knex methods are chained', () => {
        return Model1.query()
          .then(models => {
            expect(models[0]).to.be.a(Model1);
            expect(models[1]).to.be.a(Model1);
            expect(_.map(models, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2']);
            expect(_.map(models, 'id').sort()).to.eql([1, 2]);
            return Model2.query();
          })
          .then(models => {
            expect(models[0]).to.be.a(Model2);
            expect(models[1]).to.be.a(Model2);
            expect(models[2]).to.be.a(Model2);
            expect(_.map(models, 'model2Prop1').sort()).to.eql([
              'hejsan 1',
              'hejsan 2',
              'hejsan 3'
            ]);
            expect(_.map(models, 'model2Prop2').sort()).to.eql([10, 20, 30]);
            expect(_.map(models, 'idCol').sort()).to.eql([1, 2, 3]);
          });
      });

      it('should return the given range and total count when range() is called', () => {
        return Model2.query()
          .range(1, 2)
          .orderBy('model2_prop2', 'desc')
          .then(result => {
            expect(result.results[0]).to.be.a(Model2);
            expect(result.results[1]).to.be.a(Model2);
            expect(result.total === 3).to.equal(true);
            expect(_.map(result.results, 'model2Prop2')).to.eql([20, 10]);
          });
      });

      it('should return the given range and total count when range() is called without arguments', () => {
        return Model2.query()
          .offset(1)
          .limit(2)
          .range()
          .orderBy('model2_prop2', 'desc')
          .then(result => {
            expect(result.results[0]).to.be.a(Model2);
            expect(result.results[1]).to.be.a(Model2);
            expect(result.total === 3).to.equal(true);
            expect(_.map(result.results, 'model2Prop2')).to.eql([20, 10]);
          });
      });

      it('should return the given page and total count when page() is called', () => {
        return Model2.query()
          .page(1, 2)
          .orderBy('model2_prop2', 'desc')
          .then(result => {
            expect(result.results[0]).to.be.a(Model2);
            expect(result.total === 3).to.equal(true);
            expect(_.map(result.results, 'model2Prop2')).to.eql([10]);
          });
      });

      describe('query builder methods', () => {
        it('.select()', () => {
          return Model2.query()
            .select('model2.id_col', 'model2_prop2')
            .then(models => {
              expect(models[0]).to.be.a(Model2);
              // Test that only the selected columns (and stuff set by the $afterGet hook)  were returned.
              expect(_.uniq(_.flattenDeep(_.map(models, _.keys))).sort()).to.eql([
                '$afterGetCalled',
                'idCol',
                'model2Prop2'
              ]);
              expect(_.map(models, 'idCol').sort()).to.eql([1, 2, 3]);
              expect(_.map(models, 'model2Prop2').sort()).to.eql([10, 20, 30]);
              expect(_.map(models, '$afterGetCalled').sort()).to.eql([1, 1, 1]);
            });
        });

        it('.where()', () => {
          return Model2.query()
            .where('model2_prop2', '>', 15)
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20, 30]);
            });
        });

        it('.findOne()', () => {
          return Model2.query()
            .findOne('model2_prop2', '>', 20)
            .then(model => {
              expect(model.model2Prop2).to.eql(30);
            });
        });

        it('.findById()', () => {
          return Model2.query()
            .findById(2)
            .then(model => {
              expect(model.model2Prop2).to.eql(20);
            });
        });

        it('.findByIds()', () => {
          return session.knex
            .transaction(trx => {
              return Model2.query(trx)
                .findByIds([1, 2])
                .patch({ model2Prop1: 'what' })
                .then(() => {
                  return Model2.query(trx)
                    .findByIds([1, 2])
                    .orderBy('id_col');
                })
                .then(models => {
                  expect(models.map(it => it.model2Prop1)).to.eql(['what', 'what']);
                })
                .then(() => {
                  throw new Error();
                });
            })
            .catch(() => {
              return Model2.query()
                .findByIds([1, 2])
                .orderBy('id_col');
            })
            .then(models => {
              expect(models.map(it => it.model2Prop1)).to.eql(['hejsan 1', 'hejsan 2']);
            });
        });

        it('.join() with a subquery', () => {
          return Model1.query()
            .findByIds(1)
            .join(
              Model2.query()
                // Test objection raw instance in subquery where while we're at it.
                .where(raw('1 = 1'))
                .as('alias'),
              joinBuilder => {
                joinBuilder.on('Model1.id', 'alias.model1_id');
              }
            )
            .then(models => {
              // Three items because Model1 (id = 1) has three related Model2 instances.
              expect(models.length).to.equal(3);
            });
        });

        it('.join() with objection.raw', () => {
          return Model1.query()
            .findByIds(1)
            .select('Model1.id as model1Id', 'model2.id_col as model2Id')
            .join('model2', builder => {
              builder.andOn(raw('?? = ??', ['Model1.id', 'model2.model1_id']));
            })
            .orderBy('model2.id_col')
            .then(result => {
              expect(result).to.eql([
                { model1Id: 1, model2Id: 1, $afterGetCalled: 1 },
                { model1Id: 1, model2Id: 2, $afterGetCalled: 1 },
                { model1Id: 1, model2Id: 3, $afterGetCalled: 1 }
              ]);
            });
        });

        it('.where() with an a raw instance', () => {
          return Model2.query()
            .where(raw('model2_prop2 = 20'))
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('grouped .where() with an a raw instance', () => {
          return Model2.query()
            .where(builder => {
              builder.where(raw('model2_prop2 = 20'));
            })
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with an a knex.raw instance', () => {
          return Model2.query()
            .where(session.knex.raw('model2_prop2 = 20'))
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with an object', () => {
          return Model2.query()
            .where({ model2_prop2: 20 })
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() and object with toKnexRaw method', () => {
          return Model2.query()
            .where('model2_prop2', '>', {
              toKnexRaw(builder) {
                return builder.knex().raw('?', 15);
              }
            })
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20, 30]);
            });
        });

        it('.where() with object and object with toKnexRaw method', () => {
          return Model2.query()
            .where({
              model2_prop2: {
                toKnexRaw(builder) {
                  return builder.knex().raw('?', 20);
                }
              }
            })
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with an object and query builder', () => {
          return Model2.query()
            .where({
              model2_prop2: Model2.query().max('model2_prop2')
            })
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([30]);
            });
        });

        it('.where() with a subquery and aliases (#769)', () => {
          return Model2.query()
            .alias('m1')
            .where(
              'id_col',
              Model2.query()
                .select('m2.id_col')
                .alias('m2')
                .where('m2.model2_prop2', ref('m1.model2_prop2'))
            )
            .orderBy('m1.model2_prop2')
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([10, 20, 30]);
            });
        });

        it('.where() with an object and knex query builder', () => {
          return Model2.query()
            .where({
              model2_prop2: session.knex('model2').max('model2_prop2')
            })
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([30]);
            });
        });

        it('.where() with an object and knex.raw', () => {
          return Model2.query()
            .where({
              model2_prop2: session.knex.raw('10 + 10')
            })
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with an object and objection.raw', () => {
          return Model2.query()
            .where({
              model2_prop2: raw('10 + 10')
            })
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with objection.raw and a subquery builder', () => {
          return Model2.query()
            .where(
              'id_col',
              raw(
                '?',
                Model2.query()
                  .select('id_col')
                  .where('model2_prop2', 20)
              )
            )
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('raw should accept non-string values', () => {
          return Model2.query()
            .where('model2_prop2', raw(20))
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with objection.raw and a subquery builder in an object', () => {
          return Model2.query()
            .where(
              'id_col',
              raw(':subQuery', {
                subQuery: Model2.query()
                  .select('id_col')
                  .where('model2_prop2', 20)
              })
            )
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with objection.raw and a nested mess of things', () => {
          return Model2.query()
            .where(
              'id_col',
              raw(':nestedMess', {
                nestedMess: raw(
                  '?',
                  Model2.query()
                    .select('id_col')
                    .where('model2_prop2', 20)
                )
              })
            )
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with objection.raw and a knex subquery builder', () => {
          return Model2.query()
            .where(
              'id_col',
              raw(
                '?',
                Model2.query()
                  .select('id_col')
                  .where('model2_prop2', 20)
                  .build()
              )
            )
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with objection.raw and a subquery builder (array bindings)', () => {
          return Model2.query()
            .where(
              'id_col',
              raw('?', [
                Model2.query()
                  .select('id_col')
                  .where('model2_prop2', 20)
              ])
            )
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with objection.raw and a knex subquery builder (array bindings)', () => {
          return Model2.query()
            .where(
              'id_col',
              raw('?', [
                Model2.query()
                  .select('id_col')
                  .where('model2_prop2', 20)
                  .build()
              ])
            )
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20]);
            });
        });

        it('.where() with a model instance', () => {
          const where = Model1.fromJson({ model1Prop1: 'hello 1' });

          return Model1.query()
            .where(where)
            .then(models => {
              expect(_.map(models, 'model1Prop1').sort()).to.eql(['hello 1']);
            });
        });

        it('.orderBy()', () => {
          return Model2.query()
            .where('model2_prop2', '>', 15)
            .orderBy('model2_prop2')
            .then(models => {
              expect(_.map(models, 'model2Prop2')).to.eql([20, 30]);
            });
        });

        it('.pluck()', () => {
          return Model2.query()
            .where('model2_prop2', '>', 15)
            .orderBy('model2_prop2')
            .pluck('model2Prop2')
            .then(values => {
              expect(values).to.eql([20, 30]);
            });
        });

        it('.join()', () => {
          return Model2.query()
            .select('model2.*', 'Model1.model1Prop1')
            .where('model2_prop2', '>', 15)
            .join('Model1', 'model2.model1_id', 'Model1.id')
            .then(models => {
              expect(_.map(models, 'model2Prop1').sort()).to.eql(['hejsan 1', 'hejsan 2']);
              expect(_.map(models, 'model1Prop1')).to.eql(['hello 1', 'hello 1']);
            });
        });

        it('.distinct()', () => {
          return Model1.query()
            .distinct('Model1.id', 'Model1.model1Prop1')
            .leftJoinRelation('model1Relation1', { alias: 'balls' })
            .where('Model1.model1Prop1', 'hello 1')
            .orderBy('Model1.model1Prop1')
            .page(0, 1)
            .then(res => {
              expect(res.results[0].model1Prop1).to.equal('hello 1');
            });
        });

        it('.count()', () => {
          return Model2.query()
            .count()
            .first()
            .then(res => {
              expect(res[Object.keys(res)[0]]).to.eql(3);
            });
        });

        it('.countDistinct()', () => {
          return Model2.query()
            .countDistinct('id_col')
            .first()
            .then(res => {
              expect(res[Object.keys(res)[0]]).to.eql(3);
            });
        });

        it('from (objection subquery)', () => {
          return Model1.query()
            .select('sub.*')
            .from(
              Model1.query()
                .where('id', 2)
                .as('sub')
            )
            .then(res => {
              expect(res.length).to.equal(1);
              expect(res[0].id).to.equal(2);
            });
        });

        it('from (knex subquery)', () => {
          return Model1.query()
            .select('sub.*')
            .from(
              session
                .knex('Model1')
                .where('id', 2)
                .as('sub')
            )
            .then(res => {
              expect(res.length).to.equal(1);
              expect(res[0].id).to.equal(2);
            });
        });

        it('from (knex raw subquery)', () => {
          return Model1.query()
            .select('sub.*')
            .from(session.knex.raw('(select * from ?? where ?? = 2) as sub', ['Model1', 'id']))
            .then(res => {
              expect(res.length).to.equal(1);
              expect(res[0].id).to.equal(2);
            });
        });

        it('from (objection raw subquery)', () => {
          return Model1.query()
            .select('sub.*')
            .from(raw('(select * from ?? where ?? = 2) as sub', ['Model1', 'id']))
            .then(res => {
              expect(res.length).to.equal(1);
              expect(res[0].id).to.equal(2);
            });
        });

        it('from (function subquery)', () => {
          return Model1.query()
            .select('sub.*')
            .from(builder =>
              builder
                .from('Model1')
                .where('id', 2)
                .as('sub')
            )
            .then(res => {
              expect(res.length).to.equal(1);
              expect(res[0].id).to.equal(2);
            });
        });

        it('.throwIfNotFound() with empty result', done => {
          Model1.query()
            .where('model1Prop1', 'There is no value like me')
            .throwIfNotFound()
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch(err => {
              expect(err).to.be.a(Model1.NotFoundError);
              done();
            })
            .catch(done);
        });

        it('.throwIfNotFound() with non-empty result', () => {
          return Model2.query()
            .throwIfNotFound()
            .where('model2_prop2', '>', 15)
            .then(models => {
              expect(_.map(models, 'model2Prop2').sort()).to.eql([20, 30]);
            });
        });

        it('.throwIfNotFound() with single result', done => {
          Model1.query()
            .where('model1Prop1', 'There is no value like me')
            .first()
            .throwIfNotFound()
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch(err => {
              expect(err).to.be.a(Model1.NotFoundError);
              done();
            })
            .catch(done);
        });

        it('.throwIfNotFound() with result equal to 0', done => {
          Model1.query()
            .where('model1Prop1', 'There is no value like me')
            .delete()
            .throwIfNotFound()
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch(err => {
              expect(err).to.be.a(Model1.NotFoundError);
              done();
            })
            .catch(done);
        });

        it('.throwIfNotFound() should throw error returned by `createNotFoundError`', done => {
          class CustomError extends Error {
            constructor(ctx) {
              super('CustomError');
              this.ctx = ctx;
            }
          }

          class TestModel extends Model1 {
            static createNotFoundError(ctx) {
              return new CustomError(ctx);
            }
          }

          TestModel.query()
            .where('model1Prop1', 'There is no value like me')
            .mergeContext({ foo: 'bar' })
            .throwIfNotFound()
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch(err => {
              expect(err).to.be.a(CustomError);
              expect(err.ctx).to.eql({ foo: 'bar' });
              done();
            })
            .catch(done);
        });

        it('complex nested subquery', () => {
          return Model2.query()
            .from(builder => {
              builder
                .from('model2')
                .select('*', builder => {
                  let raw;

                  if (utils.isMySql(session.knex)) {
                    raw = Model2.raw('concat(model2_prop1, model2_prop2)');
                  } else {
                    raw = Model2.raw('model2_prop1 || model2_prop2');
                  }

                  builder.select(raw).as('concatProp');
                })
                .as('t');
            })
            .where('t.concatProp', 'hejsan 310')
            .then(models => {
              expect(models).to.have.length(1);
              expect(models[0]).to.eql({
                idCol: 3,
                model1Id: 1,
                model2Prop1: 'hejsan 3',
                model2Prop2: 10,
                concatProp: 'hejsan 310',
                $afterGetCalled: 1
              });
            });
        });

        it('knex-style function subqueries', () => {
          return Model1.query()
            .from(builder =>
              builder
                .select('model2.*')
                .from('model2')
                .as('foo')
            )
            .orderBy(builder =>
              builder
                .from('model2')
                .where('model2.id_col', ref('foo.id_col'))
                .select('model2_prop2')
            )
            .whereExists(builder => builder.from('Model1').where('foo.model1_id', ref('Model1.id')))
            .castTo(Model2)
            .then(models => {
              expect(models.map(it => it.model2Prop2)).to.eql([10, 20, 30]);
            });
        });

        it('raw in select', () => {
          return Model2.query()
            .select('model2.*', raw('?? + ? as ??', 'model2_prop2', 10, 'model2_prop2'))
            .orderBy('id_col')
            .then(models => {
              expect(_.map(models, 'idCol')).to.eql([1, 2, 3]);
              expect(_.map(models, 'model2Prop2')).to.eql([40, 30, 20]);
            });
        });

        it('raw in where', () => {
          return Model2.query()
            .where('model2_prop2', raw(':value', { value: 20 }))
            .orderBy('id_col')
            .then(models => {
              expect(_.map(models, 'idCol')).to.eql([2]);
              expect(_.map(models, 'model2Prop2')).to.eql([20]);
            });
        });

        it('raw in where object', () => {
          return Model2.query()
            .where({
              model2_prop2: raw('?', [20])
            })
            .orderBy('id_col')
            .then(models => {
              expect(_.map(models, 'idCol')).to.eql([2]);
              expect(_.map(models, 'model2Prop2')).to.eql([20]);
            });
        });

        it('subquery builder in select', () => {
          return Model1.query()
            .select(
              'Model1.*',
              Model2.query()
                .sum('model2_prop2')
                .where('Model1.id', ref('model2.model1_id'))
                .as('sum')
            )
            .orderBy('id')
            .then(models => {
              expect(_.map(models, 'id')).to.eql([1, 2]);
              expect(_.map(models, 'sum')).to.eql([60, null]);
            });
        });

        it('subquery builder in select (array)', () => {
          return Model1.query()
            .select([
              'Model1.*',
              Model2.query()
                .sum('model2_prop2')
                .where('Model1.id', ref('model2.model1_id'))
                .as('sum')
            ])
            .orderBy('id')
            .then(models => {
              expect(_.map(models, 'id')).to.eql([1, 2]);
              expect(_.map(models, 'sum')).to.eql([60, null]);
            });
        });

        if (session.isPostgres()) {
          it('select subquery as an array', () => {
            return Model1.query()
              .select(
                'Model1.*',
                raw(
                  'ARRAY(?) as "model1Ids"',
                  Model1.relatedQuery('model1Relation2')
                    .select('id_col')
                    .orderBy('id_col')
                )
              )
              .orderBy('id')
              .then(res => {
                expect(res[0].model1Ids).to.eql([1, 2, 3]);
                expect(res[1].model1Ids).to.eql([]);
              });
          });

          it('select subquery as an array with aliased table', () => {
            return Model1.query()
              .alias('m')
              .select(
                'm.*',
                raw(
                  'ARRAY(?) as "model1Ids"',
                  // Test doubly nested `raw` for shits and giggles.
                  raw(
                    '?',
                    Model1.relatedQuery('model1Relation2')
                      .select('id_col')
                      .orderBy('id_col')
                  )
                )
              )
              .orderBy('id')
              .then(res => {
                expect(res[0].model1Ids).to.eql([1, 2, 3]);
                expect(res[1].model1Ids).to.eql([]);
              });
          });

          it('select subquery as an array (unbound model)', () => {
            class TestModel extends Model1 {}
            TestModel.knex(null);

            return TestModel.query(session.knex)
              .select(
                'Model1.*',
                raw(
                  'ARRAY(?) as "model1Ids"',
                  TestModel.relatedQuery('model1Relation2')
                    .select('id_col')
                    .orderBy('id_col')
                )
              )
              .orderBy('id')
              .then(res => {
                expect(res[0].model1Ids).to.eql([1, 2, 3]);
                expect(res[1].model1Ids).to.eql([]);
              });
          });
        }

        it('select subquery to same table with alias', () => {
          return Model1.query()
            .upsertGraph(
              {
                id: 1,
                model1Relation1: {
                  id: 2
                }
              },
              { relate: true }
            )
            .then(() => {
              return Model1.query()
                .findById(1)
                .alias('m1')
                .select(
                  'm1.*',
                  Model1.relatedQuery('model1Relation1')
                    .select('id')
                    .as('foo')
                );
            })
            .then(res => {
              expect(res.foo).to.equal(2);
            });
        });

        it('deeply nested where subquery to same table with alias', () => {
          return Model1.query()
            .upsertGraph(
              {
                id: 1,
                model1Relation1: {
                  id: 2
                }
              },
              { relate: true }
            )
            .then(() => {
              return Model1.query()
                .alias('m1')
                .where(builder => {
                  // The two nested grouping where's are relevant here.
                  builder.where(builder => {
                    builder.where(lit(2), Model1.relatedQuery('model1Relation1').select('id'));
                  });
                });
            })
            .then(res => {
              expect(res).to.have.length(1);
              expect(res[0].id).to.equal(1);
            });
        });

        it('deeply nested subqueries to same table with alias', () => {
          return Model1.query()
            .insertGraph({
              id: 1001,
              model1Relation1: {
                id: 1002,
                model1Relation1: {
                  id: 1003,
                  model1Relation1: {
                    id: 1004
                  }
                }
              }
            })
            .then(() => {
              return Model1.query()
                .alias('m1')
                .whereExists(
                  Model1.relatedQuery('model1Relation1')
                    .alias('m2')
                    .whereExists(
                      Model1.relatedQuery('model1Relation1')
                        .alias('m3')
                        .whereExists(Model1.relatedQuery('model1Relation1').alias('m4'))
                    )
                );
            })
            .then(res => {
              expect(res).to.have.length(1);
              expect(res[0].id).to.equal(1001);
            });
        });

        it('.modify()', () => {
          let builder = Model2.query();

          return builder
            .modify(
              (modifyBuilder, arg1, arg2, arg3) => {
                expect(modifyBuilder).to.equal(builder);
                expect(arg1).to.equal('foo');
                expect(arg2).to.equal(undefined);
                expect(arg3).to.equal(10);
                builder.where('model2_prop1', '>=', 'hejsan 2');
              },
              'foo',
              undefined,
              10
            )
            .then(models => {
              expect(_.map(models, 'model2Prop1').sort()).to.eql(['hejsan 2', 'hejsan 3']);
            });
        });

        it('from', () => {
          return Model1.query()
            .upsertGraph({
              id: 2,
              model1Relation2: [
                {
                  model2Prop1: 'lol'
                }
              ]
            })
            .then(() => {
              return (
                Model1.query()
                  .select('m2.*')
                  .from({
                    m1: 'Model1',
                    m2: 'model2'
                  })
                  // This tests that correct alias is used
                  // for Model1 under the hood.
                  .findByIds(1)
                  .where('m1.id', ref('m2.model1_id'))
                  .orderBy('m2.id_col')
                  .castTo(Model2)
              );
            })
            .then(models => {
              expect(models).to.eql([
                {
                  idCol: 1,
                  model1Id: 1,
                  model2Prop1: 'hejsan 1',
                  model2Prop2: 30,
                  $afterGetCalled: 1
                },
                {
                  idCol: 2,
                  model1Id: 1,
                  model2Prop1: 'hejsan 2',
                  model2Prop2: 20,
                  $afterGetCalled: 1
                },
                {
                  idCol: 3,
                  model1Id: 1,
                  model2Prop1: 'hejsan 3',
                  model2Prop2: 10,
                  $afterGetCalled: 1
                }
              ]);
            });
        });

        it('whereExists in nested where with relatedQuery', () => {
          return Model1.query()
            .where(builder => {
              builder.whereExists(Model1.relatedQuery('model1Relation2'));
            })
            .eager('model1Relation2')
            .then(results => {
              expect(results.length).to.equal(1);
              expect(results[0].model1Prop1).to.equal('hello 1');
            });
        });

        if (!session.isMySql()) {
          it('with', () => {
            return Model1.query()
              .with('subquery1', Model1.query().unionAll(Model1.query()))
              .with('subquery2', Model1.query())
              .count('* as count')
              .from('subquery1')
              .first()
              .then(result => {
                expect(result.count).to.eql(4);
              });
          });
        }

        if (session.isPostgres()) {
          it('timeout should throw a TimeOutError', done => {
            const knexQuery = Model1.query()
              .timeout(50)
              .build();

            // Now the tricky part. We add `pg_sleep` as another source table so that the query
            // takes a long time.
            knexQuery.from({
              sleep: session.knex.raw('pg_sleep(0.1)'),
              Model1: 'Model1'
            });

            knexQuery
              .then(() => done(new Error('should not get here')))
              .catch(err => {
                expect(err).to.be.a(TimeoutError);
                done();
              })
              .catch(done);
          });

          it('smoke test for various methods', () => {
            // This test doesn't actually test that the methods work. Knex has tests
            // for these. This is a smoke test in case of typos and such.
            return Model2.query()
              .with('wm1', builder =>
                builder
                  .insert({ a: 1 })
                  .update({ a: 2 })
                  .delete()
                  .del()
                  .table('model2')
                  .clear(QueryBuilderOperation)
                  .select('*')
                  .from('model2')
              )
              .clearSelect()
              .clearWhere()
              .columns('model2.model2_prop2')
              .where(raw('? = ?', ref('model2.id_col'), ref('model2.model2_prop2')))
              .where(raw('? in (?)', ref('model2.id_col'), Model1.query().select('id')))
              .whereNot('model2.id_col', 1)
              .orWhereNot('model2.id_col', 2)
              .whereRaw('model2.id_col is null')
              .andWhereRaw('model2.id_col is null')
              .orWhereRaw('model2.id_col is null')
              .whereExists(Model2.query())
              .orWhereExists(Model2.query())
              .whereNotExists(Model2.query())
              .orWhereNotExists(Model2.query())
              .orWhereIn('model2.id_col', [1, 2, 3])
              .whereNotIn('model2.id_col', [1, 2, 3])
              .orWhereNotIn('model2.id_col', [1, 2, 3])
              .whereNull('model2.id_col')
              .orWhereNull('model2.id_col')
              .orWhereNotNull('model2.id_col')
              .andWhereBetween('model2.id_col', [0, 1])
              .whereNotBetween('model2.id_col', [0, 1])
              .andWhereNotBetween('model2.id_col', [0, 1])
              .orWhereBetween('model2.id_col', [0, 1])
              .orWhereNotBetween('model2.id_col', [0, 1])
              .orderByRaw('model2.id_col')
              .into('model2')
              .table('model2')
              .joinRaw('inner join model2 as m1 on m1.model2_prop2 = 1')
              .leftOuterJoin('model2 as m2', join =>
                join
                  .onBetween('m2.model2_prop2', [1, 2])
                  .onNotBetween('m2.model2_prop2', [1, 2])
                  .orOnBetween('m2.model2_prop2', [1, 2])
                  .orOnNotBetween('m2.model2_prop2', [1, 2])
                  .onIn('m2.model2_prop2', [1, 2])
                  .onNotIn('m2.model2_prop2', [1, 2])
                  .orOnIn('m2.model2_prop2', [1, 2])
                  .andOnIn('m2.model2_prop2', [1, 2])
                  .orOnNotIn('m2.model2_prop2', [1, 2])
                  .onNull('m2.model2_prop2')
                  .orOnNull('m2.model2_prop2')
                  .onNotNull('m2.model2_prop2')
                  .orOnNotNull('m2.model2_prop2')
                  .onExists(Model2.query())
                  .orOnExists(Model2.query())
                  .onNotExists(Model2.query())
                  .orOnNotExists(Model2.query())
                  .andOnExists(Model2.query())
                  .andOnNotExists(Model2.query())
                  .andOnBetween('m2.model2_prop2', [1, 2])
                  .andOnNotBetween('m2.model2_prop2', [1, 2])
                  .andOn('m2.model2_prop2', 1)
                  .orOnNotIn('m2.model2_prop2', [1, 2])
                  .andOnNotIn('m2.model2_prop2', [1, 2])
                  .andOnNull('m2.model2_prop2')
                  .andOnNotNull('m2.model2_prop2')
                  .onVal('m2.model2_prop2', 1)
                  .andOnVal('m2.model2_prop2', 2)
                  .orOnVal('m2.model2_prop2', 3)
              )
              .rightJoin('model2 as m3', 'm3.model2_prop2', 'm1.model2_prop2')
              .rightOuterJoin('model2 as m4', 'm4.model2_prop2', 'm1.model2_prop2')
              .fullOuterJoin('model2 as m6', 'm6.model2_prop2', 'm1.model2_prop2')
              .crossJoin('model2 as m7')
              .whereWrapped('model2.id_col < 10');
          });
        }
      });
    });

    describe('relatedQuery()', () => {
      before(() => {
        return session.populate([
          {
            id: 1,

            model1Relation1: {
              id: 3
            },

            model1Relation2: [
              {
                idCol: 1
              },
              {
                idCol: 2
              }
            ],

            model1Relation3: [
              {
                idCol: 4
              }
            ]
          },
          {
            id: 2,

            model1Relation2: [
              {
                idCol: 3
              }
            ],

            model1Relation3: [
              {
                idCol: 5
              },
              {
                idCol: 6
              }
            ]
          }
        ]);
      });

      it('should work in select', () => {
        return Model1.query()
          .select([
            'id',

            Model1.relatedQuery('model1Relation1')
              .count()
              .as('rel1Count'),

            Model1.relatedQuery('model1Relation2')
              .count()
              .as('rel2Count'),

            Model1.relatedQuery('model1Relation3')
              .count()
              .as('rel3Count')
          ])
          .orderBy('id')
          .then(res => {
            expect(res).to.eql([
              { id: 1, rel1Count: 1, rel2Count: '2', rel3Count: '1', $afterGetCalled: 1 },
              { id: 2, rel1Count: 0, rel2Count: '1', rel3Count: '2', $afterGetCalled: 1 },
              { id: 3, rel1Count: 0, rel2Count: '0', rel3Count: '0', $afterGetCalled: 1 }
            ]);
          });
      });

      it('should work with alias', () => {
        return Model1.query()
          .alias('m')
          .select([
            'id',

            Model1.relatedQuery('model1Relation1')
              .count()
              .as('rel1Count'),

            Model1.relatedQuery('model1Relation2')
              .count()
              .as('rel2Count'),

            Model1.relatedQuery('model1Relation3')
              .count()
              .as('rel3Count')
          ])
          .orderBy('id')
          .then(res => {
            expect(res).to.eql([
              { id: 1, rel1Count: 1, rel2Count: '2', rel3Count: '1', $afterGetCalled: 1 },
              { id: 2, rel1Count: 0, rel2Count: '1', rel3Count: '2', $afterGetCalled: 1 },
              { id: 3, rel1Count: 0, rel2Count: '0', rel3Count: '0', $afterGetCalled: 1 }
            ]);
          });
      });

      it('self referential relations should work', () => {
        return Model1.query()
          .select([
            'id',
            Model1.relatedQuery('model1Relation1')
              .select('id')
              .as('relId')
          ])
          .orderBy('id')
          .then(res => {
            expect(res).to.eql([
              { id: 1, relId: 3, $afterGetCalled: 1 },
              { id: 2, relId: null, $afterGetCalled: 1 },
              { id: 3, relId: null, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should work with subquery alias', () => {
        return Model1.query()
          .select([
            'id',
            Model1.relatedQuery('model1Relation1')
              .alias('a2')
              .select('a2.id')
              .as('relId')
          ])
          .alias('a1')
          .orderBy('id')
          .then(res => {
            expect(res).to.eql([
              { id: 1, relId: 3, $afterGetCalled: 1 },
              { id: 2, relId: null, $afterGetCalled: 1 },
              { id: 3, relId: null, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should work in where', () => {
        return Model1.query()
          .where(lit(3), Model1.relatedQuery('model1Relation1').select('id'))
          .first()
          .then(res => {
            expect(res.id).to.equal(1);
          });
      });
    });

    describe('joinRelation()', () => {
      before(() => {
        return session.populate([
          {
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

                  model1Relation2: [
                    {
                      idCol: 4,
                      model2Prop1: 'hejsan 4'
                    }
                  ]
                }
              }
            },

            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'hejsan 1',

                model2Relation1: [
                  {
                    id: 5,
                    model1Prop1: 'hello 5'
                  }
                ]
              },
              {
                idCol: 2,
                model2Prop1: 'hejsan 2',

                model2Relation1: [
                  {
                    id: 6,
                    model1Prop1: 'hello 6'
                  },
                  {
                    id: 7,
                    model1Prop1: 'hello 7',

                    model1Relation1: {
                      id: 8,
                      model1Prop1: 'hello 8'
                    },

                    model1Relation2: [
                      {
                        idCol: 3,
                        model2Prop1: 'hejsan 3'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]);
      });

      ['joinRelation', 'innerJoinRelation'].forEach(joinMethod => {
        it(`should join a belongs to one relation using ${joinMethod}`, () => {
          return Model1.query()
            .select('Model1.*', 'model1Relation1.model1Prop1 as rel_model1Prop1')
            [joinMethod]('model1Relation1')
            .orderBy('Model1.id')
            .then(models => {
              expect(_.map(models, 'id')).to.eql([1, 2, 3, 7]);
              expect(_.map(models, 'rel_model1Prop1')).to.eql([
                'hello 2',
                'hello 3',
                'hello 4',
                'hello 8'
              ]);
            });
        });
      });

      ['leftJoinRelation', 'leftOuterJoinRelation'].forEach(joinMethod => {
        it(`should join a belongs to one relation using ${joinMethod}`, () => {
          return Model1.query()
            .select('Model1.id', 'model1Relation1.model1Prop1 as rel_model1Prop1')
            [joinMethod]('model1Relation1')
            .orderBy('Model1.id')
            .then(models => {
              expect(models).to.eql([
                { id: 1, rel_model1Prop1: 'hello 2', $afterGetCalled: 1 },
                { id: 2, rel_model1Prop1: 'hello 3', $afterGetCalled: 1 },
                { id: 3, rel_model1Prop1: 'hello 4', $afterGetCalled: 1 },
                { id: 4, rel_model1Prop1: null, $afterGetCalled: 1 },
                { id: 5, rel_model1Prop1: null, $afterGetCalled: 1 },
                { id: 6, rel_model1Prop1: null, $afterGetCalled: 1 },
                { id: 7, rel_model1Prop1: 'hello 8', $afterGetCalled: 1 },
                { id: 8, rel_model1Prop1: null, $afterGetCalled: 1 }
              ]);
            });
        });
      });

      it('should be able to use `joinRelation` in a sub query (1)', () => {
        return Model1.query()
          .from(
            Model1.query()
              .joinRelation('model1Relation2')
              .select('Model1.id', 'model1Relation2.id_col as m2r2Id')
              .as('inner')
          )
          .select('*')
          .orderBy(['id', 'm2r2Id'])
          .then(models => {
            expect(models).to.eql([
              { id: 1, m2r2Id: 1, $afterGetCalled: 1 },
              { id: 1, m2r2Id: 2, $afterGetCalled: 1 },
              { id: 4, m2r2Id: 4, $afterGetCalled: 1 },
              { id: 7, m2r2Id: 3, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should be able to use `joinRelation` in a sub query (2)', () => {
        return Model1.query()
          .from(
            raw(
              '?',
              Model1.query()
                .joinRelation('model1Relation2')
                .select('Model1.id', 'model1Relation2.id_col as m2r2Id')
                .as('inner')
            )
          )
          .select('*')
          .orderBy(['id', 'm2r2Id'])
          .then(models => {
            expect(models).to.eql([
              { id: 1, m2r2Id: 1, $afterGetCalled: 1 },
              { id: 1, m2r2Id: 2, $afterGetCalled: 1 },
              { id: 4, m2r2Id: 4, $afterGetCalled: 1 },
              { id: 7, m2r2Id: 3, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should join a has many relation (1)', () => {
        return Model1.query()
          .select('Model1.*', 'model1Relation2.id_col')
          .joinRelation('model1Relation2')
          .then(models => {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 4, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 4, 3]);
          });
      });

      it('should join a has many relation (2)', () => {
        return Model1.query()
          .select('Model1.*', 'model1Relation2.id_col')
          .joinRelation('model1Relation2')
          .where('model1Relation2.id_col', '<', 4)
          .then(models => {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 3]);
          });
      });

      it('should join a many to many relation (1)', () => {
        return Model2.query()
          .select('model2.*', 'model2Relation1.id')
          .joinRelation('model2Relation1')
          .then(models => {
            models = _.sortBy(models, ['idCol', 'id']);
            expect(_.map(models, 'idCol')).to.eql([1, 2, 2]);
            expect(_.map(models, 'id')).to.eql([5, 6, 7]);
          });
      });

      it('should join a many to many relation (2)', () => {
        return Model2.query()
          .select('model2.*', 'model2Relation1.id')
          .joinRelation('model2Relation1')
          .whereBetween('model2Relation1.id', [5, 6])
          .then(models => {
            models = _.sortBy(models, ['idCol', 'id']);
            expect(_.map(models, 'idCol')).to.eql([1, 2]);
            expect(_.map(models, 'id')).to.eql([5, 6]);
          });
      });

      it('should be able to specify innerJoin', () => {
        return Model1.query()
          .innerJoinRelation('model1Relation1')
          .then(models => {
            expect(models.length).to.equal(4);
          });
      });

      it('should be able to specify leftJoin', () => {
        return Model1.query()
          .leftJoinRelation('model1Relation1')
          .then(models => {
            expect(models.length).to.equal(8);
          });
      });

      it('should join an eager expression `a.a`', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .leftJoinRelation('model1Relation1.model1Relation1')
          .where('model1Relation1:model1Relation1.model1Prop1', 'hello 4')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 2,
              model1Prop1: 'hello 2'
            });
          });
      });

      it('should join an eager expression `a.b`', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .leftJoinRelation('model1Relation1.model1Relation2')
          .where('model1Relation1:model1Relation2.model2_prop1', 'hejsan 4')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 3,
              model1Prop1: 'hello 3'
            });
          });
      });

      it('aliases should work with eager expression `a.b`', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .leftJoinRelation('model1Relation1 as a . model1Relation2 as b')
          .where('a:b.model2_prop1', 'hejsan 4')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 3,
              model1Prop1: 'hello 3'
            });
          });
      });

      it('should join an eager expression `a.a.b`', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1')
          .leftJoinRelation('model1Relation1.model1Relation1.model1Relation2')
          .where('model1Relation1:model1Relation1:model1Relation2.model2_prop1', 'hejsan 4')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 2,
              model1Prop1: 'hello 2'
            });
          });
      });

      it('should join an eager expression `[a, b]`', () => {
        return Model1.query()
          .select('Model1.id', 'Model1.model1Prop1', 'model1Relation2.model2_prop1 as model2Prop1')
          .leftJoinRelation('[model1Relation1, model1Relation2]')
          .where('model1Relation2.model2_prop1', 'hejsan 1')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model1Prop1: 'hello 1',
              model2Prop1: 'hejsan 1'
            });
          });
      });

      it('should join an eager expression `[a, b.c]`', () => {
        return Model1.query()
          .select(
            'Model1.id',
            'model1Relation2:model2Relation1.model1Prop1 as foo',
            'model1Relation2.model2_prop1 as model2Prop1'
          )
          .leftJoinRelation('[model1Relation1, model1Relation2.model2Relation1]')
          .where('model1Relation2:model2Relation1.model1Prop1', 'hello 6')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model2Prop1: 'hejsan 2',
              foo: 'hello 6'
            });
          });
      });

      it('should be able to merge joinRelation calls', () => {
        return (
          Model1.query()
            .select(
              'Model1.id',
              'model1Relation1.id as m1r1Id',
              'model1Relation2.id_col as m1r2Id',
              'model1Relation2:model2Relation1.id as m1r2M2r1Id'
            )
            .joinRelation('model1Relation1')
            // Join the same relation again for shits and giggles.
            .joinRelation('model1Relation1')
            .joinRelation('model1Relation2')
            .joinRelation('model1Relation2.model2Relation1')
            .orderBy(['Model1.id', 'model1Relation2.id_col', 'model1Relation2:model2Relation1.id'])
            .then(models => {
              expect(models).to.eql([
                {
                  id: 1,
                  m1r1Id: 2,
                  m1r2Id: 1,
                  m1r2M2r1Id: 5,
                  $afterGetCalled: 1
                },
                {
                  id: 1,
                  m1r1Id: 2,
                  m1r2Id: 2,
                  m1r2M2r1Id: 6,
                  $afterGetCalled: 1
                },
                {
                  id: 1,
                  m1r1Id: 2,
                  m1r2Id: 2,
                  m1r2M2r1Id: 7,
                  $afterGetCalled: 1
                }
              ]);
            })
        );
      });

      it('should be able to merge joinRelation calls with different aliases (1)', () => {
        return Model1.query()
          .select('Model1.id', 'm1r1.id as m1r1Id', 'm1r1_2.id as m1r1Id2')
          .joinRelation('model1Relation1', {
            alias: 'm1r1'
          })
          .joinRelation('model1Relation1', {
            alias: 'm1r1_2'
          })
          .orderBy('Model1.id')
          .then(models => {
            expect(models).to.eql([
              { id: 1, m1r1Id: 2, m1r1Id2: 2, $afterGetCalled: 1 },
              { id: 2, m1r1Id: 3, m1r1Id2: 3, $afterGetCalled: 1 },
              { id: 3, m1r1Id: 4, m1r1Id2: 4, $afterGetCalled: 1 },
              { id: 7, m1r1Id: 8, m1r1Id2: 8, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should be able to merge joinRelation calls with different aliases (2)', () => {
        return Model1.query()
          .select('Model1.id', 'm1r1.id as m1r1Id', 'm1r1_2.id as m1r1Id2')
          .joinRelation('model1Relation1 as m1r1')
          .joinRelation('model1Relation1 as m1r1_2')
          .orderBy('Model1.id')
          .then(models => {
            expect(models).to.eql([
              { id: 1, m1r1Id: 2, m1r1Id2: 2, $afterGetCalled: 1 },
              { id: 2, m1r1Id: 3, m1r1Id2: 3, $afterGetCalled: 1 },
              { id: 3, m1r1Id: 4, m1r1Id2: 4, $afterGetCalled: 1 },
              { id: 7, m1r1Id: 8, m1r1Id2: 8, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should be able to merge different joinRelation calls', () => {
        return Model1.query()
          .select('Model1.id', 'm1r1.id as m1r1Id', 'model1Relation2.id_col as m1r2Id')
          .joinRelation('model1Relation1', {
            alias: 'm1r1'
          })
          .leftJoinRelation('model1Relation2')
          .orderBy(['Model1.id', 'model1Relation2.id_col'])
          .then(models => {
            expect(models).to.eql([
              { id: 1, m1r1Id: 2, m1r2Id: 1, $afterGetCalled: 1 },
              { id: 1, m1r1Id: 2, m1r2Id: 2, $afterGetCalled: 1 },
              { id: 2, m1r1Id: 3, m1r2Id: null, $afterGetCalled: 1 },
              { id: 3, m1r1Id: 4, m1r2Id: null, $afterGetCalled: 1 },
              { id: 7, m1r1Id: 8, m1r2Id: 3, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should be able to merge joinRelation calls with different aliases (3)', () => {
        return Model1.query()
          .select('Model1.id', 'm1r1.id as m1r1Id', 'm1r1_2.id as m1r1Id2')
          .joinRelation('model1Relation1', {
            aliases: {
              model1Relation1: 'm1r1'
            }
          })
          .joinRelation('model1Relation1', {
            aliases: {
              model1Relation1: 'm1r1_2'
            }
          })
          .orderBy('Model1.id')
          .then(models => {
            expect(models).to.eql([
              { id: 1, m1r1Id: 2, m1r1Id2: 2, $afterGetCalled: 1 },
              { id: 2, m1r1Id: 3, m1r1Id2: 3, $afterGetCalled: 1 },
              { id: 3, m1r1Id: 4, m1r1Id2: 4, $afterGetCalled: 1 },
              { id: 7, m1r1Id: 8, m1r1Id2: 8, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should be able to merge leftJoinRelation calls', () => {
        return (
          Model1.query()
            .select(
              'Model1.id',
              'model1Relation2:model2Relation1.model1Prop1 as foo',
              'model1Relation2.model2_prop1 as model2Prop1'
            )
            .leftJoinRelation('model1Relation1')
            // Join the same relation again for shits and giggles.
            .leftJoinRelation('model1Relation1')
            .leftJoinRelation('model1Relation2')
            .leftJoinRelation('model1Relation2.model2Relation1')
            .where('model1Relation2:model2Relation1.model1Prop1', 'hello 6')
            .first()
            .then(model => {
              expect(model.toJSON()).to.eql({
                id: 1,
                model2Prop1: 'hejsan 2',
                foo: 'hello 6'
              });
            })
        );
      });

      it('should be able to specify aliases', () => {
        return Model1.query()
          .select([
            'Model1.id',
            'm1r1:m1r1.id as x',
            'm1r2:m2r1.model1Prop1 as foo',
            'm1r2.model2_prop1 as model2Prop1'
          ])
          .leftJoinRelation('[model1Relation1.model1Relation1, model1Relation2.model2Relation1]', {
            aliases: {
              model1Relation1: 'm1r1',
              model1Relation2: 'm1r2',
              model2Relation1: 'm2r1'
            }
          })
          .where('m1r2:m2r1.model1Prop1', 'hello 6')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model2Prop1: 'hejsan 2',
              foo: 'hello 6',
              x: 3
            });
          });
      });

      it('should be able to specify aliases in the relation expression (string)', () => {
        return Model1.query()
          .select([
            'Model1.id',
            'm1r1:m1r1.id as x',
            'm1r2:m2r1.model1Prop1 as foo',
            'm1r2.model2_prop1 as model2Prop1'
          ])
          .leftJoinRelation(
            `[
            model1Relation1 as m1r1.[
              model1Relation1 as m1r1
            ],
            model1Relation2 as m1r2.[
              model2Relation1 as m2r1
            ]
          ]`
          )
          .where('m1r2:m2r1.model1Prop1', 'hello 6')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model2Prop1: 'hejsan 2',
              foo: 'hello 6',
              x: 3
            });
          });
      });

      it('should be able to specify aliases in the relation expression (object)', () => {
        return Model1.query()
          .select([
            'Model1.id',
            'm1r1:m1r1.id as x',
            'm1r2:m2r1.model1Prop1 as foo',
            'm1r2.model2_prop1 as model2Prop1'
          ])
          .leftJoinRelation({
            m1r1: {
              $relation: 'model1Relation1',

              m1r1: {
                $relation: 'model1Relation1'
              }
            },

            m1r2: {
              $relation: 'model1Relation2',

              m2r1: {
                $relation: 'model2Relation1'
              }
            }
          })
          .where('m1r2:m2r1.model1Prop1', 'hello 6')
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({
              id: 1,
              model2Prop1: 'hejsan 2',
              foo: 'hello 6',
              x: 3
            });
          });
      });

      it('should disable alias with option alias = false', () => {
        return Model1.query()
          .select('model2.*', 'Model1.id')
          .joinRelation('model1Relation2', { alias: false })
          .where('model2.id_col', '<', 4)
          .then(models => {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 3]);
          });
      });

      it('should use relation name as alias with option alias = true', () => {
        return Model1.query()
          .select('Model1.*', 'model1Relation2.id_col')
          .joinRelation('model1Relation2', { alias: true })
          .where('model1Relation2.id_col', '<', 4)
          .then(models => {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 3]);
          });
      });

      it('should use custom alias with option alias = string', () => {
        return Model1.query()
          .select('Model1.*', 'fooBarBaz.id_col')
          .joinRelation('model1Relation2', { alias: 'fooBarBaz' })
          .where('fooBarBaz.id_col', '<', 4)
          .then(models => {
            models = _.sortBy(models, ['id', 'id_col']);
            expect(_.map(models, 'id')).to.eql([1, 1, 7]);
            expect(_.map(models, 'id_col')).to.eql([1, 2, 3]);
          });
      });

      it('should join eager expression a.b.c, select c.* and cast result to c', () => {
        return Model1.query()
          .joinRelation('model1Relation2.model2Relation1.model1Relation1')
          .select([
            'model1Relation2:model2Relation1:model1Relation1.id as id_col',
            'model1Relation2:model2Relation1.id as model1_id'
          ])
          .castTo(Model2)
          .then(models => {
            expect(models[0]).to.be.a(Model2);
            expect(models).to.eql([
              {
                idCol: 8,
                model1Id: 7,
                $afterGetCalled: 1
              }
            ]);
          });
      });

      it('should join eager expression a.b.c, select columns with aliases and cast result to Model', () => {
        return Model1.query()
          .joinRelation('model1Relation2.model2Relation1.model1Relation1')
          .select([
            'model1Relation2:model2Relation1:model1Relation1.id as someId',
            'model1Relation2:model2Relation1.id as someOtherId'
          ])
          .castTo(Model)
          .then(models => {
            expect(models[0]).to.be.a(Model);
            expect(models[0]).to.not.be.a(Model1);

            expect(models).to.eql([
              {
                someId: 8,
                someOtherId: 7
              }
            ]);
          });
      });

      it('should count related models', () => {
        return Model1.query()
          .leftJoinRelation('model1Relation2')
          .select('Model1.id', 'Model1.model1Prop1')
          .count('Model1.id as relCount')
          .groupBy('Model1.id', 'Model1.model1Prop1')
          .findByIds([1, 2])
          .orderBy('id')
          .map(it => {
            it.relCount = parseInt(it.relCount);
            return it;
          })
          .then(res => {
            expect(res).to.eql([
              { id: 1, model1Prop1: 'hello 1', relCount: 2, $afterGetCalled: 1 },
              { id: 2, model1Prop1: 'hello 2', relCount: 1, $afterGetCalled: 1 }
            ]);
          });
      });

      it('should work with modifiers', () => {
        return Model2.query()
          .joinRelation('model2Relation1(idGreaterThan)')
          .select('model2Relation1.id', 'model2.*')
          .mergeContext({
            filterArgs: [5]
          })
          .then(models => {
            expect(models.map(it => it.id)).to.not.contain(5);
          });
      });

      if (session.isPostgres()) {
        it('should work with raw selects in modifiers', () => {
          class TestModel2 extends Model2 {
            static get modifiers() {
              return {
                rawSelect: qb =>
                  qb.select('*').select(raw(`model2_prop1 || ' ' || model2_prop1 as "rawSelect"`))
              };
            }
          }

          class TestModel1 extends Model1 {
            static get relationMappings() {
              return {
                model1Relation2: {
                  relation: Model.HasManyRelation,
                  modelClass: TestModel2,
                  join: {
                    from: 'Model1.id',
                    to: 'model2.model1_id'
                  }
                }
              };
            }
          }

          return TestModel1.query()
            .joinRelation('model1Relation2(rawSelect)')
            .select('rawSelect')
            .findById(1)
            .where('model1Relation2.id_col', 2)
            .then(model => {
              expect(model.rawSelect).to.equal('hejsan 2 hejsan 2');
            });
        });
      }
    });

    describe('.$query()', () => {
      before(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'hejsan 1',
                model2Prop2: 30
              },
              {
                idCol: 2,
                model2Prop1: 'hejsan 2',
                model2Prop2: 20
              },
              {
                idCol: 3,
                model2Prop1: 'hejsan 3',
                model2Prop2: 10
              }
            ]
          },
          {
            id: 2,
            model1Prop1: 'hello 2'
          }
        ]);
      });

      it('should find the model itself', () => {
        return Model1.query()
          .then(models => {
            expect(_.map(models, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2']);
            models[0].model1Prop1 = 'blaa';
            return models[0].$query();
          })
          .then(model => {
            expect(model).to.be.a(Model1);
            expect(model.model1Prop1).to.equal('hello 1');
          });
      });

      it('should throw if the id is undefined', done => {
        Model1.query()
          .then(models => {
            expect(_.map(models, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2']);
            delete models[0].id;
            return models[0].$query();
          })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err.message).to.equal(
              `one of the identifier columns [id] is null or undefined. Have you specified the correct identifier column for the model 'Model1' using the 'idColumn' property?`
            );
            done();
          })
          .catch(done);
      });

      it('should throw if the id is null', done => {
        Model1.query()
          .then(models => {
            expect(_.map(models, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2']);
            models[0].id = null;
            return models[0].$query();
          })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err.message).to.equal(
              `one of the identifier columns [id] is null or undefined. Have you specified the correct identifier column for the model 'Model1' using the 'idColumn' property?`
            );
            done();
          })
          .catch(done);
      });
    });

    describe('.$relatedQuery()', () => {
      describe('belongs to one relation', () => {
        let parent1;
        let parent2;

        before(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',
              model1Relation1: {
                id: 2,
                model1Prop1: 'hello 2'
              }
            },
            {
              id: 3,
              model1Prop1: 'hello 3',
              model1Relation1: {
                id: 4,
                model1Prop1: 'hello 4'
              }
            }
          ]);
        });

        beforeEach(() => {
          return Model1.query().then(parents => {
            parent1 = _.find(parents, { id: 1 });
            parent2 = _.find(parents, { id: 3 });
          });
        });

        it('should return all related rows when no knex methods are chained', () => {
          return parent1.$relatedQuery('model1Relation1').then(related => {
            expect(related).to.be.a(Model1);
            expect(parent1.model1Relation1).to.eql(related);
            expect(related).to.eql({
              id: 2,
              model1Id: null,
              model1Prop1: 'hello 2',
              model1Prop2: null,
              $afterGetCalled: 1
            });
          });
        });

        describe('knex methods', () => {
          it('.select()', () => {
            return parent1
              .$relatedQuery('model1Relation1')
              .select('id')
              .then(related => {
                expect(related).to.be.a(Model1);
                expect(_.keys(related).sort()).to.eql(['$afterGetCalled', 'id']);
              });
          });

          it('.first()', () => {
            return parent1
              .$relatedQuery('model1Relation1')
              .first()
              .then(value => {
                expect(value).to.eql({
                  id: 2,
                  model1Id: null,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  $afterGetCalled: 1
                });
              });
          });

          it('.join()', () => {
            return parent1
              .$relatedQuery('model1Relation1')
              .select('Model1.*', 'Parent.model1Prop1 as parentProp1')
              .join('Model1 as Parent', 'Parent.model1Id', 'Model1.id')
              .first()
              .then(related => {
                expect(related).to.eql({
                  id: 2,
                  model1Id: null,
                  model1Prop1: 'hello 2',
                  model1Prop2: null,
                  parentProp1: 'hello 1',
                  $afterGetCalled: 1
                });
              });
          });
        });
      });

      describe('has many relation', () => {
        let parent1;
        let parent2;

        before(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',
              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'text 1',
                  model2Prop2: 6
                },
                {
                  idCol: 2,
                  model2Prop1: 'text 2',
                  model2Prop2: 5
                },
                {
                  idCol: 3,
                  model2Prop1: 'text 3',
                  model2Prop2: 4
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 4,
                  model2Prop1: 'text 4',
                  model2Prop2: 3
                },
                {
                  idCol: 5,
                  model2Prop1: 'text 5',
                  model2Prop2: 2
                },
                {
                  idCol: 6,
                  model2Prop1: 'text 6',
                  model2Prop2: 1
                }
              ]
            }
          ]);
        });

        beforeEach(() => {
          return Model1.query().then(parents => {
            parent1 = _.find(parents, { id: 1 });
            parent2 = _.find(parents, { id: 2 });
          });
        });

        it('should return all related rows when no knex methods are chained', () => {
          return Promise.all([
            parent1
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .then(related => {
                expect(related.length).to.equal(3);
                expect(parent1.model1Relation2).to.eql(related);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(_.map(related, 'model2Prop1').sort()).to.eql(['text 1', 'text 2', 'text 3']);
                expect(related[0]).to.eql({
                  idCol: 1,
                  model1Id: parent1.id,
                  model2Prop1: 'text 1',
                  model2Prop2: 6,
                  $afterGetCalled: 1
                });
              }),
            parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .then(related => {
                expect(related.length).to.equal(3);
                expect(parent2.model1Relation2).to.eql(related);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(_.map(related, 'model2Prop1').sort()).to.eql(['text 4', 'text 5', 'text 6']);
                expect(related[0]).to.eql({
                  idCol: 4,
                  model1Id: parent2.id,
                  model2Prop1: 'text 4',
                  model2Prop2: 3,
                  $afterGetCalled: 1
                });
              })
          ]);
        });

        describe('knex methods', () => {
          it('.select()', () => {
            return parent1
              .$relatedQuery('model1Relation2')
              .select('id_col')
              .then(related => {
                expect(related.length).to.equal(3);
                expect(related[0]).to.be.a(Model2);
                expect(related[1]).to.be.a(Model2);
                expect(related[2]).to.be.a(Model2);
                expect(_.map(related, 'idCol').sort()).to.eql([1, 2, 3]);
                expect(_.uniq(_.flattenDeep(_.map(related, _.keys))).sort()).to.eql([
                  '$afterGetCalled',
                  'idCol'
                ]);
              });
          });

          it('.where()', () => {
            return parent2
              .$relatedQuery('model1Relation2')
              .where('model2_prop2', '=', '2')
              .then(related => {
                expect(_.map(related, 'model2Prop2')).to.eql([2]);
              });
          });

          it('.orWhere()', () => {
            return parent2
              .$relatedQuery('model1Relation2')
              .where(function() {
                this.where('model2_prop2', '=', '1').orWhere('model2_prop2', '=', '3');
              })
              .orderBy('model2_prop2')
              .then(related => {
                expect(_.map(related, 'model2Prop2')).to.eql([1, 3]);
              });
          });

          it('.pluck() array', () => {
            return parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .pluck('idCol')
              .then(values => {
                expect(values).to.eql([4, 5, 6]);
              });
          });

          it('.pluck() object', () => {
            return parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .first()
              .pluck('idCol')
              .then(values => {
                expect(values).to.eql(4);
              });
          });

          it('.first()', () => {
            return parent2
              .$relatedQuery('model1Relation2')
              .orderBy('id_col')
              .pluck('idCol')
              .first()
              .then(value => {
                expect(value).to.eql(4);
              });
          });

          it('.join()', () => {
            return parent2
              .$relatedQuery('model1Relation2')
              .select('model2.*', 'Parent.model1Prop1 as parentProp1')
              .join('Model1 as Parent', 'model2.model1_id', 'Parent.id')
              .orderBy('model2.id_col', 'desc')
              .then(related => {
                expect(related).to.have.length(3);
                expect(related[0]).to.be.a(Model2);
                expect(related[0]).to.eql({
                  idCol: 6,
                  model1Id: parent2.id,
                  model2Prop1: 'text 6',
                  model2Prop2: 1,
                  parentProp1: parent2.model1Prop1,
                  $afterGetCalled: 1
                });
              });
          });
        });
      });

      describe('many to many relation', () => {
        let parent1;
        let parent2;

        before(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',
              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'text 1',
                  model2Relation1: [
                    {
                      id: 3,
                      model1Prop1: 'blaa 1',
                      model1Prop2: 6
                    },
                    {
                      id: 4,
                      model1Prop1: 'blaa 2',
                      model1Prop2: 5
                    },
                    {
                      id: 5,
                      model1Prop1: 'blaa 3',
                      model1Prop2: 4
                    }
                  ]
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 2,
                  model2Prop1: 'text 2',
                  model2Relation1: [
                    {
                      id: 6,
                      model1Prop1: 'blaa 4',
                      model1Prop2: 3,
                      aliasedExtra: 'extra 4'
                    },
                    {
                      id: 7,
                      model1Prop1: 'blaa 5',
                      model1Prop2: 2
                    },
                    {
                      id: 8,
                      model1Prop1: 'blaa 6',
                      model1Prop2: 1,
                      aliasedExtra: 'extra 6'
                    }
                  ]
                }
              ]
            }
          ]);
        });

        beforeEach(() => {
          return Model2.query().then(parents => {
            parent1 = _.find(parents, { idCol: 1 });
            parent2 = _.find(parents, { idCol: 2 });
          });
        });

        it('should return all related rows when no knex methods are chained', () => {
          return Promise.all([
            parent1
              .$relatedQuery('model2Relation1')
              .orderBy('id')
              .then(related => {
                expect(related.length).to.equal(3);
                expect(parent1.model2Relation1).to.eql(related);
                expect(related[0]).to.be.a(Model1);
                expect(related[1]).to.be.a(Model1);
                expect(related[2]).to.be.a(Model1);
                expect(_.map(related, 'model1Prop1').sort()).to.eql(['blaa 1', 'blaa 2', 'blaa 3']);
                expect(_.map(related, 'aliasedExtra').sort()).to.eql([null, null, null]);
                expect(related[0]).to.eql({
                  id: 3,
                  model1Id: null,
                  model1Prop1: 'blaa 1',
                  model1Prop2: 6,
                  aliasedExtra: null,
                  $afterGetCalled: 1
                });
              }),
            parent2
              .$relatedQuery('model2Relation1')
              .orderBy('id')
              .then(related => {
                expect(related.length).to.equal(3);
                expect(parent2.model2Relation1).to.eql(related);
                expect(related[0]).to.be.a(Model1);
                expect(related[1]).to.be.a(Model1);
                expect(related[2]).to.be.a(Model1);
                expect(_.map(related, 'model1Prop1').sort()).to.eql(['blaa 4', 'blaa 5', 'blaa 6']);
                expect(_.map(related, 'aliasedExtra').sort()).to.eql(['extra 4', 'extra 6', null]);
                expect(related[0]).to.eql({
                  id: 6,
                  model1Id: null,
                  model1Prop1: 'blaa 4',
                  model1Prop2: 3,
                  aliasedExtra: 'extra 4',
                  $afterGetCalled: 1
                });
              })
          ]);
        });

        it('should work in both directions', () => {
          return Model1.query()
            .where({ id: 6 })
            .first()
            .then(model => {
              return model.$relatedQuery('model1Relation3');
            })
            .then(models => {
              expect(models).to.have.length(1);
              expect(models[0]).to.be.a(Model2);
              expect(models[0].idCol).to.equal(2);
            });
        });

        it('should be able to filter using extra columns', () => {
          return parent2
            .$relatedQuery('model2Relation1')
            .where('extra3', 'extra 6')
            .then(related => {
              expect(related).to.eql([
                {
                  id: 8,
                  model1Id: null,
                  model1Prop1: 'blaa 6',
                  model1Prop2: 1,
                  aliasedExtra: 'extra 6',
                  $afterGetCalled: 1
                }
              ]);
            });
        });

        it('should be able to alias the join table using aliasFor', () => {
          return parent2
            .$relatedQuery('model2Relation1')
            .aliasFor('Model1Model2', 'm1m2')
            .where('extra3', 'extra 6')
            .then(related => {
              expect(related).to.eql([
                {
                  id: 8,
                  model1Id: null,
                  model1Prop1: 'blaa 6',
                  model1Prop2: 1,
                  aliasedExtra: 'extra 6',
                  $afterGetCalled: 1
                }
              ]);
            });
        });

        describe('knex methods', () => {
          it('.select()', () => {
            return parent1
              .$relatedQuery('model2Relation1')
              .select('Model1.id')
              .then(related => {
                expect(related.length).to.equal(3);
                expect(related[0]).to.be.a(Model1);
                expect(related[1]).to.be.a(Model1);
                expect(related[2]).to.be.a(Model1);
                expect(_.map(related, 'id').sort()).to.eql([3, 4, 5]);
                expect(_.uniq(_.flattenDeep(_.map(related, _.keys))).sort()).to.eql([
                  '$afterGetCalled',
                  'id'
                ]);
              });
          });

          it('.where()', () => {
            return parent2
              .$relatedQuery('model2Relation1')
              .where('model1Prop2', '=', '2')
              .then(related => {
                expect(_.map(related, 'model1Prop2')).to.eql([2]);
              });
          });

          it('.orWhere()', () => {
            return parent2
              .$relatedQuery('model2Relation1')
              .where(function() {
                this.where('model1Prop2', '1').orWhere('model1Prop2', '3');
              })
              .orderBy('model1Prop2')
              .then(related => {
                expect(_.map(related, 'model1Prop2')).to.eql([1, 3]);
              });
          });

          it('.pluck()', () => {
            return parent2
              .$relatedQuery('model2Relation1')
              .orderBy('Model1.id', 'desc')
              .pluck('id')
              .then(values => {
                expect(values).to.eql([8, 7, 6]);
              });
          });

          it('.first()', () => {
            return parent1
              .$relatedQuery('model2Relation1')
              .orderBy('Model1.id')
              .pluck('id')
              .first()
              .then(value => {
                expect(value).to.eql(3);
              });
          });
        });
      });

      describe('has one through relation', () => {
        let parent;

        before(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',
              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'text 1',

                  model2Relation2: {
                    id: 3,
                    model1Prop1: 'blaa 1',
                    model1Prop2: 6
                  }
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 2,
                  model2Prop1: 'text 2',

                  model2Relation2: {
                    id: 6,
                    model1Prop1: 'blaa 4',
                    model1Prop2: 3
                  }
                }
              ]
            }
          ]);
        });

        beforeEach(() => {
          return Model2.query().then(parents => {
            parent = _.find(parents, { idCol: 1 });
          });
        });

        it('should fetch a related model', () => {
          return parent.$relatedQuery('model2Relation2').then(related => {
            expect(related).to.eql({
              id: 3,
              model1Id: null,
              model1Prop1: 'blaa 1',
              model1Prop2: 6,
              $afterGetCalled: 1
            });
          });
        });
      });
    });
  });
};
