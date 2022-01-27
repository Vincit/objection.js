import { Person } from '../../fixtures/person';
import { Animal } from '../../fixtures/animal';

type IPerson = Partial<
  Pick<Person, 'id' | 'firstName' | 'lastName'> & {
    pets: Partial<Pick<Animal, 'id' | 'name'>>[];
  }
>;

(async () => {
  const jennifer = await Person.query().insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence',
  });

  const personPromise: PromiseLike<Person> = Person.fromJson({ firstName: 'Jennifer' })
    .$query()
    .insert();

  const jenniferObj: IPerson = {
    firstName: 'Jennifer',
    lastName: 'Lawrence',
  };
  await Person.query().insert(jenniferObj);
})();
