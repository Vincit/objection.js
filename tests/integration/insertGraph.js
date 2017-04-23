'use strict';

const _ = require('lodash');
const utils = require('../../lib/utils/knexUtils');
const expect = require('expect.js');
const Promise = require('bluebird');
const transaction = require('../../').transaction;
const ValidationError = require('../../').ValidationError;
const inheritModel = require('../../lib/model/inheritModel');

module.exports = (session) => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('Model insertGraph queries', () => {
    let population;
    let insertion;
    let eagerExpr = '[model1Relation1.model1Relation3, model1Relation1Inverse, model1Relation2.model2Relation2]';

    beforeEach(() => {
      population = {
        id: 1,
        model1Prop1: '20',
        model1Relation3: [{
          idCol: 1
        }]
      };

      insertion = {
        model1Prop1: 'root',

        model1Relation1: {
          model1Prop1: 'parent',
          model1Prop2: '#ref{grandChild.idCol}',

          model1Relation3: [{
            "#ref": 'child1'
          }, {
            "#id": 'grandChild',
            model2Prop1: 'cibling2',
            // These should go to the join table.
            extra1: 'extraVal1',
            extra2: 'extraVal2'
          }, {
            "#dbRef": 1,
            extra1: 'foo'
          }]
        },

        model1Relation1Inverse: {
          model1Prop1: 'rootParent'
        },

        model1Relation2: [{
          "#id": 'child1',
          model2Prop1: 'child1'
        }, {
          model2Prop1: 'child2',

          model2Relation2: {
            model1Prop1: 'child3'
          }
        }]
      };
    });

    describe('.query().insertGraph()', () => {

      beforeEach(() => {
        return session.populate(population);
      });

      it('should insert a model with relations', () => {
        return Model1
          .query()
          .insertGraph(insertion)
          .then(inserted => {
            return check(inserted, true).return(inserted);
          })
          .then(inserted => {
            expect(inserted).to.not.have.property('model1Prop2');
            return Model1.query().eager(eagerExpr).where('id', inserted.id).first();
          })
          .then(model => {
            return check(model);
          });
      });

      it('should have alias `insertWithRelated`', () => {
        return Model1
          .query()
          .insertWithRelated(insertion)
          .then(inserted => {
            return check(inserted, true).return(inserted);
          })
          .then(inserted => {
            expect(inserted).to.not.have.property('model1Prop2');
            return Model1.query().eager(eagerExpr).where('id', inserted.id).first();
          })
          .then(model => {
            return check(model);
          });
      });

      describe('jsonSchema: additionalProperties = false', () => {
        let origSchema;

        before(() => {
          origSchema = Model1.jsonSchema;

          Model1.jsonSchema = {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: {type: 'number'},
              model1Prop1: {type: 'string'},
              model1Prop2: {type: 'number'},
              model1Id: {type: 'number'}
            }
          };

          // Clear the memoized schema.
          delete Model1.$$hiddenData.memoizedGetJsonSchema;
          expect(Model1.getJsonSchema()).to.equal(Model1.jsonSchema);
        });

        after(() => {
          Model1.jsonSchema = origSchema;

          // Clear the memoized schema.
          delete Model1.$$hiddenData.memoizedGetJsonSchema;
          expect(Model1.getJsonSchema()).to.equal(origSchema);
        });

        it('should insert a model with relations', () => {
          return Model1
            .query()
            .insertGraph(insertion)
            .then(inserted => {
              return check(inserted, true).return(inserted);
            })
            .then(inserted => {
              expect(inserted).to.not.have.property('model1Prop2');
              return Model1.query().eager(eagerExpr).where('id', inserted.id).first();
            })
            .then(model => {
              return check(model);
            });
        });

      });

      it('should accept raw sql and subqueries', () => {
        return Model1
          .query()
          .insertGraph([{
            model1Prop1: '10'
          }, {
            model1Prop1: '50'
          }])
          .then(() => {
            return Model1
              .query()
              .insertGraph({
                model1Prop1: Model1.raw("40 + 2"),

                model1Relation2: [{
                  "#id": 'child1',
                  idCol: 100,
                  model2Prop1: Model1.query().min('model1Prop1')
                }, {
                  idCol: 101,
                  model2Prop1: Model1.knex().from('Model1').max('model1Prop1')
                }]
              });
          })
          .then(inserted => {
            inserted.model1Relation2 = _.sortBy(inserted.model1Relation2, 'idCol');

            expect(inserted.toJSON()).to.eql({
              id: 4,
              model1Relation2: [
                { model1Id: 4, idCol: 100 },
                { model1Id: 4, idCol: 101 }
              ]
            });

            return Model1.query().eager('model1Relation2').where('id', inserted.id);
          })
          .then(inserted => {
            inserted[0].model1Relation2 = _.sortBy(inserted[0].model1Relation2, 'idCol');

            expect(inserted[0]).to.eql({
              id: 4,
              model1Id: null,
              model1Prop1: '42',
              model1Prop2: null,
              $afterGetCalled: 1,
              model1Relation2: [
                { idCol: 100, model1Id: 4, model2Prop1: '10', model2Prop2: null, $afterGetCalled: 1},
                { idCol: 101, model1Id: 4, model2Prop1: '50', model2Prop2: null, $afterGetCalled: 1}
              ]
            });
          });
      });

      it('should validate models upon insertion', done => {
        insertion.model1Relation1.model1Prop1 = 666;

        transaction(Model1, Model2, (Model1, Model2) => {
          // We can modify Model1 and Model2 here since it is a subclass of the actual
          // models shared between tests.
          Model1.jsonSchema = {
            type: 'object',
            properties: {
              id: {type: 'integer'},
              model1Id: {type: 'integer'},
              model1Prop1: {type: 'string'},
              model1Prop2: {type: 'integer'}
            }
          };

          Model2.jsonSchema = {
            type: 'object',
            properties: {
              idCol: {type: 'integer'},
              model1Id: {type: 'integer'},
              model2Prop1: {type: 'string'},
              model2Prop2: {type: 'integer'}
            }
          };

          // Clear the memoized schema.
          Model1.$$hiddenData.memoizedGetJsonSchema = undefined;
          Model2.$$hiddenData.memoizedGetJsonSchema = undefined;

          expect(Model1.getJsonSchema()).to.equal(Model1.jsonSchema);
          expect(Model2.getJsonSchema()).to.equal(Model2.jsonSchema);

          return Model1.query().insertGraph(insertion);
        }).then(() => {
          done(new Error('should not get here'));
        }).catch(err => {
          expect(err).to.be.a(ValidationError);
          expect(err.data).to.have.property('model1Prop1');

          return Promise.all([
            session.knex('Model1'),
            session.knex('model_2')
          ]);
        }).spread((rows1, rows2) => {
          expect(rows1).to.have.length(1);
          expect(rows2).to.have.length(1);
          done();
        }).catch(done);
      });

      it('should validate models upon insertion: references in integer columns should be accepted', () => {
        return transaction(Model1, Model2, (Model1, Model2) => {
          // We can modify Model1 and Model2 here since it is a subclass of the actual
          // models shared between tests.
          Model1.jsonSchema = {
            type: 'object',
            properties: {
              id: {type: 'integer'},
              model1Id: {type: 'integer'},
              model1Prop1: {type: 'string'},
              model1Prop2: {type: 'integer'}
            }
          };

          Model2.jsonSchema = {
            type: 'object',
            properties: {
              idCol: {type: 'integer'},
              model1Id: {type: 'integer'},
              model2Prop1: {type: 'string'},
              model2Prop2: {type: 'integer'}
            }
          };

          // Clear the memoized schema.
          Model1.$$hiddenData.memoizedGetJsonSchema = undefined;
          Model2.$$hiddenData.memoizedGetJsonSchema = undefined;

          expect(Model1.getJsonSchema()).to.equal(Model1.jsonSchema);
          expect(Model2.getJsonSchema()).to.equal(Model2.jsonSchema);

          return Model1
            .query()
            .insertGraph(insertion)
            .then(inserted => {
              return check(inserted, true).return(inserted);
            })
            .then(inserted => {
              expect(inserted).to.not.have.property('model1Prop2');
              return Model1.query().eager(eagerExpr).where('id', inserted.id).first();
            })
            .then(model => {
              return check(model);
            });
        });
      });

      if (utils.isPostgres(session.knex)) {
        it('query building methods should be applied to the root models', () => {
          return Model1
            .query()
            .insertGraph(insertion)
            .returning('*')
            .then(inserted => {
              return check(inserted, true).return(inserted);
            })
            .then(inserted => {
              expect(inserted).to.have.property('model1Prop2');
              return Model1.query().eager(eagerExpr).where('id', inserted.id).first();
            })
            .then(model => {
              return check(model);
            });
        });
      }

    });

    describe('.query().insertGraphAndFetch()', () => {

      beforeEach(() => {
        return session.populate(population);
      });

      it('should insert a model with relations and fetch the inserted graph', () => {
        return Model1
          .query()
          .insertGraphAndFetch(insertion)
          .then(inserted => {
            return check(inserted).return(inserted);
          })
          .then(inserted => {
            return Model1.query().eager(eagerExpr).findById(inserted.id).then(fetched => {
              expect(inserted.$toJson()).to.eql(fetched.$toJson());
            });
          });
      });

    });

    describe('.query().insertGraph().allowRelated()', () => {

      beforeEach(() => {
        return session.populate(population);
      });

      it('should allow insert when the allowed relation expression is a superset', () => {
        return Model1
          .query()
          .insertGraph(insertion)
          .allowInsert(eagerExpr)
          .then(inserted => {
            return check(inserted, true).return(inserted);
          });
      });

      it('should not allow insert when the allowed relation expression is not a superset', done => {
        Model1
          .query()
          .insertGraph(insertion)
          .allowInsert('[model1Relation1.model1Relation3, model1Relation2]')
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(err => {
            expect(err instanceof ValidationError).to.equal(true);
            done();
          })
          .catch(done);
      });

    });

    describe('.$query().insertGraph()', () => {

      beforeEach(() => {
        return session.populate(population);
      });

      it('should insert a model with relations', () => {
        return Model1
          .fromJson(insertion)
          .$query()
          .insertGraph()
          .then(inserted => {
            return check(inserted, true).return(inserted);
          })
          .then(inserted => {
            return Model1.query().eager(eagerExpr).where('id', inserted.id).first();
          })
          .then(model => {
            return check(model);
          });
      });

    });

    describe('.$relatedQuery().insertGraph()', () => {

      describe('has many relation', () => {
        let parent;

        beforeEach(() => {
          return session.populate(population);
        });

        beforeEach(() => {
          return Model1
            .query()
            .where('id', 1)
            .first()
            .then(par => {
              parent = par;
            });
        });

        beforeEach(() => {
          insertion = {
            model2Prop1: 'howdy',
            model2Relation1: [insertion]
          };
        });

        it('should insert a model with relations', () => {
          return parent
            .$relatedQuery('model1Relation2')
            .insertGraph(insertion)
            .then(inserted => {
              return check(inserted.model2Relation1[0], true);
            })
            .then(() => {
              return parent
                .$relatedQuery('model1Relation2')
                .first();
            })
            .then(insertion => {
              expect(insertion.model2Prop1).to.equal('howdy');
              return insertion
                .$relatedQuery('model2Relation1')
                .eager(eagerExpr)
                .first();
            })
            .then(model => {
              return check(model);
            });
        });

      });

      describe('many to many relation', () => {
        let parent;

        beforeEach(() => {
          return session.populate(population);
        });

        beforeEach(() => {
          return Model1
            .query()
            .where('id', 1)
            .first()
            .then(par => {
              parent = par;
            });
        });

        beforeEach(() => {
          insertion = {
            model2Prop1: 'howdy',
            model2Relation1: [insertion]
          };
        });

        it('should insert a model with relations', () => {
          return parent
            .$relatedQuery('model1Relation3')
            .insertGraph(insertion)
            .then(inserted => {
              return check(inserted.model2Relation1[0], true);
            })
            .then(() => {
              return parent.$relatedQuery('model1Relation3');
            })
            .then(models => {
              let insertion = _.find(models, {model2Prop1: 'howdy'});
              return insertion
                .$relatedQuery('model2Relation1')
                .eager(eagerExpr);
            })
            .then(models => {
              let model = _.find(models, {model1Prop1: 'root'});
              return check(model);
            });
        });
      });

    });

    function check(model, shouldCheckHooks) {
      model = model.$clone();
      let knex = model.constructor.knex();

      expect(model).to.have.property('model1Relation1');
      expect(model.model1Relation1).to.have.property('model1Relation3');
      expect(model).to.have.property('model1Relation2');

      model.model1Relation1.model1Relation3 = _.sortBy(model.model1Relation1.model1Relation3, 'model2Prop1');
      model.model1Relation2 = _.sortBy(model.model1Relation2, 'model2Prop1');

      expect(model.model1Prop1).to.equal('root');
      shouldCheckHooks && checkHooks(model);

      expect(model.model1Relation1.model1Prop1).to.equal('parent');
      shouldCheckHooks && checkHooks(model.model1Relation1);

      expect(model.model1Relation1Inverse.model1Prop1).to.equal('rootParent');
      shouldCheckHooks && checkHooks(model.model1Relation1Inverse);

      expect(model.model1Relation1.model1Relation3[0].model2Prop1).to.equal('child1');
      shouldCheckHooks && checkHooks(model.model1Relation1.model1Relation3[0]);

      expect(model.model1Relation1.model1Relation3[1].model2Prop1).to.equal('cibling2');
      expect(model.model1Relation1.model1Relation3[1].extra1).to.equal('extraVal1');
      expect(model.model1Relation1.model1Relation3[1].extra2).to.equal('extraVal2');
      expect(model.model1Relation1.model1Relation3[2].idCol).to.equal(1);
      expect(model.model1Relation1.model1Relation3[2].extra1).to.equal('foo');
      shouldCheckHooks && checkHooks(model.model1Relation1.model1Relation3[1]);

      expect(model.model1Relation2[0].model2Prop1).to.equal('child1');
      shouldCheckHooks && checkHooks(model.model1Relation2[0]);

      expect(model.model1Relation2[1].model2Prop1).to.equal('child2');
      shouldCheckHooks && checkHooks(model.model1Relation2[1]);

      expect(model.model1Relation2[1].model2Relation2.model1Prop1).to.equal('child3');
      shouldCheckHooks && checkHooks(model.model1Relation2[1].model2Relation2);

      return knex(Model2.tableName).then(rows => {
        // Check that the reference model was only inserted once.
        expect(_.filter(rows, {model_2_prop_1: 'child1'})).to.have.length(1);
      });
    }

    function checkHooks(model) {
      expect(model.$beforeInsertCalled).to.equal(1);
      expect(model.$afterInsertCalled).to.equal(1);
    }

  });
};
