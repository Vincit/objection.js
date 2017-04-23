'use strict';

const _ = require('lodash');
const expect = require('expect.js');
const expectPartEql = require('./../../testUtils/testUtils').expectPartialEqual;

module.exports = (session) => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('Model delete queries', () => {

    describe('.query().delete()', () => {

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

      it('should delete a model (1)', () => {
        return Model1
          .query()
          .delete()
          .where('id', '=', 2)
          .then(numDeleted => {
            expect(numDeleted).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(2);
            expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
            expectPartEql(rows[1], {id: 3, model1Prop1: 'hello 3'});
          });
      });

      it('should delete a model (2)', () => {
        return Model2
          .query()
          .del()
          .where('model_2_prop_2', 1)
          .then(numDeleted => {
            expect(numDeleted).to.equal(1);
            return session.knex('model_2').orderBy('id_col');
          })
          .then(rows => {
            expect(rows).to.have.length(1);
            expectPartEql(rows[0], {id_col: 1, model_2_prop_1: 'text 1', model_2_prop_2: 2});
          });
      });

      it('should delete multiple', () => {
        return Model1
          .query()
          .delete()
          .where('model1Prop1', '<', 'hello 3')
          .then(numDeleted => {
            expect(numDeleted).to.equal(2);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(1);
            expectPartEql(rows[0], {id: 3, model1Prop1: 'hello 3'});
          });
      });

    });

    describe('.$query().delete()', () => {

      beforeEach(() => {
        return session.populate([{
          id: 1,
          model1Prop1: 'hello 1'
        }, {
          id: 2,
          model1Prop1: 'hello 2'
        }]);
      });

      it('should delete a model', () => {
        let model = Model1.fromJson({id: 1});

        return model
          .$query()
          .delete()
          .then(numDeleted => {
            expect(numDeleted).to.equal(1);
            expect(model.$beforeDeleteCalled).to.equal(1);
            expect(model.$afterDeleteCalled).to.equal(1);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(1);
            expectPartEql(rows[0], {id: 2, model1Prop1: 'hello 2'});
          });
      });

      it('should should call $beforeDelete and $afterDelete hooks', () => {
        let model = Model1.fromJson({id: 1});

        model.$beforeDelete = function () {
          let self = this;
          return Model1.query().findById(this.id).then(model => {
            self.before = model;
          });
        };

        model.$afterDelete = function () {
          let self = this;
          return Model1.query().findById(this.id).then(model => {
            self.after = model || null;
          });
        };

        return model
          .$query()
          .delete()
          .then(() => {
            expect(model.before.id).to.equal(model.id);
            expect(model.after).to.equal(null);
            return session.knex('Model1').orderBy('id');
          })
          .then(rows => {
            expect(rows).to.have.length(1);
            expectPartEql(rows[0], {id: 2, model1Prop1: 'hello 2'});
          });
      });

    });

    describe('.$relatedQuery().delete()', () => {

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

        it('should delete a related object (1)', () => {
          return parent1
            .$relatedQuery('model1Relation1')
            .delete()
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              return session.knex('Model1').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 3, model1Prop1: 'hello 3'});
              expectPartEql(rows[2], {id: 4, model1Prop1: 'hello 4'});
            });
        });

        it('should delete a related object (2)', () => {
          return parent2
            .$relatedQuery('model1Relation1')
            .delete()
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
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

        it('should delete all related objects', () => {
          return parent1
            .$relatedQuery('model1Relation2')
            .delete()
            .then(numDeleted => {
              expect(numDeleted).to.equal(3);
              return session.knex('model_2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expectPartEql(rows[0], {id_col: 4, model_2_prop_1: 'text 4'});
              expectPartEql(rows[1], {id_col: 5, model_2_prop_1: 'text 5'});
              expectPartEql(rows[2], {id_col: 6, model_2_prop_1: 'text 6'});
            });
        });

        it('should delete a related object', () => {
          return parent1
            .$relatedQuery('model1Relation2')
            .delete()
            .where('id_col', 2)
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              return session.knex('model_2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              expectPartEql(rows[0], {id_col: 1, model_2_prop_1: 'text 1'});
              expectPartEql(rows[1], {id_col: 3, model_2_prop_1: 'text 3'});
              expectPartEql(rows[2], {id_col: 4, model_2_prop_1: 'text 4'});
              expectPartEql(rows[3], {id_col: 5, model_2_prop_1: 'text 5'});
              expectPartEql(rows[4], {id_col: 6, model_2_prop_1: 'text 6'});
            });
        });

        it('should delete multiple related objects', () => {
          return parent1
            .$relatedQuery('model1Relation2')
            .delete()
            .where('model_2_prop_2', '<', 6)
            .where('model_2_prop_1', 'like', 'text %')
            .then(numDeleted => {
              expect(numDeleted).to.equal(2);
              return session.knex('model_2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(4);
              expectPartEql(rows[0], {id_col: 1, model_2_prop_1: 'text 1'});
              expectPartEql(rows[1], {id_col: 4, model_2_prop_1: 'text 4'});
              expectPartEql(rows[2], {id_col: 5, model_2_prop_1: 'text 5'});
              expectPartEql(rows[3], {id_col: 6, model_2_prop_1: 'text 6'});
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

        it('should delete all related objects', () => {
          return parent1
            .$relatedQuery('model2Relation1')
            .delete()
            .then(numDeleted => {
              expect(numDeleted).to.equal(3);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 6, model1Prop1: 'blaa 4'});
              expectPartEql(rows[3], {id: 7, model1Prop1: 'blaa 5'});
              expectPartEql(rows[4], {id: 8, model1Prop1: 'blaa 6'});
            });
        });

        it('should delete a related object', () => {
          return parent1
            .$relatedQuery('model2Relation1')
            .delete()
            .where('Model1.id', 5)
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(7);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'blaa 1'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'blaa 2'});
              expectPartEql(rows[4], {id: 6, model1Prop1: 'blaa 4'});
              expectPartEql(rows[5], {id: 7, model1Prop1: 'blaa 5'});
              expectPartEql(rows[6], {id: 8, model1Prop1: 'blaa 6'});
            });
        });

        it('should delete multiple objects (1)', () => {
          return parent2
            .$relatedQuery('model2Relation1')
            .delete()
            .where('model1Prop1', 'like', 'blaa 4')
            .orWhere('model1Prop1', 'like', 'blaa 6')
            .then(numDeleted => {
              expect(numDeleted).to.equal(2);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'blaa 1'});
              expectPartEql(rows[3], {id: 4, model1Prop1: 'blaa 2'});
              expectPartEql(rows[4], {id: 5, model1Prop1: 'blaa 3'});
              expectPartEql(rows[5], {id: 7, model1Prop1: 'blaa 5'});
            });
        });

        it('should delete multiple objects (2)', () => {
          return parent1
            .$relatedQuery('model2Relation1')
            .delete()
            .where('model1Prop2', '<', 6)
            .then(numDeleted => {
              expect(numDeleted).to.equal(2);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'blaa 1'});
              expectPartEql(rows[3], {id: 6, model1Prop1: 'blaa 4'});
              expectPartEql(rows[4], {id: 7, model1Prop1: 'blaa 5'});
              expectPartEql(rows[5], {id: 8, model1Prop1: 'blaa 6'});
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
                model1Prop2: 1
              }
            }]
          }, {
            id: 2,
            model1Prop1: 'hello 2',
            model1Relation2: [{
              idCol: 2,
              model2Prop1: 'text 2',
              model2Relation2: {
                id: 4,
                model1Prop1: 'blaa 2',
                model1Prop2: 2
              }
            }]
          }]);
        });

        beforeEach(() => {
          return Model2
            .query()
            .then(parents => {
              parent = _.find(parents, {idCol: 2});
            });
        });

        it('should delete the related object', () => {
          return parent
            .$relatedQuery('model2Relation2')
            .delete()
            .then(numDeleted => {
              expect(numDeleted).to.equal(1);
              return session.knex('Model1').orderBy('Model1.id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expectPartEql(rows[0], {id: 1, model1Prop1: 'hello 1'});
              expectPartEql(rows[1], {id: 2, model1Prop1: 'hello 2'});
              expectPartEql(rows[2], {id: 3, model1Prop1: 'blaa 1'});
            });
        });

      });

    });

  });
};
