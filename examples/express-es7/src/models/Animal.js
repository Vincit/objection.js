import { Model } from 'objection';

export default class Animal extends Model {
  // Table name is the only required property.
  static tableName = 'Animal';

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
      modelClass: `${__dirname}/Person`,
      join: {
        from: 'Animal.ownerId',
        to: 'Person.id'
      }
    }
  };
}
