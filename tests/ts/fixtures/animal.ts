import * as objection from '../../../';
import { Person } from './person';

export class Animal extends objection.Model {
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
}
