import { Person } from '../../fixtures/person';

(async () => {
  const person = await Person.query().findById(1);

  const pets = await person
    .$relatedQuery('pets')
    .where('species', 'dog')
    .orderBy('name');
})();
