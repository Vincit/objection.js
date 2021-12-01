import { Person } from '../fixtures/person';

(async () => {
  let jennifer = await Person.query().findById(1);

  const updateJennifer = await jennifer!
    .$query()
    .patch({ firstName: 'J.', lastName: 'Lawrence' })
    .returning('*');

  console.log(updateJennifer.firstName);
})();
