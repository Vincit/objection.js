import { raw, ref } from '../../../../';
import { Person } from '../../fixtures/person';

(async () => {
  const numberOfAffectedRows = await Person.query()
    .update({ firstName: 'Jennifer', lastName: 'Lawrence' })
    .where('id', 134);

  await Person.query().update({
    firstName: raw("'Jenni' || 'fer'"),
    lastName: 'Lawrence',
    age: Person.query().avg('age'),
    oldLastName: ref('lastName')
  });

  await Person.query().update({
    lastName: ref('someJsonColumn:mother.lastName').castText(),
    'detailsJsonColumn:address.street': 'Elm street'
  } as any);
})();
