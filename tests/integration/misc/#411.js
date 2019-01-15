const expect = require('expect.js');
const { AjvValidator, Model } = require('../../../');

module.exports = session => {
  describe('leverage ajv cache and serialize function #411', () => {
    let ajvValidator;

    class Person extends Model {
      static get jsonSchema() {
        return {
          type: 'object',
          properties: {
            foo: { type: 'string' }
          }
        };
      }

      static createValidator() {
        ajvValidator = new AjvValidator({
          onCreateAjv: ajv => {},
          options: {
            allErrors: true,
            validateSchema: false,
            ownProperties: true,
            v5: true,
            serialize(value) {
              return 'blaa blaa';
            }
          }
        });

        return ajvValidator;
      }

      $beforeValidate(json, jsonSchema) {
        return jsonSchema;
      }
    }

    it('test', () => {
      const model = Person.fromJson({ foo: 'bar' });
      expect(ajvValidator.cache.has('blaa blaa')).to.equal(true);
    });
  });
};
