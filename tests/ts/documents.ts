import { Person } from './fixtures/person';

(async () => {
  const jennifer = await Person.query().insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence',
    age: 24,
    address: {
      street: 'Somestreet 10',
      zipCode: '123456',
      city: 'Tampere'
    }
  });

  const jenniferFromDb = await Person.query().findById(jennifer.id);

  console.log(jennifer.address.city); // --> Tampere
  console.log(jenniferFromDb.address.city); // --> Tampere
})();
