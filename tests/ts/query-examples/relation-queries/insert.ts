import { Person } from '../../fixtures/person';

(async () => {
  const person = await Person.query().findById(1);
  console.log(person.firstName);

  const fluffy = await person.$relatedQuery('pets').insert({ name: 'Fluffy' });
  console.log(fluffy.species);

  const movie = await person.$relatedQuery('movies').insert({ title: 'The room' });
  console.log(movie.title);
})();
