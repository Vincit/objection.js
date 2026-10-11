const expect = require('expect.js');
const { Model } = require('../../');

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

    // On MySQL, the join rows are modified by the keys of the matching join
    // rows, which can't tell apart join rows that only differ in their extras,
    // like the first two join rows.
    const byKeys = session.isMySql();

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

          if (byKeys) {
            expect(numDeleted).to.equal(2);
            expect(await joinRows()).to.eql(withoutRows(0, 1));
          } else {
            expect(numDeleted).to.equal(1);
            expect(await joinRows()).to.eql(withoutRows(0));
          }
        });

        it('should only unrelate the join rows matching the filter for multiple owners', async () => {
          const numDeleted = await Model1.relatedQuery('model1Relation3')
            .for([1, 2])
            .unrelate()
            .where('Model1Model2.extra1', 'x1');

          if (byKeys) {
            expect(numDeleted).to.equal(3);
            expect(await joinRows()).to.eql(withoutRows(0, 1, 5));
          } else {
            expect(numDeleted).to.equal(2);
            expect(await joinRows()).to.eql(withoutRows(0, 5));
          }
        });

        it('should combine filters on the join table and the related table', async () => {
          const model = await owner(1);
          const numDeleted = await model
            .$relatedQuery('model1Relation3')
            .unrelate()
            .where('model2.id_col', 1)
            .where('Model1Model2.extra1', 'dup');

          if (byKeys) {
            expect(numDeleted).to.equal(2);
            expect(await joinRows()).to.eql(withoutRows(0, 1));
          } else {
            expect(numDeleted).to.equal(1);
            expect(await joinRows()).to.eql(withoutRows(1));
          }
        });

        it('should keep an orWhere on the join table and the related table in its group (#2191)', async () => {
          const model = await owner(1);
          const numDeleted = await model
            .$relatedQuery('model1Relation3')
            .unrelate()
            .where('Model1Model2.extra1', 'dup')
            .orWhere('model2.model2_prop1', 'c');

          if (byKeys) {
            expect(numDeleted).to.equal(3);
            expect(await joinRows()).to.eql(withoutRows(0, 1, 3));
          } else {
            expect(numDeleted).to.equal(2);
            expect(await joinRows()).to.eql(withoutRows(1, 3));
          }
        });

        it('should apply a filter on the join table to each owner', async () => {
          const numDeleted = await Model1.relatedQuery('model1Relation3')
            .for([1, 2])
            .unrelate()
            .where('Model1Model2.extra1', 'x2')
            .where('model2.id_col', 2);

          expect(numDeleted).to.equal(2);
          expect(await joinRows()).to.eql(withoutRows(2, 4));
        });

        it('should apply a filter on an aliased join table', async function () {
          // MySQL supports aliases in deletes since 8.0.16.
          if (session.isMySql()) {
            const [[{ version }]] = await session.knex.raw('select version() as version');
            if (version.startsWith('5.')) {
              this.skip();
            }
          }

          const model = await owner(1);
          const numDeleted = await model
            .$relatedQuery('model1Relation3')
            .aliasFor('Model1Model2', 'mm')
            .alias('m2')
            .unrelate()
            .where('mm.extra1', 'dup')
            .where('m2.id_col', 1);

          if (byKeys) {
            expect(numDeleted).to.equal(2);
            expect(await joinRows()).to.eql(withoutRows(0, 1));
          } else {
            expect(numDeleted).to.equal(1);
            expect(await joinRows()).to.eql(withoutRows(1));
          }
        });
      });
    });

    // The join rows of owner 1 to the related rows that are also related to
    // owner 2 are the join rows 2 and 3. On MySQL, the statement that modifies
    // the join table can't read it in a subquery (ER_UPDATE_TABLE_USED).
    describe('filters that read the join table', () => {
      const filters = {
        joinRelated: (builder) =>
          builder.joinRelated('model2Relation1').where('model2Relation1.id', 2),
        whereExists: (builder) =>
          builder.whereExists(
            Model2.relatedQuery('model2Relation1').where('model2Relation1.id', 2),
          ),
        whereIn: (builder) =>
          builder.whereIn(
            'model2.id_col',
            session.knex('Model1Model2').select('model2Id').where('model1Id', 2),
          ),
      };

      for (const [name, filter] of Object.entries(filters)) {
        it(`should unrelate with ${name}`, async () => {
          const model = await owner(1);
          const numDeleted = await model.$relatedQuery('model1Relation3').modify(filter).unrelate();

          expect(numDeleted).to.equal(2);
          expect(await joinRows()).to.eql(withoutRows(2, 3));
        });

        it(`should patch the join table extras with ${name}`, async () => {
          const model = await owner(1);
          await model
            .$relatedQuery('model1Relation3')
            .modify(filter)
            .patch({ model2Prop2: 10, extra2: 'z' });

          expect(await model2Rows()).to.eql([
            [1, 1],
            [2, 10],
            [3, 10],
          ]);

          const expected = allJoinRows.slice();
          expected[2] = [1, 2, 'x2', 'z'];
          expected[3] = [1, 3, 'x3', 'z'];
          expect(await joinRows()).to.eql(expected);
        });
      }
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

      it('should patch nothing if the related rows to patch are fetched first and none match (#161)', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10, extra2: 'z' })
          .where('model2.model2_prop2', 999);

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
        if (byKeys) {
          expected[1] = [1, 1, 'dup', 'z'];
        }
        expect(await joinRows()).to.eql(expected);
      });

      it('should patch the join table extras of rows matching a filter on a related column that the patch changes (#161)', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10, extra2: 'z' })
          .where('model2.model2_prop2', 2);

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

      it('should patch the related rows matching a filter on an extra that the patch changes (#161)', async () => {
        const model = await owner(1);
        const numUpdated = await model
          .$relatedQuery('model1Relation3')
          .patch({ model2Prop2: 10, extra1: 'changed' })
          .where('Model1Model2.extra1', 'x2');

        expect(numUpdated).to.equal(1);
        expect(await model2Rows()).to.eql([
          [1, 1],
          [2, 10],
          [3, 3],
        ]);

        const expected = allJoinRows.slice();
        expected[2] = [1, 2, 'changed', 'y'];
        expect(await joinRows()).to.eql(expected);
      });

      it('should patch the join table extras of join rows matching an orWhere on the join table and the related table (#2191)', async () => {
        const model = await owner(1);
        await model
          .$relatedQuery('model1Relation3')
          .patch({ extra2: 'z' })
          .where('Model1Model2.extra1', 'dup')
          .orWhere('model2.model2_prop1', 'c');

        const expected = allJoinRows.slice();
        expected[1] = [1, 1, 'dup', 'z'];
        expected[3] = [1, 3, 'x3', 'z'];
        if (byKeys) {
          expected[0] = [1, 1, 'x1', 'z'];
        }
        expect(await joinRows()).to.eql(expected);
      });

      describe('with more related rows than one statement can filter by (#161)', () => {
        // More ids than SQL Server accepts as bound values in one statement,
        // patched in several batches:
        const ids = Array.from({ length: 2101 }, (_, index) => 101 + index);

        beforeEach(async () => {
          const rows = ids.map((id) => ({ id_col: id, model2_prop2: 0 }));
          const joinRows = ids.map((id) => ({ model1Id: 1, model2Id: id, extra1: 'many' }));

          await session.knex.batchInsert('model2', rows, 300);
          await session.knex.batchInsert('Model1Model2', joinRows, 300);
        });

        afterEach(() => {
          delete Model2.afterUpdate;
        });

        function patchedIds() {
          return session.knex('model2').where('model2_prop2', 10).orderBy('id_col').pluck('id_col');
        }

        function patchedJoinRowIds() {
          return session
            .knex('Model1Model2')
            .where('extra2', 'z')
            .orderBy('model2Id')
            .pluck('model2Id');
        }

        it('should patch all of them and their join rows', async () => {
          const model = await owner(1);
          const numUpdated = await model
            .$relatedQuery('model1Relation3')
            .patch({ model2Prop2: 10, extra2: 'z' })
            .where('Model1Model2.extra1', 'many');

          expect(numUpdated).to.equal(ids.length);
          expect(await patchedIds()).to.eql(ids);
          expect(await patchedJoinRowIds()).to.eql(ids);
        });

        it('should return the patched rows of all batches with returning()', async function () {
          if (!session.isPostgres() && !session.isMsSql()) {
            this.skip();
          }

          const model = await owner(1);
          const models = await model
            .$relatedQuery('model1Relation3')
            .patch({ model2Prop2: 10, extra2: 'z' })
            .where('Model1Model2.extra1', 'many')
            .returning('*');

          expect(models.every((model) => model instanceof Model2)).to.equal(true);
          expect(models.map((model) => model.idCol).sort((a, b) => a - b)).to.eql(ids);
          expect(models.every((model) => model.model2Prop2 === 10)).to.equal(true);
        });

        it('should find the patched rows with asFindQuery() in a static afterUpdate hook', async () => {
          // Two batches, but few enough ids for the single find statement.
          const someIds = ids.slice(0, 600);
          let foundIds = null;

          Model2.afterUpdate = async ({ asFindQuery }) => {
            const models = await asFindQuery().select('model2.id_col').orderBy('model2.id_col');
            foundIds = models.map((model) => model.idCol);
          };

          const model = await owner(1);
          const numUpdated = await model
            .$relatedQuery('model1Relation3')
            .patch({ model2Prop2: 10, extra2: 'z' })
            .where('Model1Model2.extra1', 'many')
            .where('model2.id_col', '<=', someIds[someIds.length - 1]);

          expect(numUpdated).to.equal(someIds.length);
          expect(foundIds).to.eql(someIds);
          expect(await patchedIds()).to.eql(someIds);
        });
      });
    });

    describe('with a through.modify filter on the join table', () => {
      class FilteredModel1 extends Model1 {
        static get relationMappings() {
          return {
            filteredRelation: {
              relation: Model.ManyToManyRelation,
              modelClass: Model2,
              join: {
                from: 'Model1.id',
                through: {
                  from: 'Model1Model2.model1Id',
                  to: 'Model1Model2.model2Id',
                  extra: ['extra1'],
                  modify: (builder) => builder.where('Model1Model2.extra2', 'y'),
                },
                to: 'model2.id_col',
              },
            },
          };
        }
      }

      beforeEach(async () => {
        // A join row that the filter excludes.
        await session.knex('Model1Model2').insert({
          model1Id: 1,
          model2Id: 2,
          extra1: 'filtered',
          extra2: 'n',
        });
      });

      const filteredJoinRow = [1, 2, 'filtered', 'n'];

      function filteredOwner() {
        return FilteredModel1.fromJson({ id: 1 });
      }

      it('should unrelate rows matching a filter on the related table', async () => {
        const numDeleted = await filteredOwner()
          .$relatedQuery('filteredRelation')
          .unrelate()
          .where('model2.id_col', 2);

        expect(numDeleted).to.equal(1);
        expect(await joinRows()).to.eql([...withoutRows(2), filteredJoinRow]);
      });

      it('should apply the filter with a model class bound to a knex instance', async () => {
        const numDeleted = await FilteredModel1.bindKnex(session.knex)
          .fromJson({ id: 1 })
          .$relatedQuery('filteredRelation')
          .unrelate()
          .where('model2.id_col', 2);

        expect(numDeleted).to.equal(1);
        expect(await joinRows()).to.eql([...withoutRows(2), filteredJoinRow]);
      });

      it('should unrelate rows matching a filter on the join table', async () => {
        const numDeleted = await filteredOwner()
          .$relatedQuery('filteredRelation')
          .unrelate()
          .where('Model1Model2.extra1', 'x3');

        expect(numDeleted).to.equal(1);
        expect(await joinRows()).to.eql([...withoutRows(3), filteredJoinRow]);
      });

      it('should not unrelate the join rows that the filter excludes', async () => {
        const numDeleted = await filteredOwner()
          .$relatedQuery('filteredRelation')
          .unrelate()
          .where('Model1Model2.extra1', 'filtered');

        expect(numDeleted).to.equal(0);
        expect(await joinRows()).to.eql([...allJoinRows, filteredJoinRow]);
      });

      it('should only unrelate the join rows matching a filter on the join table', async () => {
        const numDeleted = await filteredOwner()
          .$relatedQuery('filteredRelation')
          .unrelate()
          .where('Model1Model2.extra1', 'dup');

        if (byKeys) {
          expect(numDeleted).to.equal(2);
          expect(await joinRows()).to.eql([...withoutRows(0, 1), filteredJoinRow]);
        } else {
          expect(numDeleted).to.equal(1);
          expect(await joinRows()).to.eql([...withoutRows(1), filteredJoinRow]);
        }
      });

      it('should patch the join table extras of rows matching a filter', async () => {
        await filteredOwner()
          .$relatedQuery('filteredRelation')
          .patch({ model2Prop2: 10, extra1: 'z' })
          .where('model2.id_col', 2);

        expect(await model2Rows()).to.eql([
          [1, 1],
          [2, 10],
          [3, 3],
        ]);

        const expected = allJoinRows.slice();
        expected[2] = [1, 2, 'z', 'y'];
        expect(await joinRows()).to.eql([...expected, filteredJoinRow]);
      });
    });

    function describeItemTags(title, { joinTable, isSupported = () => true }) {
      describe(title, () => {
        const { knex } = session;

        class Tag extends Model {
          static tableName = 'm2m_modify_tag';
        }

        class Item extends Model {
          static tableName = 'm2m_modify_item';

          static relationMappings = {
            tags: {
              relation: Model.ManyToManyRelation,
              modelClass: Tag,
              join: {
                from: 'm2m_modify_item.id',
                through: {
                  from: `${joinTable}.item_id`,
                  to: `${joinTable}.tag_id`,
                  extra: ['note'],
                },
                to: 'm2m_modify_tag.id',
              },
            },
          };
        }

        before(async function () {
          if (!isSupported()) {
            this.skip();
          }

          await knex.schema
            .raw('DROP VIEW IF EXISTS m2m_modify_item_tag_view')
            .dropTableIfExists('m2m_modify_item_tag')
            .dropTableIfExists('m2m_modify_item')
            .dropTableIfExists('m2m_modify_tag')
            .createTable('m2m_modify_item', (table) => {
              table.integer('id').primary();
            })
            .createTable('m2m_modify_tag', (table) => {
              table.integer('id').primary();
            })
            .createTable('m2m_modify_item_tag', (table) => {
              table.integer('item_id');
              table.integer('tag_id');
              table.string('note');
              // Single precision floats and microseconds don't survive a round
              // trip through JavaScript.
              table.specificType('weight', session.isPostgres() ? 'real' : 'float');
              table.datetime('created_at', { precision: 6 });
            })
            .raw('CREATE VIEW m2m_modify_item_tag_view AS SELECT * FROM m2m_modify_item_tag');
        });

        after(() => {
          return knex.schema
            .raw('DROP VIEW IF EXISTS m2m_modify_item_tag_view')
            .dropTableIfExists('m2m_modify_item_tag')
            .dropTableIfExists('m2m_modify_item')
            .dropTableIfExists('m2m_modify_tag');
        });

        beforeEach(async () => {
          await knex('m2m_modify_item_tag').delete();
          await knex('m2m_modify_item').delete();
          await knex('m2m_modify_tag').delete();
          await knex('m2m_modify_item').insert({ id: 1 });
          await knex('m2m_modify_tag').insert([{ id: 1 }, { id: 2 }]);
          await knex('m2m_modify_item_tag').insert(
            [
              [1, null],
              [2, 'a'],
              [2, 'b'],
            ].map(([tagId, note]) => ({
              item_id: 1,
              tag_id: tagId,
              note,
              weight: 0.1,
              created_at: '2020-01-01 00:00:00.123456',
            })),
          );
        });

        function tags() {
          return Item.fromJson({ id: 1 }).$relatedQuery('tags', knex);
        }

        function itemTags() {
          return knex('m2m_modify_item_tag')
            .orderBy(['tag_id', 'note'])
            .then((rows) => rows.map((row) => [row.tag_id, row.note]));
        }

        it('should unrelate', async () => {
          const numDeleted = await tags().unrelate().where('m2m_modify_tag.id', 2);

          expect(numDeleted).to.equal(2);
          expect(await itemTags()).to.eql([[1, null]]);
        });

        it('should only unrelate the join rows matching a filter on the join table', async () => {
          const numDeleted = await tags()
            .unrelate()
            .where('m2m_modify_tag.id', 2)
            .where(`${joinTable}.note`, 'a');

          if (byKeys) {
            expect(numDeleted).to.equal(2);
            expect(await itemTags()).to.eql([[1, null]]);
          } else {
            expect(numDeleted).to.equal(1);
            expect(await itemTags()).to.eql([
              [1, null],
              [2, 'b'],
            ]);
          }
        });

        it('should patch the join table extras', async () => {
          await tags().patch({ note: 'x' }).where('m2m_modify_tag.id', 1);

          expect(await itemTags()).to.eql([
            [1, 'x'],
            [2, 'a'],
            [2, 'b'],
          ]);
        });

        it('should only patch the join table extras of the join rows matching a filter on the join table', async () => {
          await tags().patch({ note: 'x' }).where(`${joinTable}.note`, 'b');

          expect(await itemTags()).to.eql([
            [1, null],
            ...(byKeys
              ? [
                  [2, 'x'],
                  [2, 'x'],
                ]
              : [
                  [2, 'a'],
                  [2, 'x'],
                ]),
          ]);
        });
      });
    }

    describeItemTags('with join table values that are not returned exactly', {
      joinTable: 'm2m_modify_item_tag',
    });

    // Sqlite views can only be modified through triggers.
    describeItemTags('with a view as the join table', {
      joinTable: 'm2m_modify_item_tag_view',
      isSupported: () => !session.isSqlite(),
    });

    describe('with triggers on the join table (#2406)', () => {
      const { knex } = session;

      class Tag extends Model {
        static tableName = 'm2m_trigger_tag';
      }

      function tagsRelation(joinTable) {
        return {
          relation: Model.ManyToManyRelation,
          modelClass: Tag,
          join: {
            from: 'm2m_trigger_item.id',
            through: {
              from: `${joinTable}.item_id`,
              to: `${joinTable}.tag_id`,
              extra: ['note'],
            },
            to: 'm2m_trigger_tag.id',
          },
        };
      }

      class Item extends Model {
        static tableName = 'm2m_trigger_item';

        static relationMappings = {
          // The join table has triggers for deletes and updates that modify
          // the related table.
          tags: tagsRelation('m2m_trigger_item_tag'),
          // The join table only has a trigger for inserts.
          insertTriggerTags: tagsRelation('m2m_trigger_item_tag_insert'),
        };
      }

      const joinTables = ['m2m_trigger_item_tag', 'm2m_trigger_item_tag_insert'];

      // The tables are only used here, so that their triggers are fetched
      // after they are created.
      before(async function () {
        if (!session.isMySql()) {
          this.skip();
        }

        await dropTables();
        await knex.schema
          .createTable('m2m_trigger_item', (table) => {
            table.integer('id').primary();
          })
          .createTable('m2m_trigger_tag', (table) => {
            table.integer('id').primary();
            table.integer('count').defaultTo(0);
          });

        for (const joinTable of joinTables) {
          await knex.schema.createTable(joinTable, (table) => {
            table.integer('item_id');
            table.integer('tag_id');
            table.string('note');
          });
        }

        for (const event of ['DELETE', 'UPDATE']) {
          await knex.raw(`
            CREATE TRIGGER m2m_trigger_item_tag_${event.toLowerCase()}
            AFTER ${event} ON m2m_trigger_item_tag FOR EACH ROW
            UPDATE m2m_trigger_tag SET count = count + 1 WHERE id = OLD.tag_id
          `);
        }

        await knex.raw(`
          CREATE TRIGGER m2m_trigger_item_tag_insert_insert
          AFTER INSERT ON m2m_trigger_item_tag_insert FOR EACH ROW
          UPDATE m2m_trigger_tag SET count = count + 1 WHERE id = NEW.tag_id
        `);
      });

      after(async () => {
        if (session.isMySql()) {
          await dropTables();
        }
      });

      async function dropTables() {
        for (const table of [...joinTables, 'm2m_trigger_item', 'm2m_trigger_tag']) {
          await knex.schema.dropTableIfExists(table);
        }
      }

      beforeEach(async () => {
        await knex('m2m_trigger_item').delete();
        await knex('m2m_trigger_tag').delete();
        await knex('m2m_trigger_item').insert({ id: 1 });
        await knex('m2m_trigger_tag').insert([{ id: 1 }, { id: 2 }]);

        for (const joinTable of joinTables) {
          await knex(joinTable).delete();
          await knex(joinTable).insert(
            [
              [1, null],
              [2, 'a'],
              [2, 'b'],
            ].map(([tagId, note]) => ({ item_id: 1, tag_id: tagId, note })),
          );
        }
        // Reset the counts that the insert trigger increased.
        await knex('m2m_trigger_tag').update({ count: 0 });
      });

      function tags(relationName, trx = knex) {
        return Item.fromJson({ id: 1 }).$relatedQuery(relationName, trx);
      }

      function joinRows(joinTable) {
        return knex(joinTable)
          .orderBy(['tag_id', 'note'])
          .then((rows) => rows.map((row) => [row.tag_id, row.note]));
      }

      function tagCounts() {
        return knex('m2m_trigger_tag')
          .orderBy('id')
          .then((rows) => rows.map((row) => row.count));
      }

      async function queriesOf(callback) {
        const queries = [];
        const onQuery = (query) => queries.push(query.sql);

        knex.client.on('query', onQuery);
        try {
          await callback();
        } finally {
          knex.client.removeListener('query', onQuery);
        }

        return queries;
      }

      it('should fetch the keys of the join rows before modifying them', async () => {
        const model = await owner(1);
        const queries = await queriesOf(() =>
          model.$relatedQuery('model1Relation3').unrelate().where('model2.id_col', 2),
        );

        expect(queries).to.have.length(2);
        expect(queries[0]).to.match(/^select .* exists \(select 1 from `model2`/);
        expect(queries[1]).to.match(/^delete /);
        expect(queries[1]).not.to.contain('exists');
      });

      it('should unrelate if a trigger is created after the first unrelate', async () => {
        const joinTable = 'm2m_trigger_item_tag_insert';
        await tags('insertTriggerTags').unrelate().where('m2m_trigger_tag.id', 2);

        await knex.raw(`
          CREATE TRIGGER m2m_trigger_item_tag_insert_delete
          AFTER DELETE ON ${joinTable} FOR EACH ROW
          UPDATE m2m_trigger_tag SET count = count + 1 WHERE id = OLD.tag_id
        `);

        try {
          const numDeleted = await tags('insertTriggerTags')
            .unrelate()
            .where('m2m_trigger_tag.id', 1);

          expect(numDeleted).to.equal(1);
          expect(await joinRows(joinTable)).to.eql([]);
          expect(await tagCounts()).to.eql([1, 0]);
        } finally {
          await knex.raw('DROP TRIGGER m2m_trigger_item_tag_insert_delete');
        }
      });

      it('should unrelate if the join table has a delete trigger', async () => {
        const queries = await queriesOf(async () => {
          const numDeleted = await tags('tags')
            .unrelate()
            .where('m2m_trigger_tag.id', 2)
            .where('m2m_trigger_item_tag.note', 'a');

          // The keys can't tell apart the join rows of tag 2.
          expect(numDeleted).to.equal(2);
        });

        expect(queries).to.have.length(2);
        expect(queries[0]).to.match(/^select /);
        expect(queries[1]).to.match(/^delete /);
        expect(queries[1]).not.to.contain('exists');
        expect(await joinRows('m2m_trigger_item_tag')).to.eql([[1, null]]);
        expect(await tagCounts()).to.eql([0, 2]);
      });

      it('should patch the join table extras if the join table has an update trigger', async () => {
        await tags('tags').patch({ note: 'x' }).where('m2m_trigger_tag.id', 1);

        expect(await joinRows('m2m_trigger_item_tag')).to.eql([
          [1, 'x'],
          [2, 'a'],
          [2, 'b'],
        ]);
        expect(await tagCounts()).to.eql([1, 0]);
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
