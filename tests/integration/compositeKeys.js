const _ = require('lodash');
const Model = require('../../').Model;
const expect = require('expect.js');
const Promise = require('bluebird');

module.exports = session => {
  describe('Composite keys', () => {
    let A;
    let B;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('A_B')
        .dropTableIfExists('A')
        .dropTableIfExists('B')
        .createTable('A', table => {
          table.integer('id1');
          table.string('id2');
          table.string('aval');
          table.integer('bid3');
          table.string('bid4');
          table.primary(['id1', 'id2']);
        })
        .createTable('B', table => {
          table.integer('id3');
          table.string('id4');
          table.string('bval');
          table.primary(['id3', 'id4']);
        })
        .createTable('A_B', table => {
          table.integer('aid1');
          table.string('aid2');
          table.integer('bid3');
          table.string('bid4');
        });
    });

    after(() => {
      return session.knex.schema
        .dropTableIfExists('A_B')
        .dropTableIfExists('A')
        .dropTableIfExists('B');
    });

    before(() => {
      class ModelA extends Model {
        static get tableName() {
          return 'A';
        }

        static get idColumn() {
          return ['id1', 'id2'];
        }

        static get relationMappings() {
          return {
            b: {
              relation: Model.BelongsToOneRelation,
              modelClass: ModelB,
              join: {
                from: ['A.bid3', 'A.bid4'],
                to: ['B.id3', 'B.id4']
              }
            },
            ba: {
              relation: Model.ManyToManyRelation,
              modelClass: ModelB,
              join: {
                from: ['A.id1', 'A.id2'],
                through: {
                  from: ['A_B.aid1', 'A_B.aid2'],
                  to: ['A_B.bid3', 'A_B.bid4']
                },
                to: ['B.id3', 'B.id4']
              }
            }
          };
        }
      }

      class ModelB extends Model {
        static get tableName() {
          return 'B';
        }

        static get idColumn() {
          return ['id3', 'id4'];
        }

        static get relationMappings() {
          return {
            a: {
              relation: Model.HasManyRelation,
              modelClass: ModelA,
              join: {
                from: ['B.id3', 'B.id4'],
                to: ['A.bid3', 'A.bid4']
              }
            },
            ab: {
              relation: Model.ManyToManyRelation,
              modelClass: ModelA,
              join: {
                from: ['B.id3', 'B.id4'],
                through: {
                  from: ['A_B.bid3', 'A_B.bid4'],
                  to: ['A_B.aid1', 'A_B.aid2']
                },
                to: ['A.id1', 'A.id2']
              }
            }
          };
        }
      }

      A = ModelA.bindKnex(session.knex);
      B = ModelB.bindKnex(session.knex);
    });

    describe('insert', () => {
      afterEach(() => {
        return session.knex('A').delete();
      });

      it('should insert a model', () => {
        return A.query()
          .insert({ id1: 1, id2: '1', aval: 'a' })
          .then(ret => {
            expect(ret).to.eql({ id1: 1, id2: '1', aval: 'a' });
            return A.query().insertAndFetch({ id1: 1, id2: '2', aval: 'b' });
          })
          .then(ret => {
            expect(ret.$toJson()).to.eql({ id1: 1, id2: '2', aval: 'b', bid3: null, bid4: null });
            return session.knex('A').orderBy('id2');
          })
          .then(rows => {
            expect(rows).to.eql([
              { id1: 1, id2: '1', aval: 'a', bid3: null, bid4: null },
              { id1: 1, id2: '2', aval: 'b', bid3: null, bid4: null }
            ]);
          });
      });

      it('insert should fail (unique violation)', done => {
        A.query()
          .insert({ id1: 1, id2: '1', aval: 'a' })
          .then(() => {
            return A.query().insert({ id1: 1, id2: '1', aval: 'b' });
          })
          .then(() => {
            done(new Error('should not get here'));
          })
          .catch(() => {
            done();
          });
      });
    });

    describe('find', () => {
      beforeEach(() => {
        return A.query().insertWithRelated([
          { id1: 1, id2: '1', aval: 'a' },
          { id1: 1, id2: '2', aval: 'b' },
          { id1: 2, id2: '2', aval: 'c' },
          { id1: 2, id2: '3', aval: 'd' },
          { id1: 3, id2: '3', aval: 'e' }
        ]);
      });

      afterEach(() => {
        return session.knex('A').delete();
      });

      it('findById should fetch one model by composite id', () => {
        return A.query()
          .findById([2, '2'])
          .then(model => {
            expect(model.toJSON()).to.eql({ id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null });
          });
      });

      it('findByIds should fetch two models by composite ids', () => {
        return A.query()
          .findByIds([[1, '1'], [2, '2']])
          .then(models => {
            expect(models).to.eql([
              { id1: 1, id2: '1', aval: 'a', bid3: null, bid4: null },
              { id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null }
            ]);
          });
      });

      it('whereComposite should fetch one model by composite id', () => {
        return A.query()
          .whereComposite(['id1', 'id2'], [2, '2'])
          .first()
          .then(model => {
            expect(model.toJSON()).to.eql({ id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null });
          });
      });

      it('whereInComposite should fetch multiple models by composite id', () => {
        return A.query()
          .whereInComposite(['id1', 'id2'], [[1, '2'], [2, '3'], [3, '3']])
          .orderBy(['id1', 'id2'])
          .then(models => {
            expect(models).to.eql([
              { id1: 1, id2: '2', aval: 'b', bid3: null, bid4: null },
              { id1: 2, id2: '3', aval: 'd', bid3: null, bid4: null },
              { id1: 3, id2: '3', aval: 'e', bid3: null, bid4: null }
            ]);
          });
      });

      it('whereNotInComposite should fetch multiple models by composite id', () => {
        return A.query()
          .whereNotInComposite(['id1', 'id2'], [[1, '2'], [2, '3'], [3, '3']])
          .orderBy(['id1', 'id2'])
          .then(models => {
            expect(models).to.eql([
              { id1: 1, id2: '1', aval: 'a', bid3: null, bid4: null },
              { id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null }
            ]);
          });
      });
    });

    describe('update', () => {
      beforeEach(() => {
        return A.query().insertWithRelated([
          { id1: 1, id2: '1', aval: 'a' },
          { id1: 1, id2: '2', aval: 'b' },
          { id1: 2, id2: '2', aval: 'c' },
          { id1: 2, id2: '3', aval: 'd' },
          { id1: 3, id2: '3', aval: 'e' }
        ]);
      });

      afterEach(() => {
        return session.knex('A').delete();
      });

      it('updateAndFetchById should accept a composite id', () => {
        return A.query()
          .updateAndFetchById([1, '2'], { aval: 'updated' })
          .orderBy(['id1', 'id2'])
          .then(model => {
            expect(model).to.eql({ id1: 1, id2: '2', aval: 'updated', bid3: null, bid4: null });
            return session.knex('A').orderBy(['id1', 'id2']);
          })
          .then(rows => {
            expect(rows).to.eql([
              { id1: 1, id2: '1', aval: 'a', bid3: null, bid4: null },
              { id1: 1, id2: '2', aval: 'updated', bid3: null, bid4: null },
              { id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null },
              { id1: 2, id2: '3', aval: 'd', bid3: null, bid4: null },
              { id1: 3, id2: '3', aval: 'e', bid3: null, bid4: null }
            ]);
          });
      });
    });

    describe('upsertGraph', () => {
      beforeEach(() => {
        return A.query().insertGraph({
          id1: 1,
          id2: '1',
          aval: 'val1',

          b: {
            id3: 1,
            id4: '1',
            bval: 'val2',

            a: [
              {
                id1: 1,
                id2: '2',
                aval: 'val3'
              },
              {
                id1: 2,
                id2: '2',
                aval: 'val4'
              }
            ]
          },

          ba: [
            {
              id3: 2,
              id4: '1',
              bval: 'val5'
            },
            {
              id3: 2,
              id4: '2',
              bval: 'val6'
            }
          ]
        });
      });

      afterEach(() => {
        return Promise.all([
          session.knex('A').delete(),
          session.knex('B').delete(),
          session.knex('A_B').delete()
        ]);
      });

      it('should work when `insertMissing` option is true', () => {
        return A.query()
          .upsertGraph(
            {
              // update
              id1: 1,
              id2: '1',
              aval: 'x',

              b: {
                // update
                id3: 1,
                id4: '1',
                bval: 'z',

                // [2, '2'] is deleted
                a: [
                  {
                    // This is the root. Note that a is simply b in reverse.
                    // We need to mention the root here so that is doesn't
                    // get deleted.
                    id1: 1,
                    id2: '1'
                  },
                  {
                    // update
                    id1: 1,
                    id2: '2',
                    aval: 'w'
                  },
                  {
                    // insert
                    id1: 400,
                    id2: '600',
                    aval: 'new a'
                  }
                ]
              },

              // [2, '2'] is deleted
              ba: [
                {
                  // update
                  id3: 2,
                  id4: '1',
                  bval: 'y'
                },
                {
                  // insert
                  id3: 200,
                  id4: '300',
                  bval: 'new b'
                }
              ]
            },
            { insertMissing: true }
          )
          .then(() => {
            return A.query()
              .findById([1, '1'])
              .eager('[b.a, ba]')
              .modifyEager('b.a', qb => qb.orderBy(['id1', 'id2']))
              .modifyEager('ba', qb => qb.orderBy(['id3', 'id4']));
          })
          .then(model => {
            expect(model).to.eql({
              id1: 1,
              id2: '1',
              aval: 'x',
              bid3: 1,
              bid4: '1',

              b: {
                id3: 1,
                id4: '1',
                bval: 'z',

                a: [
                  {
                    id1: 1,
                    id2: '1',
                    aval: 'x',
                    bid3: 1,
                    bid4: '1'
                  },
                  {
                    id1: 1,
                    id2: '2',
                    bid3: 1,
                    bid4: '1',
                    aval: 'w'
                  },
                  {
                    id1: 400,
                    id2: '600',
                    bid3: 1,
                    bid4: '1',
                    aval: 'new a'
                  }
                ]
              },

              ba: [
                {
                  id3: 2,
                  id4: '1',
                  bval: 'y'
                },
                {
                  id3: 200,
                  id4: '300',
                  bval: 'new b'
                }
              ]
            });

            return Promise.all([
              session.knex('A').orderBy(['id1', 'id2']),
              session.knex('B').orderBy(['id3', 'id4'])
            ]);
          })
          .spread((a, b) => {
            expect(a).to.eql([
              { id1: 1, id2: '1', aval: 'x', bid3: 1, bid4: '1' },
              { id1: 1, id2: '2', aval: 'w', bid3: 1, bid4: '1' },
              { id1: 400, id2: '600', aval: 'new a', bid3: 1, bid4: '1' }
            ]);

            expect(b).to.eql([
              { id3: 1, id4: '1', bval: 'z' },
              { id3: 2, id4: '1', bval: 'y' },
              { id3: 200, id4: '300', bval: 'new b' }
            ]);
          });
      });

      it('should insert if partial id is given', () => {
        const upsert = A.fromJson({
          id1: 1,
          id2: '1',
          aval: 'aUpdated',

          ba: [
            {
              id3: 2,
              id4: '1',
              bval: 'bUpdated'
            },
            {
              id4: '3',
              bval: 'bNew'
            }
          ]
        });

        // Add the other key just before it is actually inserted
        // so that we don't insert a row with null id.
        upsert.ba[1].$beforeInsert = function() {
          this.id3 = 2;
        };

        return A.query()
          .upsertGraph(upsert)
          .then(model => {
            return A.query()
              .findById([1, '1'])
              .eager('ba')
              .modifyEager('ba', qb => qb.orderBy(['id3', 'id4']));
          })
          .then(model => {
            expect(model).to.eql({
              id1: 1,
              id2: '1',
              aval: 'aUpdated',
              bid3: 1,
              bid4: '1',

              ba: [
                {
                  id3: 2,
                  id4: '1',
                  bval: 'bUpdated'
                },
                {
                  id3: 2,
                  id4: '3',
                  bval: 'bNew'
                }
              ]
            });
          });
      });
    });

    describe('delete', () => {
      beforeEach(() => {
        return A.query().insertWithRelated([
          { id1: 1, id2: '1', aval: 'a' },
          { id1: 1, id2: '2', aval: 'b' },
          { id1: 2, id2: '2', aval: 'c' },
          { id1: 2, id2: '3', aval: 'd' },
          { id1: 3, id2: '3', aval: 'e' }
        ]);
      });

      afterEach(() => {
        return session.knex('A').delete();
      });

      it('deleteById should accept a composite id', () => {
        return A.query()
          .deleteById([1, '2'])
          .orderBy(['id1', 'id2'])
          .then(count => {
            expect(count).to.eql(1);
            return session.knex('A').orderBy(['id1', 'id2']);
          })
          .then(rows => {
            expect(rows).to.eql([
              { id1: 1, id2: '1', aval: 'a', bid3: null, bid4: null },
              { id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null },
              { id1: 2, id2: '3', aval: 'd', bid3: null, bid4: null },
              { id1: 3, id2: '3', aval: 'e', bid3: null, bid4: null }
            ]);
          });
      });
    });

    describe('relations', () => {
      beforeEach(() => {
        return B.query().insertWithRelated([
          {
            id3: 1,
            id4: '1',
            bval: 'b1',
            a: [
              { id1: 1, id2: '1', aval: 'a1', '#id': 'a1' },
              { id1: 1, id2: '2', aval: 'a2' },
              { id1: 2, id2: '1', aval: 'a3' }
            ],
            ab: [
              { id1: 11, id2: '11', aval: 'a7', '#id': 'a7' },
              { id1: 11, id2: '12', aval: 'a8' },
              { id1: 12, id2: '11', aval: 'a9' }
            ]
          },
          {
            id3: 1,
            id4: '2',
            bval: 'b2',
            a: [
              { id1: 2, id2: '2', aval: 'a4' },
              { id1: 2, id2: '3', aval: 'a5' },
              { id1: 3, id2: '2', aval: 'a6' }
            ],
            ab: [
              { '#ref': 'a1' },
              { '#ref': 'a7' },

              { id1: 21, id2: '21', aval: 'a10' },
              { id1: 21, id2: '22', aval: 'a11' },
              { id1: 22, id2: '21', aval: 'a12' }
            ]
          }
        ]);
      });

      afterEach(() => {
        return Promise.all([
          session.knex('A').delete(),
          session.knex('B').delete(),
          session.knex('A_B').delete()
        ]);
      });

      describe('eager fetch', () => {
        [
          {
            eagerAlgo: Model.WhereInEagerAlgorithm,
            name: 'WhereInEagerAlgorithm'
          },
          {
            eagerAlgo: Model.JoinEagerAlgorithm,
            name: 'JoinEagerAlgorithm'
          }
        ].map(eager => {
          it('basic ' + eager.name, () => {
            return B.query()
              .eagerAlgorithm(eager.eagerAlgo)
              .eager('[a(oa).b(ob), ab(oa)]', {
                oa: builder => {
                  builder.orderBy(['id1', 'id2']);
                },
                ob: builder => {
                  builder.orderBy(['id3', 'id4']);
                }
              })
              .then(models => {
                models = _.sortBy(models, ['id3', 'id4']);
                models.forEach(it => {
                  it.a = _.sortBy(it.a, ['id1', 'id2']);
                });
                models.forEach(it => {
                  it.ab = _.sortBy(it.ab, ['id1', 'id2']);
                });

                expect(models).to.eql([
                  {
                    id3: 1,
                    id4: '1',
                    bval: 'b1',
                    a: [
                      {
                        id1: 1,
                        id2: '1',
                        aval: 'a1',
                        bid3: 1,
                        bid4: '1',
                        b: { id3: 1, id4: '1', bval: 'b1' }
                      },
                      {
                        id1: 1,
                        id2: '2',
                        aval: 'a2',
                        bid3: 1,
                        bid4: '1',
                        b: { id3: 1, id4: '1', bval: 'b1' }
                      },
                      {
                        id1: 2,
                        id2: '1',
                        aval: 'a3',
                        bid3: 1,
                        bid4: '1',
                        b: { id3: 1, id4: '1', bval: 'b1' }
                      }
                    ],
                    ab: [
                      { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },
                      { id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null },
                      { id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null }
                    ]
                  },
                  {
                    id3: 1,
                    id4: '2',
                    bval: 'b2',
                    a: [
                      {
                        id1: 2,
                        id2: '2',
                        aval: 'a4',
                        bid3: 1,
                        bid4: '2',
                        b: { id3: 1, id4: '2', bval: 'b2' }
                      },
                      {
                        id1: 2,
                        id2: '3',
                        aval: 'a5',
                        bid3: 1,
                        bid4: '2',
                        b: { id3: 1, id4: '2', bval: 'b2' }
                      },
                      {
                        id1: 3,
                        id2: '2',
                        aval: 'a6',
                        bid3: 1,
                        bid4: '2',
                        b: { id3: 1, id4: '2', bval: 'b2' }
                      }
                    ],
                    ab: [
                      { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1' },
                      { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },

                      { id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null },
                      { id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null },
                      { id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null }
                    ]
                  }
                ]);
              });
          });

          it('belongs to one $relatedQuery and ' + eager.name, () => {
            return B.query()
              .findById([1, '1'])
              .then(b => {
                return b
                  .$relatedQuery('a')
                  .eager('b')
                  .eagerAlgorithm(eager.eagerAlgo);
              })
              .then(b => {
                b = _.sortBy(b, ['id1', 'id2']);

                expect(b).to.eql([
                  {
                    id1: 1,
                    id2: '1',
                    aval: 'a1',
                    bid3: 1,
                    bid4: '1',
                    b: { id3: 1, id4: '1', bval: 'b1' }
                  },
                  {
                    id1: 1,
                    id2: '2',
                    aval: 'a2',
                    bid3: 1,
                    bid4: '1',
                    b: { id3: 1, id4: '1', bval: 'b1' }
                  },
                  {
                    id1: 2,
                    id2: '1',
                    aval: 'a3',
                    bid3: 1,
                    bid4: '1',
                    b: { id3: 1, id4: '1', bval: 'b1' }
                  }
                ]);
              });
          });

          it('many to many $relatedQuery and ' + eager.name, () => {
            return B.query()
              .findById([1, '1'])
              .then(b => {
                return b
                  .$relatedQuery('ab')
                  .eager('ba')
                  .eagerAlgorithm(eager.eagerAlgo);
              })
              .then(b => {
                b = _.sortBy(b, ['id1', 'id2']);
                b[0].ba = _.sortBy(b[0].ba, ['id3', 'id4']);

                expect(b).to.eql([
                  {
                    id1: 11,
                    id2: '11',
                    aval: 'a7',
                    bid3: null,
                    bid4: null,
                    ba: [{ bval: 'b1', id3: 1, id4: '1' }, { bval: 'b2', id3: 1, id4: '2' }]
                  },
                  {
                    id1: 11,
                    id2: '12',
                    aval: 'a8',
                    bid3: null,
                    bid4: null,
                    ba: [{ bval: 'b1', id3: 1, id4: '1' }]
                  },
                  {
                    id1: 12,
                    id2: '11',
                    aval: 'a9',
                    bid3: null,
                    bid4: null,
                    ba: [{ bval: 'b1', id3: 1, id4: '1' }]
                  }
                ]);
              });
          });
        });
      });

      describe('belongs to one relation', () => {
        it('find', () => {
          return A.query()
            .findById([1, '1'])
            .then(a1 => {
              return [a1, a1.$relatedQuery('b')];
            })
            .spread((a1, b1) => {
              expect(a1.b).to.eql({ id3: 1, id4: '1', bval: 'b1' });
              expect(b1).to.equal(a1.b);
            });
        });

        it('insert', () => {
          return A.query()
            .findById([1, '1'])
            .then(a1 => {
              return [a1, a1.$relatedQuery('b').insert({ id3: 1000, id4: '2000', bval: 'new' })];
            })
            .spread((a1, bNew) => {
              expect(a1.b).to.eql({ id3: 1000, id4: '2000', bval: 'new' });
              expect(bNew).to.equal(a1.b);
              expect(a1).to.eql({
                id1: 1,
                id2: '1',
                aval: 'a1',
                bid3: 1000,
                bid4: '2000',
                b: bNew
              });
              return Promise.all([
                session
                  .knex('A')
                  .where({ id1: 1, id2: '1' })
                  .first(),
                session
                  .knex('B')
                  .where({ id3: 1000, id4: '2000' })
                  .first()
              ]);
            })
            .spread((a1, bNew) => {
              expect(a1).to.eql({ id1: 1, id2: '1', aval: 'a1', bid3: 1000, bid4: '2000' });
              expect(bNew).to.eql({ id3: 1000, id4: '2000', bval: 'new' });
            });
        });

        it('update', () => {
          return A.query()
            .findById([1, '1'])
            .then(a1 => {
              return [a1, a1.$relatedQuery('b').update({ bval: 'updated' })];
            })
            .spread((a1, numUpdated) => {
              expect(numUpdated).to.equal(1);
              return session.knex('B').where('bval', 'updated');
            })
            .then(rows => {
              expect(rows).to.have.length(1);
              expect(rows[0]).to.eql({ id3: 1, id4: '1', bval: 'updated' });
            });
        });

        it('updateAndFetchById', () => {
          return A.query()
            .findById([1, '1'])
            .then(a1 => {
              return [a1, a1.$relatedQuery('b').updateAndFetchById([1, '1'], { bval: 'updated' })];
            })
            .spread((a1, b1) => {
              expect(b1).to.eql({ id3: 1, id4: '1', bval: 'updated' });
              return session.knex('B').where('bval', 'updated');
            })
            .then(rows => {
              expect(rows).to.have.length(1);
              expect(rows[0]).to.eql({ id3: 1, id4: '1', bval: 'updated' });
            });
        });

        it('delete', () => {
          return A.query()
            .findById([2, '2'])
            .then(a1 => {
              return [a1, a1.$relatedQuery('b').delete()];
            })
            .spread((a1, numDeleted) => {
              expect(numDeleted).to.equal(1);
              return session.knex('B');
            })
            .then(rows => {
              expect(rows).to.have.length(1);
              expect(rows[0].bval).to.equal('b1');
            });
        });

        it('relate', () => {
          return A.query()
            .findById([2, '2'])
            .then(a1 => {
              expect(a1.bid3).to.equal(1);
              expect(a1.bid4).to.equal('2');
              return [a1, a1.$relatedQuery('b').relate([1, '1'])];
            })
            .spread(a1 => {
              expect(a1.bid3).to.equal(1);
              expect(a1.bid4).to.equal('1');
              return A.query().findById([2, '2']);
            })
            .then(a1 => {
              expect(a1.bid3).to.equal(1);
              expect(a1.bid4).to.equal('1');
            });
        });

        it('unrelate', () => {
          return A.query()
            .findById([2, '2'])
            .then(a1 => {
              expect(a1.bid3).to.equal(1);
              expect(a1.bid4).to.equal('2');
              return [a1, a1.$relatedQuery('b').unrelate()];
            })
            .spread(a1 => {
              expect(a1.bid3).to.equal(null);
              expect(a1.bid4).to.equal(null);
              return A.query().findById([2, '2']);
            })
            .then(a1 => {
              expect(a1.bid3).to.equal(null);
              expect(a1.bid4).to.equal(null);
            });
        });
      });

      describe('has many relation', () => {
        it('find', () => {
          return B.query()
            .findById([1, '1'])
            .then(b1 => {
              return [b1, b1.$relatedQuery('a').orderBy(['id1', 'id2'])];
            })
            .spread((b1, a) => {
              expect(b1.a).to.eql(a);
              expect(a).to.eql([
                { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1' },
                { id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1' },
                { id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1' }
              ]);
            });
        });

        it('insert', () => {
          return B.query()
            .findById([1, '1'])
            .then(b1 => {
              return [b1, b1.$relatedQuery('a').insert({ id1: 1000, id2: '2000', aval: 'new' })];
            })
            .spread((b1, aNew) => {
              expect(_.last(b1.a)).to.eql({
                id1: 1000,
                id2: '2000',
                aval: 'new',
                bid3: 1,
                bid4: '1'
              });
              expect(_.last(b1.a)).to.equal(aNew);
              return session
                .knex('A')
                .where({ id1: 1000, id2: '2000' })
                .first();
            })
            .then(aNew => {
              expect(aNew).to.eql({ id1: 1000, id2: '2000', aval: 'new', bid3: 1, bid4: '1' });
            });
        });

        it('update', () => {
          return B.query()
            .findById([1, '1'])
            .then(b1 => {
              return b1
                .$relatedQuery('a')
                .update({ aval: 'up' })
                .where('id2', '>', '1');
            })
            .then(count => {
              expect(count).to.equal(1);
              return session.knex('A').orderBy(['id1', 'id2']);
            })
            .then(rows => {
              expect(rows).to.eql([
                { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1' },
                { id1: 1, id2: '2', aval: 'up', bid3: 1, bid4: '1' },
                { id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1' },
                { id1: 2, id2: '2', aval: 'a4', bid3: 1, bid4: '2' },
                { id1: 2, id2: '3', aval: 'a5', bid3: 1, bid4: '2' },
                { id1: 3, id2: '2', aval: 'a6', bid3: 1, bid4: '2' },
                { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },
                { id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null },
                { id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null },
                { id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null },
                { id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null },
                { id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null }
              ]);
            });
        });

        it('delete', () => {
          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return b2.$relatedQuery('a').delete();
            })
            .then(count => {
              expect(count).to.equal(3);
              return session.knex('A').orderBy(['id1', 'id2']);
            })
            .then(rows => {
              expect(rows).to.eql([
                { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1' },
                { id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1' },
                { id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1' },
                { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },
                { id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null },
                { id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null },
                { id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null },
                { id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null },
                { id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null }
              ]);
            });
        });

        it('relate', () => {
          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return b2.$relatedQuery('a').relate([1, '1']);
            })
            .then(() => {
              return session.knex('A').orderBy(['id1', 'id2']);
            })
            .then(rows => {
              expect(rows).to.eql([
                { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '2' },
                { id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1' },
                { id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1' },
                { id1: 2, id2: '2', aval: 'a4', bid3: 1, bid4: '2' },
                { id1: 2, id2: '3', aval: 'a5', bid3: 1, bid4: '2' },
                { id1: 3, id2: '2', aval: 'a6', bid3: 1, bid4: '2' },
                { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },
                { id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null },
                { id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null },
                { id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null },
                { id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null },
                { id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null }
              ]);
            });
        });

        it('relate (object value)', () => {
          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return b2.$relatedQuery('a').relate({ id1: 1, id2: '1' });
            })
            .then(() => {
              return session.knex('A').orderBy(['id1', 'id2']);
            })
            .then(rows => {
              expect(rows).to.eql([
                { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '2' },
                { id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1' },
                { id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1' },
                { id1: 2, id2: '2', aval: 'a4', bid3: 1, bid4: '2' },
                { id1: 2, id2: '3', aval: 'a5', bid3: 1, bid4: '2' },
                { id1: 3, id2: '2', aval: 'a6', bid3: 1, bid4: '2' },
                { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },
                { id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null },
                { id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null },
                { id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null },
                { id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null },
                { id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null }
              ]);
            });
        });

        it('unrelate', () => {
          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return b2
                .$relatedQuery('a')
                .unrelate()
                .where('aval', 'a5');
            })
            .then(() => {
              return session.knex('A').orderBy(['id1', 'id2']);
            })
            .then(rows => {
              expect(rows).to.eql([
                { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1' },
                { id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1' },
                { id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1' },
                { id1: 2, id2: '2', aval: 'a4', bid3: 1, bid4: '2' },
                { id1: 2, id2: '3', aval: 'a5', bid3: null, bid4: null },
                { id1: 3, id2: '2', aval: 'a6', bid3: 1, bid4: '2' },
                { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },
                { id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null },
                { id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null },
                { id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null },
                { id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null },
                { id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null }
              ]);
            });
        });
      });

      describe('many to many relation', () => {
        it('find', () => {
          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return b2.$relatedQuery('ab').orderBy(['id1', 'id2']);
            })
            .then(ret => {
              expect(ret).to.eql([
                { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1' },
                { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },
                { id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null },
                { id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null },
                { id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null }
              ]);
            });
        });

        it('insert', () => {
          let aOld;
          let abOld;

          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return Promise.all([
                b2,
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread((b2, a, ab) => {
              aOld = a;
              abOld = ab;

              return b2.$relatedQuery('ab').insert({ id1: 1000, id2: 2000, aval: 'new' });
            })
            .then(() => {
              return Promise.all([
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread((a, ab) => {
              expect(a).to.eql(
                aOld.concat([{ id1: 1000, id2: '2000', aval: 'new', bid3: null, bid4: null }])
              );

              expect(ab).to.eql(abOld.concat([{ aid1: 1000, aid2: '2000', bid3: 1, bid4: '2' }]));
            });
        });

        it('update', () => {
          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return b2.$relatedQuery('ab').update({ aval: 'XX' });
            })
            .then(() => {
              return session.knex('A').orderBy(['id1', 'id2']);
            })
            .then(rows => {
              expect(rows).to.eql([
                { id1: 1, id2: '1', aval: 'XX', bid3: 1, bid4: '1' },
                { id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1' },
                { id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1' },
                { id1: 2, id2: '2', aval: 'a4', bid3: 1, bid4: '2' },
                { id1: 2, id2: '3', aval: 'a5', bid3: 1, bid4: '2' },
                { id1: 3, id2: '2', aval: 'a6', bid3: 1, bid4: '2' },
                { id1: 11, id2: '11', aval: 'XX', bid3: null, bid4: null },
                { id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null },
                { id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null },
                { id1: 21, id2: '21', aval: 'XX', bid3: null, bid4: null },
                { id1: 21, id2: '22', aval: 'XX', bid3: null, bid4: null },
                { id1: 22, id2: '21', aval: 'XX', bid3: null, bid4: null }
              ]);
            });
        });

        it('delete', () => {
          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return b2.$relatedQuery('ab').delete();
            })
            .then(() => {
              return session.knex('A').orderBy(['id1', 'id2']);
            })
            .then(rows => {
              expect(rows).to.eql([
                { id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1' },
                { id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1' },
                { id1: 2, id2: '2', aval: 'a4', bid3: 1, bid4: '2' },
                { id1: 2, id2: '3', aval: 'a5', bid3: 1, bid4: '2' },
                { id1: 3, id2: '2', aval: 'a6', bid3: 1, bid4: '2' },
                { id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null },
                { id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null }
              ]);
            });
        });

        it('relate', () => {
          let aOld;
          let abOld;

          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return Promise.all([
                b2,
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread((b2, a, ab) => {
              aOld = a;
              abOld = ab;

              return b2.$relatedQuery('ab').relate([1, '2']);
            })
            .then(() => {
              return Promise.all([
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread((a, ab) => {
              expect(a).to.eql(aOld);
              expect(ab).to.eql(
                _.sortBy(abOld.concat([{ aid1: 1, aid2: '2', bid3: 1, bid4: '2' }]), [
                  'bid3',
                  'bid4',
                  'aid1',
                  'aid2'
                ])
              );
            });
        });

        it('unrelate', () => {
          let aOld;
          let abOld;

          return B.query()
            .findById([1, '2'])
            .then(b2 => {
              return Promise.all([
                b2,
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread((b2, a, ab) => {
              aOld = a;
              abOld = ab;

              return b2.$relatedQuery('ab').unrelate();
            })
            .then(() => {
              return Promise.all([
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread((a, ab) => {
              expect(a).to.eql(aOld);
              expect(ab).to.eql(_.reject(abOld, { bid3: 1, bid4: '2' }));
            });
        });
      });
    });
  });
};
