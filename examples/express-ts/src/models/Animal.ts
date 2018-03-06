import { Model } from 'objection';
import Person from './Person';
import { join } from 'path';

export default class Animal extends Model {
  // prettier-ignore
  readonly id!: number;
  ownerId?: number;
  // prettier-ignore
  name!: string;
  // prettier-ignore
  species!: string;

  // Optional eager relations.
  owner?: Person;

  // Table name is the only required property.
  static tableName = 'animals';

  // Optional JSON schema. This is not the database schema! Nothing is generated
  // based on this. This is only used for validation. Whenever a model instance
  // is created it is checked against this schema. http://json-schema.org/.
  static jsonSchema = {
    type: 'object',
    required: ['name'],

    properties: {
      id: { type: 'integer' },
      ownerId: { type: ['integer', 'null'] },
      name: { type: 'string', minLength: 1, maxLength: 255 },
      species: { type: 'string', minLength: 1, maxLength: 255 }
    }
  };

  // This object defines the relations to other models.
  static relationMappings = {
    owner: {
      relation: Model.BelongsToOneRelation,
      // The related model. This can be either a Model subclass constructor or an
      // absolute file path to a module that exports one. We use the file path version
      // here to prevent require loops.
      modelClass: join(__dirname, 'Person'),
      join: {
        from: 'animals.ownerId',
        to: 'persons.id'
      }
    }
  };
}
