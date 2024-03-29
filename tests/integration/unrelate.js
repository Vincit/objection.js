const _ = require('lodash');
const expect = require('expect.js');
const chai = require('chai');

module.exports = (session) => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('Model unrelate queries', () => {
    describe('.$query()', () => {
      it('should reject the query', (done) => {
        Model1.fromJson({ id: 1 })
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
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',

              model1Relation1: {
                id: 2,
                model1Prop1: 'hello 2',
              },
            },
            {
              id: 3,
              model1Prop1: 'hello 3',

              model1Relation1: {
                id: 4,
                model1Prop1: 'hello 4',
              },

              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'foo',
                },
              ],
            },
          ]);
        });

        it('should unrelate', () => {
          return Model1.query()
            .findById(1)
            .then((model) => {
              return model.$relatedQuery('model1Relation1').unrelate();
            })
            .then((numUpdated) => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              expect(rows[0].model1Id).to.equal(null);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(4);
              expect(rows[3].model1Id).to.equal(null);
            });
        });

        it('should fail if arguments are given', (done) => {
          Model1.query()
            .findById(1)
            .then((model) => {
              return model.$relatedQuery('model1Relation1').unrelate(1);
            })
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch((err) => {
              expect(err.message).to.equal(
                `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`,
              );
              done();
            })
            .catch(done);
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
                {
                  idCol: 2,
                  model2Prop1: 'text 2',
                  model2Prop2: 5,
                },
                {
                  idCol: 3,
                  model2Prop1: 'text 3',
                  model2Prop2: 4,
                },
              ],
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 4,
                  model2Prop1: 'text 4',
                  model2Prop2: 3,
                },
              ],
            },
          ]);
        });

        it('should unrelate', () => {
          return Model1.query()
            .where('id', 1)
            .first()
            .then((model) => {
              return model.$relatedQuery('model1Relation2').unrelate().where('id_col', 2);
            })
            .then((numUpdated) => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              expect(rows[0].model1_id).to.equal(1);
              expect(rows[1].model1_id).to.equal(null);
              expect(rows[2].model1_id).to.equal(1);
              expect(rows[3].model1_id).to.equal(2);
            });
        });

        it('should unrelate multiple', () => {
          return Model1.query()
            .where('id', 1)
            .first()
            .then((model) => {
              return model.$relatedQuery('model1Relation2').unrelate().where('id_col', '>', 1);
            })
            .then((numUpdated) => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              expect(rows[0].model1_id).to.equal(1);
              expect(rows[1].model1_id).to.equal(null);
              expect(rows[2].model1_id).to.equal(null);
              expect(rows[3].model1_id).to.equal(2);
            });
        });

        it('should fail if arguments are given', (done) => {
          Model1.query()
            .findById(1)
            .then((model) => {
              return model.$relatedQuery('model1Relation2').unrelate([1, 2]);
            })
            .then((numUpdated) => {
              done(new Error('should not get here'));
            })
            .catch((err) => {
              expect(err.message).to.equal(
                `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`,
              );
              done();
            })
            .catch(done);
        });
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
                    {
                      id: 4,
                      model1Prop1: 'blaa 2',
                      model1Prop2: 5,
                    },
                    {
                      id: 5,
                      model1Prop1: 'blaa 3',
                      model1Prop2: 4,
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
                      id: 6,
                      model1Prop1: 'blaa 4',
                      model1Prop2: 3,
                    },
                  ],
                },
              ],
            },
          ]);
        });

        it('should unrelate', () => {
          return Model2.query()
            .where('id_col', 1)
            .first()
            .then((model) => {
              return model.$relatedQuery('model2Relation1').unrelate().where('Model1.id', 4);
            })
            .then((numDeleted) => {
              expect(numDeleted).to.equal(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              expect(_.filter(rows, { model2Id: 1, model1Id: 3 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 1, model1Id: 4 })).to.have.length(0);
              expect(_.filter(rows, { model2Id: 1, model1Id: 5 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 6 })).to.have.length(1);
            });
        });

        it('should unrelate multiple', () => {
          return Model2.query()
            .findById(1)
            .then((model) => {
              return model
                .$relatedQuery('model2Relation1')
                .unrelate()
                .where('model1Prop1', '>', 'blaa 1');
            })
            .then((numDeleted) => {
              expect(numDeleted).to.equal(2);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(2);
              expect(_.filter(rows, { model2Id: 1, model1Id: 3 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 1, model1Id: 4 })).to.have.length(0);
              expect(_.filter(rows, { model2Id: 1, model1Id: 5 })).to.have.length(0);
              expect(_.filter(rows, { model2Id: 2, model1Id: 6 })).to.have.length(1);
            });
        });

        it('should fail if arguments are given', (done) => {
          Model2.query()
            .findById(1)
            .then((model) => {
              return model.$relatedQuery('model2Relation1').unrelate([1, 2]);
            })
            .then((numUpdated) => {
              done(new Error('should not get here'));
            })
            .catch((err) => {
              expect(err.message).to.equal(
                `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`,
              );
              done();
            })
            .catch(done);
        });
      });

      describe('has one through relation', () => {
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
                    id: 5,
                    model1Prop1: 'blaa 3',
                    model1Prop2: 4,
                  },
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

                  model2Relation2: {
                    id: 6,
                    model1Prop1: 'blaa 4',
                    model1Prop2: 5,
                  },

                  model2Relation1: [
                    {
                      id: 7,
                      model1Prop1: 'blaa 5',
                      model1Prop2: 4,
                    },
                  ],
                },
              ],
            },
          ]);
        });

        it('should unrelate', () => {
          return Model2.query()
            .where('id_col', 2)
            .first()
            .then((model) => {
              return model.$relatedQuery('model2Relation2').unrelate();
            })
            .then((numDeleted) => {
              expect(numDeleted).to.equal(1);
              return session.knex('Model1Model2One');
            })
            .then((rows) => {
              expect(rows).to.have.length(1);
              expect(_.filter(rows, { model2Id: 1, model1Id: 5 })).to.have.length(1);
            });
        });
      });
    });

    describe('.relatedQuery().unrelate()', () => {
      describe('belongs to one relation', () => {
        beforeEach(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1',

              model1Relation1: {
                id: 2,
                model1Prop1: 'hello 2',
              },
            },
            {
              id: 3,
              model1Prop1: 'hello 3',

              model1Relation1: {
                id: 4,
                model1Prop1: 'hello 4',
              },

              model1Relation2: [
                {
                  idCol: 1,
                  model2Prop1: 'foo',
                },
              ],
            },
          ]);
        });

        it('should unrelate using one id', () => {
          return Model1.relatedQuery('model1Relation1')
            .for(1)
            .unrelate()
            .then((numUpdated) => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              chai.expect(rows).containSubset([
                { id: 1, model1Id: null },
                { id: 2, model1Id: null },
                { id: 3, model1Id: 4 },
                { id: 4, model1Id: null },
              ]);
            });
        });

        it('should unrelate using multiple ids', () => {
          return Model1.relatedQuery('model1Relation1')
            .for([1, 3])
            .unrelate()
            .then((numUpdated) => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              chai.expect(rows).containSubset([
                { id: 1, model1Id: null },
                { id: 2, model1Id: null },
                { id: 3, model1Id: null },
                { id: 4, model1Id: null },
              ]);
            });
        });

        it('should unrelate using subquery', () => {
          return Model1.relatedQuery('model1Relation1')
            .for(Model1.query().findByIds([1, 3]))
            .unrelate()
            .then((numUpdated) => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              chai.expect(rows).containSubset([
                { id: 1, model1Id: null },
                { id: 2, model1Id: null },
                { id: 3, model1Id: null },
                { id: 4, model1Id: null },
              ]);
            });
        });

        // Filters don't work on mysql when the related table and the
        // owner table are the same.
        if (!session.isMySql()) {
          it('should unrelate using multiple ids and a filter', () => {
            return Model1.relatedQuery('model1Relation1')
              .for([1, 3])
              .unrelate()
              .where('model1Prop1', '!=', 'hello 2')
              .then((numUpdated) => {
                expect(numUpdated).to.equal(1);
                return session.knex(Model1.getTableName()).orderBy('id');
              })
              .then((rows) => {
                expect(rows).to.have.length(4);
                chai.expect(rows).containSubset([
                  { id: 1, model1Id: 2 },
                  { id: 2, model1Id: null },
                  { id: 3, model1Id: null },
                  { id: 4, model1Id: null },
                ]);
              });
          });
        }

        it('should fail if arguments are given', (done) => {
          Model1.relatedQuery('model1Relation1')
            .for(1)
            .unrelate(1)
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch((err) => {
              expect(err.message).to.equal(
                `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`,
              );
              done();
            })
            .catch(done);
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
                {
                  idCol: 2,
                  model2Prop1: 'text 2',
                  model2Prop2: 5,
                },
                {
                  idCol: 3,
                  model2Prop1: 'text 3',
                  model2Prop2: 4,
                },
              ],
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 4,
                  model2Prop1: 'text 4',
                  model2Prop2: 3,
                },
              ],
            },
          ]);
        });

        it('should unrelate for one parent', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(1)
            .unrelate()
            .whereIn('id_col', [2, 4])
            .then((numUpdated) => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: null },
                { id_col: 3, model1_id: 1 },
                { id_col: 4, model1_id: 2 },
              ]);
            });
        });

        it('should unrelate for one parent using a subquery', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(Model1.query().findById(1))
            .unrelate()
            .whereIn('id_col', [2, 4])
            .then((numUpdated) => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: null },
                { id_col: 3, model1_id: 1 },
                { id_col: 4, model1_id: 2 },
              ]);
            });
        });

        it('should unrelate for two parents', () => {
          return Model1.relatedQuery('model1Relation2')
            .for([1, 2])
            .unrelate()
            .whereIn('id_col', [2, 4])
            .then((numUpdated) => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: null },
                { id_col: 3, model1_id: 1 },
                { id_col: 4, model1_id: null },
              ]);
            });
        });

        it('should unrelate multiple', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(1)
            .unrelate()
            .where('id_col', '>', 1)
            .then((numUpdated) => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then((rows) => {
              expect(rows).to.have.length(4);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: null },
                { id_col: 3, model1_id: null },
                { id_col: 4, model1_id: 2 },
              ]);
            });
        });

        it('should fail if arguments are given', (done) => {
          Model1.relatedQuery('model1Relation2')
            .for(1)
            .unrelate([1, 2])
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch((err) => {
              expect(err.message).to.equal(
                `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`,
              );
              done();
            })
            .catch(done);
        });
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
                    {
                      id: 4,
                      model1Prop1: 'blaa 2',
                      model1Prop2: 5,
                    },
                    {
                      id: 5,
                      model1Prop1: 'blaa 3',
                      model1Prop2: 4,
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
                      id: 6,
                      model1Prop1: 'blaa 4',
                      model1Prop2: 3,
                    },
                  ],
                },
              ],
            },
          ]);
        });

        it('should unrelate using one parent id', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(1)
            .unrelate()
            .whereIn('Model1.id', [4, 6])
            .then((numDeleted) => {
              expect(numDeleted).to.equal(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(3);
              chai.expect(rows).containSubset([
                { model2Id: 1, model1Id: 3 },
                { model2Id: 1, model1Id: 5 },
                { model2Id: 2, model1Id: 6 },
              ]);
            });
        });

        it('should unrelate using two parent ids', () => {
          return Model2.relatedQuery('model2Relation1')
            .for([1, 2])
            .unrelate()
            .whereIn('Model1.id', [4, 6])
            .then((numDeleted) => {
              expect(numDeleted).to.equal(2);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(2);
              chai.expect(rows).containSubset([
                { model2Id: 1, model1Id: 3 },
                { model2Id: 1, model1Id: 5 },
              ]);
            });
        });

        it('should unrelate using two parents and a subquery', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(Model2.query().findByIds([1, 2]))
            .unrelate()
            .whereIn('Model1.id', [4, 6])
            .then((numDeleted) => {
              expect(numDeleted).to.equal(2);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(2);
              chai.expect(rows).containSubset([
                { model2Id: 1, model1Id: 3 },
                { model2Id: 1, model1Id: 5 },
              ]);
            });
        });

        it('should unrelate multiple', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(1)
            .unrelate()
            .where('model1Prop1', '>', 'blaa 1')
            .then((numDeleted) => {
              expect(numDeleted).to.equal(2);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then((rows) => {
              expect(rows).to.have.length(2);
              expect(_.filter(rows, { model2Id: 1, model1Id: 3 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 1, model1Id: 4 })).to.have.length(0);
              expect(_.filter(rows, { model2Id: 1, model1Id: 5 })).to.have.length(0);
              expect(_.filter(rows, { model2Id: 2, model1Id: 6 })).to.have.length(1);
            });
        });

        it('should fail if arguments are given', (done) => {
          Model2.query()
            .findById(1)
            .then((model) => {
              return model.$relatedQuery('model2Relation1').unrelate([1, 2]);
            })
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch((err) => {
              expect(err.message).to.equal(
                `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`,
              );
              done();
            })
            .catch(done);
        });
      });
    });
  });
};
