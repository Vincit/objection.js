import { Person } from '../fixtures/person';
import { ModelObject } from '../../../typings/objection';

const takesPersonPojo = (person: ModelObject<Person>) => true;

const person = Person.fromJson({ firstName: 'Jennifer' });
const personPojo = person.toJSON();

takesPersonPojo(personPojo);
