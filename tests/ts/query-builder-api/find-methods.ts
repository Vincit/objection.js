import { raw, ref } from '../../..';
import { Movie } from '../fixtures/movie';
import { Person } from '../fixtures/person';

(async () => {
  const person = await Person.query().findById(1);
  await Person.query().findById([1, '10']);
  await Person.query()
    .findById(1)
    .patch({ firstName: 'Jennifer' });

  const [person1, person2] = await Person.query().findByIds([1, 2]);
  const [person3, person4] = await Person.query().findByIds([
    [1, '10'],
    [2, '10']
  ]);

  await Person.query().findOne({
    firstName: 'Jennifer',
    lastName: 'Lawrence'
  });
  await Person.query().findOne('age', '>', 20);
  await Person.query().findOne(raw('random() < 0.5'));

  await Person.query()
    .alias('p')
    .where('p.id', 1)
    .join('persons as parent', 'parent.id', 'p.parentId');

  await Person.query()
    .aliasFor('persons_movies', 'pm')
    .joinRelated('movies')
    .where('pm.someProp', 100);
  await Person.query()
    .aliasFor(Movie, 'm')
    .joinRelated('movies')
    .where('m.name', 'The Room');

  await Person.query().select('id', 'name');

  await Person.query()
    .transacting(Person.knex())
    .select('*');

  await Person.query()
    .forShare()
    .select('*');

  await Person.query()
    .select('name')
    .as('person_name');

  await Person.query()
    .columns('firstName', 'lastName')
    .select();
  await Person.query()
    .columns(['firstName', 'lastName'])
    .select();
  await Person.query()
    .columns('firstName', { last: 'lastName' }, 'age')
    .select();

  await Person.query()
    .column('firstName', 'lastName')
    .select();
  await Person.query()
    .column(['firstName', 'lastName'])
    .select();
  await Person.query()
    .column('firstName', { last: 'lastName' }, 'age')
    .select();

  await Person.query()
    .select('*')
    .from('employees');

  // No example available in Knex documentation

  await Person.query().with('young_adults', Person.query().where('age', '<', 30));

  await Person.query()
    .withSchema('legacy')
    .select('*');

  // No example available in Knex documentation

  await Person.query().distinct('firstName', 'lastName');

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

  await Person.query().whereRaw('id = ?', [1]);

  // No example available in Knex documentation

  await Person.query()
    .groupBy('count')
    .orderBy('name', 'desc')
    .having('count', '>', 100);

  await Person.query().whereExists(function() {
    this.select('*')
      .from('accounts')
      .whereRaw('users.account_id = accounts.id');
  });

  await Person.query().whereNotExists(function() {
    this.select('*')
      .from('accounts')
      .whereRaw('users.account_id = accounts.id');
  });
  await Person.query().orWhereNotExists(function() {
    this.select('*')
      .from('accounts')
      .whereRaw('users.account_id = accounts.id');
  });

  await Person.query()
    .whereIn('id', [1, 2, 3])
    .orWhereIn('id', [4, 5, 6]);
  await Person.query().whereIn('account_id', function() {
    this.select('id').from('accounts');
  });

  await Person.query().whereNotIn('id', [1, 2, 3]);
  await Person.query()
    .where('name', 'like', '%Test%')
    .orWhereNotIn('id', [1, 2, 3]);

  await Person.query().whereNull('updated_at');
  await Person.query().whereNotNull('created_at');
  await Person.query().whereExists(function() {
    this.select('*')
      .from('accounts')
      .whereRaw('users.account_id = accounts.id');
  });
  await Person.query().whereNotExists(function() {
    this.select('*')
      .from('accounts')
      .whereRaw('users.account_id = accounts.id');
  });
  await Person.query().whereBetween('votes', [1, 100]);
  await Person.query().whereNotBetween('votes', [1, 100]);

  await Person.query().whereColumn('firstName', 'like', ref('foo'));
  await Person.query()
    .andWhereColumn('firstName', 'like', ref('foo'))
    .orWhereColumn('firstName', 'like', ref('bar'));

  await Person.query()
    .whereNotColumn('firstName', 'like', 'foo')
    .andWhereNotColumn('lastName', 'like', 'bar')
    .orWhereNotColumn('age', '>', '35');

  await Person.query().groupBy('age');
  await Person.query().groupByRaw('age');

  await Person.query().orderBy('email');
  await Person.query().orderBy('email', 'ASC');
  await Person.query().orderBy('email', 'desc');
  await Person.query().orderByRaw('? ASC', ['email']);
  await Person.query().orderByRaw('email desc');

  await Person.query()
    .whereNull('last_name')
    .union(function() {
      this.select('*')
        .from('users')
        .whereNull('first_name');
    });
  await Person.query()
    .whereNull('last_name')
    .union([Person.query().whereNull('first_name')]);

  await Person.query().unionAll(function() {
    this.select('*')
      .from('users')
      .whereNull('first_name');
  });
  await Person.query()
    .whereNull('last_name')
    .unionAll([Person.query().whereNull('first_name')]);

  await Person.query()
    .groupBy('age')
    .orderBy('firstName', 'desc')
    .having('age', '>', 18);

  await Person.query().havingIn('id', [5, 3, 10, 17]);

  await Person.query()
    .groupBy('count')
    .orderBy('name', 'desc')
    .havingRaw('count > ?', [100])
    .orHaving('count', '<', 50)
    .orHavingRaw('count = ?', [15]);

  await Person.query().offset(10);

  await Person.query()
    .limit(100)
    .offset(200);

  await Person.query().count();
  await Person.query().resultSize();

  await Person.query().countDistinct('firstName');

  await Person.query().min('age');
  await Person.query().max('age');
  await Person.query().sum('age');
  await Person.query().avg('age');
  await Person.query().avgDistinct('age');

  await Person.query()
    .insert({
      firstName: 'Foo'
    })
    .returning('*');

  const info = Person.query().columnInfo();

  await Person.query().whereComposite(['id', 'name'], '=', [1, 'Jennifer']);
  await Person.query().whereComposite('id', 1);

  await Person.query().whereInComposite(
    ['a', 'b'],
    [
      [1, 2],
      [3, 4],
      [1, 4]
    ]
  );
  await Person.query().whereInComposite('a', [[1], [3], [1]]);
  await Person.query().whereInComposite('a', [1, 3, 1]);
  await Person.query().whereInComposite(['a', 'b'], Person.query().select('a', 'b'));

  await Person.query().whereJsonSupersetOf('additionalData:myDogs', 'additionalData:dogsAtHome');
  await Person.query().whereJsonSupersetOf('additionalData:myDogs[0]', { name: 'peter' });

  await Person.query().orWhereJsonSupersetOf('additionalData:myDogs', 'additionalData:dogsAtHome');
  await Person.query().orWhereJsonSupersetOf('additionalData:myDogs[0]', { name: 'peter' });

  await Person.query().whereJsonNotSupersetOf('additionalData:myDogs', 'additionalData:dogsAtHome');
  await Person.query().whereJsonNotSupersetOf('additionalData:myDogs[0]', { name: 'peter' });

  await Person.query().orWhereJsonNotSupersetOf(
    'additionalData:myDogs',
    'additionalData:dogsAtHome'
  );
  await Person.query().orWhereJsonNotSupersetOf('additionalData:myDogs[0]', { name: 'peter' });

  await Person.query().whereJsonSubsetOf('additionalData:myDogs', 'additionalData:dogsAtHome');
  await Person.query().whereJsonSubsetOf('additionalData:myDogs[0]', { name: 'peter' });

  await Person.query().orWhereJsonSubsetOf('additionalData:myDogs', 'additionalData:dogsAtHome');
  await Person.query().orWhereJsonSubsetOf('additionalData:myDogs[0]', { name: 'peter' });

  await Person.query().whereJsonNotSubsetOf('additionalData:myDogs', 'additionalData:dogsAtHome');
  await Person.query().whereJsonNotSubsetOf('additionalData:myDogs[0]', { name: 'peter' });

  await Person.query().orWhereJsonNotSubsetOf('additionalData:myDogs', 'additionalData:dogsAtHome');
  await Person.query().orWhereJsonNotSubsetOf('additionalData:myDogs[0]', { name: 'peter' });

  await Person.query().whereJsonIsArray('additionalData');

  await Person.query().orWhereJsonIsArray('additionalData');

  await Person.query().whereJsonNotArray('additionalData');

  await Person.query().orWhereJsonNotArray('additionalData');

  await Person.query().whereJsonIsObject('additionalData');

  await Person.query().orWhereJsonIsObject('additionalData');

  await Person.query().whereJsonNotObject('additionalData');

  await Person.query().orWhereJsonNotObject('additionalData');

  await Person.query().whereJsonHasAny('additionalData', 'foo');
  await Person.query().whereJsonHasAny('additionalData', ['foo', 'bar']);

  await Person.query().orWhereJsonHasAny('additionalData', 'foo');
  await Person.query().orWhereJsonHasAny('additionalData', ['foo', 'bar']);

  await Person.query().whereJsonHasAll('additionalData', 'foo');
  await Person.query().whereJsonHasAll('additionalData', ['foo', 'bar']);

  await Person.query().orWhereJsonHasAll('additionalData', 'foo');
  await Person.query().orWhereJsonHasAll('additionalData', ['foo', 'bar']);
})();
