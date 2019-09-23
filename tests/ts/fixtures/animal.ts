import * as objection from '../../../';
import { Person } from './person';

export class Animal extends objection.Model {
  id!: number;

  species!: string;
  name?: string;
  owner?: Person;

  // Tests the ColumnNameMappers interface.
  static columnNameMappers = {
    parse(json: objection.Pojo) {
      return json;
    },

    format(json: objection.Pojo) {
      return json;
    }
  };

  static get modifiers() {
    return {
      orderByName(builder: objection.QueryBuilder<Animal>) {
        builder.orderBy('name');
      },

      onlyDogs(builder: objection.QueryBuilder<Animal>) {
        builder.where('species', 'dog');
      }
    };
  }
}
