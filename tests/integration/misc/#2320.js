const { Model } = require('../../../');
const { expect } = require('chai');

module.exports = (session) => {
  describe('insert().onConflict().ignore() results #2320 #2597 #2661', () => {
    const { knex } = session;

    before(function () {
      // knex doesn't support `onConflict()` on SQL Server.
      if (session.isMsSql()) {
        this.skip();
      }
    });

    class Tag extends Model {
      static get tableName() {
        return 'onConflictTags';
      }

      static get jsonSchema() {
        return {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            meta: { type: ['object', 'null'] },
          },
        };
      }
    }

    before(() => {
      return knex.schema.dropTableIfExists('onConflictTags').createTable('onConflictTags', (t) => {
        t.increments('id').primary();
        t.string('name').unique();
        t.json('meta');
      });
    });

    after(() => {
      return knex.schema.dropTableIfExists('onConflictTags');
    });

    beforeEach(async () => {
      await knex('onConflictTags').delete();
      await Tag.query(knex).insert({ name: 'a', meta: { v: 'original a' } });
      await Tag.query(knex).insert({ name: 'b', meta: { v: 'original b' } });
    });

    async function findTag(name) {
      return Tag.query(knex).findOne({ name });
    }

    it('should not assign an id to an ignored model', async () => {
      const tag = Tag.fromJson({ name: 'a' });
      const result = await Tag.query(knex).insert(tag).onConflict('name').ignore();

      expect(result).to.equal(tag);
      expect(tag.id).to.equal(undefined);
    });

    it('should assign the id to a model that is not ignored', async () => {
      const result = await Tag.query(knex).insert({ name: 'c' }).onConflict('name').ignore();

      expect(result.id).to.equal((await findTag('c')).id);
    });

    it('insertAndFetch() should not fetch an ignored model without an id (#2661)', async () => {
      const result = await Tag.query(knex)
        .insertAndFetch({ name: 'a', meta: { v: 'new a' } })
        .onConflict('name')
        .ignore();

      expect(result.id).to.equal(undefined);
      expect(result.name).to.equal('a');
      expect(result.meta).to.eql({ v: 'new a' });
    });

    if (session.isPostgres()) {
      it('should merge the returned rows to the right models (#2320)', async () => {
        const tags = ['a', 'c', 'b', 'd'].map((name) => Tag.fromJson({ name }));
        const result = await Tag.query(knex).insert(tags).onConflict('name').ignore();

        expect(result).to.have.length(4);
        expect(result.every((it, i) => it === tags[i])).to.equal(true);
        expect(tags.map((it) => it.name)).to.eql(['a', 'c', 'b', 'd']);
        expect(tags[0].id).to.equal(undefined);
        expect(tags[1].id).to.equal((await findTag('c')).id);
        expect(tags[2].id).to.equal(undefined);
        expect(tags[3].id).to.equal((await findTag('d')).id);
      });

      it('should not crash with object properties in the jsonSchema (#2597)', async () => {
        const result = await Tag.query(knex)
          .insert([
            { name: 'c', meta: { v: 'new c' } },
            { name: 'a', meta: { v: 'new a' } },
          ])
          .onConflict('name')
          .ignore()
          .returning('*');

        expect(result.map((it) => it.id)).to.eql([(await findTag('c')).id, undefined]);
        expect(result.map((it) => it.meta)).to.eql([{ v: 'new c' }, { v: 'new a' }]);
      });

      it('insertAndFetch() should only fetch the models that have an id (#2661)', async () => {
        const result = await Tag.query(knex)
          .insertAndFetch([
            { name: 'a', meta: { v: 'new a' } },
            { name: 'c', meta: { v: 'new c' } },
          ])
          .onConflict('name')
          .ignore();

        expect(result.map((it) => it.id)).to.eql([undefined, (await findTag('c')).id]);
        expect(result.map((it) => it.meta)).to.eql([{ v: 'new a' }, { v: 'new c' }]);
      });
    }
  });
};
