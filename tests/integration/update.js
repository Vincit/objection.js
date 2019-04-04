const _ = require('lodash');
const expect = require('expect.js');
const Promise = require('bluebird');
const { inheritModel } = require('../../lib/model/inheritModel');
const { expectPartialEqual: expectPartEql } = require('./../../testUtils/testUtils');
const { ValidationError, raw } = require('../../');

module.exports = session => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('Model update queries', () => {
    describe('.query().update()', () => {
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

      it('should update a model (1)', () => {
        let model = Model1.fromJson({ model1Prop1: 'updated text' });

        return Model1.query()
          .update(model)
          .where('id', '=', 2)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(model.$beforeUpdateCalled).to.equal(1);
            expect(model.$afterUpdateCalled).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'updated text' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should be able to update to null value', () => {
        return Model1.query()
          .update({ model1Prop1: null, model1Prop2: 100 })
          .where('id', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: null });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should be able to update to an empty string', () => {
        return Model1.query()
          .update({ model1Prop1: '', model1Prop2: 100 })
          .where('id', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(3);
            expectPartEql(rows[0], { id: 1, model1Prop1: '' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
            expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
          });
      });

      it('should accept json', () => {
        return Model1.query()
          .update({ model1Prop1: 'updated text' })
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

      it('should update a model (2)', () => {
        let model = Model2.fromJson({ model2Prop1: 'updated text' });

        return Model2.query()
          .update(model)
          .where('id_col', '=', 1)
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            return session.knex('model2').orderBy('id_col');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id_col: 1, model2_prop1: 'updated text', model2_prop2: 2 });
            expectPartEql(rows[1], { id_col: 2, model2_prop1: 'text 2', model2_prop2: 1 });
          });
      });

      it('should update multiple', () => {
        return Model1.query()
          .update({ model1Prop1: 'updated text' })
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

      it('should validate', done => {
        let ModelWithSchema = subClassWithSchema(Model1, {
          type: 'object',
          properties: {
            id: { type: ['number', 'null'] },
            model1Prop1: { type: 'string' },
            model1Prop2: { type: 'number' }
          }
        });

        ModelWithSchema.query()
          .update({ model1Prop1: 666 })
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

      it('should validate required properties', done => {
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
          .update({ model1Prop1: 'text' })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err).to.be.a(ValidationError);
            return session.knex(Model1.getTableName());
          })
          .then(rows => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
            done();
          })
          .catch(done);
      });

      it.skip('should pass validation if query properties are passed in for required', () => {
        const ModelWithSchema = subClassWithSchema(Model1, {
          type: 'object',
          required: ['model1Prop1'],
          properties: {
            id: { type: ['number', 'null'] },
            model1Prop1: { type: 'string' },
            model1Prop2: { type: 'number' }
          }
        });

        return ModelWithSchema.query()
          .update({ model1Prop1: raw(`'text'`) })
          .where('model1Prop1', 'hello 2')
          .then(() => {
            return session.knex(Model1.getTableName());
          })
          .then(rows => {
            expect(_.map(rows, 'model1Prop1').sort()).to.eql(['hello 1', 'hello 2', 'hello 3']);
          });
      });

      it('should use `Model.createValidationError` to create the error', done => {
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
            model1Prop2: { type: 'number' }
          }
        });

        ModelWithSchema.createValidationError = props => {
          return new MyError(props);
        };

        ModelWithSchema.query()
          .update({ model1Prop1: 666 })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err).to.be.a(MyError);
            expect(err.errors).to.eql({
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
    });

    describe('.query().updateAndFetchById()', () => {
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

      it('should update and fetch a model', () => {
        let model = Model1.fromJson({ model1Prop1: 'updated text' });

        return Model1.query()
          .updateAndFetchById(2, model)
          .then(fetchedModel => {
            expect(fetchedModel).to.equal(model);
            expect(fetchedModel).eql({
              id: 2,
              model1Prop1: 'updated text',
              model1Prop2: null,
              model1Id: null,
              $beforeUpdateCalled: true,
              $beforeUpdateOptions: {},
              $afterUpdateCalled: true,
              $afterUpdateOptions: {}
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
    });

    describe('.$query().update()', () => {
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

      it('should update a model (1)', () => {
        const model = Model1.fromJson({ id: 1 });

        return model
          .$query()
          .update({ model1Prop1: 'updated text' })
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(model.model1Prop1).to.eql('updated text');
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
          });
      });

      it('should update a model (2)', () => {
        const model = Model1.fromJson({ id: 1, model1Prop1: 'updated text' });

        return model
          .$query()
          .update()
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(model.$beforeUpdateCalled).to.equal(1);
            expect(model.$afterUpdateCalled).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
          });
      });

      it('should pass the old values to $beforeUpdate and $afterUpdate hooks in options.old', () => {
        let model = Model1.fromJson({ id: 1, model1Prop1: 'updated text' });

        return Model1.fromJson({ id: 1 })
          .$query()
          .update(model)
          .then(() => {
            expect(model.$beforeUpdateCalled).to.equal(1);
            expect(model.$beforeUpdateOptions).to.eql({ old: { id: 1 } });
            expect(model.$afterUpdateCalled).to.equal(1);
            expect(model.$afterUpdateOptions).to.eql({ old: { id: 1 } });
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'updated text' });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2' });
          });
      });

      it('should pass the old values to $beforeValidate and $afterValidate hooks in options.old', () => {
        let TestModel = inheritModel(Model1);

        TestModel.pickJsonSchemaProperties = false;
        TestModel.jsonSchema = {
          type: 'object',
          properties: {
            id: { type: 'integer' }
          }
        };

        let before;
        let after;

        let model = TestModel.fromJson({ id: 1, model1Prop1: 'text' });

        TestModel.prototype.$beforeValidate = (schema, json, options) => {
          before = options.old.toJSON();
          return schema;
        };

        TestModel.prototype.$afterValidate = function(json, options) {
          after = options.old.toJSON();
        };

        return model
          .$query()
          .update({ model1Prop1: 'updated text' })
          .then(numUpdated => {
            expect(numUpdated).to.equal(1);
            expect(before.id).to.equal(1);
            expect(after.id).to.equal(1);
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
          .update()
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
    });

    describe('.$query().updateAndFetch()', () => {
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

      it('should update and fetch a model', () => {
        let model = Model1.fromJson({ id: 1 });

        return model
          .$query()
          .updateAndFetch({ model1Prop2: 10, undefinedShouldBeIgnored: undefined })
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
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1', model1Prop2: 10 });
            expectPartEql(rows[1], { id: 2, model1Prop1: 'hello 2', model1Prop2: null });
          });
      });
    });

    describe('.$relatedQuery().update()', () => {
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

        it('should update a related object (1)', () => {
          return parent1
            .$relatedQuery('model1Relation1')
            .update({ model1Prop1: 'updated text' })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('Model1').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], { id: 1, model1Prop1: 'hello 1' });
              expectPartEql(rows[1], { id: 2, model1Prop1: 'updated text' });
              expectPartEql(rows[2], { id: 3, model1Prop1: 'hello 3' });
              expectPartEql(rows[3], { id: 4, model1Prop1: 'hello 4' });
            });
        });

        it('should update a related object (2)', () => {
          return parent2
            .$relatedQuery('model1Relation1')
            .update({ model1Prop1: 'updated text', model1Prop2: 1000 })
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

        it('should update a related object', () => {
          return parent1
            .$relatedQuery('model1Relation2')
            .update({ model2Prop1: 'updated text' })
            .where('id_col', 2)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
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

        it('should update multiple related objects', () => {
          return parent1
            .$relatedQuery('model1Relation2')
            .update({ model2Prop1: 'updated text' })
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

        it('should update a related object', () => {
          return parent1
            .$relatedQuery('model2Relation1')
            .update({ model1Prop1: 'updated text' })
            .where('Model1.id', 5)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
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

        it('should update multiple objects (1)', () => {
          return parent2
            .$relatedQuery('model2Relation1')
            .update({ model1Prop1: 'updated text', model1Prop2: 123 })
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

        it('should update multiple objects (2)', () => {
          return parent1
            .$relatedQuery('model2Relation1')
            .update({ model1Prop1: 'updated text', model1Prop2: 123 })
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

        it('should update the related object', () => {
          return parent
            .$relatedQuery('model2Relation2')
            .update({ model1Prop1: 'updated text' })
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

    function subClassWithSchema(Model, schema) {
      let SubModel = inheritModel(Model);
      SubModel.jsonSchema = schema;
      return SubModel;
    }
  });
};
