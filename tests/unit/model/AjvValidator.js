const { AjvValidator, Model } = require('../../../');
const { cloneDeep } = require('../../../lib/utils/objectUtils');
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
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer' },
        meta: {
          type: 'object',
          required: ['id2'],
          properties: {
            id2: { type: 'integer' },
            meta2: {
              type: 'object',
              required: ['id3'],
              properties: {
                id3: { type: 'integer' },
                meta3: { type: 'object' },
                arr1: { type: 'array', items: { type: 'string' } },
                arr2: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id4'],
                    properties: {
                      id4: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      },
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

    const originalSchema = cloneDeep(schema);

    it('should remove required fields recursively', () => {
      const expectSchemaNoRequired = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          meta: {
            type: 'object',
            properties: {
              id2: { type: 'integer' },
              meta2: {
                type: 'object',
                properties: {
                  id3: { type: 'integer' },
                  meta3: { type: 'object' },
                  arr1: { type: 'array', items: { type: 'string' } },
                  arr2: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id4: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        definitions: {
          TestRef1: {
            type: 'object',
            properties: {
              aRequiredProp1: { type: 'string' }
            }
          },
          TestRef2: {
            type: 'object',
            properties: {
              aRequiredProp2: { type: 'string' }
            }
          }
        }
      };

      const validator = new AjvValidator({ onCreateAjv: () => {} });
      const validatorNoRequired = validator.getValidator(modelClass('test', schema), schema, true);
      const validatorWithRequired = validator.getValidator(
        modelClass('test', schema),
        schema,
        false
      );

      expect(validatorWithRequired.schema).to.eql(originalSchema);
      expect(validatorNoRequired.schema).to.eql(expectSchemaNoRequired);
    });
  });
});
