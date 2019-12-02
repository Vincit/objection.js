import { Person } from '../../fixtures/person';

(async () => {
  let numUpdated = await Person.query()
    .findById(1)
    .patch({
      firstName: 'Jennifer'
    });

  numUpdated = await Person.query()
    .patch({ lastName: 'Dinosaur' })
    .where('age', '>', 60);

  const updatedPerson = await Person.query().patchAndFetchById(246, {
    lastName: 'Updated'
  });

  await Person.fromJson({ firstName: 'Jennifer' })
    .$query()
    .update();

  await Person.fromJson({ firstName: 'Jennifer' })
    .$query()
    .patch();
})();
