import { Movie } from '../../fixtures/movie';
import { Person } from '../../fixtures/person';

(async () => {
  const person = await Person.query().findById(123);

  await person.$relatedQuery('movies').relate(50);

  await person.$relatedQuery('movies').relate([50, 60, 70]);

  await person.$relatedQuery('movies').relate({
    foo: 50,
    bar: 20,
    baz: 10
  });

  const someMovie = await Movie.query().findById(2);

  await someMovie.$relatedQuery('actors').relate({
    id: 50,
    someExtra: "I'll be written to the join table"
  });
})();
