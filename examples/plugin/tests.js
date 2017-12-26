'use strict';

const sessionPlugin = require('./');
const expect = require('expect.js');
const Model = require('objection').Model;
const Knex = require('knex');

const ISO_DATE_REGEX = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

describe('example plugin tests', () => {
  let knex;

  before(() => {
    knex = Knex({
      client: 'sqlite3',
      useNullAsDefault: true,
      connection: {
        filename: './test.db'
      }
    });
  });

  before(() => {
    return knex.schema.createTable('Person', table => {
      table.increments('id').primary();
      table.string('name');
      table.string('createdBy');
      table.string('createdAt');
      table.string('modifiedBy');
      table.string('modifiedAt');
    });
  });

  after(() => {
    return knex.schema.dropTable('Person');
  });

  after(() => {
    return knex.destroy();
  });

  beforeEach(() => {
    return knex('Person').delete();
  });

  it('should add `createdBy` and `createdAt` properties automatically on insert', () => {
    const session = {
      userId: 'foo'
    };

    class Person extends sessionPlugin(Model) {
      static get tableName() {
        return 'Person';
      }
    }

    return Person.query(knex)
      .session(session)
      .insert({ name: 'Jennifer' })
      .then(jennifer => {
        expect(jennifer.createdBy).to.equal(session.userId);
        expect(jennifer.createdAt).to.match(ISO_DATE_REGEX);
      });
  });

  it('should add `modifiedBy` and `modifiedAt` properties automatically on update', () => {
    class Person extends sessionPlugin(Model) {
      static get tableName() {
        return 'Person';
      }
    }

    return Person.query(knex)
      .session({ userId: 'foo' })
      .insert({ name: 'Jennifer' })
      .then(jennifer => {
        return jennifer
          .$query(knex)
          .session({ userId: 'bar' })
          .patchAndFetch({ name: 'Jonnifer' });
      })
      .then(jonnifer => {
        expect(jonnifer.createdBy).to.equal('foo');
        expect(jonnifer.createdAt).to.match(ISO_DATE_REGEX);
        expect(jonnifer.modifiedBy).to.equal('bar');
        expect(jonnifer.modifiedAt).to.match(ISO_DATE_REGEX);
      });
  });
});
