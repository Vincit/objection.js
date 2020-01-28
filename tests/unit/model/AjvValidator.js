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
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id: { type: 'integer' },
        meta: {
          type: 'object',
          additionalProperties: false,
          required: ['id2'],
          properties: {
            id2: { type: 'integer' },
            meta2: {
              type: 'object',
              additionalProperties: false,
              required: ['id3'],
              properties: {
                id3: { type: 'integer' },
                meta3: { type: 'object' }
              }
            }
        }
    };

    it('should remove required fields recursively', () => {
      const expectSchema = {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'integer' },
          meta: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id2: { type: 'integer' },
              meta2: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id3: { type: 'integer' },
                  meta3: { type: 'object' }
                }
              }
          }
      };
    
      const validator = new AjvValidator({ onCreateAjv: () => {} });
      const validators = validator.getValidator(modelClass('test', schema), schema, true);
      
      expect(validators.schema).to.eql(expectSchema);
    });
  });
});
