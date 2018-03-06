const _ = require('lodash');
const raw = require('../../').raw;
const expect = require('expect.js');
const Promise = require('bluebird');
const inheritModel = require('../../lib/model/inheritModel').inheritModel;
const expectPartEql = require('./../../testUtils/testUtils').expectPartialEqual;
const ValidationError = require('../../').ValidationError;
const isPostgres = require('../../lib/utils/knexUtils').isPostgres;
const isSqlite = require('../../lib/utils/knexUtils').isSqlite;
const mockKnexFactory = require('../../testUtils/mockKnex');

module.exports = session => {
  const Model1 = session.models.Model1;
  const Model2 = session.models.Model2;

  describe('Model patch queries', () => {
    describe('.query().patch()', () => {
      beforeEach(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'text 1',
                model2Prop2: 2
              },
              {
                idCol: 2,
                model2Prop1: 'text 2',
                model2Prop2: 1
              }
            ]
          },
          {
            id: 2,
            model1Prop1: 'hello 2'
          },
          {
            id: 3,
            model1Prop1: 'hello 3'
          }
        ]);
      });

      it('should patch a model (1)', () => {
        let model = Model1.fromJson({ model1Prop1: 'updated text' });

        return Model1.query()
          .patch(model)
          .where('id', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(model.$beforeInsertCalled).to.equal(undefined);
            expect(model.$afterInsertCalled).to.equal(undefined);
            expect(model.$beforeDeleteCalled).to.equal(undefined);
            expect(model.$afterDeleteCalled).to.equal(undefined);
            expect(model.$beforeUpdateCalled).to.equal(1);
            expect(model.$beforeUpdateOptions).to.eql({ patch: true });
            expect(model.$afterUpdateCalled).to.equal(1);
            expect(model.$afterUpdateOptions).to.eql({ patch: true });
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'updated text' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should patch a model (2)', () => {
        let model = Model2.fromJson({ model2Prop1: 'updated text' });

        return Model2.query()
          .patch(model)
          .where('id_col', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(model.$beforeInsertCalled).to.equal(undefined);
            expect(model.$afterInsertCalled).to.equal(undefined);
            expect(model.$beforeDeleteCalled).to.equal(undefined);
            expect(model.$afterDeleteCalled).to.equal(undefined);
            expect(model.$beforeUpdateCalled).to.equal(1);
            expect(model.$beforeUpdateOptions).to.eql({ patch: true });
            expect(model.$afterUpdateCalled).to.equal(1);
            expect(model.$afterUpdateOptions).to.eql({ patch: true });
            return session.knex('model2').orderBy('id_col');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id_col: 1, model2_prop1: 'updated text', model2_prop2: 2 });
            expectPartEql(rows[1], { id_col: 2, model2_prop1: 'text 2', model2_prop2: 1 });
          });
      });

      it('should accept json', () => {
        return Model1.query()
          .patch({ model1Prop1: 'updated text' })
          .where('id', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'updated text' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should ignore non-objects in relation properties', () => {
        return Model1.query()
          .patch({
            model1Prop1: 'updated text',
            model1Relation1: 1,
            model1Relation2: [1, 2, null, undefined, 5]
          })
          .where('id', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'updated text' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should accept subqueries and raw expressions (1)', () => {
        return Model1.query()
          .patch({
            model1Prop1: Model2.raw('(select max(??) from ??)', ['model2_prop1', 'model2']),
            model1Prop2: Model2.query().sum('model2_prop2')
          })
          .where('id', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'text 2', model1Prop2: 3 });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should accept subqueries and raw expressions (2)', () => {
        return Model1.query()
          .patch({
            model1Prop1: 'Morten',
            model1Prop2: Model2.knexQuery().sum('model2_prop2')
          })
          .where('id', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'Morten', model1Prop2: 3 });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should patch multiple', () => {
        return Model1.query()
          .patch({ model1Prop1: 'updated text' })
          .where('model1Prop1', '<', 'hello 3')
          .then(numUpdated => {
            expect(numUpdated).to.equal(2);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'updated text' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('increment should create patch', () => {
        return Model2.query()
          .increment('model2Prop2', 10)
          .where('id_col', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('model2').orderBy('id_col');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id_col: 1, model2_prop2: 2 });
            expectPartEql(rows[1], { id_col: 2, model2_prop2: 11 });
          });
      });

      it('decrement should create patch', () => {
        return Model2.query()
          .decrement('model2Prop2', 10)
          .where('id_col', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('model2').orderBy('id_col');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id_col: 1, model2_prop2: 2 });
            expectPartEql(rows[1], { id_col: 2, model2_prop2: -9 });
          });
      });

      it('should validate (1)', done => {
        let ModelWithSchema = subClassWithSchema(Model1, {
          type: 'object',
          required: ['model1Prop2'],
          properties: {
            id: { type: ['number', 'null'] },
            model1Prop1: { type: 'string' },
            model1Prop2: { type: 'number' }
          }
        });

        ModelWithSchema.query()
          .patch({ model1Prop1: 100 })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err).to.be.a(ValidationError);
            expect(err.type).to.equal('ModelValidation');
            expect(err.data).to.eql({
              model1Prop1: [
                {
                  message: 'should be string',
                  keyword: 'type',
                  params: {
                    type: 'string'
                  }
                }
              ]
            });
            return session.knex(Model1.getTableName());
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
            id: { type: ['number', 'null'] },
            model1Prop1: { type: 'string' },
            model1Prop2: { type: 'number' }
          }
        });

        ModelWithSchema.query()
          .patch({ model1Prop1: 'text' })
          .then(() => {
            return session.knex(Model1.getTableName());
          })
          .then(rows => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['text', 'text', 'text']);
            done();
          })
          .catch(done);
      });
    });

    describe('.query().patchAndFetchById()', () => {
      beforeEach(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'text 1',
                model2Prop2: 2
              },
              {
                idCol: 2,
                model2Prop1: 'text 2',
                model2Prop2: 1
              }
            ]
          },
          {
            id: 2,
            model1Prop1: 'hello 2'
          },
          {
            id: 3,
            model1Prop1: 'hello 3'
          }
        ]);
      });

      it('should patch and fetch a model', () => {
        let model = Model1.fromJson({ model1Prop1: 'updated text' });

        return Model1.query()
          .patchAndFetchById(2, model)
          .then(fetchedModel => {
            expect(model.$beforeInsertCalled).to.equal(undefined);
            expect(model.$afterInsertCalled).to.equal(undefined);
            expect(model.$beforeDeleteCalled).to.equal(undefined);
            expect(model.$afterDeleteCalled).to.equal(undefined);
            expect(model.$beforeUpdateCalled).to.equal(1);
            expect(model.$beforeUpdateOptions).to.eql({ patch: true });
            expect(model.$afterUpdateCalled).to.equal(1);
            expect(model.$afterUpdateOptions).to.eql({ patch: true });
            expect(fetchedModel).to.equal(model);
            expect(fetchedModel).eql({
              id: 2,
              model1Prop1: 'updated text',
              model1Prop2: null,
              model1Id: null,
              $beforeUpdateCalled: true,
              $beforeUpdateOptions: { patch: true },
              $afterUpdateCalled: true,
              $afterUpdateOptions: { patch: true }
            });
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'updated text' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should work with `eager` method', () => {
        let model = Model1.fromJson({ model1Prop1: 'updated text' });

        return Model1.query()
          .patchAndFetchById(1, model)
          .eager('model1Relation2')
          .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
          .then(fetchedModel => {
            expect(fetchedModel).eql({
              id: 1,
              model1Prop1: 'updated text',
              model1Prop2: null,
              model1Id: null,
              $beforeUpdateCalled: true,
              $beforeUpdateOptions: { patch: true },
              $afterUpdateCalled: true,
              $afterUpdateOptions: { patch: true },

              model1Relation2: [
                {
                  idCol: 1,
                  model1Id: 1,
                  model2Prop1: 'text 1',
                  model2Prop2: 2,
                  $afterGetCalled: 1
                },
                {
                  idCol: 2,
                  model1Id: 1,
                  model2Prop1: 'text 2',
                  model2Prop2: 1,
                  $afterGetCalled: 1
                }
              ]
            });

            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should work with `pick` method', () => {
        let model = Model1.fromJson({ model1Prop1: 'updated text' });

        return Model1.query()
          .patchAndFetchById(1, model)
          .eager('model1Relation2')
          .modifyEager('model1Relation2', qb => qb.orderBy('id_col'))
          .pick(Model2, ['idCol', 'model1Id'])
          .then(fetchedModel => {
            expect(fetchedModel).eql({
              id: 1,
              model1Prop1: 'updated text',
              model1Prop2: null,
              model1Id: null,
              $beforeUpdateCalled: true,
              $beforeUpdateOptions: { patch: true },
              $afterUpdateCalled: true,
              $afterUpdateOptions: { patch: true },

              model1Relation2: [
                {
                  idCol: 1,
                  model1Id: 1,
                  $afterGetCalled: 1
                },
                {
                  idCol: 2,
                  model1Id: 1,
                  $afterGetCalled: 1
                }
              ]
            });

            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should fetch nothing if nothing is updated', () => {
        return Model1.query()
          .patchAndFetchById(2, { model1Prop1: 'updated text' })
          .where('id', -1)
          .then(fetchedModel => {
            expect(fetchedModel).to.equal(undefined);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });
    });

    describe('.$query().patch()', () => {
      beforeEach(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1'
          },
          {
            id: 2,
            model1Prop1: 'hello 2'
          }
        ]);
      });

      it('should patch a model (1)', () => {
        let model = Model1.fromJson({ id: 1 });

        return model
          .$query()
          .patch({ model1Prop1: 'updated text', undefinedShouldBeIgnored: undefined })
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(model.model1Prop1).to.equal('updated text');
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
          });
      });

      if (isPostgres(session.knex)) {
        it('should work with returning', () => {
          let model = Model1.fromJson({ id: 1 });

          return model
            .$query()
            .patch({ model1Prop1: 'updated text' })
            .returning('model1Prop1', 'model1Prop2')
            .then(patched => {
              const expected = { model1Prop1: 'updated text', model1Prop2: null };
              expect(patched).to.be.a(Model1);
              expect(patched).to.eql(expected);
              expect(model).to.eql(Object.assign({}, expected, { id: 1 }));
              return session.knex('Model1').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(2);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            });
        });

        it('should work with returning *', () => {
          const model = Model1.fromJson({ id: 1 });

          return model
            .$query()
            .patch({ model1Prop1: 'updated text' })
            .returning('*')
            .then(patched => {
              const expected = {
                id: 1,
                model1Id: null,
                model1Prop1: 'updated text',
                model1Prop2: null
              };
              expect(patched).to.be.a(Model1);
              expect(patched).to.eql(expected);
              expect(model).to.eql(expected);
              return session.knex('Model1').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(2);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            });
        });
      }

      it('should patch a model (2)', () => {
        return Model1.fromJson({ id: 1, model1Prop1: 'updated text' })
          .$query()
          .patch()
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
          });
      });

      it('should pass the old values to $beforeUpdate and $afterUpdate hooks in options.old', () => {
        let patch = Model1.fromJson({ model1Prop1: 'updated text' });

        return Model1.fromJson({ id: 1 })
          .$query()
          .patch(patch)
          .then(() => {
            expect(patch.$beforeInsertCalled).to.equal(undefined);
            expect(patch.$afterInsertCalled).to.equal(undefined);
            expect(patch.$beforeDeleteCalled).to.equal(undefined);
            expect(patch.$afterDeleteCalled).to.equal(undefined);
            expect(patch.$beforeUpdateCalled).to.equal(1);
            expect(patch.$beforeUpdateOptions).to.eql({ patch: true, old: { id: 1 } });
            expect(patch.$afterUpdateCalled).to.equal(1);
            expect(patch.$afterUpdateOptions).to.eql({ patch: true, old: { id: 1 } });
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
          });
      });

      it('omitting a field should remove it from the patch', () => {
        return Model1.fromJson({ id: 1, model1Prop1: 'updated text', thisShouldBeRemoved: 1000 })
          .$omit('thisShouldBeRemoved')
          .$query()
          .patch()
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
          });
      });

      it('model edits in $beforeUpdate should get into database query', () => {
        let model = Model1.fromJson({ id: 1 });

        model.$beforeUpdate = function() {
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
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
          });
      });

      it('should throw if the id is undefined', done => {
        let model = Model1.fromJson({ model1Prop2: 1 });

        model
          .$query()
          .patch({ model1Prop1: 'updated text', undefinedShouldBeIgnored: undefined })
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
        let model = Model1.fromJson({ id: null });

        model
          .$query()
          .patch({ model1Prop1: 'updated text', undefinedShouldBeIgnored: undefined })
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

    describe('.$query().patchAndFetch()', () => {
      let ModelOne;
      let queries = [];

      before(() => {
        const knex = mockKnexFactory(session.knex, function(mock, oldImpl, args) {
          queries.push(this.toString());
          return oldImpl.apply(this, args);
        });

        ModelOne = session.unboundModels.Model1.bindKnex(knex);
      });

      beforeEach(() => {
        queries = [];

        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1'
          },
          {
            id: 2,
            model1Prop1: 'hello 2'
          }
        ]);
      });

      it('should patch and fetch a model', () => {
        let model = ModelOne.fromJson({ id: 1 });

        return model
          .$query()
          .patchAndFetch({ model1Prop2: 10, undefinedShouldBeIgnored: undefined })
          .then(updated => {
            expect(updated.id).to.equal(1);
            expect(updated.model1Id).to.equal(null);
            expect(updated.model1Prop1).to.equal('hello 1');
            expect(updated.model1Prop2).to.equal(10);
            expectPartEql(model, {
              id: 1,
              model1Prop1: 'hello 1',
              model1Prop2: 10,
              model1Id: null
            });

            if (session.isPostgres()) {
              expect(queries).to.eql([
                'update "Model1" set "model1Prop2" = 10 where "Model1"."id" = 1',
                'select "Model1".* from "Model1" where "Model1"."id" = 1'
              ]);
            }

            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1', model1Prop2: 10 });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2', model1Prop2: null });
          });
      });
    });

    describe('.$relatedQuery().patch()', () => {
      describe('belongs to one relation', () => {
        let parent1;
        let parent2;

        beforeEach(() => {
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

        it('should patch a related object (1)', () => {
          const model = Model1.fromJson({ model1Prop1: 'updated text' });

          return parent1
            .$relatedQuery('model1Relation1')
            .patch(model)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('Model1').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(4);

              expect(model.$beforeInsertCalled).to.equal(undefined);
              expect(model.$afterInsertCalled).to.equal(undefined);
              expect(model.$beforeDeleteCalled).to.equal(undefined);
              expect(model.$afterDeleteCalled).to.equal(undefined);
              expect(model.$beforeUpdateCalled).to.equal(1);
              expect(model.$beforeUpdateOptions).to.eql({ patch: true });
              expect(model.$afterUpdateCalled).to.equal(1);
              expect(model.$afterUpdateOptions).to.eql({ patch: true });

              expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'updated text' });
              expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
              expectPartEql(rows[3], { id: 4, model1Prop1: 'hello 4' });
            });
        });

        it('should patch a related object (2)', () => {
          return parent2
            .$relatedQuery('model1Relation1')
            .patch({ model1Prop1: 'updated text', model1Prop2: 1000 })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('Model1').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
              expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
              expectPartEql(rows[3], { id: 4, model1Prop1: 'updated text', model1Prop2: 1000 });
            });
        });
      });

      describe('has many relation', () => {
        let parent1;
        let parent2;

        beforeEach(() => {
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

        it('should patch a related object', () => {
          const model = Model2.fromJson({ model2Prop1: 'updated text' });

          return parent1
            .$relatedQuery('model1Relation2')
            .patch(model)
            .where('id_col', 2)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);

              expect(model.$beforeInsertCalled).to.equal(undefined);
              expect(model.$afterInsertCalled).to.equal(undefined);
              expect(model.$beforeDeleteCalled).to.equal(undefined);
              expect(model.$afterDeleteCalled).to.equal(undefined);
              expect(model.$beforeUpdateCalled).to.equal(1);
              expect(model.$beforeUpdateOptions).to.eql({ patch: true });
              expect(model.$afterUpdateCalled).to.equal(1);
              expect(model.$afterUpdateOptions).to.eql({ patch: true });

              return session.knex('model2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              expectPartEql(rows[0], { id_col: 1, model2_prop1: 'text 1' });
              expectPartEql(rows[1], {
                id_col: 2,
                model2_prop1: 'updated text',
                model2_prop2: 5
              });
              expectPartEql(rows[2], { id_col: 3, model2_prop1: 'text 3' });
              expectPartEql(rows[3], { id_col: 4, model2_prop1: 'text 4' });
              expectPartEql(rows[4], { id_col: 5, model2_prop1: 'text 5' });
              expectPartEql(rows[5], { id_col: 6, model2_prop1: 'text 6' });
            });
        });

        it('should patch multiple related objects', () => {
          return parent1
            .$relatedQuery('model1Relation2')
            .patch({ model2Prop1: 'updated text' })
            .where('model2_prop2', '<', 6)
            .where('model2_prop1', 'like', 'text %')
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex('model2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              expectPartEql(rows[0], { id_col: 1, model2_prop1: 'text 1' });
              expectPartEql(rows[1], {
                id_col: 2,
                model2_prop1: 'updated text',
                model2_prop2: 5
              });
              expectPartEql(rows[2], {
                id_col: 3,
                model2_prop1: 'updated text',
                model2_prop2: 4
              });
              expectPartEql(rows[3], { id_col: 4, model2_prop1: 'text 4' });
              expectPartEql(rows[4], { id_col: 5, model2_prop1: 'text 5' });
              expectPartEql(rows[5], { id_col: 6, model2_prop1: 'text 6' });
            });
        });
      });

      describe('many to many relation', () => {
        let parent1;
        let parent2;

        beforeEach(() => {
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
              ],

              model1Relation3: [
                {
                  idCol: 3,
                  model2Prop1: 'foo 1',
                  extra1: 'extra 11',
                  extra2: 'extra 21'
                },
                {
                  idCol: 4,
                  model2Prop1: 'foo 2',
                  extra1: 'extra 12',
                  extra2: 'extra 22'
                },
                {
                  idCol: 5,
                  model2Prop1: 'foo 3',
                  extra1: 'extra 13',
                  extra2: 'extra 23'
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
                      model1Prop2: 3
                    },
                    {
                      id: 7,
                      model1Prop1: 'blaa 5',
                      model1Prop2: 2
                    },
                    {
                      id: 8,
                      model1Prop1: 'blaa 6',
                      model1Prop2: 1
                    }
                  ]
                }
              ],

              model1Relation3: [
                {
                  idCol: 6,
                  model2Prop1: 'foo 4',
                  extra1: 'extra 14',
                  extra2: 'extra 24'
                },
                {
                  idCol: 7,
                  model2Prop1: 'foo 5',
                  extra1: 'extra 15',
                  extra2: 'extra 25'
                },
                {
                  idCol: 8,
                  model2Prop1: 'foo 6',
                  extra1: 'extra 16',
                  extra2: 'extra 26'
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

        it('should patch a related object', () => {
          const model = Model1.fromJson({ model1Prop1: 'updated text' });

          return parent1
            .$relatedQuery('model2Relation1')
            .patch(model)
            .where('Model1.id', 5)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);

              expect(model.$beforeInsertCalled).to.equal(undefined);
              expect(model.$afterInsertCalled).to.equal(undefined);
              expect(model.$beforeDeleteCalled).to.equal(undefined);
              expect(model.$afterDeleteCalled).to.equal(undefined);
              expect(model.$beforeUpdateCalled).to.equal(1);
              expect(model.$beforeUpdateOptions).to.eql({ patch: true });
              expect(model.$afterUpdateCalled).to.equal(1);
              expect(model.$afterUpdateOptions).to.eql({ patch: true });

              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(8);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
              expectPartEql(rows[2], { id: 3, model1Prop1: 'blaa 1' });
              expectPartEql(rows[3], { id: 4, model1Prop1: 'blaa 2' });
              expectPartEql(rows[4], { id: 5, model1Prop1: 'updated text' });
              expectPartEql(rows[5], { id: 6, model1Prop1: 'blaa 4' });
              expectPartEql(rows[6], { id: 7, model1Prop1: 'blaa 5' });
              expectPartEql(rows[7], { id: 8, model1Prop1: 'blaa 6' });
            });
        });

        it('should patch a related object with extras', () => {
          return Model1.query()
            .findById(1)
            .then(parent => {
              return parent
                .$relatedQuery('model1Relation3')
                .where('id_col', '>', 3)
                .patch({
                  model2Prop1: 'iam updated',
                  extra1: 'updated extra 1',
                  // Test query properties. sqlite doesn't have `concat` function. Use a literal for it.
                  extra2: isSqlite(session.knex)
                    ? 'updated extra 2'
                    : raw(`CONCAT('updated extra ', '2')`)
                })
                .where('id_col', '<', 5)
                .then(numUpdated => {
                  expect(numUpdated).to.equal(1);

                  return [
                    session.knex('model2').orderBy('id_col'),
                    session
                      .knex('Model1Model2')
                      .select('model1Id', 'model2Id', 'extra1', 'extra2')
                      .orderBy(['model1Id', 'model2Id'])
                  ];
                })
                .spread((model2, model1Model2) => {
                  expect(model2.length).to.equal(8);
                  expect(model1Model2.length).to.equal(12);

                  expectPartEql(model2[0], { id_col: 1, model2_prop1: 'text 1' });
                  expectPartEql(model2[1], { id_col: 2, model2_prop1: 'text 2' });
                  expectPartEql(model2[2], { id_col: 3, model2_prop1: 'foo 1' });
                  expectPartEql(model2[3], { id_col: 4, model2_prop1: 'iam updated' });
                  expectPartEql(model2[4], { id_col: 5, model2_prop1: 'foo 3' });
                  expectPartEql(model2[5], { id_col: 6, model2_prop1: 'foo 4' });
                  expectPartEql(model2[6], { id_col: 7, model2_prop1: 'foo 5' });
                  expectPartEql(model2[7], { id_col: 8, model2_prop1: 'foo 6' });

                  expectPartEql(model1Model2[0], {
                    model1Id: 1,
                    extra1: 'extra 11',
                    extra2: 'extra 21'
                  });
                  expectPartEql(model1Model2[1], {
                    model1Id: 1,
                    extra1: 'updated extra 1',
                    extra2: 'updated extra 2'
                  });
                  expectPartEql(model1Model2[2], {
                    model1Id: 1,
                    extra1: 'extra 13',
                    extra2: 'extra 23'
                  });
                  expectPartEql(model1Model2[3], {
                    model1Id: 2,
                    extra1: 'extra 14',
                    extra2: 'extra 24'
                  });
                  expectPartEql(model1Model2[4], {
                    model1Id: 2,
                    extra1: 'extra 15',
                    extra2: 'extra 25'
                  });
                  expectPartEql(model1Model2[5], {
                    model1Id: 2,
                    extra1: 'extra 16',
                    extra2: 'extra 26'
                  });

                  expectPartEql(model1Model2[6], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[7], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[8], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[9], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[10], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[11], { extra1: null, extra2: null });
                });
            });
        });

        it('should patch all related objects with extras', () => {
          return Model1.query()
            .findById(1)
            .then(parent => {
              return parent
                .$relatedQuery('model1Relation3')
                .patch({
                  model2Prop1: 'iam updated',
                  extra1: 'updated extra 1',
                  extra2: 'updated extra 2'
                })
                .then(numUpdated => {
                  expect(numUpdated).to.equal(3);

                  return [
                    session.knex('model2').orderBy('id_col'),
                    session
                      .knex('Model1Model2')
                      .select('model1Id', 'model2Id', 'extra1', 'extra2')
                      .orderBy(['model1Id', 'model2Id'])
                  ];
                })
                .spread((model2, model1Model2) => {
                  expect(model2.length).to.equal(8);
                  expect(model1Model2.length).to.equal(12);

                  expectPartEql(model2[0], { id_col: 1, model2_prop1: 'text 1' });
                  expectPartEql(model2[1], { id_col: 2, model2_prop1: 'text 2' });
                  expectPartEql(model2[2], { id_col: 3, model2_prop1: 'iam updated' });
                  expectPartEql(model2[3], { id_col: 4, model2_prop1: 'iam updated' });
                  expectPartEql(model2[4], { id_col: 5, model2_prop1: 'iam updated' });
                  expectPartEql(model2[5], { id_col: 6, model2_prop1: 'foo 4' });
                  expectPartEql(model2[6], { id_col: 7, model2_prop1: 'foo 5' });
                  expectPartEql(model2[7], { id_col: 8, model2_prop1: 'foo 6' });

                  expectPartEql(model1Model2[0], {
                    model1Id: 1,
                    extra1: 'updated extra 1',
                    extra2: 'updated extra 2'
                  });
                  expectPartEql(model1Model2[1], {
                    model1Id: 1,
                    extra1: 'updated extra 1',
                    extra2: 'updated extra 2'
                  });
                  expectPartEql(model1Model2[2], {
                    model1Id: 1,
                    extra1: 'updated extra 1',
                    extra2: 'updated extra 2'
                  });
                  expectPartEql(model1Model2[3], {
                    model1Id: 2,
                    extra1: 'extra 14',
                    extra2: 'extra 24'
                  });
                  expectPartEql(model1Model2[4], {
                    model1Id: 2,
                    extra1: 'extra 15',
                    extra2: 'extra 25'
                  });
                  expectPartEql(model1Model2[5], {
                    model1Id: 2,
                    extra1: 'extra 16',
                    extra2: 'extra 26'
                  });

                  expectPartEql(model1Model2[6], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[7], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[8], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[9], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[10], { extra1: null, extra2: null });
                  expectPartEql(model1Model2[11], { extra1: null, extra2: null });
                });
            });
        });

        it('should patch all related objects', () => {
          return parent2
            .$relatedQuery('model2Relation1')
            .patch({ model1Prop1: 'updated text', model1Prop2: 123 })
            .then(numUpdated => {
              expect(numUpdated).to.equal(3);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(8);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
              expectPartEql(rows[2], { id: 3, model1Prop1: 'blaa 1' });
              expectPartEql(rows[3], { id: 4, model1Prop1: 'blaa 2' });
              expectPartEql(rows[4], { id: 5, model1Prop1: 'blaa 3' });
              expectPartEql(rows[5], { id: 6, model1Prop1: 'updated text', model1Prop2: 123 });
              expectPartEql(rows[6], { id: 7, model1Prop1: 'updated text', model1Prop2: 123 });
              expectPartEql(rows[7], { id: 8, model1Prop1: 'updated text', model1Prop2: 123 });
            });
        });

        it('should patch multiple objects (1)', () => {
          return parent2
            .$relatedQuery('model2Relation1')
            .patch({ model1Prop1: 'updated text', model1Prop2: 123 })
            .where('model1Prop1', 'like', 'blaa 4')
            .orWhere('model1Prop1', 'like', 'blaa 6')
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(8);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
              expectPartEql(rows[2], { id: 3, model1Prop1: 'blaa 1' });
              expectPartEql(rows[3], { id: 4, model1Prop1: 'blaa 2' });
              expectPartEql(rows[4], { id: 5, model1Prop1: 'blaa 3' });
              expectPartEql(rows[5], { id: 6, model1Prop1: 'updated text', model1Prop2: 123 });
              expectPartEql(rows[6], { id: 7, model1Prop1: 'blaa 5' });
              expectPartEql(rows[7], { id: 8, model1Prop1: 'updated text', model1Prop2: 123 });
            });
        });

        it('should patch multiple objects (2)', () => {
          return parent1
            .$relatedQuery('model2Relation1')
            .patch({ model1Prop1: 'updated text', model1Prop2: 123 })
            .where('model1Prop2', '<', 6)
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(8);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
              expectPartEql(rows[2], { id: 3, model1Prop1: 'blaa 1' });
              expectPartEql(rows[3], { id: 4, model1Prop1: 'updated text', model1Prop2: 123 });
              expectPartEql(rows[4], { id: 5, model1Prop1: 'updated text', model1Prop2: 123 });
              expectPartEql(rows[5], { id: 6, model1Prop1: 'blaa 4' });
              expectPartEql(rows[6], { id: 7, model1Prop1: 'blaa 5' });
              expectPartEql(rows[7], { id: 8, model1Prop1: 'blaa 6' });
            });
        });
      });

      describe('has one through relation', () => {
        let parent;

        beforeEach(() => {
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
                    id: 7,
                    model1Prop1: 'blaa 5',
                    model1Prop2: 2
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

        it('should patch the related object', () => {
          return parent
            .$relatedQuery('model2Relation2')
            .patch({ model1Prop1: 'updated text' })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
              expectPartEql(rows[2], { id: 3, model1Prop1: 'updated text' });
              expectPartEql(rows[3], { id: 7, model1Prop1: 'blaa 5' });
            });
        });
      });
    });

    describe('hooks', () => {
      let ModelOne;
      let ModelTwo;

      let beforeUpdateCalled = '';
      let afterUpdateCalled = '';
      let beforeUpdateOpt = null;
      let afterUpdateOpt = null;

      before(() => {
        // Create a new knex object by wrapping session.knex so that we get a new
        // instance instead of a cached one from `bindKnex`.
        const knex = mockKnexFactory(session.knex, function(mock, oldImpl, args) {
          return oldImpl.apply(this, args);
        });

        ModelOne = session.unboundModels.Model1.bindKnex(knex);
        ModelTwo = ModelOne.getRelation('model1Relation2').relatedModelClass;

        expect(ModelOne).to.not.equal(Model1);
        expect(ModelTwo).to.not.equal(Model2);
        expect(ModelOne).to.not.equal(session.unboundModels.Model1);
        expect(ModelTwo).to.not.equal(session.unboundModels.Model2);

        ModelOne.prototype.$beforeUpdate = function(opt, ctx) {
          beforeUpdateCalled += 'ModelOne';
          beforeUpdateOpt = _.cloneDeep(opt);
        };

        ModelOne.prototype.$afterUpdate = function(opt, ctx) {
          afterUpdateCalled += 'ModelOne';
          afterUpdateOpt = _.cloneDeep(opt);
        };

        ModelTwo.prototype.$beforeUpdate = function(opt, ctx) {
          beforeUpdateCalled += 'ModelTwo';
          beforeUpdateOpt = _.cloneDeep(opt);
        };

        ModelTwo.prototype.$afterUpdate = function(opt, ctx) {
          afterUpdateCalled += 'ModelTwo';
          afterUpdateOpt = _.cloneDeep(opt);
        };
      });

      beforeEach(() => {
        beforeUpdateCalled = '';
        afterUpdateCalled = '';
        beforeUpdateOpt = null;
        afterUpdateOpt = null;
      });

      beforeEach(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1',

            model1Relation1: {
              id: 2,
              model1Prop1: 'hello 2'
            },

            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'foo 1'
              }
            ],

            model1Relation3: [
              {
                idCol: 2,
                model2Prop1: 'foo 2'
              }
            ]
          }
        ]);
      });

      it('.query().patch()', () => {
        return ModelOne.query()
          .findById(1)
          .patch({ model1Prop1: 'updated text' })
          .then(() => {
            expect(beforeUpdateCalled).to.equal('ModelOne');
            expect(beforeUpdateOpt).to.eql({ patch: true });
            expect(afterUpdateCalled).to.equal('ModelOne');
            expect(afterUpdateOpt).to.eql({ patch: true });
          });
      });

      it('.$query().patch()', () => {
        return ModelOne.query()
          .findById(1)
          .then(model => {
            return model.$query().patch({ model1Prop1: 'updated text' });
          })
          .then(() => {
            expect(beforeUpdateCalled).to.equal('ModelOne');
            expect(beforeUpdateOpt).to.eql({
              patch: true,
              old: {
                $afterGetCalled: 1,
                id: 1,
                model1Id: 2,
                model1Prop1: 'hello 1',
                model1Prop2: null
              }
            });

            expect(afterUpdateCalled).to.equal('ModelOne');
            expect(afterUpdateOpt).to.eql({
              patch: true,
              old: {
                $afterGetCalled: 1,
                id: 1,
                model1Id: 2,
                model1Prop1: 'hello 1',
                model1Prop2: null
              }
            });
          });
      });

      describe('$relatedQuery().patch()', () => {
        it('belongs to one relation', () => {
          return ModelOne.query()
            .findById(1)
            .then(model => {
              return model.$relatedQuery('model1Relation1').patch({ model1Prop1: 'updated text' });
            })
            .then(() => {
              expect(beforeUpdateCalled).to.equal('ModelOne');
              expect(beforeUpdateOpt).to.eql({ patch: true });
              expect(afterUpdateCalled).to.equal('ModelOne');
              expect(afterUpdateOpt).to.eql({ patch: true });
            });
        });

        it('has many relation', () => {
          return ModelOne.query()
            .findById(1)
            .then(model => {
              return model.$relatedQuery('model1Relation2').patch({ model2Prop1: 'updated text' });
            })
            .then(() => {
              expect(beforeUpdateCalled).to.equal('ModelTwo');
              expect(beforeUpdateOpt).to.eql({ patch: true });
              expect(afterUpdateCalled).to.equal('ModelTwo');
              expect(afterUpdateOpt).to.eql({ patch: true });
            });
        });

        it('many to many relation', () => {
          return ModelOne.query()
            .findById(1)
            .then(model => {
              return model.$relatedQuery('model1Relation3').patch({ model2Prop1: 'updated text' });
            })
            .then(() => {
              expect(beforeUpdateCalled).to.equal('ModelTwo');
              expect(beforeUpdateOpt).to.eql({ patch: true });
              expect(afterUpdateCalled).to.equal('ModelTwo');
              expect(afterUpdateOpt).to.eql({ patch: true });
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
