import { raw, ref } from '../../../';
import { Movie } from '../fixtures/movie';
import { Person } from '../fixtures/person';

(async () => {
  await Person.query().insert({ firstName: 'Jennifer', lastName: 'Lawrence' });

  await Movie.relatedQuery('actors')
    .for(1)
    .insert([
      { firstName: 'Jennifer', lastName: 'Lawrence' },
      { firstName: 'Bradley', lastName: 'Cooper' }
    ]);

  await Person.query().insert({
    age: Person.query().avg('age'),
    firstName: raw("'Jenni' || 'fer'")
  });

  await Person.query()
    .insert({
      age: Person.query().avg('age'),
      firstName: raw("'Jenni' || 'fer'")
    })
    .returning('*');

  await Movie.relatedQuery('actors')
    .for(1)
    .insert({
      firstName: 'Jennifer',
      lastName: 'Lawrence',
      someExtra: "I'll be written to the join table"
    });

  await Person.query().insertAndFetch({ firstName: 'Jennifer', lastName: 'Lawrence' });

  await Movie.relatedQuery('actors')
    .for(1)
    .insertAndFetch([
      { firstName: 'Jennifer', lastName: 'Lawrence' },
      { firstName: 'Bradley', lastName: 'Cooper' }
    ]);

  await Person.query().insertAndFetch({
    age: Person.query().avg('age'),
    firstName: raw("'Jenni' || 'fer'")
  });

  await Movie.relatedQuery('actors')
    .for(1)
    .insertAndFetch({
      firstName: 'Jennifer',
      lastName: 'Lawrence',
      someExtra: "I'll be written to the join table"
    });

  await Person.query().insertGraphAndFetch({ firstName: 'Jennifer', lastName: 'Lawrence' });

  await Person.query()
    .patch({ age: 24 })
    .findById(1);

  await Person.query()
    .patch({ age: 20 })
    .where('age', '<', 50);

  await Person.query()
    .patch({ age: raw('age + 1') })
    .where('age', '<', 50);

  await Person.query().patch({
    age: Person.query().avg('age'),
    firstName: raw("'Jenni' || 'fer'"),
    oldLastName: ref('lastName')
    // Unable to support with TypeScript as of Sep 26, 2019 and typescript 3.5.3
    // 'detailsJsonColumn:address.street': 'Elm street'
  });

  await Person.query().patchAndFetchById(134, { age: 24 });

  let jennifer = await Person.query().findOne({ firstName: 'Jennifer' });
  let updatedJennifer = await jennifer.$query().patchAndFetch({ age: 24 });

  await Person.query()
    .update({ firstName: 'Jennifer', lastName: 'Lawrence', age: 24 })
    .where('id', 134);

  await Person.query().update({
    firstName: raw("'Jenni' || 'fer'"),
    lastName: 'Lawrence',
    age: Person.query().avg('age'),
    oldLastName: ref('lastName') // same as knex.raw('??', ['lastName'])
  });

  await Person.query().update({
    lastName: ref('someJsonColumn:mother.lastName').castText()
    // Unable to support with TypeScript as of Sep 26, 2019 and typescript 3.5.3
    // 'detailsJsonColumn:address.street': 'Elm street'
  });

  await Person.query().updateAndFetchById(134, {
    firstName: 'Christine'
  });

  jennifer = await Person.query().findOne({ firstName: 'Jennifer' });
  updatedJennifer = await jennifer.$query().updateAndFetch({ age: 24 });

  await Person.query()
    .delete()
    .where('age', '>', 100);

  await Person.query()
    .delete()
    .whereIn(
      'id',
      Person.query()
        .select('persons.id')
        .joinRelated('pets')
        .where('pets.name', 'Fluffy')
    );

  await Person.query()
    .delete()
    .whereExists(Person.relatedQuery('pets').where('pets.name', 'Fluffy'));

  let person = await Person.query().findById(1);

  await person
    .$relatedQuery('pets')
    .delete()
    .whereNotIn('species', ['cat', 'dog']);

  await person.$relatedQuery('pets').delete();

  await Person.query().deleteById(1);
  await Person.query().deleteById([10, '20', 46]);

  let actor = await Person.query().findById(100);
  let movie = await Movie.query().findById(200);
  await actor.$relatedQuery('movies').relate(movie);

  await Person.relatedQuery('movies')
    .for(100)
    .relate(200);

  await Person.relatedQuery('movies')
    .for(
      Person.query()
        .where('firstName', 'Arnold')
        .limit(1)
    )
    .relate([100, 200, 300, 400]);

  await Person.relatedQuery('movies')
    .for(123)
    .relate(50);

  await Person.relatedQuery('movies')
    .for(123)
    .relate([50, 60, 70]);

  await Person.relatedQuery('movies')
    .for(123)
    .relate({ foo: 50, bar: 20, baz: 10 });

  await Movie.relatedQuery('actors')
    .for(1)
    .relate({
      id: 50,
      someExtra: "I'll be written to the join table"
    });

  actor = await Person.query().findById(100);
  await actor
    .$relatedQuery('movies')
    .unrelate()
    .where('name', 'like', 'Terminator%');

  await Person.relatedQuery('movies')
    .for(100)
    .unrelate()
    .where('name', 'like', 'Terminator%');

  const arnold = Person.query().findOne({
    firstName: 'Arnold',
    lastName: 'Schwarzenegger'
  });

  await Person.relatedQuery('movies')
    .for(arnold)
    .unrelate()
    .where('name', 'like', 'Terminator%');

  person = await Person.query().findById(123);

  const numUnrelatedRows = await person
    .$relatedQuery('movies')
    .unrelate()
    .where('id', 50);

  await Person.query().increment('age', 1);
  await Person.query().decrement('age', 1);

  await Person.query().truncate();
})();
