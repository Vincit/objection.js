import * as ajv from 'ajv';
import * as objection from '../../../';
import { Animal } from './animal';
import { Movie } from './movie';

class CustomValidationError extends Error {}

export class Person extends objection.Model {
  id!: number;

  // With TypeScript 2.7, fields in models need either optionality:
  firstName?: string;
  // Or for not-null fields that are always initialized, you can use the new ! syntax:
  lastName!: string;
  mom?: Person;
  children?: Person[];
  // Note that $relatedQuery won't work for optional fields (at least until TS 2.8), so this gets a !:
  pets!: Animal[];
  comments?: Comment[];
  movies?: Movie[];
  age!: number;
  parent?: Partial<Person> | null;

  oldLastName?: string;

  detailsJsonColumn!: objection.Pojo;
  address!: objection.Pojo;

  // fields marked as extras in relationMappings
  someExtra!: string;

  static columnNameMappers = objection.snakeCaseMappers();

  examplePersonMethod = (arg: string) => 1;

  static staticExamplePersonMethod() {
    return 100;
  }

  petsWithId(petId: number): Promise<Animal[]> {
    return this.$relatedQuery('pets').where('id', petId);
  }

  fetchMom(): Promise<Person | undefined> {
    return this.$relatedQuery('mom');
  }

  async $beforeInsert(queryContext: objection.QueryContext) {
    console.log(queryContext.someCustomValue);
  }

  $formatDatabaseJson(json: objection.Pojo) {
    // Test that any property can be accessed and set.
    json.bar = json.foo;
    return json;
  }

  $parseDatabaseJson(json: objection.Pojo) {
    // Test that any property can be accessed and set.
    json.foo = json.bar;
    return json;
  }

  static createValidator() {
    return new objection.AjvValidator({
      onCreateAjv(ajvalidator: ajv.Ajv) {
        // modify ajvalidator
      },
      options: {
        allErrors: false
      }
    });
  }

  static createValidationError(args: objection.CreateValidationErrorArgs) {
    const { message, type, data } = args;
    const errorItem: objection.ValidationErrorItem = data['someProp'];
    const itemMessage: string = errorItem.message;
    return new CustomValidationError('my custom error: ' + message + ' ' + itemMessage);
  }

  static get modifiers() {
    return {
      defaultSelects(builder: objection.QueryBuilder<Person>) {
        builder.select('id', 'firstName');
      },

      orderByAge(builder: objection.QueryBuilder<Person>) {
        builder.orderBy('age');
      }
    };
  }
}
