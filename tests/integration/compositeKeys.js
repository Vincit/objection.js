'use strict';

var _ = require('lodash');
var Model = require('../../').Model;
var expect = require('expect.js');
var Promise = require('bluebird');

module.exports = function (session) {

  describe('Composite keys', function () {
    var A;
    var B;

    before(function () {
      return session.knex.schema
        .dropTableIfExists('A_B')
        .dropTableIfExists('A')
        .dropTableIfExists('B')
        .createTable('A', function (table) {
          table.integer('id1');
          table.string('id2');
          table.string('aval');
          table.integer('bid3');
          table.string('bid4');
          table.primary(['id1', 'id2']);
        })
        .createTable('B', function (table) {
          table.integer('id3');
          table.string('id4');
          table.string('bval');
          table.primary(['id3', 'id4']);
        })
        .createTable('A_B', function (table) {
          table.integer('aid1');
          table.string('aid2');
          table.integer('bid3');
          table.string('bid4');
        });
    });

    after(function () {
      return session.knex.schema
        .dropTableIfExists('A_B')
        .dropTableIfExists('A')
        .dropTableIfExists('B');
    });

    before(function () {
      A = function A() {

      };

      B = function B() {

      };

      Model.extend(A);
      Model.extend(B);

      A.tableName = 'A';
      B.tableName = 'B';

      A.idColumn = ['id1', 'id2'];
      B.idColumn = ['id3', 'id4'];

      A.knex(session.knex);
      B.knex(session.knex);

      A.relationMappings = {
        b: {
          relation: Model.BelongsToOneRelation,
          modelClass: B,
          join: {
            from: ['A.bid3', 'A.bid4'],
            to: ['B.id3', 'B.id4']
          }
        },
        ba: {
          relation: Model.ManyToManyRelation,
          modelClass: B,
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

      B.relationMappings = {
        a: {
          relation: Model.HasManyRelation,
          modelClass: A,
          join: {
            from: ['B.id3', 'B.id4'],
            to: ['A.bid3', 'A.bid4']
          }
        },
        ab: {
          relation: Model.ManyToManyRelation,
          modelClass: A,
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
    });

    describe('insert', function () {

      afterEach(function () {
        return session.knex('A').delete();
      });

      it('should insert a model', function () {
        return A
          .query()
          .insert({id1: 1, id2: '1', aval: 'a'})
          .then(function (ret) {
            expect(ret).to.eql({id1: 1, id2: '1', aval: 'a'});
            return A
              .query()
              .insertAndFetch({id1: 1, id2: '2', aval: 'b'});
          })
          .then(function (ret) {
            expect(ret.$toJson()).to.eql({id1: 1, id2: '2', aval: 'b', bid3: null, bid4: null});
            return session
              .knex('A')
              .orderBy('id2');
          })
          .then(function (rows) {
            expect(rows).to.eql([
              {id1: 1, id2: '1', aval: 'a', bid3: null, bid4: null},
              {id1: 1, id2: '2', aval: 'b', bid3: null, bid4: null}
            ]);
          });
      });

      it('insert should fail (unique violation)', function (done) {
        A.query()
          .insert({id1: 1, id2: '1', aval: 'a'})
          .then(function () {
            return A.query().insert({id1: 1, id2: '1', aval: 'b'});
          })
          .then(function () {
            done(new Error('should not get here'));
          })
          .catch(function () {
            done();
          });
      });
    });

    describe('find', function () {

      beforeEach(function () {
        return A.query().insertWithRelated([
          {id1: 1, id2: '1', aval: 'a'},
          {id1: 1, id2: '2', aval: 'b'},
          {id1: 2, id2: '2', aval: 'c'},
          {id1: 2, id2: '3', aval: 'd'},
          {id1: 3, id2: '3', aval: 'e'}
        ]);
      });

      afterEach(function () {
        return session.knex('A').delete();
      });

      it('findById should fetch one model by composite id', function () {
        return A
          .query()
          .findById([2, '2'])
          .then(function (model) {
            expect(model.toJSON()).to.eql({id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null})
          });
      });

      it('whereComposite should fetch one model by composite id', function () {
        return A
          .query()
          .whereComposite(['id1', 'id2'], [2, '2'])
          .first()
          .then(function (model) {
            expect(model.toJSON()).to.eql({id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null})
          });
      });

      it('whereInComposite should fetch multiple models by composite id', function () {
        return A
          .query()
          .whereInComposite(['id1', 'id2'], [[1, '2'], [2, '3'], [3, '3']])
          .orderBy(['id1', 'id2'])
          .then(function (models) {
            expect(models).to.eql([
              {id1: 1, id2: '2', aval: 'b', bid3: null, bid4: null},
              {id1: 2, id2: '3', aval: 'd', bid3: null, bid4: null},
              {id1: 3, id2: '3', aval: 'e', bid3: null, bid4: null}
            ]);
          });
      });

    });

    describe('update', function () {

      beforeEach(function () {
        return A.query().insertWithRelated([
          {id1: 1, id2: '1', aval: 'a'},
          {id1: 1, id2: '2', aval: 'b'},
          {id1: 2, id2: '2', aval: 'c'},
          {id1: 2, id2: '3', aval: 'd'},
          {id1: 3, id2: '3', aval: 'e'}
        ]);
      });

      afterEach(function () {
        return session.knex('A').delete();
      });

      it('updateAndFetchById should accept a composite id', function () {
        return A
          .query()
          .updateAndFetchById([1, '2'], {aval: 'updated'})
          .orderBy(['id1', 'id2'])
          .then(function (model) {
            expect(model).to.eql({id1: 1, id2: '2', aval: 'updated', bid3: null, bid4: null});
            return session.knex('A').orderBy(['id1', 'id2']);
          })
          .then(function (rows) {
            expect(rows).to.eql([
              {id1: 1, id2: '1', aval: 'a', bid3: null, bid4: null},
              {id1: 1, id2: '2', aval: 'updated', bid3: null, bid4: null},
              {id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null},
              {id1: 2, id2: '3', aval: 'd', bid3: null, bid4: null},
              {id1: 3, id2: '3', aval: 'e', bid3: null, bid4: null}
            ]);
          });
      });

    });

    describe('delete', function () {

      beforeEach(function () {
        return A.query().insertWithRelated([
          {id1: 1, id2: '1', aval: 'a'},
          {id1: 1, id2: '2', aval: 'b'},
          {id1: 2, id2: '2', aval: 'c'},
          {id1: 2, id2: '3', aval: 'd'},
          {id1: 3, id2: '3', aval: 'e'}
        ]);
      });

      afterEach(function () {
        return session.knex('A').delete();
      });

      it('deleteById should accept a composite id', function () {
        return A
          .query()
          .deleteById([1, '2'])
          .orderBy(['id1', 'id2'])
          .then(function (count) {
            expect(count).to.eql(1);
            return session.knex('A').orderBy(['id1', 'id2']);
          })
          .then(function (rows) {
            expect(rows).to.eql([
              {id1: 1, id2: '1', aval: 'a', bid3: null, bid4: null},
              {id1: 2, id2: '2', aval: 'c', bid3: null, bid4: null},
              {id1: 2, id2: '3', aval: 'd', bid3: null, bid4: null},
              {id1: 3, id2: '3', aval: 'e', bid3: null, bid4: null}
            ]);
          });
      });

    });

    describe('relations', function () {

      beforeEach(function () {
        return B.query().insertWithRelated([{
          id3: 1,
          id4: '1',
          bval: 'b1',
          a: [
            {id1: 1, id2: '1', aval: 'a1', "#id": 'a1'},
            {id1: 1, id2: '2', aval: 'a2'},
            {id1: 2, id2: '1', aval: 'a3'}
          ],
          ab: [
            {id1: 11, id2: '11', aval: 'a7', "#id": 'a7'},
            {id1: 11, id2: '12', aval: 'a8'},
            {id1: 12, id2: '11', aval: 'a9'}
          ]
        }, {
          id3: 1,
          id4: '2',
          bval: 'b2',
          a: [
            {id1: 2, id2: '2', aval: 'a4'},
            {id1: 2, id2: '3', aval: 'a5'},
            {id1: 3, id2: '2', aval: 'a6'}
          ],
          ab: [
            {"#ref": 'a1'},
            {"#ref": 'a7'},

            {id1: 21, id2: '21', aval: 'a10'},
            {id1: 21, id2: '22', aval: 'a11'},
            {id1: 22, id2: '21', aval: 'a12'}
          ]
        }]);
      });

      afterEach(function () {
        return Promise.all([
          session.knex('A').delete(),
          session.knex('B').delete(),
          session.knex('A_B').delete()
        ]);
      });

      describe('eager fetch', function () {

        [{
          eagerAlgo: Model.WhereInEagerAlgorithm,
          name: 'WhereInEagerAlgorithm'
        }, {
          eagerAlgo: Model.JoinEagerAlgorithm,
          name: 'JoinEagerAlgorithm'
        }].map(function (eager) {

          it('basic ' + eager.name, function () {
            return B
              .query()
              .eagerAlgorithm(eager.eagerAlgo)
              .eager('[a(oa).b(ob), ab(oa)]', {
                oa: function (builder) {
                  builder.orderBy(['id1', 'id2']);
                },
                ob: function (builder) {
                  builder.orderBy(['id3', 'id4']);
                }
              })
              .then(function (models) {
                models = _.sortBy(models, ['id3', 'id4']);
                models.forEach(function (it) { it.a = _.sortBy(it.a, ['id1', 'id2']); });
                models.forEach(function (it) { it.ab = _.sortBy(it.ab, ['id1', 'id2']); });

                expect(models).to.eql([{
                  id3: 1,
                  id4: '1',
                  bval: 'b1',
                  a: [
                    {id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1', b: {id3: 1, id4: '1', bval: 'b1'}},
                    {id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1', b: {id3: 1, id4: '1', bval: 'b1'}},
                    {id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1', b: {id3: 1, id4: '1', bval: 'b1'}}
                  ],
                  ab: [
                    {id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null},
                    {id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null},
                    {id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null}
                  ]
                }, {
                  id3: 1,
                  id4: '2',
                  bval: 'b2',
                  a: [
                    {id1: 2, id2: '2', aval: 'a4', bid3: 1, bid4: '2', b: {id3: 1, id4: '2', bval: 'b2'}},
                    {id1: 2, id2: '3', aval: 'a5', bid3: 1, bid4: '2', b: {id3: 1, id4: '2', bval: 'b2'}},
                    {id1: 3, id2: '2', aval: 'a6', bid3: 1, bid4: '2', b: {id3: 1, id4: '2', bval: 'b2'}}
                  ],
                  ab: [
                    {id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1'},
                    {id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null},

                    {id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null},
                    {id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null},
                    {id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null}
                  ]
                }]);
              });
          });

          it('belongs to one $relatedQuery and ' + eager.name, function () {
            return B
              .query()
              .findById([1, '1'])
              .then(function (b) {
                return b.$relatedQuery('a')
                  .eager('b')
                  .eagerAlgorithm(eager.eagerAlgo);
              })
              .then(function (b) {
                b = _.sortBy(b, ['id1', 'id2']);

                expect(b).to.eql([
                  {id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1', b: {id3: 1, id4: '1', bval: 'b1'}},
                  {id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1', b: {id3: 1, id4: '1', bval: 'b1'}},
                  {id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1', b: {id3: 1, id4: '1', bval: 'b1'}}
                ]);
              });
          });

          it('many to many $relatedQuery and ' + eager.name, function () {
            return B
              .query()
              .findById([1, '1'])
              .then(function  (b) {
                return b.$relatedQuery('ab')
                  .eager('ba')
                  .eagerAlgorithm(eager.eagerAlgo);
              }).then(function (b) {
                b = _.sortBy(b, ['id1', 'id2']);
                b[0].ba = _.sortBy(b[0].ba, ['id3', 'id4']);

                expect(b).to.eql([
                  {id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null, ba: [{bval: 'b1', id3: 1, id4: '1'}, {bval: 'b2', id3: 1, id4: '2'}]},
                  {id1: 11, id2: '12', aval: 'a8', bid3: null, bid4: null, ba: [{bval: 'b1', id3: 1, id4: '1'}]},
                  {id1: 12, id2: '11', aval: 'a9', bid3: null, bid4: null, ba: [{bval: 'b1', id3: 1, id4: '1'}]}
                ]);
              });
            });
          });
      });

      describe('belongs to one relation', function () {

        it('find', function () {
          return A
            .query()
            .findById([1, '1'])
            .then(function (a1) {
              return [a1, a1.$relatedQuery('b')];
            })
            .spread(function (a1, b1) {
              expect(a1.b).to.eql({id3: 1, id4: '1', bval: 'b1'});
              expect(b1).to.equal(a1.b);
            });
        });

        it('insert', function () {
          return A
            .query()
            .findById([1, '1'])
            .then(function (a1) {
              return [a1, a1.$relatedQuery('b').insert({id3: 1000, id4: '2000', bval: 'new'})];
            })
            .spread(function (a1, bNew) {
              expect(a1.b).to.eql({id3: 1000, id4: '2000', bval: 'new'});
              expect(bNew).to.equal(a1.b);
              expect(a1).to.eql({id1: 1, id2: '1', aval: 'a1', bid3: 1000, bid4: '2000', b: bNew});
              return Promise.all([
                session.knex('A').where({id1: 1, id2: '1'}).first(),
                session.knex('B').where({id3: 1000, id4: '2000'}).first()
              ]);
            })
            .spread(function (a1, bNew) {
              expect(a1).to.eql({id1: 1, id2: '1', aval: 'a1', bid3: 1000, bid4: '2000'});
              expect(bNew).to.eql({id3: 1000, id4: '2000', bval: 'new'});
            });
        });

        it('update', function () {
          return A
            .query()
            .findById([1, '1'])
            .then(function (a1) {
              return [a1, a1.$relatedQuery('b').update({bval: 'updated'})];
            })
            .spread(function (a1, numUpdated) {
              expect(numUpdated).to.equal(1);
              return session.knex('B').where('bval', 'updated');
            })
            .then(function (rows) {
              expect(rows).to.have.length(1);
              expect(rows[0]).to.eql({id3: 1, id4: '1', bval: 'updated'});
            });
        });

        it('updateAndFetchById', function () {
          return A
            .query()
            .findById([1, '1'])
            .then(function (a1) {
              return [a1, a1.$relatedQuery('b').updateAndFetchById([1, '1'], {bval: 'updated'})];
            })
            .spread(function (a1, b1) {
              expect(b1).to.eql({id3: 1, id4: '1', bval: 'updated'});
              return session.knex('B').where('bval', 'updated');
            })
            .then(function (rows) {
              expect(rows).to.have.length(1);
              expect(rows[0]).to.eql({id3: 1, id4: '1', bval: 'updated'});
            });
        });

        it('delete', function () {
          return A
            .query()
            .findById([2, '2'])
            .then(function (a1) {
              return [a1, a1.$relatedQuery('b').delete()];
            })
            .spread(function (a1, numDeleted) {
              expect(numDeleted).to.equal(1);
              return session.knex('B');
            })
            .then(function (rows) {
              expect(rows).to.have.length(1);
              expect(rows[0].bval).to.equal('b1');
            });
        });

        it('relate', function () {
          return A
            .query()
            .findById([2, '2'])
            .then(function (a1) {
              expect(a1.bid3).to.equal(1);
              expect(a1.bid4).to.equal('2');
              return [a1, a1.$relatedQuery('b').relate([1, '1'])];
            })
            .spread(function (a1) {
              expect(a1.bid3).to.equal(1);
              expect(a1.bid4).to.equal('1');
              return A.query().findById([2, '2']);
            })
            .then(function (a1) {
              expect(a1.bid3).to.equal(1);
              expect(a1.bid4).to.equal('1');
            });
        });

        it('unrelate', function () {
          return A
            .query()
            .findById([2, '2'])
            .then(function (a1) {
              expect(a1.bid3).to.equal(1);
              expect(a1.bid4).to.equal('2');
              return [a1, a1.$relatedQuery('b').unrelate()];
            })
            .spread(function (a1) {
              expect(a1.bid3).to.equal(null);
              expect(a1.bid4).to.equal(null);
              return A.query().findById([2, '2']);
            })
            .then(function (a1) {
              expect(a1.bid3).to.equal(null);
              expect(a1.bid4).to.equal(null);
            });
        });

      });

      describe('has many relation', function () {

        it('find', function () {
          return B
            .query()
            .findById([1, '1'])
            .then(function (b1) {
              return [b1, b1.$relatedQuery('a').orderBy(['id1', 'id2'])];
            })
            .spread(function (b1, a) {
              expect(b1.a).to.eql(a);
              expect(a).to.eql([
                {id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1'},
                {id1: 1, id2: '2', aval: 'a2', bid3: 1, bid4: '1'},
                {id1: 2, id2: '1', aval: 'a3', bid3: 1, bid4: '1'}
              ]);
            });
        });

        it('insert', function () {
          return B
            .query()
            .findById([1, '1'])
            .then(function (b1) {
              return [b1, b1.$relatedQuery('a').insert({id1: 1000, id2: '2000', aval: 'new'})];
            })
            .spread(function (b1, aNew) {
              expect(_.last(b1.a)).to.eql({id1: 1000, id2: '2000', aval: 'new', bid3: 1, bid4: '1'});
              expect(_.last(b1.a)).to.equal(aNew);
              return session.knex('A').where({id1: 1000, id2: '2000'}).first()
            })
            .then(function (aNew) {
              expect(aNew).to.eql({id1: 1000, id2: '2000', aval: 'new', bid3: 1, bid4: '1'});
            });
        });

        it('update', function () {
          return B
            .query()
            .findById([1, '1'])
            .then(function (b1) {
              return b1
                .$relatedQuery('a')
                .update({aval: 'up'})
                .where('id2', '>', '1');
            })
            .then(function (count) {
              expect(count).to.equal(1);
              return session.knex('A').orderBy(['id1', 'id2'])
            })
            .then(function (rows) {
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

        it('delete', function () {
          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return b2
                .$relatedQuery('a')
                .delete();
            })
            .then(function (count) {
              expect(count).to.equal(3);
              return session.knex('A').orderBy(['id1', 'id2'])
            })
            .then(function (rows) {
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

        it('relate', function () {
          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return b2
                .$relatedQuery('a')
                .relate([1, '1']);
            })
            .then(function () {
              return session.knex('A').orderBy(['id1', 'id2'])
            })
            .then(function (rows) {
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

        it('relate (object value)', function () {
          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return b2
                .$relatedQuery('a')
                .relate({id1: 1, id2: '1'});
            })
            .then(function () {
              return session.knex('A').orderBy(['id1', 'id2'])
            })
            .then(function (rows) {
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

        it('unrelate', function () {
          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return b2
                .$relatedQuery('a')
                .unrelate()
                .where('aval', 'a5');
            })
            .then(function () {
              return session.knex('A').orderBy(['id1', 'id2'])
            })
            .then(function (rows) {
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

      describe('many to many relation', function () {

        it('find', function () {
          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return b2.$relatedQuery('ab').orderBy(['id1', 'id2']);
            })
            .then(function (ret) {
              expect(ret).to.eql([
                { id1: 1, id2: '1', aval: 'a1', bid3: 1, bid4: '1' },
                { id1: 11, id2: '11', aval: 'a7', bid3: null, bid4: null },
                { id1: 21, id2: '21', aval: 'a10', bid3: null, bid4: null },
                { id1: 21, id2: '22', aval: 'a11', bid3: null, bid4: null },
                { id1: 22, id2: '21', aval: 'a12', bid3: null, bid4: null }
              ]);
            });
        });

        it('insert', function () {
          var aOld;
          var abOld;

          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return Promise.all([
                b2,
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread(function (b2, a, ab) {
              aOld = a;
              abOld = ab;

              return b2.$relatedQuery('ab').insert({id1: 1000, id2: 2000, aval: 'new'});
            })
            .then(function () {
              return Promise.all([
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread(function (a, ab) {
              expect(a).to.eql(aOld.concat([
                { id1: 1000, id2: '2000', aval: 'new', bid3: null, bid4: null }
              ]));

              expect(ab).to.eql(abOld.concat([
                { aid1: 1000, aid2: '2000', bid3: 1, bid4: '2' }
              ]));
            });
        });

        it('update', function () {
          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return b2.$relatedQuery('ab').update({aval: 'XX'});
            })
            .then(function () {
              return session.knex('A').orderBy(['id1', 'id2'])
            })
            .then(function (rows) {
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

        it('delete', function () {
          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return b2.$relatedQuery('ab').delete();
            })
            .then(function () {
              return session.knex('A').orderBy(['id1', 'id2'])
            })
            .then(function (rows) {
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

        it('relate', function () {
          var aOld;
          var abOld;

          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return Promise.all([
                b2,
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread(function (b2, a, ab) {
              aOld = a;
              abOld = ab;

              return b2.$relatedQuery('ab').relate([1, '2']);
            })
            .then(function () {
              return Promise.all([
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread(function (a, ab) {
              expect(a).to.eql(aOld);
              expect(ab).to.eql(_.sortBy(abOld.concat([{ aid1: 1, aid2: '2', bid3: 1, bid4: '2' }]), ['bid3', 'bid4', 'aid1', 'aid2']));
            });
        });

        it('unrelate', function () {
          var aOld;
          var abOld;

          return B
            .query()
            .findById([1, '2'])
            .then(function (b2) {
              return Promise.all([
                b2,
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread(function (b2, a, ab) {
              aOld = a;
              abOld = ab;

              return b2.$relatedQuery('ab').unrelate();
            })
            .then(function () {
              return Promise.all([
                session.knex('A').orderBy(['id1', 'id2']),
                session.knex('A_B').orderBy(['bid3', 'bid4', 'aid1', 'aid2'])
              ]);
            })
            .spread(function (a, ab) {
              expect(a).to.eql(aOld);
              expect(ab).to.eql(_.reject(abOld, {bid3: 1, bid4: '2'}));
            });
        });

      });

    });

  });

};