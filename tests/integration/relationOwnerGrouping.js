const expect = require('expect.js');

// The relation's owner condition must always be ANDed with the user's where
// clauses as a group. Otherwise `orWhere` would find, update or delete rows of
// other owners. See issues #2191 and #1909.
module.exports = (session) => {
  const { Model1, Model2 } = session.models;

  describe('relation owner condition grouping with orWhere (#2191)', () => {
    beforeEach(() => {
      return session.populate([
        {
          id: 1,
          model1Prop1: 'owner 1',
          model1Relation1: { id: 3, model1Prop1: 'a' },
          model1Relation2: [
            { idCol: 1, model2Prop1: 'a' },
            { idCol: 2, model2Prop1: 'b' },
            { idCol: 3, model2Prop1: 'c' },
          ],
          model1Relation3: [
            { idCol: 6, model2Prop1: 'a' },
            { idCol: 7, model2Prop1: 'b' },
            { idCol: 8, model2Prop1: 'c' },
          ],
        },
        {
          id: 2,
          model1Prop1: 'owner 2',
          model1Relation1: { id: 4, model1Prop1: 'b' },
          model1Relation2: [
            { idCol: 4, model2Prop1: 'a' },
            { idCol: 5, model2Prop1: 'b' },
          ],
          model1Relation3: [
            { idCol: 9, model2Prop1: 'a' },
            { idCol: 10, model2Prop1: 'b' },
          ],
        },
      ]);
    });

    function owner1() {
      return Model1.fromJson({ id: 1, model1Id: 3 });
    }

    async function model2Ids(predicate = () => true) {
      const rows = await session.knex('model2').orderBy('id_col');
      return rows.filter(predicate).map((it) => it.id_col);
    }

    function ids(rows, prop = 'idCol') {
      return rows.map((it) => it[prop]).sort((a, b) => a - b);
    }

    describe('HasManyRelation', () => {
      it('find', async () => {
        const pets = await owner1()
          .$relatedQuery('model1Relation2')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b');

        expect(ids(pets)).to.eql([1, 2]);
      });

      it('delete', async () => {
        const numDeleted = await owner1()
          .$relatedQuery('model1Relation2')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .delete();

        expect(numDeleted).to.equal(2);
        expect(await model2Ids()).to.eql([3, 4, 5, 6, 7, 8, 9, 10]);
      });

      it('patch', async () => {
        const numPatched = await owner1()
          .$relatedQuery('model1Relation2')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .patch({ model2Prop2: 100 });

        expect(numPatched).to.equal(2);
        expect(await model2Ids((it) => it.model2_prop2 === 100)).to.eql([1, 2]);
      });

      it('update', async () => {
        const numUpdated = await owner1()
          .$relatedQuery('model1Relation2')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .update({ model2Prop1: 'x' });

        expect(numUpdated).to.equal(2);
        expect(await model2Ids((it) => it.model2_prop1 === 'x')).to.eql([1, 2]);
      });

      it('patchAndFetchById', async () => {
        const patched = await owner1()
          .$relatedQuery('model1Relation2')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .patchAndFetchById(2, { model2Prop2: 100 });

        expect(patched.idCol).to.equal(2);
        expect(await model2Ids((it) => it.model2_prop2 === 100)).to.eql([2]);
      });

      it('unrelate', async () => {
        const numUnrelated = await owner1()
          .$relatedQuery('model1Relation2')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .unrelate();

        expect(numUnrelated).to.equal(2);
        expect(await model2Ids((it) => it.model1_id === 1)).to.eql([3]);
        expect(await model2Ids((it) => it.model1_id === 2)).to.eql([4, 5]);
      });

      it('static relatedQuery().for() delete', async () => {
        const numDeleted = await Model1.relatedQuery('model1Relation2')
          .for(1)
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .delete();

        expect(numDeleted).to.equal(2);
        expect(await model2Ids()).to.eql([3, 4, 5, 6, 7, 8, 9, 10]);
      });
    });

    describe('BelongsToOneRelation', () => {
      it('find', async () => {
        const parents = await owner1()
          .$relatedQuery('model1Relation1')
          .where('model1Prop1', 'a')
          .orWhere('model1Prop1', 'b');

        expect(ids([].concat(parents || []), 'id')).to.eql([3]);
      });

      it('patch', async () => {
        const numPatched = await owner1()
          .$relatedQuery('model1Relation1')
          .where('model1Prop1', 'a')
          .orWhere('model1Prop1', 'b')
          .patch({ model1Prop2: 100 });

        expect(numPatched).to.equal(1);
        const rows = await session.knex('Model1').where('model1Prop2', 100);
        expect(ids(rows, 'id')).to.eql([3]);
      });
    });

    describe('ManyToManyRelation', () => {
      it('find', async () => {
        const related = await owner1()
          .$relatedQuery('model1Relation3')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b');

        expect(ids(related)).to.eql([6, 7]);
      });

      it('delete', async () => {
        const numDeleted = await owner1()
          .$relatedQuery('model1Relation3')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .delete();

        expect(numDeleted).to.equal(2);
        expect(await model2Ids()).to.eql([1, 2, 3, 4, 5, 8, 9, 10]);
      });

      it('patch', async () => {
        const numPatched = await owner1()
          .$relatedQuery('model1Relation3')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .patch({ model2Prop2: 100 });

        expect(numPatched).to.equal(2);
        expect(await model2Ids((it) => it.model2_prop2 === 100)).to.eql([6, 7]);
      });

      it('unrelate', async () => {
        const numUnrelated = await owner1()
          .$relatedQuery('model1Relation3')
          .where('model2_prop1', 'a')
          .orWhere('model2_prop1', 'b')
          .unrelate();

        expect(numUnrelated).to.equal(2);
        const rows = await session.knex('Model1Model2');
        expect(ids(rows, 'model2Id')).to.eql([8, 9, 10]);
      });
    });

    describe('HasOneThroughRelation', () => {
      it('find', async () => {
        await session.knex('Model1Model2One').insert([
          { model1Id: 1, model2Id: 6 },
          { model1Id: 2, model2Id: 7 },
        ]);

        const related = await Model2.fromJson({ idCol: 6 })
          .$relatedQuery('model2Relation2')
          .where('model1Prop1', 'nope')
          .orWhere('model1Prop1', 'owner 2');

        expect(related).to.equal(undefined);
      });
    });
  });
};
