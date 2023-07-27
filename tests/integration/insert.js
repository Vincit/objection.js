const _ = require('lodash');
const chai = require('chai');
const expect = require('expect.js');
const Promise = require('bluebird');
const { inheritModel } = require('../../lib/model/inheritModel');
const { ValidationError, UniqueViolationError } = require('../../');

module.exports = (session) => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('Model insert queries', () => {
    describe('.query().insert()', () => {
      beforeEach(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'test 1',
              },
              {
                idCol: 2,
                model2Prop1: 'test 2',
              },
            ],
          },
          {
            id: 2,
            model1Prop1: 'hello 2',
          },
        ]);
      });

      it('should insert new model', () => {
        let model = Model1.fromJson({ model1Prop1: 'hello 3' });

        return Model1.query()
          .insert(model)
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.$beforeInsertCalled).to.equal(1);
            expect(inserted.$afterInsertCalled).to.equal(1);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      it('should throw a UniqueViolationError when existing id is given', async () => {
        try {
          await Model1.query().insert({ id: 1 });
          throw new Error('should not get here');
        } catch (err) {
          expect(err).to.be.a(UniqueViolationError);
        }
      });

      it('should insert new model (additionalProperties = false)', () => {
        let Mod = inheritModel(Model1);

        Mod.jsonSchema = {
          type: 'object',
          additionalProperties: false,
          properties: {
            model1Prop1: { type: 'string' },
            model2Prop2: { type: 'number' },
          },
        };

        return Mod.query()
          .insert({ model1Prop1: 'hello 3' })
          .then((inserted) => {
            expect(inserted).to.be.a(Mod);
            expect(inserted.$beforeInsertCalled).to.equal(1);
            expect(inserted.$afterInsertCalled).to.equal(1);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      it('should work with relations', () => {
        let model = {
          model1Prop1: 'hello 3',
          model1Relation1: { model1Prop1: 'hello 4' },
          model1Relation2: [{ model2Prop1: 'moro 1' }],
        };

        return Model1.query()
          .insert(model)
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.$beforeInsertCalled).to.equal(1);
            expect(inserted.$afterInsertCalled).to.equal(1);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      it('should work with relations and additionalProperties = false', () => {
        let Mod = inheritModel(Model1);

        let model = {
          model1Prop1: 'hello 3',
          model1Relation1: { model1Prop1: 'hello 4' },
          model1Relation2: [{ model2Prop1: 'moro 1' }],
        };

        Mod.jsonSchema = {
          type: 'object',
          additionalProperties: false,

          properties: {
            model1Prop1: { type: 'string' },
            model1Prop2: { type: 'number' },
          },
        };

        return Mod.query()
          .insert(model)
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.$beforeInsertCalled).to.equal(1);
            expect(inserted.$afterInsertCalled).to.equal(1);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Mod.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      it('should ignore non-objects in relation properties', () => {
        let model = {
          model1Prop1: 'hello 3',
          model1Relation1: 1,
          model1Relation2: [1, 2, null, 4, undefined],
        };

        return Model1.query()
          .insert(model)
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.$beforeInsertCalled).to.equal(1);
            expect(inserted.$afterInsertCalled).to.equal(1);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      it('should insert new model with identifier', () => {
        let model = Model1.fromJson({ id: 1000, model1Prop1: 'hello 3' });

        return Model1.query()
          .insert(model)
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.id).to.equal(1000);
            expect(inserted.$beforeInsertCalled).to.equal(1);
            expect(inserted.$afterInsertCalled).to.equal(1);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.filter(rows, { id: 1000, model1Prop1: 'hello 3' })).to.have.length(1);
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      if (session.isPostgres()) {
        it('should accept an array', () => {
          let models = [
            Model1.fromJson({ model1Prop1: 'hello 3' }),
            Model1.fromJson({ model1Prop1: 'hello 4' }),
          ];

          return Model1.query()
            .insert(models)
            .then((inserted) => {
              expect(inserted[0]).to.be.a(Model1);
              expect(inserted[1]).to.be.a(Model1);
              expect(inserted[0].$beforeInsertCalled).to.equal(1);
              expect(inserted[0].$afterInsertCalled).to.equal(1);
              expect(inserted[1].$beforeInsertCalled).to.equal(1);
              expect(inserted[1].$afterInsertCalled).to.equal(1);
              expect(_.map(inserted, 'id').sort()).to.eql([3, 4]);
              expect(_.map(inserted, 'model1Prop1').sort()).to.eql(['hello 3', 'hello 4']);
              return session.knex(Model1.getTableName());
            })
            .then((rows) => {
              expect(_.map(rows, 'model1Prop1').sort()).to.eql([
                'hello 1',
                'hello 2',
                'hello 3',
                'hello 4',
              ]);
              expect(_.map(rows, 'id').sort()).to.eql([1, 2, 3, 4]);
            });
        });
      }

      it('should accept json', () => {
        return Model1.query()
          .insert({ model1Prop1: 'hello 3' })
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      it('should accept subqueries and raw expressions', () => {
        return Model1.query()
          .insert({
            model1Prop1: Model2.query().max('model2_prop1'),
            model1Prop2: Model1.raw('5 + 8'),
          })
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.id).to.eql(3);
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'test 2']);
            expect(_.find(rows, { id: 3, model1Prop1: 'test 2' }).model1Prop2).to.equal(13);
          });
      });

      if (session.isPostgres()) {
        it('should accept a json array', () => {
          return Model1.query()
            .insert([{ model1Prop1: 'hello 3' }, { model1Prop1: 'hello 4' }])
            .then((inserted) => {
              expect(inserted[0]).to.be.a(Model1);
              expect(inserted[1]).to.be.a(Model1);
              expect(_.map(inserted, 'id').sort()).to.eql([3, 4]);
              expect(_.map(inserted, 'model1Prop1').sort()).to.eql(['hello 3', 'hello 4']);
              return session.knex(Model1.getTableName());
            })
            .then((rows) => {
              expect(_.map(rows, 'model1Prop1').sort()).to.eql([
                'hello 1',
                'hello 2',
                'hello 3',
                'hello 4',
              ]);
              expect(_.map(rows, 'id').sort()).to.eql([1, 2, 3, 4]);
            });
        });

        it('returning("*") should return all columns', () => {
          return Model1.query()
            .insert({ model1Prop1: 'hello 3' })
            .returning('*')
            .then((inserted) => {
              expect(inserted).to.be.a(Model1);
              expect(inserted.$toJson()).to.eql({
                id: 3,
                model1Id: null,
                model1Prop1: 'hello 3',
                model1Prop2: null,
              });
              return session.knex(Model1.getTableName());
            })
            .then((rows) => {
              expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
              expect(_.map(rows, 'id').sort()).to.eql([1, 2, 3]);
            });
        });

        it('returning("someColumn") should only return that `someColumn`', () => {
          return Model1.query()
            .insert({ model1Prop1: Model1.raw("'hello' || ' 3'") })
            .returning('model1Prop1')
            .then((inserted) => {
              expect(inserted).to.be.a(Model1);
              expect(inserted.$toJson()).to.eql({ model1Prop1: 'hello 3' });
              return session.knex(Model1.getTableName());
            })
            .then((rows) => {
              expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
              expect(_.map(rows, 'id').sort()).to.eql([1, 2, 3]);
            });
        });
      }

      it('should validate', (done) => {
        let ModelWithSchema = subClassWithSchema(Model1, {
          type: 'object',
          properties: {
            id: { type: ['number', 'null'] },
            model1Prop1: { type: 'string' },
            model1Prop2: { type: 'number' },
          },
        });

        ModelWithSchema.query()
          .insert({ model1Prop1: 666 })
          .then((x) => {
            done(new Error('should not get here'));
          })
          .catch((err) => {
            expect(err.message).to.equal('model1Prop1: must be string');
            expect(err).to.be.a(ValidationError);
            expect(err).to.be.a(ModelWithSchema.ValidationError);

            return session.knex(Model1.getTableName()).then((rows) => {
              expect(_.map(rows, 'id').sort()).to.eql([1, 2]);
              done();
            });
          })
          .catch(done);
      });

      it('should use `Model.createValidationError` to create the error', (done) => {
        class MyError extends Error {
          constructor({ data }) {
            super('MyError');
            this.errors = data;
          }
        }

        let ModelWithSchema = subClassWithSchema(Model1, {
          type: 'object',
          properties: {
            id: { type: ['number', 'null'] },
            model1Prop1: { type: 'string' },
            model1Prop2: { type: 'number' },
          },
        });

        ModelWithSchema.createValidationError = (props) => {
          return new MyError(props);
        };

        ModelWithSchema.query()
          .insert({ model1Prop1: 666 })
          .then((x) => {
            done(new Error('should not get here'));
          })
          .catch((err) => {
            expect(err).to.be.a(MyError);
            expect(err.errors).to.eql({
              model1Prop1: [
                {
                  message: 'must be string',
                  keyword: 'type',
                  params: {
                    type: 'string',
                  },
                },
              ],
            });

            return session.knex(Model1.getTableName()).then((rows) => {
              expect(_.map(rows, 'id').sort()).to.eql([1, 2]);
              done();
            });
          })
          .catch(done);
      });

      it('should allow properties with same names as relations', () => {
        const Mod = inheritModel(Model1);

        Mod.prototype.$parseJson = function (json, opt) {
          if (typeof json.model1Relation1 === 'number') {
            json.model1Prop1 = json.model1Relation1;
            delete json.model1Relation1;
          }

          return Model1.prototype.$parseJson.call(this, json, opt);
        };

        return Mod.query()
          .insert({ model1Prop1: 123, model1Relation1: 666 })
          .then((inserted) => {
            expect(inserted.model1Prop1).to.equal(666);
          });
      });
    });

    describe('.query().insertAndFetch()', () => {
      beforeEach(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [
              {
                idCol: 1,
                model2Prop1: 'test 1',
              },
              {
                idCol: 2,
                model2Prop1: 'test 2',
              },
            ],
          },
          {
            id: 2,
            model1Prop1: 'hello 2',
          },
        ]);
      });

      it('should insert and fetch new model', () => {
        let model = Model1.fromJson({ model1Prop1: 'hello 3' });

        return Model1.query()
          .insertAndFetch(model)
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted).to.equal(model);
            expect(inserted).to.eql({
              id: 3,
              model1Prop1: 'hello 3',
              model1Prop2: null,
              model1Id: null,
              $beforeInsertCalled: true,
              $afterInsertCalled: true,
            });
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      if (session.isPostgres()) {
        it('should insert and fetch an array of new models', () => {
          let model1 = Model1.fromJson({ model1Prop1: 'hello 3' });
          let model2 = Model1.fromJson({ model1Prop1: 'hello 4', model1Prop2: 10 });

          return Model1.query()
            .insertAndFetch([model1, model2])
            .then((inserted) => {
              expect(inserted).to.have.length(2);

              expect(inserted[0]).to.be.a(Model1);
              expect(inserted[0]).to.equal(model1);
              expect(inserted[0]).to.eql({
                id: 3,
                model1Prop1: 'hello 3',
                model1Prop2: null,
                model1Id: null,
                $beforeInsertCalled: true,
                $afterInsertCalled: true,
              });

              expect(inserted[1]).to.be.a(Model1);
              expect(inserted[1]).to.equal(model2);
              expect(inserted[1]).to.eql({
                id: 4,
                model1Prop1: 'hello 4',
                model1Prop2: 10,
                model1Id: null,
                $beforeInsertCalled: true,
                $afterInsertCalled: true,
              });

              return session.knex(Model1.getTableName());
            })
            .then((rows) => {
              expect(_.map(rows, 'model1Prop1').sort()).to.eql([
                'hello 1',
                'hello 2',
                'hello 3',
                'hello 4',
              ]);
            });
        });
      }
    });

    describe('.$query().insert()', () => {
      beforeEach(() => {
        return session.populate([
          {
            id: 1,
            model1Prop1: 'hello 1',
          },
          {
            id: 2,
            model1Prop1: 'hello 2',
          },
        ]);
      });

      it('should insert new model', () => {
        return Model1.fromJson({ model1Prop1: 'hello 3' })
          .$query()
          .insert()
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.$beforeInsertCalled).to.equal(1);
            expect(inserted.$afterInsertCalled).to.equal(1);
            expect(inserted.id).to.eql(3);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex(Model1.getTableName());
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      it('model edits in $beforeInsert should get into database query', () => {
        let model = Model1.fromJson({});

        model.$beforeInsert = function () {
          let self = this;
          return Promise.delay(1).then(() => {
            self.model1Prop1 = 'hello 3';
          });
        };

        return model
          .$query()
          .insert()
          .then((inserted) => {
            expect(inserted).to.be.a(Model1);
            expect(inserted.model1Prop1).to.equal('hello 3');
            return session.knex('Model1').orderBy('id');
          })
          .then((rows) => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });
    });

    describe('.$relatedQuery().insert()', () => {
      describe('belongs to one relation', () => {
        let parent1;
        let parent2;

        beforeEach(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',
            },
            {
              id: 2,
              model1Prop1: 'hello 3',
            },
          ]);
        });

        beforeEach(() => {
          return Model1.query().then((parents) => {
            parent1 = _.find(parents, { id: 1 });
            parent2 = _.find(parents, { id: 2 });
          });
        });

        it('should insert a related object', () => {
          let inserted = null;

          // First check that there is nothing in the relation.
          return parent1
            .$relatedQuery('model1Relation1')
            .then((model) => {
              expect(parent1.model1Id).to.equal(null);
              expect(model).to.eql(undefined);

              return parent1
                .$relatedQuery('model1Relation1')
                .insert(Model1.fromJson({ model1Prop1: 'test' }));
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(3);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              expect(parent1.model1Relation1).to.equal(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.find(rows, { id: parent1.id }).model1Id).to.equal(3);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('test');
            });
        });

        it('should accept json', () => {
          let inserted = null;
          return parent1
            .$relatedQuery('model1Relation1')
            .insert({ model1Prop1: 'inserted' })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(3);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('inserted');
              expect(parent1.model1Relation1).to.equal(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.find(rows, { id: parent1.id }).model1Id).to.equal(3);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('inserted');
            });
        });

        it("insert replaces old related object, but doesn't remove it", () => {
          let inserted = null;
          return parent1
            .$relatedQuery('model1Relation1')
            .insert({ model1Prop1: 'inserted' })
            .then(() => {
              return parent1.$relatedQuery('model1Relation1').insert({ model1Prop1: 'inserted 2' });
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted).to.be.a(Model1);
              expect(inserted.id).to.equal(4);
              expect(inserted.model1Prop1).to.equal('inserted 2');
              expect(parent1.model1Relation1).to.equal(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              expect(_.find(rows, { id: parent1.id }).model1Id).to.equal(4);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('inserted 2');
            });
        });
      });

      describe('has one relation', () => {
        let parent1;
        let parent2;

        beforeEach(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',
            },
            {
              id: 2,
              model1Prop1: 'hello 3',
            },
          ]);
        });

        beforeEach(() => {
          return Model1.query().then((parents) => {
            parent1 = _.find(parents, { id: 1 });
            parent2 = _.find(parents, { id: 2 });
          });
        });

        it('should insert a related object', () => {
          let inserted = null;

          // First check that there is nothing in the relation.
          return parent1
            .$relatedQuery('model1Relation1Inverse')
            .then((model) => {
              expect(model).to.eql(undefined);

              return parent1
                .$relatedQuery('model1Relation1Inverse')
                .insert(Model1.fromJson({ model1Prop1: 'test' }));
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(3);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              expect(parent1.model1Relation1Inverse).to.equal(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.find(rows, { id: inserted.id }).model1Id).to.equal(parent1.id);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('test');
            });
        });

        it('should accept json', () => {
          let inserted = null;

          // First check that there is nothing in the relation.
          return parent1
            .$relatedQuery('model1Relation1Inverse')
            .then((model) => {
              expect(model).to.eql(undefined);

              return parent1
                .$relatedQuery('model1Relation1Inverse')
                .insert({ model1Prop1: 'test' });
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(3);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              expect(parent1.model1Relation1Inverse).to.equal(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.find(rows, { id: inserted.id }).model1Id).to.equal(parent1.id);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('test');
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
                  model2Prop2: 6,
                },
              ],
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 2,
                  model2Prop1: 'text 4',
                  model2Prop2: 3,
                },
              ],
            },
          ]);
        });

        beforeEach(() => {
          return Model1.query().then((parents) => {
            parent1 = _.find(parents, { id: 1 });
            parent2 = _.find(parents, { id: 2 });
          });
        });

        it('should insert a related object', () => {
          let inserted = null;

          return parent1
            .$relatedQuery('model1Relation2')
            .then((models) => {
              expect(models).to.have.length(1);

              return parent1
                .$relatedQuery('model1Relation2')
                .insert(Model2.fromJson({ model2Prop1: 'test' }));
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.idCol).to.equal(3);
              expect(inserted).to.be.a(Model2);
              expect(inserted.model2Prop1).to.equal('test');
              expect(inserted.model1Id).to.equal(parent1.id);
              expect(parent1.model1Relation2).to.eql(undefined);
              return session.knex('model2');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.find(rows, { id_col: inserted.idCol }).model1_id).to.equal(parent1.id);
              expect(_.find(rows, { id_col: inserted.idCol }).model2_prop1).to.equal('test');
            });
        });

        it('should accept json', () => {
          let inserted = null;

          return parent1
            .$relatedQuery('model1Relation2')
            .then((models) => {
              expect(models).to.have.length(1);

              return parent1.$relatedQuery('model1Relation2').insert({ model2Prop1: 'test' });
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.idCol).to.equal(3);
              expect(inserted).to.be.a(Model2);
              expect(inserted.model2Prop1).to.equal('test');
              expect(inserted.model1Id).to.equal(parent1.id);
              expect(parent1.model1Relation2).to.eql(undefined);
              return session.knex('model2');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.find(rows, { id_col: inserted.idCol }).model1_id).to.equal(parent1.id);
              expect(_.find(rows, { id_col: inserted.idCol }).model2_prop1).to.equal('test');
            });
        });

        if (session.isPostgres()) {
          it('should accept an array', () => {
            let inserted = null;

            return parent1
              .$relatedQuery('model1Relation2')
              .then((models) => {
                expect(models).to.have.length(1);

                return parent1
                  .$relatedQuery('model1Relation2')
                  .insert([
                    Model2.fromJson({ model2Prop1: 'test 1' }),
                    Model2.fromJson({ model2Prop1: 'test 2' }),
                  ]);
              })
              .then(($inserted) => {
                inserted = $inserted;
                expect(inserted[0].idCol).to.equal(3);
                expect(inserted[1].idCol).to.equal(4);
                expect(inserted[0]).to.be.a(Model2);
                expect(inserted[1]).to.be.a(Model2);
                expect(inserted[0].model2Prop1).to.equal('test 1');
                expect(inserted[1].model2Prop1).to.equal('test 2');
                expect(inserted[0].model1Id).to.equal(parent1.id);
                expect(inserted[1].model1Id).to.equal(parent1.id);
                expect(parent1.model1Relation2).to.eql(undefined);
                return session.knex('model2');
              })
              .then((rows) => {
                expect(rows).to.have.length(4);
                expect(_.find(rows, { id_col: inserted[0].idCol }).model1_id).to.equal(parent1.id);
                expect(_.find(rows, { id_col: inserted[0].idCol }).model2_prop1).to.equal('test 1');
                expect(_.find(rows, { id_col: inserted[1].idCol }).model1_id).to.equal(parent1.id);
                expect(_.find(rows, { id_col: inserted[1].idCol }).model2_prop1).to.equal('test 2');
              });
          });

          it('should accept a json array', () => {
            let inserted = null;

            return parent1
              .$relatedQuery('model1Relation2')
              .then((models) => {
                expect(models).to.have.length(1);

                return parent1
                  .$relatedQuery('model1Relation2')
                  .insert([{ model2Prop1: 'test 1' }, { model2Prop1: 'test 2' }]);
              })
              .then(($inserted) => {
                inserted = $inserted;
                expect(inserted[0].$beforeInsertCalled).to.equal(1);
                expect(inserted[0].$afterInsertCalled).to.equal(1);
                expect(inserted[1].$beforeInsertCalled).to.equal(1);
                expect(inserted[1].$afterInsertCalled).to.equal(1);
                expect(inserted[0].idCol).to.equal(3);
                expect(inserted[1].idCol).to.equal(4);
                expect(inserted[0]).to.be.a(Model2);
                expect(inserted[1]).to.be.a(Model2);
                expect(inserted[0].model2Prop1).to.equal('test 1');
                expect(inserted[1].model2Prop1).to.equal('test 2');
                expect(inserted[0].model1Id).to.equal(parent1.id);
                expect(inserted[1].model1Id).to.equal(parent1.id);
                expect(parent1.model1Relation2).to.eql(undefined);
                return session.knex('model2');
              })
              .then((rows) => {
                expect(rows).to.have.length(4);
                expect(_.find(rows, { id_col: inserted[0].idCol }).model1_id).to.equal(parent1.id);
                expect(_.find(rows, { id_col: inserted[0].idCol }).model2_prop1).to.equal('test 1');
                expect(_.find(rows, { id_col: inserted[1].idCol }).model1_id).to.equal(parent1.id);
                expect(_.find(rows, { id_col: inserted[1].idCol }).model2_prop1).to.equal('test 2');
              });
          });
        }
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
                      model1Prop2: 6,
                    },
                  ],
                },
              ],
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
                      id: 4,
                      model1Prop1: 'blaa 2',
                      model1Prop2: 3,
                    },
                  ],
                },
              ],
            },
          ]);
        });

        beforeEach(() => {
          return Model2.query().then((parents) => {
            parent1 = _.find(parents, { idCol: 1 });
            parent2 = _.find(parents, { idCol: 2 });
          });
        });

        it('should insert a related object', () => {
          let inserted = null;

          return parent1
            .$relatedQuery('model2Relation1')
            .then((models) => {
              expect(models).to.have.length(1);
              return parent1
                .$relatedQuery('model2Relation1')
                .insert(Model1.fromJson({ model1Prop1: 'test' }));
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(5);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              expect(parent1.model2Relation1).to.eql(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(5);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('test');
              return session.knex('Model1Model2');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(
                _.filter(rows, { model1Id: inserted.id, model2Id: parent1.idCol }),
              ).to.have.length(1);
            });
        });

        if (session.isPostgres()) {
          it('should insert a related object with onConflict().ignore()', async () => {
            const inserted = await Model2.relatedQuery('model2Relation1')
              .for(parent1.idCol)
              .insert({ id: 4 })
              .onConflict('id')
              .ignore();

            expect(inserted.id).to.equal(4);
            expect(inserted.$beforeInsertCalled).to.equal(1);
            expect(inserted.$afterInsertCalled).to.equal(1);

            const joinTableRows = await session.knex('Model1Model2');
            chai.expect(joinTableRows).to.containSubset([{ model1Id: 4, model2Id: parent1.idCol }]);
          });
        }

        it('should accept json', () => {
          let inserted = null;

          return parent1
            .$relatedQuery('model2Relation1')
            .then((models) => {
              expect(models).to.have.length(1);

              return parent1.$relatedQuery('model2Relation1').insert({ model1Prop1: 'test' });
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(5);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              expect(parent1.model2Relation1).to.eql(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(5);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('test');
              return session.knex('Model1Model2');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(
                _.filter(rows, { model1Id: inserted.id, model2Id: parent1.idCol }),
              ).to.have.length(1);
            });
        });

        if (session.isPostgres()) {
          it('should accept an array', () => {
            let inserted = null;

            return parent1
              .$relatedQuery('model2Relation1')
              .then((models) => {
                expect(models).to.have.length(1);

                return parent1
                  .$relatedQuery('model2Relation1')
                  .insert([
                    Model1.fromJson({ model1Prop1: 'test 1' }),
                    Model1.fromJson({ model1Prop1: 'test 2' }),
                  ]);
              })
              .then(($inserted) => {
                inserted = $inserted;
                expect(inserted[0].id).to.equal(5);
                expect(inserted[1].id).to.equal(6);
                expect(inserted[0]).to.be.a(Model1);
                expect(inserted[1]).to.be.a(Model1);
                expect(inserted[0].model1Prop1).to.equal('test 1');
                expect(inserted[1].model1Prop1).to.equal('test 2');
                expect(parent1.model2Relation1).to.eql(undefined);
                return session.knex('Model1');
              })
              .then((rows) => {
                expect(rows).to.have.length(6);
                expect(_.find(rows, { id: inserted[0].id }).model1Prop1).to.equal('test 1');
                expect(_.find(rows, { id: inserted[1].id }).model1Prop1).to.equal('test 2');
                return session.knex('Model1Model2');
              })
              .then((rows) => {
                expect(rows).to.have.length(4);
                expect(
                  _.filter(rows, { model1Id: inserted[0].id, model2Id: parent1.idCol }),
                ).to.have.length(1);
                expect(
                  _.filter(rows, { model1Id: inserted[1].id, model2Id: parent1.idCol }),
                ).to.have.length(1);
              });
          });

          it('should accept a json array', () => {
            let inserted = null;

            return parent1
              .$relatedQuery('model2Relation1')
              .then((models) => {
                expect(models).to.have.length(1);

                return parent1
                  .$relatedQuery('model2Relation1')
                  .insert([{ model1Prop1: 'test 1' }, { model1Prop1: 'test 2' }]);
              })
              .then(($inserted) => {
                inserted = $inserted;
                expect(inserted[0].$beforeInsertCalled).to.equal(1);
                expect(inserted[0].$afterInsertCalled).to.equal(1);
                expect(inserted[1].$beforeInsertCalled).to.equal(1);
                expect(inserted[1].$afterInsertCalled).to.equal(1);
                expect(inserted[0].id).to.equal(5);
                expect(inserted[1].id).to.equal(6);
                expect(inserted[0]).to.be.a(Model1);
                expect(inserted[1]).to.be.a(Model1);
                expect(inserted[0].model1Prop1).to.equal('test 1');
                expect(inserted[1].model1Prop1).to.equal('test 2');
                expect(parent1.model2Relation1).to.eql(undefined);
                return session.knex('Model1');
              })
              .then((rows) => {
                expect(rows).to.have.length(6);
                expect(_.find(rows, { id: inserted[0].id }).model1Prop1).to.equal('test 1');
                expect(_.find(rows, { id: inserted[1].id }).model1Prop1).to.equal('test 2');
                return session.knex('Model1Model2');
              })
              .then((rows) => {
                expect(rows).to.have.length(4);
                expect(
                  _.filter(rows, { model1Id: inserted[0].id, model2Id: parent1.idCol }),
                ).to.have.length(1);
                expect(
                  _.filter(rows, { model1Id: inserted[1].id, model2Id: parent1.idCol }),
                ).to.have.length(1);
              });
          });
        }

        it('should insert extra properties to the join table', () => {
          let inserted = null;

          return parent1
            .$relatedQuery('model2Relation1')
            .then((models) => {
              expect(models).to.have.length(1);
              return parent1
                .$relatedQuery('model2Relation1')
                .insert(Model1.fromJson({ model1Prop1: 'test', aliasedExtra: 'foo' }));
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.id).to.equal(5);
              expect(inserted.model1Prop1).to.equal('test');
              expect(inserted.aliasedExtra).to.equal('foo');
              expect(parent1.model2Relation1).to.eql(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(5);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('test');
              return session.knex('Model1Model2');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(
                _.filter(rows, {
                  model1Id: inserted.id,
                  model2Id: parent1.idCol,
                  extra3: inserted.aliasedExtra,
                }),
              ).to.have.length(1);
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
                  model2Relation1: [
                    {
                      id: 3,
                      model1Prop1: 'blaa 1',
                      model1Prop2: 6,
                    },
                  ],
                },
              ],
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
                      id: 4,
                      model1Prop1: 'blaa 2',
                      model1Prop2: 3,
                    },
                  ],
                },
              ],
            },
          ]);
        });

        beforeEach(() => {
          return Model2.query().then((parents) => {
            parent = _.find(parents, { idCol: 2 });
          });
        });

        it('should insert a related object', () => {
          let inserted = null;

          return parent
            .$relatedQuery('model2Relation2')
            .then((models) => {
              expect(models).to.equal(undefined);

              return parent.$relatedQuery('model2Relation2').insert({ model1Prop1: 'test' });
            })
            .then(($inserted) => {
              inserted = $inserted;

              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(5);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');

              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(5);
              expect(_.find(rows, { id: inserted.id }).model1Prop1).to.equal('test');
              return session.knex('Model1Model2One');
            })
            .then((rows) => {
              expect(rows).to.have.length(1);
              expect(
                _.filter(rows, { model1Id: inserted.id, model2Id: parent.idCol }),
              ).to.have.length(1);
            });
        });
      });
    });

    describe('.relatedQuery().insert()', () => {
      describe('belongs to one relation', () => {
        beforeEach(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
            },
          ]);
        });

        it('should insert a related object', () => {
          let inserted = null;

          // First check that there is nothing in the relation.
          return Model1.relatedQuery('model1Relation1')
            .for(1)
            .first()
            .then((model) => {
              expect(model).to.eql(undefined);

              return Model1.relatedQuery('model1Relation1')
                .for(1)
                .first()
                .insert({ model1Prop1: 'inserted' });
            })
            .then(($inserted) => {
              inserted = $inserted;
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(3);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('inserted');
              return session.knex('Model1').orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              chai.expect(rows).containSubset([
                {
                  id: 1,
                  model1Prop1: 'hello 1',
                  model1Id: 3,
                },
                {
                  id: 2,
                  model1Prop1: 'hello 2',
                  model1Id: null,
                },
                {
                  id: 3,
                  model1Prop1: 'inserted',
                  model1Id: null,
                },
              ]);
            });
        });

        it('should insert a related object and relate it to multiple owners', () => {
          return Model1.relatedQuery('model1Relation1')
            .for([1, 2])
            .insert({ model1Prop1: 'inserted' })
            .then((inserted) => {
              expect(inserted.id).to.not.be(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              chai.expect(rows).containSubset([
                {
                  id: 1,
                  model1Prop1: 'hello 1',
                  model1Id: 3,
                },
                {
                  id: 2,
                  model1Prop1: 'hello 2',
                  model1Id: 3,
                },
                {
                  id: 3,
                  model1Prop1: 'inserted',
                  model1Id: null,
                },
              ]);
            });
        });

        it('should insert a related object and relate it to multiple owners using a subquery', () => {
          return Model1.relatedQuery('model1Relation1')
            .for(Model1.query().findByIds([1, 2]))
            .insert({ model1Prop1: 'inserted' })
            .then((inserted) => {
              expect(inserted.id).to.not.be(undefined);
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              chai.expect(rows).containSubset([
                {
                  id: 1,
                  model1Prop1: 'hello 1',
                  model1Id: 3,
                },
                {
                  id: 2,
                  model1Prop1: 'hello 2',
                  model1Id: 3,
                },
                {
                  id: 3,
                  model1Prop1: 'inserted',
                  model1Id: null,
                },
              ]);
            });
        });
      });

      describe('has many relation', () => {
        beforeEach(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',
              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'text 1',
                  model2Prop2: 6,
                },
              ],
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 2,
                  model2Prop1: 'text 2',
                  model2Prop2: 3,
                },
              ],
            },
          ]);
        });

        it('should insert a related object', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(1)
            .insert({ model2Prop1: 'inserted' })
            .then((inserted) => {
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.idCol).to.equal(3);
              expect(inserted).to.be.a(Model2);
              expect(inserted.model2Prop1).to.equal('inserted');
              expect(inserted.model1Id).to.equal(1);
              return session.knex('model2').orderBy('id_col');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              chai.expect(rows).containSubset([
                { id_col: 1, model2_prop1: 'text 1', model2_prop2: 6, model1_id: 1 },
                { id_col: 2, model2_prop1: 'text 2', model2_prop2: 3, model1_id: 2 },
                { id_col: 3, model2_prop1: 'inserted', model2_prop2: null, model1_id: 1 },
              ]);
            });
        });

        it('should insert a related object using a subquery', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(Model1.query().findById(1))
            .insert({ model2Prop1: 'inserted' })
            .then(() => {
              return session.knex('model2').orderBy('id_col');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              chai.expect(rows).containSubset([
                { id_col: 1, model2_prop1: 'text 1', model2_prop2: 6, model1_id: 1 },
                { id_col: 2, model2_prop1: 'text 2', model2_prop2: 3, model1_id: 2 },
                { id_col: 3, model2_prop1: 'inserted', model2_prop2: null, model1_id: 1 },
              ]);
            });
        });

        it('should fail if multiple parents are given', (done) => {
          Model1.relatedQuery('model1Relation2')
            .for([1, 2])
            .insert({ model2Prop1: 'inserted' })
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch((err) => {
              expect(err.message).to.equal(
                "Can only insert items for one parent at a time in case of HasManyRelation. Otherwise multiple insert queries would need to be created. If you need to insert items for multiple parents, simply loop through them. That's the most performant way.",
              );
              done();
            })
            .catch(done);
        });

        if (session.isPostgres()) {
          it('should accept an array', () => {
            return Model1.relatedQuery('model1Relation2')
              .for(1)
              .insert([{ model2Prop1: 'inserted 1' }, { model2Prop1: 'inserted 2' }])
              .then((inserted) => {
                expect(inserted[0].$beforeInsertCalled).to.equal(1);
                expect(inserted[0].$afterInsertCalled).to.equal(1);
                expect(inserted[1].$beforeInsertCalled).to.equal(1);
                expect(inserted[1].$afterInsertCalled).to.equal(1);
                expect(inserted[0].idCol).to.equal(3);
                expect(inserted[1].idCol).to.equal(4);
                expect(inserted[0]).to.be.a(Model2);
                expect(inserted[1]).to.be.a(Model2);
                expect(inserted[0].model2Prop1).to.equal('inserted 1');
                expect(inserted[1].model2Prop1).to.equal('inserted 2');
                expect(inserted[0].model1Id).to.equal(1);
                expect(inserted[1].model1Id).to.equal(1);
                return session.knex('model2');
              })
              .then((rows) => {
                expect(rows).to.have.length(4);
                chai.expect(rows).containSubset([
                  { id_col: 1, model2_prop1: 'text 1', model2_prop2: 6, model1_id: 1 },
                  { id_col: 2, model2_prop1: 'text 2', model2_prop2: 3, model1_id: 2 },
                  { id_col: 3, model2_prop1: 'inserted 1', model2_prop2: null, model1_id: 1 },
                  { id_col: 4, model2_prop1: 'inserted 2', model2_prop2: null, model1_id: 1 },
                ]);
              });
          });
        }
      });

      describe('many to many relation', () => {
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
                      model1Prop2: 6,
                    },
                  ],
                },
              ],
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
                      id: 4,
                      model1Prop1: 'blaa 2',
                      model1Prop2: 3,
                    },
                  ],
                },
              ],
            },
          ]);
        });

        it('should insert a related object for one parent using an id', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(1)
            .insert({ model1Prop1: 'test' })
            .then((inserted) => {
              expect(inserted.$beforeInsertCalled).to.equal(1);
              expect(inserted.$afterInsertCalled).to.equal(1);
              expect(inserted.id).to.equal(5);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(5);
              expect(_.find(rows, { id: 5 }).model1Prop1).to.equal('test');
              return session.knex('Model1Model2');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.filter(rows, { model1Id: 5, model2Id: 1 })).to.have.length(1);
            });
        });

        it('should insert a related object for one parent using a subquery', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(Model2.query().findById(1))
            .insert({ model1Prop1: 'test' })
            .then((inserted) => {
              expect(inserted.id).to.equal(5);
              expect(inserted).to.be.a(Model1);
              expect(inserted.model1Prop1).to.equal('test');
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(5);
              expect(_.find(rows, { id: 5 }).model1Prop1).to.equal('test');
              return session.knex('Model1Model2');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.filter(rows, { model1Id: 5, model2Id: 1 })).to.have.length(1);
            });
        });

        if (session.isPostgres()) {
          it('should insert a related object for two parents using ids', () => {
            return Model2.relatedQuery('model2Relation1')
              .for([1, 2])
              .insert({ model1Prop1: 'test' })
              .then((inserted) => {
                expect(inserted.$beforeInsertCalled).to.equal(1);
                expect(inserted.$afterInsertCalled).to.equal(1);
                expect(inserted.id).to.equal(5);
                expect(inserted).to.be.a(Model1);
                expect(inserted.model1Prop1).to.equal('test');
                return session.knex('Model1');
              })
              .then((rows) => {
                expect(rows).to.have.length(5);
                expect(_.find(rows, { id: 5 }).model1Prop1).to.equal('test');
                return session.knex('Model1Model2');
              })
              .then((rows) => {
                expect(rows).to.have.length(4);
                expect(_.filter(rows, { model1Id: 5, model2Id: 1 })).to.have.length(1);
                expect(_.filter(rows, { model1Id: 5, model2Id: 2 })).to.have.length(1);
              });
          });

          it('should accept an array', () => {
            return Model2.relatedQuery('model2Relation1')
              .for(1)
              .insert([{ model1Prop1: 'test 1' }, { model1Prop1: 'test 2' }])
              .then((inserted) => {
                expect(inserted[0].id).to.equal(5);
                expect(inserted[1].id).to.equal(6);
                expect(inserted[0]).to.be.a(Model1);
                expect(inserted[1]).to.be.a(Model1);
                expect(inserted[0].model1Prop1).to.equal('test 1');
                expect(inserted[1].model1Prop1).to.equal('test 2');
                return session.knex('Model1');
              })
              .then((rows) => {
                expect(rows).to.have.length(6);
                expect(_.find(rows, { id: 5 }).model1Prop1).to.equal('test 1');
                expect(_.find(rows, { id: 6 }).model1Prop1).to.equal('test 2');
                return session.knex('Model1Model2');
              })
              .then((rows) => {
                expect(rows).to.have.length(4);
                expect(_.filter(rows, { model1Id: 5, model2Id: 1 })).to.have.length(1);
                expect(_.filter(rows, { model1Id: 6, model2Id: 1 })).to.have.length(1);
              });
          });
        }

        it('should insert extra properties to the join table', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(1)
            .insert(Model1.fromJson({ model1Prop1: 'test', aliasedExtra: 'foo' }))
            .then((inserted) => {
              expect(inserted.id).to.equal(5);
              expect(inserted.model1Prop1).to.equal('test');
              expect(inserted.aliasedExtra).to.equal('foo');
              return session.knex('Model1');
            })
            .then((rows) => {
              expect(rows).to.have.length(5);
              expect(_.find(rows, { id: 5 }).model1Prop1).to.equal('test');
              return session.knex('Model1Model2');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(
                _.filter(rows, {
                  model1Id: 5,
                  model2Id: 1,
                  extra3: 'foo',
                }),
              ).to.have.length(1);
            });
        });
      });
    });

    describe('.query().insert().onConflict()', () => {
      beforeEach(() => {
        return session.populate([]);
      });

      describe('.ignore()', () => {
        it('should silently ignore insert if id already exists', async () => {
          await Model1.query().insert({ id: 1 });
          const result = await Model1.query().insert({ id: 1 }).onConflict('id').ignore();
          expect(result instanceof Model1).to.equal(true);

          const rows = await Model1.query();
          expect(rows).to.have.length(1);
          expect(rows[0].id).to.equal(1);
          expect(result.id).to.equal(rows[0].id);
        });
      });

      describe('.merge()', () => {
        it('should update the row if id already exists', async () => {
          await Model2.query().insert({ idCol: 1 });
          const result = await Model2.query()
            .insert({ idCol: 1, model2Prop1: 'updated' })
            .onConflict('id_col')
            .merge();
          expect(result instanceof Model2).to.equal(true);

          const rows = await Model2.query();
          expect(rows).to.have.length(1);
          expect(rows[0].idCol).to.equal(1);
          expect(rows[0].model2Prop1).to.equal('updated');
          expect(result.id).to.equal(rows[0].id);
          expect(result.model2Prop1).to.equal(rows[0].model2Prop1);
        });

        it('should update some columns of the row if id already exists', async () => {
          await Model2.query().insert({ idCol: 1 });
          const result = await Model2.query()
            .insert({ idCol: 1, model2Prop1: 'updated', model2Prop2: 123456 })
            .onConflict('id_col')
            .merge(['model2_prop1']);
          expect(result instanceof Model2).to.equal(true);

          const rows = await Model2.query();
          expect(rows).to.have.length(1);
          expect(rows[0].idCol).to.equal(1);
          expect(rows[0].model2Prop1).to.equal('updated');
          expect(rows[0].model2Prop2).to.equal(null);
          expect(result.id).to.equal(rows[0].id);
          expect(result.model2Prop1).to.equal(rows[0].model2Prop1);
        });

        if (session.isPostgres()) {
          it('should update the row with custom values if id already exists', async () => {
            await Model2.query().insert({ idCol: 1 });
            const result = await Model2.query()
              .insert({ idCol: 1, model2Prop1: 'updated' })
              .onConflict('id_col')
              .merge({ model2Prop1: 'override updated' })
              .returning('id_col', 'model2_prop1');
            expect(result instanceof Model2).to.equal(true);

            const rows = await Model2.query();
            expect(rows).to.have.length(1);
            expect(rows[0].idCol).to.equal(1);
            expect(rows[0].model2Prop1).to.equal('override updated');
            expect(result.id).to.equal(rows[0].id);
            expect(result.model2Prop1).to.equal(rows[0].model2Prop1);
          });
        }
      });
    });

    function subClassWithSchema(Model, schema) {
      let SubModel = inheritModel(Model);
      SubModel.jsonSchema = schema;
      return SubModel;
    }
  });
};
