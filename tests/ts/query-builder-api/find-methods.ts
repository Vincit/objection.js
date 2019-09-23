import { raw } from '../../..';
import { Movie } from '../fixtures/movie';
import { Person } from '../fixtures/person';

(async () => {
  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#findbyid
  const person = await Person.query().findById(1);
  await Person.query().findById([1, '10']);
  await Person.query()
    .findById(1)
    .patch({ firstName: 'Jennifer' });

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#findbyids
  const [person1, person2] = await Person.query().findByIds([1, 2]);
  const [person3, person4] = await Person.query().findByIds([[1, '10'], [2, '10']]);

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#findone
  await Person.query().findOne({
    firstName: 'Jennifer',
    lastName: 'Lawrence'
  });
  await Person.query().findOne('age', '>', 20);
  await Person.query().findOne(raw('random() < 0.5'));

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#alias
  await Person.query()
    .alias('p')
    .where('p.id', 1)
    .join('persons as parent', 'parent.id', 'p.parentId');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#aliasfor
  await Person.query()
    .aliasFor('persons_movies', 'pm')
    .joinRelation('movies')
    .where('pm.someProp', 100);
  await Person.query()
    .aliasFor(Movie, 'm')
    .joinRelation('movies')
    .where('m.name', 'The Room');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#select
  await Person.query().select('id', 'name');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#forupdate
  await Person.query()
    .transacting(Person.knex())
    .select('*');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#forshare
  await Person.query()
    .forShare()
    .select('*');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#as
  await Person.query()
    .select('name')
    .as('person_name');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#columns
  await Person.query()
    .columns('firstName', 'lastName')
    .select();
  await Person.query()
    .columns(['firstName', 'lastName'])
    .select();
  await Person.query()
    .columns('firstName', { last: 'lastName' }, 'age')
    .select();

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#column
  await Person.query()
    .column('firstName', 'lastName')
    .select();
  await Person.query()
    .column(['firstName', 'lastName'])
    .select();
  await Person.query()
    .column('firstName', { last: 'lastName' }, 'age')
    .select();

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#from
  await Person.query()
    .select('*')
    .from('employees');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#into
  // No example available in Knex documentation

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#with
  await Person.query().with('young_adults', Person.query().where('age', '<', 30));

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#withschema
  await Person.query()
    .withSchema('legacy')
    .select('*');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#table
  // No example available in Knex documentation

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#distinct
  await Person.query().distinct('firstName', 'lastName');

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#where
  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#andwhere
  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#orwhere
  await Person.query().where('firstName', 'Will');
  await Person.query().where({
    firstName: 'Will'
  });
  await Person.query()
    .where(builder => {
      builder.whereIn('id', [1, 11, 15]).whereNotIn('id', [17, 19]);
    })
    .andWhere(function() {
      this.where('id', '>', 10);
    });
  await Person.query()
    .where(function() {
      this.where('id', 1).orWhere('id', '>', 10);
    })
    .orWhere({ name: 'Tester' });
  await Person.query().where('firstName', 'like', '%mark%');
  await Person.query().where('votes', '>', 100);
  let subquery = Person.query()
    .where('votes', '>', 100)
    .andWhere('status', 'active')
    .orWhere('name', 'John')
    .select('id');
  await Person.query().where('id', 'in', subquery);
  await Person.query()
    .where('id', 1)
    .orWhere({ votes: 100, user: 'knex' });

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#wherenot
  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#orwherenot
  await Person.query()
    .whereNot({
      firstName: 'Test',
      lastName: 'User'
    })
    .select('id');
  await Person.query().whereNot('id', 1);
  await Person.query()
    .whereNot(function() {
      this.where('id', 1).orWhereNot('id', '>', 10);
    })
    .orWhereNot({ name: 'Tester' });
  await Person.query().whereNot('votes', '>', 100);
  subquery = Person.query()
    .whereNot('votes', '>', 100)
    .andWhere('status', 'active')
    .orWhere('name', 'John')
    .select('id');
  await Person.query().where('id', 'not in', subquery);

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#whereraw
  await Person.query().whereRaw('id = ?', [1]);

  // https://vincit.github.io/objection.js/api/query-builder/find-methods.html#wherewrapped
  // No example available in Knex documentation
})();
