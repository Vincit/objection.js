import { Person } from '../../fixtures/person';

(async () => {
  const person = await Person.query().findById(1);

  const pets = await person
    .$relatedQuery('pets')
    .where('species', 'dog')
    .orderBy('name');

  console.log(pets[0].name);

  const pets2 = await Person.relatedQuery('pets').for([1, 2, 3]);
  console.log(pets2[0].species);

  const movies = await Person.relatedQuery('movies').for(1);
  console.log(movies[0].title);

  const mom = await Person.relatedQuery('mom').for(1);
  console.log(mom[0].firstName);
})();
