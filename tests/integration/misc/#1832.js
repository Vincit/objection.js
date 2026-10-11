const { Model } = require('../../../');
const { expect } = require('chai');
const { resetWarnings } = require('../../../lib/utils/warnings');

module.exports = (session) => {
  describe('warn when fetching relations of owners without join properties #1832', () => {
    const { knex } = session;

    class Person extends Model {
      static get tableName() {
        return 'issue1832Person';
      }

      static get relationMappings() {
        return {
          pets: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            join: {
              from: 'issue1832Person.id',
              to: 'issue1832Animal.ownerId',
            },
          },

          petsByCode: {
            relation: Model.HasManyRelation,
            modelClass: Animal,
            join: {
              from: 'issue1832Person.code',
              to: 'issue1832Animal.ownerCode',
            },
          },
        };
      }
    }

    class Animal extends Model {
      static get tableName() {
        return 'issue1832Animal';
      }

      static get relationMappings() {
        return {
          owner: {
            relation: Model.BelongsToOneRelation,
            modelClass: Person,
            join: {
              from: 'issue1832Animal.ownerId',
              to: 'issue1832Person.id',
            },
          },

          keepers: {
            relation: Model.ManyToManyRelation,
            modelClass: Person,
            join: {
              from: 'issue1832Animal.id',
              through: {
                from: 'issue1832AnimalKeeper.animalId',
                to: 'issue1832AnimalKeeper.personId',
              },
              to: 'issue1832Person.id',
            },
          },

          keeper: {
            relation: Model.HasOneThroughRelation,
            modelClass: Person,
            join: {
              from: 'issue1832Animal.id',
              through: {
                from: 'issue1832AnimalKeeper.animalId',
                to: 'issue1832AnimalKeeper.personId',
              },
              to: 'issue1832Person.id',
            },
          },
        };
      }
    }

    class Tag extends Model {
      static get tableName() {
        return 'issue1832AnimalTag';
      }

      static get idColumn() {
        return ['animalId', 'tag'];
      }

      static get relationMappings() {
        return {
          animal: {
            relation: Model.BelongsToOneRelation,
            modelClass: Animal,
            join: {
              from: 'issue1832AnimalTag.animalId',
              to: 'issue1832Animal.id',
            },
          },
        };
      }
    }

    let warnings;
    let originalWarn;

    before(async () => {
      await knex.schema
        .dropTableIfExists('issue1832AnimalTag')
        .dropTableIfExists('issue1832AnimalKeeper')
        .dropTableIfExists('issue1832Animal')
        .dropTableIfExists('issue1832Person')
        .createTable('issue1832Person', (t) => {
          t.integer('id').primary();
          t.string('code');
          t.string('name');
        })
        .createTable('issue1832Animal', (t) => {
          t.integer('id').primary();
          t.integer('ownerId');
          t.string('ownerCode');
          t.string('name');
        })
        .createTable('issue1832AnimalKeeper', (t) => {
          t.integer('animalId');
          t.integer('personId');
        })
        .createTable('issue1832AnimalTag', (t) => {
          t.integer('animalId');
          t.string('tag');
          t.primary(['animalId', 'tag']);
        });

      await knex('issue1832Person').insert({ id: 1, code: 'jen', name: 'Jennifer' });
      await knex('issue1832Animal').insert([
        { id: 1, ownerId: 1, ownerCode: 'jen', name: 'Doggo' },
        { id: 2, ownerId: null, ownerCode: null, name: 'Stray' },
      ]);
      await knex('issue1832AnimalKeeper').insert({ animalId: 1, personId: 1 });
      await knex('issue1832AnimalTag').insert({ animalId: 1, tag: 'good' });
    });

    after(async () => {
      await knex.schema
        .dropTableIfExists('issue1832AnimalTag')
        .dropTableIfExists('issue1832AnimalKeeper')
        .dropTableIfExists('issue1832Animal')
        .dropTableIfExists('issue1832Person');
    });

    beforeEach(() => {
      resetWarnings();
      warnings = [];
      originalWarn = console.warn;
      console.warn = (message) => warnings.push(message);
    });

    afterEach(() => {
      console.warn = originalWarn;
      resetWarnings();
    });

    const expectedWarning =
      '[objection] Fetching relation "pets" of Person: some owner models are missing the join ' +
      'property "issue1832Person.id", so no related models are found for them. ' +
      'Select the column in the owner query.';

    it('$fetchGraph() should warn if the id is not selected for a HasManyRelation', async () => {
      const jennifer = await Person.query(knex).findById(1).select('name');
      await jennifer.$fetchGraph('pets', { transaction: knex });

      expect(jennifer.pets).to.eql([]);
      expect(warnings).to.eql([expectedWarning]);
    });

    it('$relatedQuery() should warn if the id is not selected for a HasManyRelation', async () => {
      const jennifer = await Person.query(knex).findById(1).select('name');
      const pets = await jennifer.$relatedQuery('pets', knex);

      expect(pets).to.eql([]);
      expect(warnings).to.eql([expectedWarning]);
    });

    it('should only warn once per relation', async () => {
      const people = await Person.query(knex).select('name');
      await Person.fetchGraph(people, 'pets', { transaction: knex });
      await Person.fetchGraph(people, 'pets', { transaction: knex });

      expect(warnings).to.eql([expectedWarning]);
    });

    it('should not warn if the foreign key is selected or null', async () => {
      const animals = await Animal.query(knex).orderBy('id');
      await Animal.fetchGraph(animals, 'owner', { transaction: knex });

      expect(animals.map((it) => it.owner && it.owner.name)).to.eql(['Jennifer', null]);
      expect(warnings).to.eql([]);
    });

    it('withGraphFetched() should not warn if the foreign key is not selected', async () => {
      const doggo = await Animal.query(knex)
        .findById(1)
        .select('id', 'name')
        .withGraphFetched('owner');

      expect(doggo.owner.name).to.equal('Jennifer');
      expect(warnings).to.eql([]);
    });

    it('$fetchGraph() should warn if a non-id column is not selected for a HasManyRelation', async () => {
      const jennifer = await Person.query(knex).findById(1).select('id', 'name');
      await jennifer.$fetchGraph('petsByCode', { transaction: knex });

      expect(jennifer.petsByCode).to.eql([]);
      expect(warnings).to.eql([
        '[objection] Fetching relation "petsByCode" of Person: some owner models are missing the ' +
          'join property "issue1832Person.code", so no related models are found for them. ' +
          'Select the column in the owner query.',
      ]);
    });

    it('$fetchGraph() should warn if a foreign key in the composite id is not selected', async () => {
      const tag = await Tag.query(knex).first().select('tag');
      await tag.$fetchGraph('animal', { transaction: knex });

      expect(tag.animal).to.equal(null);
      expect(warnings).to.eql([
        '[objection] Fetching relation "animal" of Tag: some owner models are missing the join ' +
          'property "issue1832AnimalTag.animalId", so no related models are found for them. ' +
          'Select the column in the owner query.',
      ]);
    });

    // Nullable foreign keys that were never set are `undefined` too, e.g. on
    // models returned by `insert()` or created with `fromJson()` (#132).
    it('should not warn if the foreign key of an inserted model is not set', async () => {
      const inserted = await Animal.query(knex).insert({ id: 3, name: 'Newcomer' });

      try {
        await inserted.$fetchGraph('owner', { transaction: knex });

        expect(inserted.owner).to.equal(null);
        expect(warnings).to.eql([]);
      } finally {
        await Animal.query(knex).deleteById(3);
      }
    });

    it('should not warn if the foreign key of a model created with fromJson() is not set', async () => {
      const stray = Animal.fromJson({ id: 2, name: 'Stray' });
      await stray.$fetchGraph('owner', { transaction: knex });
      const owner = await stray.$relatedQuery('owner', knex);

      expect(stray.owner).to.equal(null);
      expect(owner).to.equal(undefined);
      expect(warnings).to.eql([]);
    });

    // A foreign key left out of a partial `select()` can't be told apart from
    // one that was never set, so it doesn't warn either (#132).
    it('$fetchGraph() should not warn if the foreign key is not selected', async () => {
      const doggo = await Animal.query(knex).findById(1).select('id', 'name');
      await doggo.$fetchGraph('owner', { transaction: knex });

      expect(doggo.owner).to.equal(null);
      expect(warnings).to.eql([]);
    });

    const expectedThroughWarning = (relation) =>
      `[objection] Fetching relation "${relation}" of Animal: some owner models are missing the ` +
      'join property "issue1832Animal.id", so no related models are found for them. ' +
      'Select the column in the owner query.';

    it('$fetchGraph() should warn if the id is not selected for a ManyToManyRelation', async () => {
      const doggo = await Animal.query(knex).findById(1).select('name');
      await doggo.$fetchGraph('keepers', { transaction: knex });

      expect(doggo.keepers).to.eql([]);
      expect(warnings).to.eql([expectedThroughWarning('keepers')]);
    });

    it('$fetchGraph() should warn if the id is not selected for a HasOneThroughRelation', async () => {
      const doggo = await Animal.query(knex).findById(1).select('name');
      await doggo.$fetchGraph('keeper', { transaction: knex });

      expect(doggo.keeper).to.equal(null);
      expect(warnings).to.eql([expectedThroughWarning('keeper')]);
    });

    it('should not warn if the id is selected for a ManyToManyRelation', async () => {
      const animals = await Animal.query(knex).orderBy('id');
      await Animal.fetchGraph(animals, '[keepers, keeper]', { transaction: knex });

      expect(animals.map((it) => it.keepers.map((it) => it.name))).to.eql([['Jennifer'], []]);
      expect(animals.map((it) => it.keeper && it.keeper.name)).to.eql(['Jennifer', null]);
      expect(warnings).to.eql([]);
    });
  });
};
