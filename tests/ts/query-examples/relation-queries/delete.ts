import { Person } from '../../fixtures/person';

(async () => {
  const numberOfDeletedRows = await Person.query()
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

  // This is another way to implement the same query.
  await Person.query()
    .delete()
    .whereExists(Person.relatedQuery('pets').where('pets.name', 'Fluffy'));

  const person = await Person.query().findById(1);

  // Delete all pets but cats and dogs of a person.
  await person
    .$relatedQuery('pets')
    .delete()
    .whereNotIn('species', ['cat', 'dog']);

  // Delete all pets of a person.
  await person.$relatedQuery('pets').delete();
})();
