import { Animal } from '../../fixtures/animal';
import { Person } from '../../fixtures/person';

(async () => {
  const person = await Person.query().findById(1);

  console.log(person.firstName);
  console.log(person instanceof Person); // --> true

  const people = await Person.query();

  console.log(people[0] instanceof Person); // --> true
  console.log('there are', people.length, 'People in total');

  const middleAgedJennifers = await Person.query()
    .where('age', '>', 40)
    .where('age', '<', 60)
    .where('firstName', 'Jennifer')
    .orderBy('lastName');

  console.log('The last name of the first middle aged Jennifer is');
  console.log(middleAgedJennifers[0].lastName);
})();

(async () => {
  const people = await Person.query()
    .select('persons.*', 'Parent.firstName as parentFirstName')
    .join('persons as parent', 'persons.parentId', 'parent.id')
    .where('persons.age', '<', Person.query().avg('persons.age'))
    .whereExists(
      Animal.query()
        .select(1)
        .whereColumn('persons.id', 'animals.ownerId')
    )
    .orderBy('persons.lastName');
})();

(async () => {
  const people = await Person.query()
    .select('parent:parent.name as grandParentName')
    .joinRelated('parent.parent');
})();

(async () => {
  const nonMiddleAgedJennifers = await Person.query()
    .where(builder => builder.where('age', '<', 4).orWhere('age', '>', 60))
    .where('firstName', 'Jennifer')
    .orderBy('lastName');
})();
