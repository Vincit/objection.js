const { AjvValidator, Model } = require('../../../');
const expect = require('expect.js');

function modelClass(tableName, schema) {
  return class TestModel extends Model {
    static get tableName() {
      return tableName;
    }
    static get jsonSchema() {
      return schema;
    }
  };
}

describe('AjvValidator', () => {
  describe('patch validator', () => {
    const schema = {
      definitions: {
        TestRef1: {
          type: 'object',
          properties: {
            aRequiredProp1: { type: 'string' }
          },
          required: ['aRequiredProp1']
        },
        TestRef2: {
          type: 'object',
          properties: {
            aRequiredProp2: { type: 'string' }
          },
          required: ['aRequiredProp2']
        }
      },
      anyOf: [{ $ref: '#/definitions/TestRef1' }, { $ref: '#/definitions/TestRef2' }]
    };

    it('should remove required fields from definitions', () => {
      const validator = new AjvValidator({ onCreateAjv: () => {} });
      const validators = validator.getValidator(modelClass('test', schema), schema, true);
      const definitions = Object.entries(validators.schema.definitions);

      expect(definitions.length).to.be(2);
      definitions.forEach(d => expect(d.required).to.be(undefined));
    });
  });
});
