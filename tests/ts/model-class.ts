import { Person } from './fixtures/person';
import { Animal } from './fixtures/animal';
import { ModelClass } from '../../';

(async () => {
  const query = Person.query();
  const modelClass = query.modelClass();

  const persons: Person[] = await modelClass.query();
  const pets: Animal[] = await modelClass.relatedQuery('pets');
})();

(async () => {
  const modelClass: ModelClass<Person> = Person;

  const tableName: string = modelClass.tableName;
  const persons = await modelClass.query().where('firstName', 'Jennifer');
  const persons2: Person[] = await modelClass.fetchGraph(persons, 'pets');
})();

(async () => {
  const property: string = Person.propertyNameToColumnName('firstName');
  
  // @ts-expect-error
  const propertyFail: string = Person.propertyNameToColumnName('first_name');
})();

(async () => {
  // @ts-expect-error
  const propertyFail: string = Person.columnNameToPropertyName('firstName');

  const property: string = Person.columnNameToPropertyName('first_name');
})();
