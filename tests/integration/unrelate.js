'use strict';

const _ = require('lodash');
const expect = require('expect.js');

module.exports = (session) => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('Model unrelate queries', () => {

    describe('.$query()', () => {

      it('should reject the query', done => {
        Model1
          .fromJson({id: 1})
          .$query()
          .unrelate()
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(() => {
            done();
          });
      });

    });

    describe('.$relatedQuery().unrelate()', () => {

      describe('belongs to one relation', () => {

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

        it('should unrelate', () => {
          return Model1
            .query()
            .where('id', 1)
            .first()
            .then(model => {
              return model
                .$relatedQuery('model1Relation1')
                .unrelate();
            })
            .then(() => {
              return session.knex(Model1.tableName).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expect(rows[0].model1Id).to.equal(null);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(4);
              expect(rows[3].model1Id).to.equal(null);
            });
        });

      });

      describe('has many relation', () => {

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
            }]
          }]);
        });

        it('should unrelate', () => {
          return Model1
            .query()
            .where('id', 1)
            .first()
            .then(model => {
              return model
                .$relatedQuery('model1Relation2')
                .unrelate()
                .where('id_col', 2);
            })
            .then(() => {
              return session.knex(Model2.tableName).orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expect(rows[0].model_1_id).to.equal(1);
              expect(rows[1].model_1_id).to.equal(null);
              expect(rows[2].model_1_id).to.equal(1);
              expect(rows[3].model_1_id).to.equal(2);
            });
        });

        it('should unrelate multiple', () => {
          return Model1
            .query()
            .where('id', 1)
            .first()
            .then(model => {
              return model
                .$relatedQuery('model1Relation2')
                .unrelate()
                .where('id_col', '>', 1);
            })
            .then(() => {
              return session.knex(Model2.tableName).orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expect(rows[0].model_1_id).to.equal(1);
              expect(rows[1].model_1_id).to.equal(null);
              expect(rows[2].model_1_id).to.equal(null);
              expect(rows[3].model_1_id).to.equal(2);
            });
        });

      });

      describe('many to many relation', () => {

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
              }]
            }]
          }]);
        });

        it('should unrelate', () => {
          return Model2
            .query()
            .where('id_col', 1)
            .first()
            .then(model => {
              return model
                .$relatedQuery('model2Relation1')
                .unrelate()
                .where('Model1.id', 4);
            })
            .then(() => {
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(_.filter(rows, {model2Id: 1, model1Id: 3})).to.have.length(1);
              expect(_.filter(rows, {model2Id: 1, model1Id: 4})).to.have.length(0);
              expect(_.filter(rows, {model2Id: 1, model1Id: 5})).to.have.length(1);
              expect(_.filter(rows, {model2Id: 2, model1Id: 6})).to.have.length(1);
            });
        });

        it('should unrelate multiple', () => {
          return Model2
            .query()
            .where('id_col', 1)
            .first()
            .then(model => {
              return model
                .$relatedQuery('model2Relation1')
                .unrelate()
                .where('model1Prop1', '>', 'blaa 1');
            })
            .then(() => {
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(2);
              expect(_.filter(rows, {model2Id: 1, model1Id: 3})).to.have.length(1);
              expect(_.filter(rows, {model2Id: 1, model1Id: 4})).to.have.length(0);
              expect(_.filter(rows, {model2Id: 1, model1Id: 5})).to.have.length(0);
              expect(_.filter(rows, {model2Id: 2, model1Id: 6})).to.have.length(1);
            });
        });

      });

      describe('has one through relation', () => {

        beforeEach(() => {
          return session.populate([{
            id: 1,
            model1Prop1: 'hello 1',
            model1Relation2: [{
              idCol: 1,
              model2Prop1: 'text 1',

              model2Relation2: {
                id: 5,
                model1Prop1: 'blaa 3',
                model1Prop2: 4
              }
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 2,
              model2Prop1: 'text 2',

              model2Relation2: {
                id: 6,
                model1Prop1: 'blaa 4',
                model1Prop2: 5
              },

              model2Relation1: [{
                id: 7,
                model1Prop1: 'blaa 5',
                model1Prop2: 4
              }]
            }]
          }]);
        });

        it('should unrelate', () => {
          return Model2
            .query()
            .where('id_col', 2)
            .first()
            .then(model => {
              return model
                .$relatedQuery('model2Relation2')
                .unrelate();
            })
            .then(() => {
              return session.knex('Model1Model2One');
            })
            .then(rows => {
              expect(rows).to.have.length(1);
              expect(_.filter(rows, {model2Id: 1, model1Id: 5})).to.have.length(1);
            });
        });

      });

    });

  });
};
