import { Person } from '../../fixtures/person';

(async () => {
  const jennifer = await Person.query().insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence'
  });
})();
