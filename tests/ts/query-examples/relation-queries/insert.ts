import { Person } from '../../fixtures/person';

(async () => {
  const person = await Person.query().findById(1);

  const fluffy = await person.$relatedQuery('pets').insert({ name: 'Fluffy' });

  const movie = await person.$relatedQuery('movies').insert({ title: 'The room' });
})();
