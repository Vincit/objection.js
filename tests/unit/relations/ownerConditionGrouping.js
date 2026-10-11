const Knex = require('knex');
const expect = require('expect.js');
const { Model } = require('../../../');
const mockKnexFactory = require('../../../testUtils/mockKnex');

// The relation's owner condition must always be ANDed with the user's where
// clauses as a group. Otherwise `orWhere` would leak rows of other owners.
// See issues #2191 and #1909.
describe('relation owner condition grouping (#2191)', () => {
  let executedQueries = [];
  let mockKnex = null;
  let Owner = null;
  let Pet = null;
  let Toy = null;

  before(() => {
    const knex = Knex({ client: 'pg' });

    mockKnex = mockKnexFactory(knex, function (mock, oldImpl, args) {
      executedQueries.push(this.toString());
      const promise = Promise.resolve([]);
      return promise.then.apply(promise, args);
    });
  });

  beforeEach(() => {
    executedQueries = [];

    const orFilter = (query) => query.where('species', 'dog').orWhere('species', 'cat');

    Owner = class Owner extends Model {
      static get tableName() {
        return 'owners';
      }

      static get relationMappings() {
        return {
          pets: {
            relation: Model.HasManyRelation,
            modelClass: Pet,
            join: { from: 'owners.id', to: 'pets.ownerId' },
          },
          filteredPets: {
            relation: Model.HasManyRelation,
            modelClass: Pet,
            filter: orFilter,
            join: { from: 'owners.id', to: 'pets.ownerId' },
          },
          favoritePet: {
            relation: Model.BelongsToOneRelation,
            modelClass: Pet,
            join: { from: 'owners.favoritePetId', to: 'pets.id' },
          },
          toys: {
            relation: Model.ManyToManyRelation,
            modelClass: Toy,
            join: {
              from: 'owners.id',
              through: { from: 'ownersToys.ownerId', to: 'ownersToys.toyId' },
              to: 'toys.id',
            },
          },
          filteredToys: {
            relation: Model.ManyToManyRelation,
            modelClass: Toy,
            filter: (query) => query.where('color', 'red').orWhere('color', 'blue'),
            join: {
              from: 'owners.id',
              through: {
                from: 'ownersToys.ownerId',
                to: 'ownersToys.toyId',
                modify: (query) => query.where('shared', false).orWhere('primary', true),
              },
              to: 'toys.id',
            },
          },
          bestToy: {
            relation: Model.HasOneThroughRelation,
            modelClass: Toy,
            join: {
              from: 'owners.id',
              through: { from: 'ownersToys.ownerId', to: 'ownersToys.toyId' },
              to: 'toys.id',
            },
          },
        };
      }
    };

    Pet = class Pet extends Model {
      static get tableName() {
        return 'pets';
      }

      static get modifiers() {
        return {
          dogsOrCats: orFilter,
        };
      }
    };

    Toy = class Toy extends Model {
      static get tableName() {
        return 'toys';
      }
    };

    Owner.knex(mockKnex);
    Pet.knex(mockKnex);
    Toy.knex(mockKnex);
  });

  function owner() {
    return Owner.fromJson({ id: 1, favoritePetId: 2 });
  }

  function sql(query) {
    return query.toKnexQuery().toString();
  }

  describe('HasManyRelation', () => {
    it('find', () => {
      expect(sql(owner().$relatedQuery('pets').where('name', 'a').orWhere('name', 'b'))).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and ("name" = 'a' or "name" = 'b')`,
      );
    });

    it('find with a single orWhere', () => {
      expect(sql(owner().$relatedQuery('pets').orWhere('name', 'a'))).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and ("name" = 'a')`,
      );
    });

    it('find with whereRaw', () => {
      expect(sql(owner().$relatedQuery('pets').whereRaw(`name = 'a' or name = 'b'`))).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and (name = 'a' or name = 'b')`,
      );
    });

    it('find with orWhere added in an onBuild hook', () => {
      expect(
        sql(
          owner()
            .$relatedQuery('pets')
            .where('name', 'a')
            .onBuild((query) => query.orWhere('name', 'b')),
        ),
      ).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and ("name" = 'a' or "name" = 'b')`,
      );
    });

    it('find with orWhere in a modifier', () => {
      expect(sql(owner().$relatedQuery('pets').modify('dogsOrCats'))).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and ("species" = 'dog' or "species" = 'cat')`,
      );
    });

    it('delete', () => {
      expect(
        sql(owner().$relatedQuery('pets').where('name', 'a').orWhere('name', 'b').delete()),
      ).to.equal(
        `delete from "pets" where ("name" = 'a' or "name" = 'b') and "pets"."ownerId" in (1)`,
      );
    });

    it('patch', () => {
      expect(
        sql(
          owner()
            .$relatedQuery('pets')
            .where('name', 'a')
            .orWhere('name', 'b')
            .patch({ name: 'c' }),
        ),
      ).to.equal(
        `update "pets" set "name" = 'c' where ("name" = 'a' or "name" = 'b') and "pets"."ownerId" in (1)`,
      );
    });

    it('update', () => {
      expect(
        sql(
          owner()
            .$relatedQuery('pets')
            .where('name', 'a')
            .orWhere('name', 'b')
            .update({ name: 'c' }),
        ),
      ).to.equal(
        `update "pets" set "name" = 'c' where ("name" = 'a' or "name" = 'b') and "pets"."ownerId" in (1)`,
      );
    });

    it('unrelate', async () => {
      await owner().$relatedQuery('pets').where('name', 'a').orWhere('name', 'b').unrelate();

      expect(executedQueries).to.eql([
        `update "pets" set "ownerId" = NULL where ("name" = 'a' or "name" = 'b') and "pets"."ownerId" in (1)`,
      ]);
    });

    it('relate', async () => {
      await owner().$relatedQuery('pets').where('name', 'a').orWhere('name', 'b').relate(5);

      expect(executedQueries).to.eql([
        `update "pets" set "ownerId" = 1 where ("name" = 'a' or "name" = 'b') and "pets"."id" in (5)`,
      ]);
    });

    it('queries without orWhere are unchanged', () => {
      expect(sql(owner().$relatedQuery('pets').where('name', 'a').where('age', 2))).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and "name" = 'a' and "age" = 2`,
      );

      expect(sql(owner().$relatedQuery('pets').where('name', 'a').delete())).to.equal(
        `delete from "pets" where "name" = 'a' and "pets"."ownerId" in (1)`,
      );
    });

    it('explicitly grouped orWhere is unchanged', () => {
      expect(
        sql(
          owner()
            .$relatedQuery('pets')
            .where((query) => query.where('name', 'a').orWhere('name', 'b'))
            .delete(),
        ),
      ).to.equal(
        `delete from "pets" where ("name" = 'a' or "name" = 'b') and "pets"."ownerId" in (1)`,
      );
    });

    it('relation filter with orWhere', () => {
      expect(sql(owner().$relatedQuery('filteredPets'))).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and ("species" = 'dog' or "species" = 'cat')`,
      );

      expect(sql(owner().$relatedQuery('filteredPets').delete())).to.equal(
        `delete from "pets" where "pets"."ownerId" in (1) and ("species" = 'dog' or "species" = 'cat')`,
      );
    });

    it('relation filter with orWhere combined with user orWhere', () => {
      expect(
        sql(owner().$relatedQuery('filteredPets').where('name', 'a').orWhere('name', 'b')),
      ).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and ("species" = 'dog' or "species" = 'cat') and ("name" = 'a' or "name" = 'b')`,
      );
    });

    it('unrelate with relation filter with orWhere', async () => {
      await owner().$relatedQuery('filteredPets').unrelate();

      expect(executedQueries).to.eql([
        `update "pets" set "ownerId" = NULL where "pets"."ownerId" in (1) and ("species" = 'dog' or "species" = 'cat')`,
      ]);
    });

    it('static relatedQuery().for()', () => {
      expect(
        sql(Owner.relatedQuery('pets').for(1).where('name', 'a').orWhere('name', 'b').delete()),
      ).to.equal(
        `delete from "pets" where ("name" = 'a' or "name" = 'b') and "pets"."ownerId" in (1)`,
      );
    });

    it('static relatedQuery() as a subquery', () => {
      expect(
        sql(
          Owner.query().whereExists(
            Owner.relatedQuery('pets').where('name', 'a').orWhere('name', 'b'),
          ),
        ),
      ).to.equal(
        `select "owners".* from "owners" where exists (select "pets".* from "pets" where "pets"."ownerId" = "owners"."id" and ("name" = 'a' or "name" = 'b'))`,
      );
    });

    it('fetchGraph with an orWhere modifier', async () => {
      const owners = [Owner.fromJson({ id: 1 }), Owner.fromJson({ id: 2 })];
      await Owner.fetchGraph(owners, 'pets(dogsOrCats)');

      expect(executedQueries).to.eql([
        `select "pets".* from "pets" where "pets"."ownerId" in (1, 2) and ("species" = 'dog' or "species" = 'cat')`,
      ]);
    });
  });

  describe('wheres added by *ById hooks', () => {
    it('patchAndFetchById() after orWhere', () => {
      expect(
        sql(
          owner()
            .$relatedQuery('pets')
            .where('name', 'a')
            .orWhere('name', 'b')
            .patchAndFetchById(1, { name: 'c' }),
        ),
      ).to.equal(
        `update "pets" set "name" = 'c' where ("name" = 'a' or "name" = 'b') and "pets"."id" = 1 and "pets"."ownerId" in (1)`,
      );
    });

    it('patchAndFetchById() after orWhere without a relation', () => {
      expect(
        sql(
          Pet.query().where('name', 'a').orWhere('name', 'b').patchAndFetchById(1, { name: 'c' }),
        ),
      ).to.equal(
        `update "pets" set "name" = 'c' where ("name" = 'a' or "name" = 'b') and "pets"."id" = 1`,
      );
    });

    it('$query().patch() with orWhere', () => {
      expect(
        sql(
          Pet.fromJson({ id: 1 })
            .$query()
            .patch({ name: 'c' })
            .where('name', 'a')
            .orWhere('name', 'b'),
        ),
      ).to.equal(
        `update "pets" set "name" = 'c' where "pets"."id" = 1 and ("name" = 'a' or "name" = 'b')`,
      );
    });

    it('findById() called by the user stays in the user group', () => {
      expect(sql(owner().$relatedQuery('pets').findById(1).orWhere('name', 'b'))).to.equal(
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and ("pets"."id" = 1 or "name" = 'b')`,
      );
    });

    it('asFindQuery() in afterUpdate keeps the where groups of the executed query', async () => {
      const findQueries = [];

      Pet = class extends Pet {
        static afterUpdate({ asFindQuery }) {
          findQueries.push(sql(asFindQuery()));
        }
      };
      Pet.knex(mockKnex);

      await Owner.relatedQuery('pets')
        .for(1)
        .patchAndFetchById(1, { name: 'c' })
        .orWhere('name', 'b');

      expect(executedQueries).to.eql([
        `update "pets" set "name" = 'c' where "pets"."id" = 1 and "pets"."ownerId" in (1) and ("name" = 'b')`,
      ]);
      expect(findQueries).to.eql([
        `select "pets".* from "pets" where "pets"."ownerId" in (1) and "pets"."id" = 1 and ("name" = 'b')`,
      ]);
    });
  });

  describe('building an executed query again', () => {
    let findQueries = null;

    beforeEach(() => {
      findQueries = [];

      Pet = class extends Pet {
        static afterUpdate({ asFindQuery }) {
          findQueries.push(sql(asFindQuery()));
        }

        static afterDelete({ asFindQuery }) {
          findQueries.push(sql(asFindQuery()));
        }
      };
      Pet.knex(mockKnex);
    });

    const onBuild = (query) => query.onBuild((query) => query.where('hidden', false));
    const where = `where ("hidden" = false and "name" = 'a' or "name" = 'b') and "pets"."ownerId" in (1)`;
    const findQuery = `select "pets".* from "pets" ${where}`;

    it('patch() with orWhere and an onBuild() hook', async () => {
      await onBuild(owner().$relatedQuery('pets'))
        .where('name', 'a')
        .orWhere('name', 'b')
        .patch({ name: 'c' });

      expect(executedQueries).to.eql([`update "pets" set "name" = 'c' ${where}`]);
      expect(findQueries).to.eql([findQuery]);
    });

    it('delete() with orWhere and an onBuild() hook', async () => {
      await onBuild(owner().$relatedQuery('pets')).where('name', 'a').orWhere('name', 'b').delete();

      expect(executedQueries).to.eql([`delete from "pets" ${where}`]);
      expect(findQueries).to.eql([findQuery]);
    });

    it('patch() with orWhere and an onBuild() hook in a modifier', async () => {
      await owner()
        .$relatedQuery('pets')
        .modify(onBuild)
        .where('name', 'a')
        .orWhere('name', 'b')
        .patch({ name: 'c' });

      expect(executedQueries).to.eql([`update "pets" set "name" = 'c' ${where}`]);
      expect(findQueries).to.eql([findQuery]);
    });
  });

  describe('wheres added in onBuildKnex()', () => {
    it('are built', () => {
      expect(
        sql(
          Pet.query()
            .where('name', 'a')
            .onBuildKnex((knexQuery, query) => {
              query.where('age', 2);
            }),
        ),
      ).to.equal(`select "pets".* from "pets" where "name" = 'a' and "age" = 2`);
    });
  });

  describe('BelongsToOneRelation', () => {
    it('find', () => {
      expect(
        sql(owner().$relatedQuery('favoritePet').where('name', 'a').orWhere('name', 'b')),
      ).to.equal(
        `select "pets".* from "pets" where "pets"."id" in (2) and ("name" = 'a' or "name" = 'b')`,
      );
    });

    it('delete', () => {
      expect(
        sql(owner().$relatedQuery('favoritePet').where('name', 'a').orWhere('name', 'b').delete()),
      ).to.equal(`delete from "pets" where ("name" = 'a' or "name" = 'b') and "pets"."id" in (2)`);
    });

    it('patch', () => {
      expect(
        sql(
          owner()
            .$relatedQuery('favoritePet')
            .where('name', 'a')
            .orWhere('name', 'b')
            .patch({ name: 'c' }),
        ),
      ).to.equal(
        `update "pets" set "name" = 'c' where ("name" = 'a' or "name" = 'b') and "pets"."id" in (2)`,
      );
    });
  });

  describe('ManyToManyRelation', () => {
    it('find', () => {
      expect(sql(owner().$relatedQuery('toys').where('name', 'a').orWhere('name', 'b'))).to.equal(
        `select "toys".* from "toys" inner join "ownersToys" on "toys"."id" = "ownersToys"."toyId" where "ownersToys"."ownerId" in (1) and ("name" = 'a' or "name" = 'b')`,
      );
    });

    it('delete', () => {
      expect(
        sql(owner().$relatedQuery('toys').where('name', 'a').orWhere('name', 'b').delete()),
      ).to.equal(
        `delete from "toys" where "toys"."id" in (select "toys"."id" from "toys" inner join "ownersToys" on "toys"."id" = "ownersToys"."toyId" where "ownersToys"."ownerId" in (1) and ("name" = 'a' or "name" = 'b'))`,
      );
    });

    it('patch', () => {
      expect(
        sql(
          owner()
            .$relatedQuery('toys')
            .where('name', 'a')
            .orWhere('name', 'b')
            .patch({ name: 'c' }),
        ),
      ).to.equal(
        `update "toys" set "name" = 'c' where "toys"."id" in (select "toys"."id" from "toys" inner join "ownersToys" on "toys"."id" = "ownersToys"."toyId" where "ownersToys"."ownerId" in (1) and ("name" = 'a' or "name" = 'b'))`,
      );
    });

    it('unrelate', async () => {
      await owner().$relatedQuery('toys').where('name', 'a').orWhere('name', 'b').unrelate();

      expect(executedQueries).to.eql([
        `delete from "ownersToys" where "ownersToys"."ownerId" in (1) and exists (select 1 from "toys" where "toys"."id" = "ownersToys"."toyId" and ("name" = 'a' or "name" = 'b'))`,
      ]);
    });

    it('relation filter and join table modify with orWhere', () => {
      expect(sql(owner().$relatedQuery('filteredToys'))).to.equal(
        `select "toys".* from "toys" inner join (select "ownersToys".* from "ownersToys" where "shared" = false or "primary" = true) as "ownersToys" on "toys"."id" = "ownersToys"."toyId" where "ownersToys"."ownerId" in (1) and ("color" = 'red' or "color" = 'blue')`,
      );
    });

    it('unrelate with relation filter and join table modify with orWhere', async () => {
      await owner().$relatedQuery('filteredToys').unrelate();

      expect(executedQueries).to.eql([
        `delete from "ownersToys" where "ownersToys"."ownerId" in (1) and exists (select 1 from "toys" where "toys"."id" = "ownersToys"."toyId" and ("color" = 'red' or "color" = 'blue')) and ("shared" = false or "primary" = true)`,
      ]);
    });
  });

  describe('HasOneThroughRelation', () => {
    it('find', () => {
      expect(
        sql(owner().$relatedQuery('bestToy').where('name', 'a').orWhere('name', 'b')),
      ).to.equal(
        `select "toys".* from "toys" inner join "ownersToys" on "toys"."id" = "ownersToys"."toyId" where "ownersToys"."ownerId" in (1) and ("name" = 'a' or "name" = 'b')`,
      );
    });

    it('delete', () => {
      expect(
        sql(owner().$relatedQuery('bestToy').where('name', 'a').orWhere('name', 'b').delete()),
      ).to.equal(
        `delete from "toys" where "toys"."id" in (select "toys"."id" from "toys" inner join "ownersToys" on "toys"."id" = "ownersToys"."toyId" where "ownersToys"."ownerId" in (1) and ("name" = 'a' or "name" = 'b'))`,
      );
    });
  });
});
