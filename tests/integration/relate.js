const _ = require('lodash');
const expect = require('expect.js');
const chai = require('chai');

module.exports = session => {
  let Model1 = session.models.Model1;
  let Model2 = session.models.Model2;

  describe('Model relate queries', () => {
    describe('.$query()', () => {
      it('should reject the query because relate makes no sense in this context', done => {
        Model1.fromJson({ id: 1 })
          .$query()
          .relate(1)
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(() => {
            done();
          });
      });
    });

    describe('.$relatedQuery().relate()', () => {
      describe('belongs to one relation', () => {
        let model1;
        let model2;

        beforeEach(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1'
            },
            {
              id: 2,
              model1Prop1: 'hello 3'
            },
            {
              id: 3,
              model1Prop1: 'hello 4'
            }
          ]);
        });

        beforeEach(async () => {
          model1 = await Model1.query().findById(1);
          model2 = await Model1.query().findById(2);
        });

        it('should relate', () => {
          return model1
            .$relatedQuery('model1Relation1')
            .relate(model2.id)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1Id).to.equal(model2.id);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(null);
            });
        });

        it('should relate multiple', () => {
          return model1
            .$relatedQuery('model1Relation1')
            .relate([model2.id])
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1Id).to.equal(model2.id);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(null);
            });
        });

        it('should relate (object value)', () => {
          return model1
            .$relatedQuery('model1Relation1')
            .relate({ id: model2.id })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1Id).to.equal(model2.id);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(null);
            });
        });

        it('should relate (model value)', () => {
          return model1
            .$relatedQuery('model1Relation1')
            .relate(model2)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1Id).to.equal(model2.id);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(null);
            });
        });

        it('should fail with invalid object value)', done => {
          model1
            .$relatedQuery('model1Relation1')
            .relate({ wrongId: model2.id })
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch(() => {
              return session
                .knex(Model1.getTableName())
                .orderBy('id')
                .then(rows => {
                  expect(rows).to.have.length(3);
                  expect(rows[0].model1Id).to.equal(null);
                  expect(rows[1].model1Id).to.equal(null);
                  expect(rows[2].model1Id).to.equal(null);
                  done();
                });
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
                  model2Prop2: 6
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 2,
                  model2Prop1: 'text 4',
                  model2Prop2: 3
                }
              ]
            },
            {
              id: 3,
              model1Prop1: 'hello 3',
              model1Relation2: [
                {
                  idCol: 3,
                  model2Prop1: 'text 5',
                  model2Prop2: 2
                }
              ]
            }
          ]);
        });

        it('should relate', () => {
          return Model1.query()
            .where('id', 1)
            .first()
            .then(model => {
              return model.$relatedQuery('model1Relation2').relate(2);
            })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1_id).to.equal(1);
              expect(rows[1].model1_id).to.equal(1);
              expect(rows[2].model1_id).to.equal(3);
            });
        });

        it('should relate (multiple values)', () => {
          return Model1.query()
            .where('id', 1)
            .first()
            .then(model => {
              return model.$relatedQuery('model1Relation2').relate([2, 3]);
            })
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1_id).to.equal(1);
              expect(rows[1].model1_id).to.equal(1);
              expect(rows[2].model1_id).to.equal(1);
            });
        });

        it('should relate (object value)', () => {
          return Model1.query()
            .where('id', 1)
            .first()
            .then(model => {
              return model.$relatedQuery('model1Relation2').relate({ idCol: 2 });
            })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1_id).to.equal(1);
              expect(rows[1].model1_id).to.equal(1);
              expect(rows[2].model1_id).to.equal(3);
            });
        });

        it('should relate (multiple object values)', () => {
          return Model1.query()
            .where('id', 1)
            .first()
            .then(model => {
              return model.$relatedQuery('model1Relation2').relate([{ idCol: 2 }, { idCol: 3 }]);
            })
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1_id).to.equal(1);
              expect(rows[1].model1_id).to.equal(1);
              expect(rows[2].model1_id).to.equal(1);
            });
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
                      model1Prop2: 6
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
                      id: 4,
                      model1Prop1: 'blaa 2',
                      model1Prop2: 3
                    },
                    {
                      id: 5,
                      model1Prop1: 'blaa 3',
                      model1Prop2: 2
                    },
                    {
                      id: 6,
                      model1Prop1: 'blaa 4',
                      model1Prop2: 1
                    }
                  ]
                }
              ]
            }
          ]);
        });

        it('should relate', () => {
          return Model2.query()
            .where('id_col', 1)
            .first()
            .then(model => {
              return model.$relatedQuery('model2Relation1').relate(5);
            })
            .then(res => {
              expect(res).to.equal(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              expect(_.filter(rows, { model2Id: 1, model1Id: 3 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 1, model1Id: 5 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 4 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 5 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 6 })).to.have.length(1);
            });
        });

        if (session.isPostgres()) {
          it('should relate (multiple values)', () => {
            return Model2.query()
              .where('id_col', 1)
              .first()
              .then(model => {
                return model.$relatedQuery('model2Relation1').relate([5, 6]);
              })
              .then(res => {
                expect(res).to.equal(2);
                return session.knex('Model1Model2').orderBy('id');
              })
              .then(rows => {
                expect(rows).to.have.length(6);
                expect(_.filter(rows, { model2Id: 1, model1Id: 3 })).to.have.length(1);
                expect(_.filter(rows, { model2Id: 1, model1Id: 5 })).to.have.length(1);
                expect(_.filter(rows, { model2Id: 1, model1Id: 6 })).to.have.length(1);
                expect(_.filter(rows, { model2Id: 2, model1Id: 4 })).to.have.length(1);
                expect(_.filter(rows, { model2Id: 2, model1Id: 5 })).to.have.length(1);
                expect(_.filter(rows, { model2Id: 2, model1Id: 6 })).to.have.length(1);
              });
          });
        }

        it('should relate (object value)', () => {
          return Model2.query()
            .where('id_col', 1)
            .first()
            .then(model => {
              return model.$relatedQuery('model2Relation1').relate({ id: 5 });
            })
            .then(res => {
              expect(res).to.equal(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              expect(_.filter(rows, { model2Id: 1, model1Id: 3 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 1, model1Id: 5 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 4 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 5 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 6 })).to.have.length(1);
            });
        });

        it('should relate with extra properties', () => {
          return Model2.query()
            .where('id_col', 1)
            .first()
            .then(model => {
              return model
                .$relatedQuery('model2Relation1')
                .relate({ id: 5, aliasedExtra: 'foobar' });
            })
            .then(res => {
              expect(res).to.equal(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              expect(_.filter(rows, { model2Id: 1, model1Id: 3 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 1, model1Id: 5, extra3: 'foobar' })).to.have.length(
                1
              );
              expect(_.filter(rows, { model2Id: 2, model1Id: 4 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 5 })).to.have.length(1);
              expect(_.filter(rows, { model2Id: 2, model1Id: 6 })).to.have.length(1);
            });
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
                  model2Relation2: null
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'hello 2'
            }
          ]);
        });

        it('should relate', () => {
          return Model2.query()
            .where('id_col', 1)
            .first()
            .then(model => {
              return model.$relatedQuery('model2Relation2').relate(2);
            })
            .then(res => {
              expect(res).to.equal(1);
              return session.knex('Model1Model2One');
            })
            .then(rows => {
              expect(rows).to.have.length(1);
              expect(_.filter(rows, { model2Id: 1, model1Id: 2 })).to.have.length(1);
            });
        });
      });
    });

    describe('.relatedQuery().relate()', () => {
      describe('belongs to one relation', () => {
        beforeEach(() => {
          return session.populate([
            {
              id: 1,
              model1Prop1: 'hello 1'
            },
            {
              id: 2,
              model1Prop1: 'hello 3'
            },
            {
              id: 3,
              model1Prop1: 'hello 4'
            }
          ]);
        });

        it('should relate', () => {
          return Model1.relatedQuery('model1Relation1')
            .for(1)
            .relate(2)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1Id).to.equal(2);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(null);
            });
        });

        it('should relate (object value)', () => {
          return Model1.relatedQuery('model1Relation1')
            .for(1)
            .relate({ id: 2 })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1Id).to.equal(2);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(null);
            });
        });

        it('should relate for multiple parents', () => {
          return Model1.relatedQuery('model1Relation1')
            .for([1, 3])
            .relate(2)
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1Id).to.equal(2);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(2);
            });
        });

        it('should relate for multiple parents using a subquery', () => {
          return Model1.relatedQuery('model1Relation1')
            .for(Model1.query().findByIds([1, 3]))
            .relate(2)
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model1.getTableName()).orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(3);
              expect(rows[0].model1Id).to.equal(2);
              expect(rows[1].model1Id).to.equal(null);
              expect(rows[2].model1Id).to.equal(2);
            });
        });

        it('should fail with invalid object value)', done => {
          Model1.relatedQuery('model1Relation1')
            .for(1)
            .relate({ wrongId: 2 })
            .then(() => {
              done(new Error('should not get here'));
            })
            .catch(() => {
              return session
                .knex(Model1.getTableName())
                .orderBy('id')
                .then(rows => {
                  expect(rows).to.have.length(3);
                  expect(rows[0].model1Id).to.equal(null);
                  expect(rows[1].model1Id).to.equal(null);
                  expect(rows[2].model1Id).to.equal(null);
                  done();
                });
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
                  model2Prop2: 6
                },
                {
                  idCol: 2,
                  model2Prop1: 'text 2',
                  model2Prop2: 5
                }
              ]
            },
            {
              id: 2,
              model1Prop1: 'hello 2',
              model1Relation2: [
                {
                  idCol: 3,
                  model2Prop1: 'text 3',
                  model2Prop2: 4
                },
                {
                  idCol: 4,
                  model2Prop1: 'text 4',
                  model2Prop2: 3
                }
              ]
            },
            {
              id: 3,
              model1Prop1: 'hello 3',
              model1Relation2: [
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

        it('should relate', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(1)
            .relate(3)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('model2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: 1 },
                { id_col: 3, model1_id: 1 },
                { id_col: 4, model1_id: 2 },
                { id_col: 5, model1_id: 3 },
                { id_col: 6, model1_id: 3 }
              ]);
            });
        });

        it('should relate using a subquery', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(Model1.query().findByIds(1))
            .relate(3)
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('model2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: 1 },
                { id_col: 3, model1_id: 1 },
                { id_col: 4, model1_id: 2 },
                { id_col: 5, model1_id: 3 },
                { id_col: 6, model1_id: 3 }
              ]);
            });
        });

        it('should fail with multiple values', done => {
          Model1.relatedQuery('model1Relation2')
            .for([1, 2])
            .relate(3)
            .then(() => {
              throw new Error('should not get here');
            })
            .catch(err => {
              expect(err.message).to.equal(
                "Can only relate items for one parent at a time in case of HasManyRelation. Otherwise multiple update queries would need to be created. If you need to relate items for multiple parents, simply loop through them. That's the most performant way."
              );
              done();
            })
            .catch(done);
        });

        it('should relate (multiple values)', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(1)
            .relate([3, 5])
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: 1 },
                { id_col: 3, model1_id: 1 },
                { id_col: 4, model1_id: 2 },
                { id_col: 5, model1_id: 1 },
                { id_col: 6, model1_id: 3 }
              ]);
            });
        });

        it('should relate (object value)', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(1)
            .relate({ idCol: 3 })
            .then(numUpdated => {
              expect(numUpdated).to.equal(1);
              return session.knex('model2').orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: 1 },
                { id_col: 3, model1_id: 1 },
                { id_col: 4, model1_id: 2 },
                { id_col: 5, model1_id: 3 },
                { id_col: 6, model1_id: 3 }
              ]);
            });
        });

        it('should relate (multiple object values)', () => {
          return Model1.relatedQuery('model1Relation2')
            .for(1)
            .relate([{ idCol: 3 }, { idCol: 5 }])
            .then(numUpdated => {
              expect(numUpdated).to.equal(2);
              return session.knex(Model2.getTableName()).orderBy('id_col');
            })
            .then(rows => {
              expect(rows).to.have.length(6);
              chai.expect(rows).containSubset([
                { id_col: 1, model1_id: 1 },
                { id_col: 2, model1_id: 1 },
                { id_col: 3, model1_id: 1 },
                { id_col: 4, model1_id: 2 },
                { id_col: 5, model1_id: 1 },
                { id_col: 6, model1_id: 3 }
              ]);
            });
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
                      model1Prop2: 6
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
                      id: 4,
                      model1Prop1: 'blaa 2',
                      model1Prop2: 3
                    },
                    {
                      id: 5,
                      model1Prop1: 'blaa 3',
                      model1Prop2: 2
                    },
                    {
                      id: 6,
                      model1Prop1: 'blaa 4',
                      model1Prop2: 1
                    }
                  ]
                }
              ]
            }
          ]);
        });

        it('should relate using one parent id', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(1)
            .relate(5)
            .then(res => {
              expect(res).to.equal(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              chai.expect(rows).to.containSubset([
                { model2Id: 1, model1Id: 3 },
                { model2Id: 1, model1Id: 5 },
                { model2Id: 2, model1Id: 4 },
                { model2Id: 2, model1Id: 5 },
                { model2Id: 2, model1Id: 6 }
              ]);
            });
        });

        it('should relate using a subquery', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(Model2.query().findById(1))
            .relate(5)
            .then(res => {
              expect(res).to.equal(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              chai.expect(rows).to.containSubset([
                { model2Id: 1, model1Id: 3 },
                { model2Id: 1, model1Id: 5 },
                { model2Id: 2, model1Id: 4 },
                { model2Id: 2, model1Id: 5 },
                { model2Id: 2, model1Id: 6 }
              ]);
            });
        });

        if (session.isPostgres()) {
          it('should relate multiple values', () => {
            return Model2.relatedQuery('model2Relation1')
              .for(1)
              .relate([5, 6])
              .then(res => {
                expect(res).to.equal(2);
                return session.knex('Model1Model2').orderBy('id');
              })
              .then(rows => {
                expect(rows).to.have.length(6);
                chai.expect(rows).to.containSubset([
                  { model2Id: 1, model1Id: 3 },
                  { model2Id: 1, model1Id: 5 },
                  { model2Id: 1, model1Id: 6 },
                  { model2Id: 2, model1Id: 4 },
                  { model2Id: 2, model1Id: 5 },
                  { model2Id: 2, model1Id: 6 }
                ]);
              });
          });

          it('should relate multiple values using a subquery', () => {
            return Model2.relatedQuery('model2Relation1')
              .for(Model2.query().findById(1))
              .relate([5, 6])
              .then(() => {
                return session.knex('Model1Model2').orderBy('id');
              })
              .then(rows => {
                expect(rows).to.have.length(6);
                chai.expect(rows).to.containSubset([
                  { model2Id: 1, model1Id: 3 },
                  { model2Id: 1, model1Id: 5 },
                  { model2Id: 1, model1Id: 6 },
                  { model2Id: 2, model1Id: 4 },
                  { model2Id: 2, model1Id: 5 },
                  { model2Id: 2, model1Id: 6 }
                ]);
              });
          });

          it('should relate multiple values for multiple parents', () => {
            return Model2.relatedQuery('model2Relation1')
              .for([1, 2])
              .relate([1, 2])
              .then(() => {
                return session.knex('Model1Model2').orderBy('id');
              })
              .then(rows => {
                expect(rows).to.have.length(8);
                chai.expect(rows).to.containSubset([
                  { model2Id: 1, model1Id: 1 },
                  { model2Id: 1, model1Id: 2 },
                  { model2Id: 1, model1Id: 3 },
                  { model2Id: 2, model1Id: 1 },
                  { model2Id: 2, model1Id: 2 },
                  { model2Id: 2, model1Id: 4 },
                  { model2Id: 2, model1Id: 5 },
                  { model2Id: 2, model1Id: 6 }
                ]);
              });
          });
        }

        it('should relate (object value)', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(1)
            .relate({ id: 5 })
            .then(res => {
              expect(res).to.eql(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              chai.expect(rows).to.containSubset([
                { model2Id: 1, model1Id: 3 },
                { model2Id: 1, model1Id: 5 },
                { model2Id: 2, model1Id: 4 },
                { model2Id: 2, model1Id: 5 },
                { model2Id: 2, model1Id: 6 }
              ]);
            });
        });

        it('should relate with extra properties', () => {
          return Model2.relatedQuery('model2Relation1')
            .for(1)
            .relate({ id: 5, aliasedExtra: 'foobar' })
            .then(res => {
              expect(res).to.eql(1);
              return session.knex('Model1Model2').orderBy('id');
            })
            .then(rows => {
              expect(rows).to.have.length(5);
              chai.expect(rows).to.containSubset([
                { model2Id: 1, model1Id: 3 },
                { model2Id: 1, model1Id: 5, extra3: 'foobar' },
                { model2Id: 2, model1Id: 4 },
                { model2Id: 2, model1Id: 5 },
                { model2Id: 2, model1Id: 6 }
              ]);
            });
        });
      });
    });
  });
};
