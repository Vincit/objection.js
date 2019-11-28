import { Person } from '../../fixtures/person';

(async () => {
  const jennifer = await Person.query().insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence'
  });

  const personPromise: Promise<Person> = Person.fromJson({ firstName: 'Jennifer' })
    .$query()
    .insert();
})();
