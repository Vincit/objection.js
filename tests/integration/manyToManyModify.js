const expect = require('expect.js');

module.exports = (session) => {
  const { Model1, Model2 } = session.models;

  describe('many to many relation modify queries', () => {
    beforeEach(async () => {
      await session.populate([
        {
          id: 1,
          model1Prop1: 'owner 1',
          model1Relation2: [
            { idCol: 1, model2Prop1: 'a', model2Prop2: 1 },
            { idCol: 2, model2Prop1: 'b', model2Prop2: 2 },
            { idCol: 3, model2Prop1: 'c', model2Prop2: 3 },
          ],
        },
        {
          id: 2,
          model1Prop1: 'owner 2',
        },
      ]);

      // Owner 1 is related to model2 1 through two join rows that only differ
      // by their extras. Owner 2 shares related rows 2 and 3 with owner 1.
      await session.knex('Model1Model2').insert([
        { model1Id: 1, model2Id: 1, extra1: 'x1', extra2: 'y' },
        { model1Id: 1, model2Id: 1, extra1: 'dup', extra2: 'y' },
        { model1Id: 1, model2Id: 2, extra1: 'x2', extra2: 'y' },
        { model1Id: 1, model2Id: 3, extra1: 'x3', extra2: 'y' },
        { model1Id: 2, model2Id: 2, extra1: 'x2', extra2: 'y' },
        { model1Id: 2, model2Id: 3, extra1: 'x1', extra2: 'y' },
      ]);
    });

    const allJoinRows = [
      [1, 1, 'x1', 'y'],
      [1, 1, 'dup', 'y'],
      [1, 2, 'x2', 'y'],
      [1, 3, 'x3', 'y'],
      [2, 2, 'x2', 'y'],
      [2, 3, 'x1', 'y'],
    ];

    function joinRows() {
      return session
        .knex('Model1Model2')
        .orderBy('id')
        .then((rows) => rows.map((row) => [row.model1Id, row.model2Id, row.extra1, row.extra2]));
    }

    function model2Rows() {
      return session
        .knex('model2')
        .orderBy('id_col')
        .then((rows) => rows.map((row) => [row.id_col, row.model2_prop2]));
    }

    function owner(id) {
      return Model1.query().findById(id);
    }

    function withoutRows(...indices) {
      return allJoinRows.filter((row, index) => !indices.includes(index));
    }

    describe('unrelate', () => {
      it('should unrelate all related rows of the owner', async () => {
        const model = await owner(1);
        const numDeleted = await model.$relatedQuery('model1Relation3').unrelate();

        expect(numDeleted).to.equal(4);
        expect(await joinRows()).to.eql(withoutRows(0, 1, 2, 3));
        expect(await model2Rows()).to.have.length(3);
      });

      it('should unrelate rows matching a filter on the related table', async () => {
        const model = await owner(1);
        const numDeleted = await model
          .$relatedQuery('model1Relation3')
          .unrelate()
          .where('model2.model2_prop1', 'b');

        expect(numDeleted).to.equal(1);
        expect(await joinRows()).to.eql(withoutRows(2));
      });

      it('should unrelate all join rows of a related row matching a filter', async () => {
        const model = await owner(1);
        const numDeleted = await model
          .$relatedQuery('model1Relation3')
          .unrelate()
          .where('model2.id_col', 1);

        expect(numDeleted).to.equal(2);
        expect(await joinRows()).to.eql(withoutRows(0, 1));
      });

      it('should unrelate rows using findByIds', async () => {
        const model = await owner(1);
        const numDeleted = await model
          .$relatedQuery('model1Relation3')
          .unrelate()
          .findByIds([1, 3]);

        expect(numDeleted).to.equal(3);
        expect(await joinRows()).to.eql(withoutRows(0, 1, 3));
      });

      it('should return 0 if no rows match', async () => {
        const model = await owner(1);
        const numDeleted = await model
          .$relatedQuery('model1Relation3')
          .unrelate()
          .where('model2.model2_prop1', 'does not exist');

        expect(numDeleted).to.equal(0);
        expect(await joinRows()).to.eql(allJoinRows);
      });

      it('should unrelate for multiple owners', async () => {
        const numDeleted = await Model1.relatedQuery('model1Relation3')
          .for([1, 2])
          .unrelate()
          .where('model2.id_col', 2);

        expect(numDeleted).to.equal(2);
        expect(await joinRows()).to.eql(withoutRows(2, 4));
      });

      describe('filters on the join table (#1853)', () => {
        it('should only unrelate the join rows matching the filter', async () => {
          const model = await owner(1);
          const numDeleted = await model
            .$relatedQuery('model1Relation3')
            .unrelate()
            .where('Model1Model2.extra1', 'x1');

          expect(numDeleted).to.equal(1);
          expect(await joinRows()).to.eql(withoutRows(0));
        });

        it('should only unrelate the join rows matching the filter for multiple owners', async () => {
          const numDeleted = await Model1.relatedQuery('model1Relation3')
            .for([1, 2])
            .unrelate()
            .where('Model1Model2.extra1', 'x1');

          expect(numDeleted).to.equal(2);
          expect(await joinRows()).to.eql(withoutRows(0, 5));
        });

        it('should combine filters on the join table and the related table', async () => {
          const model = await owner(1);
          const numDeleted = await model
            .$relatedQuery('model1Relation3')
            .unrelate()
            .where('model2.id_col', 1)
            .where('Model1Model2.extra1', 'dup');

          expect(numDeleted).to.equal(1);
          expect(await joinRows()).to.eql(withoutRows(1));
        });
      });

      describe('with a trigger on the join table that modifies the related table (#2127)', () => {
        before(async function () {
          if (!session.isMySql()) {
            this.skip();
          }

          await session.knex.raw('DROP TRIGGER IF EXISTS model1_model2_after_delete');
          await session.knex.raw(`
            CREATE TRIGGER model1_model2_after_delete AFTER DELETE ON Model1Model2
            FOR EACH ROW UPDATE model2 SET model2_prop2 = model2_prop2 + 100
            WHERE id_col = OLD.model2Id
          `);
        });

        after(async () => {
          if (session.isMySql()) {
            await session.knex.raw('DROP TRIGGER IF EXISTS model1_model2_after_delete');
          }
        });

        it('should unrelate', async () => {
          const model = await owner(1);
          const numDeleted = await model
            .$relatedQuery('model1Relation3')
            .unrelate()
            .where('model2.model2_prop1', 'b');

          expect(numDeleted).to.equal(1);
          expect(await joinRows()).to.eql(withoutRows(2));
          expect(await model2Rows()).to.eql([
            [1, 1],
            [2, 102],
            [3, 3],
          ]);
        });

        it('should only unrelate the join rows matching a filter on the join table', async () => {
          const model = await owner(1);
          const numDeleted = await model
            .$relatedQuery('model1Relation3')
            .unrelate()
            .where('Model1Model2.extra1', 'dup');

          expect(numDeleted).to.equal(1);
          expect(await joinRows()).to.eql(withoutRows(1));
          expect(await model2Rows()).to.eql([
            [1, 101],
            [2, 2],
            [3, 3],
          ]);
        });
      });
    });

    describe('patch', () => {
      it('should patch related rows matching a filter', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10 })
          .where('model2.id_col', 1);

        expect(numUpdated).to.equal(1);
        expect(await model2Rows()).to.eql([
          [1, 10],
          [2, 2],
          [3, 3],
        ]);
        expect(await joinRows()).to.eql(allJoinRows);
      });

      it('should patch related rows and join table extras matching a filter', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10, extra2: 'z' })
          .where('model2.model2_prop1', 'b');

        expect(numUpdated).to.equal(1);
        expect(await model2Rows()).to.eql([
          [1, 1],
          [2, 10],
          [3, 3],
        ]);

        const expected = allJoinRows.slice();
        expected[2] = [1, 2, 'x2', 'z'];
        expect(await joinRows()).to.eql(expected);
      });

      it('should patch nothing if no rows match', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10, extra2: 'z' })
          .where('model2.model2_prop1', 'does not exist');

        expect(numUpdated).to.equal(0);
        expect(await model2Rows()).to.eql([
          [1, 1],
          [2, 2],
          [3, 3],
        ]);
        expect(await joinRows()).to.eql(allJoinRows);
      });

      it('should patch nothing with none()', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10, extra2: 'z' })
          .none();

        expect(numUpdated).to.equal(0);
        expect(await model2Rows()).to.eql([
          [1, 1],
          [2, 2],
          [3, 3],
        ]);
        expect(await joinRows()).to.eql(allJoinRows);
      });

      it('should patch nothing if resolved in a hook', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10, extra2: 'z' })
          .runBefore((_, builder) => {
            builder.resolve(0);
          });

        expect(numUpdated).to.equal(0);
        expect(await model2Rows()).to.eql([
          [1, 1],
          [2, 2],
          [3, 3],
        ]);
        expect(await joinRows()).to.eql(allJoinRows);
      });

      it('should patch nothing if resolved in a hook with only join table extras', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ extra2: 'z' })
          .runBefore((_, builder) => {
            builder.resolve(0);
          });

        expect(numUpdated).to.equal(0);
        expect(await joinRows()).to.eql(allJoinRows);
      });

      it('should only patch the join table extras of join rows matching a filter on the join table (#1853)', async () => {
        const model = await owner(1);
        await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10, extra2: 'z' })
          .where('Model1Model2.extra1', 'x1');

        expect(await model2Rows()).to.eql([
          [1, 10],
          [2, 2],
          [3, 3],
        ]);

        const expected = allJoinRows.slice();
        expected[0] = [1, 1, 'x1', 'z'];
        expect(await joinRows()).to.eql(expected);
      });
    });

    describe('delete', () => {
      it('should delete all related rows of the owner', async () => {
        const model = await owner(1);
        const numDeleted = await model.$relatedQuery('model1Relation3').delete();

        expect(numDeleted).to.equal(3);
        expect(await model2Rows()).to.eql([]);
        expect(await joinRows()).to.eql([]);
      });

      it('should delete related rows matching a filter on the related table', async () => {
        const model = await owner(1);
        const numDeleted = await model
          .$relatedQuery('model1Relation3')
          .delete()
          .where('model2.model2_prop1', 'a');

        expect(numDeleted).to.equal(1);
        expect(await model2Rows()).to.eql([
          [2, 2],
          [3, 3],
        ]);
        expect(await joinRows()).to.eql(withoutRows(0, 1));
      });

      it('should delete related rows matching a filter on the join table', async () => {
        const model = await owner(1);
        const numDeleted = await model
          .$relatedQuery('model1Relation3')
          .delete()
          .where('Model1Model2.extra1', 'x2');

        expect(numDeleted).to.equal(1);
        expect(await model2Rows()).to.eql([
          [1, 1],
          [3, 3],
        ]);
        expect(await joinRows()).to.eql(withoutRows(2, 4));
      });

      it('should delete related rows using findById', async () => {
        const model = await owner(1);
        const numDeleted = await model.$relatedQuery('model1Relation3').delete().findById(3);

        expect(numDeleted).to.equal(1);
        expect(await model2Rows()).to.eql([
          [1, 1],
          [2, 2],
        ]);
        expect(await joinRows()).to.eql(withoutRows(3, 5));
      });

      it('should return 0 if no rows match', async () => {
        const model = await owner(2);
        const numDeleted = await model
          .$relatedQuery('model1Relation3')
          .delete()
          .where('model2.model2_prop1', 'a');

        expect(numDeleted).to.equal(0);
        expect(await model2Rows()).to.have.length(3);
        expect(await joinRows()).to.eql(allJoinRows);
      });
    });
  });
};
