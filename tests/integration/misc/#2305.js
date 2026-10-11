const { expect } = require('chai');
const { Model } = require('../../../');

module.exports = (session) => {
  describe('models without a primary key (idColumn = null) #2305', () => {
    const { knex } = session;
    let JobExecution;

    before(() => {
      return knex.schema
        .dropTableIfExists('job_execution')
        .createTable('job_execution', (table) => {
          table.string('name').unique();
          table.integer('runs');
        });
    });

    after(() => {
      return knex.schema.dropTableIfExists('job_execution');
    });

    before(() => {
      JobExecution = class JobExecution extends Model {
        static get tableName() {
          return 'job_execution';
        }

        static get idColumn() {
          return null;
        }
      };

      JobExecution.knex(knex);
    });

    beforeEach(() => {
      return knex('job_execution').delete();
    });

    const rows = () => knex('job_execution').orderBy('name');

    it('should have no id columns', () => {
      expect(JobExecution.getIdColumnArray()).to.eql([]);
      expect(JobExecution.getIdPropertyArray()).to.eql([]);
    });

    it('should have no id', () => {
      const job = JobExecution.fromJson({ name: 'a' });

      expect(job.$id()).to.equal(undefined);
      expect(job.$hasId()).to.equal(false);
      expect(() => job.$id(1)).to.throw('model JobExecution has no idColumn');
    });

    it('should throw a clear error for id based queries', () => {
      const job = JobExecution.fromJson({ name: 'a' });
      const message = 'model JobExecution has no idColumn';

      expect(() => JobExecution.query().findById(1).toKnexQuery()).to.throw(message);
      expect(() => JobExecution.query().findByIds([1]).toKnexQuery()).to.throw(message);
      expect(() => JobExecution.query().deleteById(1).toKnexQuery()).to.throw(message);
      expect(() => job.$query().patch({ runs: 1 }).toKnexQuery()).to.throw(message);
    });

    it('should insert a model', async () => {
      const job = await JobExecution.query().insert({ name: 'a', runs: 1 });

      expect(job).to.be.an.instanceOf(JobExecution);
      expect(job.toJSON()).to.eql({ name: 'a', runs: 1 });
      expect(await rows()).to.eql([{ name: 'a', runs: 1 }]);
    });

    it('should insert multiple models', async function () {
      if (!session.isPostgres()) {
        // Only Postgres supports batch inserts.
        return this.skip();
      }

      const jobs = await JobExecution.query().insert([
        { name: 'a', runs: 1 },
        { name: 'b', runs: 2 },
      ]);

      expect(jobs.map((job) => job.toJSON())).to.eql([
        { name: 'a', runs: 1 },
        { name: 'b', runs: 2 },
      ]);
      expect(await rows()).to.eql([
        { name: 'a', runs: 1 },
        { name: 'b', runs: 2 },
      ]);
    });

    it('should insert with onConflict().ignore()', async () => {
      await JobExecution.query().insert({ name: 'a', runs: 1 });
      const job = await JobExecution.query()
        .insert({ name: 'a', runs: 2 })
        .onConflict('name')
        .ignore();

      expect(job.toJSON()).to.eql({ name: 'a', runs: 2 });
      expect(await rows()).to.eql([{ name: 'a', runs: 1 }]);
    });

    it('should return the columns given to returning()', async function () {
      if (session.isMySql()) {
        return this.skip();
      }

      const job = await JobExecution.query().insert({ name: 'a', runs: 1 }).returning('runs');
      expect(job.runs).to.equal(1);
    });

    it('should patch, update, find and delete by where clauses', async () => {
      await JobExecution.query().insert({ name: 'a', runs: 1 });

      expect(await JobExecution.query().patch({ runs: 2 }).where('name', 'a')).to.equal(1);
      expect(await JobExecution.query().update({ name: 'a', runs: 3 }).where('name', 'a')).to.equal(
        1,
      );
      expect((await JobExecution.query().findOne({ name: 'a' })).runs).to.equal(3);
      expect(await JobExecution.query().delete().where('name', 'a')).to.equal(1);
      expect(await rows()).to.eql([]);
    });

    describe('as the join model of a many-to-many relation', () => {
      before(() => {
        return knex.schema
          .dropTableIfExists('job_tag')
          .dropTableIfExists('job')
          .dropTableIfExists('tag')
          .createTable('job', (table) => {
            table.integer('id').primary();
          })
          .createTable('tag', (table) => {
            table.integer('id').primary();
          })
          .createTable('job_tag', (table) => {
            table.integer('job_id');
            table.integer('tag_id');
          });
      });

      after(() => {
        return knex.schema
          .dropTableIfExists('job_tag')
          .dropTableIfExists('job')
          .dropTableIfExists('tag');
      });

      beforeEach(async () => {
        await knex('job_tag').delete();
        await knex('job').delete();
        await knex('tag').delete();
        await knex('job').insert({ id: 1 });
        await knex('tag').insert([{ id: 1 }, { id: 2 }]);
      });

      class Tag extends Model {
        static tableName = 'tag';
      }

      class GetterJobTag extends Model {
        static get tableName() {
          return 'job_tag';
        }

        static get idColumn() {
          return null;
        }
      }

      class FieldJobTag extends Model {
        static tableName = 'job_tag';
        static idColumn = null;
      }

      for (const JobTag of [GetterJobTag, FieldJobTag]) {
        it(`should relate, find and unrelate with ${JobTag.name}`, async () => {
          class Job extends Model {
            static tableName = 'job';

            static relationMappings = {
              tags: {
                relation: Model.ManyToManyRelation,
                modelClass: Tag,
                join: {
                  from: 'job.id',
                  through: {
                    modelClass: JobTag,
                    from: 'job_tag.job_id',
                    to: 'job_tag.tag_id',
                  },
                  to: 'tag.id',
                },
              },
            };
          }

          const job = Job.bindKnex(knex).fromJson({ id: 1 });

          await job.$relatedQuery('tags').relate(1);
          await job.$relatedQuery('tags').relate(2);
          const tags = await job.$relatedQuery('tags').orderBy('tag.id');
          expect(tags.map((tag) => tag.id)).to.eql([1, 2]);

          expect(await job.$relatedQuery('tags').unrelate().where('tag.id', 1)).to.equal(1);
          expect(await knex('job_tag')).to.eql([{ job_id: 1, tag_id: 2 }]);

          // The join model class is not modified by the relation.
          expect(JobTag.getIdColumn()).to.equal(null);
        });
      }
    });
  });
};
