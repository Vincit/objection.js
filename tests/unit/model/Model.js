'use strict';

const _ = require('lodash');
const knex = require('knex');
const expect = require('expect.js');
const Model = require('../../../').Model;
const QueryBuilder = require('../../../').QueryBuilder;
const ValidationError = require('../../../').ValidationError;

describe('Model', () => {

  describe('fromJson', () => {
    let Model1;

    beforeEach(() => {
      Model1 = createModelClass();
    });

    it('should copy attributes to the created object', () => {
      let json = {a: 1, b: 2, c: {d: 'str1'}, e: [3, 4, {f: 'str2'}]};
      let model = Model1.fromJson(json);

      expect(model.a).to.equal(1);
      expect(model.b).to.equal(2);
      expect(model.c.d).to.equal('str1');
      expect(model.e[0]).to.equal(3);
      expect(model.e[1]).to.equal(4);
      expect(model.e[2].f).to.equal('str2');
    });

    it('should skip properties starting with $', () => {
      let model = Model1.fromJson({a: 1, $b: 2});

      expect(model.a).to.equal(1);
      expect(model).not.to.have.property('$b');
    });

    it('should skip functions', () => {
      let model = Model1.fromJson({a: 1, b: () => {}});

      expect(model.a).to.equal(1);
      expect(model).not.to.have.property('b');
    });

    it('should call $parseJson', () => {
      let calls = 0;
      let json = {a: 1};
      let options = {b: 2};

      Model1.prototype.$parseJson = function (jsn, opt) {
        ++calls;
        expect(jsn).to.eql(json);
        expect(opt).to.eql(options);
        return {c: 3};
      };

      let model = Model1.fromJson(json, options);

      expect(model).not.to.have.property('a');
      expect(model.c).to.equal(3);
      expect(calls).to.equal(1);
    });

    it('should validate if jsonSchema is defined', () => {
      Model1.jsonSchema = {
        required: ['a'],
        additionalProperties: false,
        properties: {
          a: {type: 'string'},
          b: {type: 'number'},
          c: {
            type: 'object',
            properties: {
              d: {type: 'string'},
              e: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    f: {type: 'number'}
                  }
                }
              }
            }
          }
        }
      };

      expect(() => {
        Model1.fromJson({a: 'str', b: 1});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({a: 'str'});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({a: 'a', c: {d: 'test'}});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({a: 'a', c: {d: 'test', e: [{f: 1}]}});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({a: 1, b: '1'});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('a');
        expect(exp.data).to.have.property('b');
      });

      expect(() => {
        Model1.fromJson({b: 1});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('a');
      });

      expect(() => {
        Model1.fromJson({a: 'a', additional: 1});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('additional');
      });

      expect(() => {
        Model1.fromJson({a: 'a', c: {d: 10}});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('c.d');
      });

      expect(() => {
        Model1.fromJson({a: 'a', c: {d: 'test', e: [{f: 'not a number'}]}});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('c.e[0].f');
      });

      expect(() => {
        Model1.fromJson({a: 'a', c: {d: 'test', e: [{additional: true}]}});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('c.e[0]');
      });

    });

    it('should call $validate if jsonSchema is defined', () => {
      let calls = 0;
      let json = {a: 'str', b: 2};
      let options = {some: 'option'};

      Model1.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      Model1.prototype.$validate = function (jsn, opt) {
        Model.prototype.$validate.call(this, jsn, opt);

        ++calls;
        expect(opt).to.eql(options);
        expect(jsn).to.eql(json);
      };

      expect(() => {
        Model1.fromJson(json, options);
      }).not.to.throwException(err => {
        console.log(err.stack)
      });

      expect(calls).to.equal(1);
    });

    it('should only call jsonSchema once if jsonSchema is a getter', () => {
      let calls = 0;

      Object.defineProperty(Model1, "jsonSchema", {
        get: () => {
          ++calls;
          return {
            required: ['a'],
            properties: {
              a: {type: 'string'},
              b: {type: 'number'}
            }
          };
        }
      });

      for (let i = 0; i < 10; ++i) {
        Model1.fromJson({a: 'str', b: 2});
      }

      let model = Model1.fromJson({a: 'str', b: 2});
      model.$validate();
      model.$validate();
      model.$toJson();
      model.$toDatabaseJson();

      expect(calls).to.equal(1);
    });

    it('should call $beforeValidate if jsonSchema is defined', () => {
      let calls = 0;
      let json = {a: 1, b: 2};
      let options = {some: 'option'};

      Model1.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      Model1.prototype.$beforeValidate = function (schema, jsn, opt) {
        ++calls;

        expect(opt).to.eql(options);
        expect(jsn).to.eql(json);
        expect(schema).to.eql(Model1.jsonSchema);

        schema.properties.a.type = 'number';
        return schema;
      };

      expect(() => {
        Model1.fromJson(json, options);
      }).not.to.throwException();

      expect(calls).to.equal(1);
    });

    it('should call $afterValidate if jsonSchema is defined', () => {
      let calls = 0;
      let json = {a: 'str', b: 2};
      let options = {some: 'option'};

      Model1.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      Model1.prototype.$afterValidate = function (jsn, opt) {
        ++calls;
        expect(opt).to.eql(options);
        expect(jsn).to.eql(json);
      };

      expect(() => {
        Model1.fromJson(json, options);
      }).not.to.throwException();

      expect(calls).to.equal(1);
    });

    it('should skip requirement validation if options.patch == true', () => {
      Model1.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      expect(() => {
        Model1.fromJson({a: 'str', b: 1}, {patch: true});
      }).not.to.throwException();

      // b is not required.
      expect(() => {
        Model1.fromJson({a: 'str'}, {patch: true});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({a: 1, b: '1'}, {patch: true});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('a');
        expect(exp.data).to.have.property('b');
      });

      expect(() => {
        Model1.fromJson({b: 1}, {patch: true});
      }).not.to.throwException();

    });

    it('should skip validation if options.skipValidation == true', () => {
      Model1.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      expect(() => {
        Model1.fromJson({a: 'str', b: 1}, {skipValidation: true});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({a: 'str'}, {skipValidation: true});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({a: 1, b: '1'}, {skipValidation: true});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({b: 1}, {skipValidation: true});
      }).not.to.throwException();
    });

    it('should merge default values from jsonSchema', () => {
      let obj = {a: 100, b: 200};

      Model1.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string', default: 'default string'},
          b: {type: 'number', default: 666},
          c: {type: 'object', default: obj}
        }
      };

      let model = Model1.fromJson({a: 'str'});

      expect(model.a).to.equal('str');
      expect(model.b).to.equal(666);
      expect(model.c).to.eql(obj);
      expect(model.c).not.to.equal(obj);
    });

    // regression introduced in 0.6
    // https://github.com/Vincit/objection.js/issues/205
    it('should not throw TypeError when jsonSchema.properties == undefined', () => {
      Model1.jsonSchema = {
        required: ['a']
      };

      let model = Model1.fromJson({a: 100});

      expect(model.a).to.equal(100);
    });

    it('should validate but not pass if jsonSchema.required exists and jsonSchema.properties == undefined', () => {
      Model1.jsonSchema = {
        required: ['a']
      };

      expect(() => {
        Model1.fromJson({b: 200});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
      });
    });

    it('should not merge default values from jsonSchema if options.patch == true', () => {
      let obj = {a: 100, b: 200};

      Model1.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string', default: 'default string'},
          b: {type: 'number', default: 666},
          c: {type: 'object', default: obj}
        }
      };

      let model = Model1.fromJson({b: 10}, {patch: true});

      expect(model).to.not.have.property('a');
      expect(model.b).to.equal(10);
      expect(model).to.not.have.property('c');
    });

    it('should throw with error context if validation fails', () => {
      Model1.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'number'},
          b: {type: 'string', minLength: 4}
        }
      };

      expect(() => {
        Model1.fromJson({b: 'abc'});
      }).to.throwException(exp => {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('a');
        expect(exp.data['a']).to.be.a(Array);
        expect(exp.data['a'].length).to.be.above(0);
        expect(exp.data['a'][0]).to.have.property('message');
        expect(exp.data['a'][0]).to.have.property('keyword');
        expect(exp.data['a'][0]).to.have.property('params');
        expect(exp.data['a'][0].keyword).to.equal('required');
        expect(exp.data).to.have.property('b');
        expect(exp.data['b']).to.be.a(Array);
        expect(exp.data['b'].length).to.be.above(0);
        expect(exp.data['b'][0]).to.have.property('message');
        expect(exp.data['b'][0]).to.have.property('keyword');
        expect(exp.data['b'][0]).to.have.property('params');
        expect(exp.data['b'][0].keyword).to.equal('minLength');
        expect(exp.data['b'][0].params).to.have.property('limit');
        expect(exp.data['b'][0].params.limit).to.equal(4);
      });
    });

    it('should throw if anything non-object is given', () => {
      function SomeClass() {}

      expect(() => {
        Model1.fromJson();
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson(null);
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson(undefined);
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson({});
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson(new SomeClass());
      }).not.to.throwException();

      expect(() => {
        Model1.fromJson('hello');
      }).to.throwException();

      expect(() => {
        Model1.fromJson(new String('hello'));
      }).to.throwException();

      expect(() => {
        Model1.fromJson(1);
      }).to.throwException();

      expect(() => {
        Model1.fromJson(new Number(1));
      }).to.throwException();

      expect(() => {
        Model1.fromJson([{a: 1}]);
      }).to.throwException();

      expect(() => {
        Model1.fromJson(/.*/);
      }).to.throwException();

      expect(() => {
        Model1.fromJson(new Date());
      }).to.throwException();

      expect(() => {
        Model1.fromJson(() => {});
      }).to.throwException();

      expect(() => {
        Model1.fromJson(new Int16Array(100));
      }).to.throwException();
    });
  });

  describe('fromDatabaseJson', () => {
    let Model1;

    beforeEach(() => {
      Model1 = createModelClass();
    });

    it('should copy attributes to the created object', () => {
      let json = {a: 1, b: 2, c: {d: 'str1'}, e: [3, 4, {f: 'str2'}]};
      let model = Model1.fromDatabaseJson(json);

      expect(model.a).to.equal(1);
      expect(model.b).to.equal(2);
      expect(model.c.d).to.equal('str1');
      expect(model.e[0]).to.equal(3);
      expect(model.e[1]).to.equal(4);
      expect(model.e[2].f).to.equal('str2');
    });

    it('should call $parseDatabaseJson', () => {
      let calls = 0;
      let json = {a: 1};

      Model1.prototype.$parseDatabaseJson = jsn => {
        ++calls;
        expect(jsn).to.eql(json);
        return {c: 3};
      };

      let model = Model1.fromDatabaseJson(json);

      expect(model).not.to.have.property('a');
      expect(model.c).to.equal(3);
      expect(calls).to.equal(1);
    });

  });

  describe('$toJson', () => {
    let Model1;

    beforeEach(() => {
      Model1 = createModelClass();
    });

    it('should return the internal representation by default', () => {
      expect(Model1.fromJson({a: 1, b: 2, c: {d: [1, 3]}}).$toJson()).to.eql({a: 1, b: 2, c: {d: [1, 3]}});
    });

    it('should call $formatJson', () => {
      let calls = 0;
      let json = {a: 1};

      Model1.prototype.$formatJson = jsn => {
        ++calls;
        expect(jsn).to.eql(json);
        jsn.b = 2;
        return jsn;
      };

      let model = Model1.fromJson(json);
      let output = model.$toJson();

      expect(output.a).to.equal(1);
      expect(output.b).to.equal(2);
      expect(calls).to.equal(1);
    });

    it('should call $toJson for properties of class Model', () => {
      let Model2 = createModelClass();

      Model2.prototype.$formatJson = jsn => {
        jsn.d = 3;
        return jsn;
      };

      let model = Model1.fromJson({a: 1});
      model.b = Model2.fromJson({c: 2});
      model.e = [Model2.fromJson({f: 100})];

      expect(model.$toJson()).to.eql({a: 1, b: {c: 2, d: 3}, e: [{f:100, d:3}]});
    });

    it('should return a deep copy', () => {
      let json = {a: 1, b: [{c:2}], d: {e: 'str'}};
      let model = Model1.fromJson(json);
      let output = model.$toJson();

      expect(output).to.eql(json);
      expect(output.b).to.not.equal(json.b);
      expect(output.b[0]).to.not.equal(json.b[0]);
      expect(output.d).to.not.equal(json.d);
    });

    it('should be called by JSON.stringify', () => {
      Model1.prototype.$formatJson = jsn => {
        jsn.b = 2;
        return jsn;
      };

      let model = Model1.fromJson({a: 1});
      expect(JSON.stringify(model)).to.equal('{"a":1,"b":2}');
    });

    it('properties registered using $omitFromJson method should be removed from the json', () => {
      let model = Model1.fromJson({a: 1, b: 2, c: 3});
      model.$omitFromJson(['b', 'c']);
      expect(model.$toJson()).to.eql({a: 1});
      expect(model).to.eql({a: 1, b: 2, c: 3});
    });

    it('properties registered using $omitFromJson method should be removed from the json (multiple calls)', () => {
      let model = Model1.fromJson({a: 1, b: 2, c: 3});
      model.$omitFromJson(['b']);
      model.$omitFromJson(['c']);
      model.$omitFromDatabaseJson(['a']);
      expect(model.$toJson()).to.eql({a: 1});
      expect(model).to.eql({a: 1, b: 2, c: 3});
    });

  });

  describe('$toDatabaseJson', () => {
    let Model1;

    beforeEach(() => {
      Model1 = createModelClass();
    });

    it('should return then internal representation by default', () => {
      expect(Model1.fromJson({a: 1, b: 2, c: {d: [1, 3]}}).$toDatabaseJson()).to.eql({a: 1, b: 2, c: {d: [1, 3]}});
    });

    it('should call $formatDatabaseJson', () => {
      let calls = 0;
      let json = {a: 1};

      Model1.prototype.$formatDatabaseJson = jsn => {
        ++calls;
        expect(jsn).to.eql(json);
        jsn.b = 2;
        return jsn;
      };

      let model = Model1.fromJson(json);
      let output = model.$toDatabaseJson();

      expect(output.a).to.equal(1);
      expect(output.b).to.equal(2);
      expect(calls).to.equal(1);
    });

    it('should call $toDatabaseJson for properties of class Model', () => {
      let Model2 = createModelClass();

      Model2.prototype.$formatDatabaseJson = jsn => {
        jsn.d = 3;
        return jsn;
      };

      let model = Model1.fromJson({a: 1});
      model.b = Model2.fromJson({c: 2});
      model.e = [Model2.fromJson({f: 100})];

      expect(model.$toDatabaseJson()).to.eql({a: 1, b: {c: 2, d: 3}, e: [{f:100, d:3}]});
    });

    it('should return a deep copy', () => {
      let json = {a: 1, b: [{c:2}], d: {e: 'str'}};
      let model = Model1.fromJson(json);
      let output = model.$toDatabaseJson();

      expect(output).to.eql(json);
      expect(output.b).to.not.equal(json.b);
      expect(output.b[0]).to.not.equal(json.b[0]);
      expect(output.d).to.not.equal(json.d);
    });

    it('properties registered using $omitFromDatabaseJson method should be removed from the json', () => {
      let model = Model1.fromJson({a: 1, b: 2, c: 3});
      model.$omitFromDatabaseJson(['b', 'c']);
      expect(model.$toDatabaseJson()).to.eql({a: 1});
      expect(model).to.eql({a: 1, b: 2, c: 3});
    });

    it('properties registered using $omitFromDatabaseJson method should be removed from the json (multiple calls)', () => {
      let model = Model1.fromJson({a: 1, b: 2, c: 3});
      model.$omitFromDatabaseJson(['b']);
      model.$omitFromDatabaseJson(['c']);
      model.$omitFromJson(['a']);
      expect(model.$toDatabaseJson()).to.eql({a: 1});
      expect(model).to.eql({a: 1, b: 2, c: 3});
    });

  });

  describe('$clone', () => {
    let Model1;

    beforeEach(() => {
      Model1 = createModelClass();
    });

    it('should clone', () => {
      let Model2 = createModelClass();

      Model2.prototype.$formatJson = jsn => {
        jsn.d = 3;
        return jsn;
      };

      let model = Model1.fromJson({a: 1, g: {h: 100}, r: [{h: 50}]});
      model.b = Model2.fromJson({c: 2});
      model.e = [Model2.fromJson({f: 100})];

      let clone = model.$clone();

      expect(clone).to.eql(model);
      expect(clone.$toJson()).to.eql(model.$toJson());
      expect(clone.$toJson()).to.eql({a: 1, g: {h: 100}, r: [{h: 50}], b: {c: 2, d: 3}, e: [{f: 100, d: 3}]});

      expect(clone.g).to.not.equal(model.g);
      expect(clone.r[0]).to.not.equal(model.r[0]);
      expect(clone.b).to.not.equal(model.b);
      expect(clone.e[0]).to.not.equal(model.e[0]);
    });
  });

  describe('propertyNameToColumnName', () => {
    let Model1;

    beforeEach(() => {
      Model1 = createModelClass({
        $formatDatabaseJson: json => {
          return _.mapKeys(json, (value, key) => {
            return _.snakeCase(key);
          });
        }
      });
    });

    it('should convert a property name to column name', () => {
      expect(Model1.propertyNameToColumnName('someProperty')).to.equal('some_property');
    });
  });

  describe('columnNameToPropertyName', () => {
    let Model1;

    beforeEach(() => {
      Model1 = createModelClass({
        $parseDatabaseJson: json => {
          return _.mapKeys(json, (value, key) => {
            return _.camelCase(key);
          });
        }
      });
    });

    it('should convert a column name to property name', () => {
      expect(Model1.columnNameToPropertyName('some_property')).to.equal('someProperty');
    });
  });

  describe('$pick', () => {

    it('should pick only the given properties to be visible in JSON representations', () => {
      let Model1 = createModelClass();

      let model = Model1.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$pick('a').toJSON()).to.eql({a:1});
      expect(model.$pick('a').$toDatabaseJson()).to.eql({a:1});
      expect(model.$pick('a').$e).to.eql('5');

      model = Model1.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$pick('a', 'c').toJSON()).to.eql({a:1, c:3});
      expect(model.$pick('a', 'c').$toDatabaseJson()).to.eql({a:1, c:3});
      expect(model.$pick('a', 'c').$e).to.eql('5');

      model = Model1.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$pick(['a', 'b']).toJSON()).to.eql({a:1, b:2});
      expect(model.$pick(['a', 'b']).$toDatabaseJson()).to.eql({a:1, b:2});
      expect(model.$pick(['a', 'b']).$e).to.eql('5');

      model = Model1.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$pick({a:true, b:false, d:true}).toJSON()).to.eql({a:1, d:'4'});
      expect(model.$pick({a:true, b:false, d:true}).$toDatabaseJson()).to.eql({a:1, d:'4'});
      expect(model.$pick({a:true, b:false, d:true}).$e).to.eql('5');
    });

  });

  describe('$omit', () => {

    it('should omit the given properties from the JSON representations', () => {
      let Model1 = createModelClass();

      let model = Model1.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$omit('a').toJSON()).to.eql({b:2, c:3, d:'4'});
      expect(model.$omit('a').$toDatabaseJson()).to.eql({b:2, c:3, d:'4'});
      expect(model.$omit('$e').$e).to.eql('5');

      model = Model1.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$omit('b', 'd').toJSON()).to.eql({a:1, c:3});
      expect(model.$omit('b', 'd').$toDatabaseJson()).to.eql({a:1, c:3});
      expect(model.$omit('b', 'd', '$e').$e).to.eql('5');

      model = Model1.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$omit(['c', 'd']).toJSON()).to.eql({a:1, b:2});
      expect(model.$omit(['c', 'd']).$toDatabaseJson()).to.eql({a:1, b:2});
      expect(model.$omit(['c', 'd', '$e']).$e).to.eql('5');

      model = Model1.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$omit({a:false, b:true, c:true}).toJSON()).to.eql({a:1, d:'4'});
      expect(model.$omit({a:false, b:true, c:true}).$toDatabaseJson()).to.eql({a:1, d:'4'});
      expect(model.$omit({a:false, b:true, c:true, $e: true}).$e).to.eql('5');
    });

  });

  describe('virtualAttributes', () => {
    let Model1;

    beforeEach(() => {
      Model1 = createModelClass();
    });

    it('should include getters', () => {
      Object.defineProperty(Model1.prototype, "foo", {
        get: function () {
          return this.a + this.b;
        }
      });

      Object.defineProperty(Model1.prototype, "bar", {
        get: function () {
          return this.a + this.b;
        }
      });

      Model1.virtualAttributes = ['foo'];

      expect(Model1.fromJson({a: 100, b: 10}).toJSON()).to.eql({
        a: 100,
        b: 10,
        foo: 110
      })
    });

    it('should include methods', () => {
      Model1.prototype.foo = function () {
        return this.a + this.b;
      };

      Model1.prototype.bar = function () {
        return this.a + this.b;
      };

      Model1.virtualAttributes = ['foo'];

      expect(Model1.fromJson({a: 100, b: 10}).toJSON()).to.eql({
        a: 100,
        b: 10,
        foo: 110
      })
    });
  });

  it('should parse relations into Model instances and remove them from database representation', () => {
    let Model1 = modelClass('Model1');
    let Model2 = modelClass('Model2');

    Model1.relationMappings = {
      relation1: {
        relation: Model.HasManyRelation,
        modelClass: Model2,
        join: {
          from: 'Model1.id',
          to: 'Model2.model1Id'
        }
      },
      relation2: {
        relation: Model.BelongsToOneRelation,
        modelClass: Model1,
        join: {
          from: 'Model1.id',
          to: 'Model1.model1Id'
        }
      }
    };

    let model = Model1.fromJson({
      id: 10,
      model1Id: 13,
      relation1: [
        {id: 11, model1Id: 10},
        {id: 12, model1Id: 10}
      ],
      relation2: {id: 13, model1Id: null}
    });

    expect(model.relation1[0]).to.be.a(Model2);
    expect(model.relation1[1]).to.be.a(Model2);
    expect(model.relation2).to.be.a(Model1);

    let json = model.$toDatabaseJson();

    expect(json).to.not.have.property('relation1');
    expect(json).to.not.have.property('relation2');

    json = model.$toJson();

    expect(json).to.have.property('relation1');
    expect(json).to.have.property('relation2');
  });

  it('relationMappings can be a function', () => {
    let Model1 = modelClass('Model1');
    let Model2 = modelClass('Model2');

    Model1.relationMappings = () => {
      return {
        relation1: {
          relation: Model.HasManyRelation,
          modelClass: Model2,
          join: {
            from: 'Model1.id',
            to: 'Model2.model1Id'
          }
        }
      };
    };

    expect(Model1.getRelation('relation1').relatedModelClass).to.equal(Model2);
  });

  it('if jsonSchema is given, should remove all but schema properties from database representation', () => {
    let Model = modelClass('Model');

    Model.jsonSchema = {
      type: 'object',
      properties: {
        prop1: {type: 'number'},
        prop2: {type: 'string'}
      }
    };

    let model = Model.fromJson({
      prop1: 10,
      prop2: '10',
      prop3: 'should be removed',
      prop4: {also: 'this'}
    });

    let json = model.$toDatabaseJson();

    expect(json.prop1).to.equal(10);
    expect(json.prop2).to.equal('10');
    expect(json.prop3).to.equal(undefined);
    expect(json.prop4).to.equal(undefined);

    expect(model.prop1).to.equal(10);
    expect(model.prop2).to.equal('10');
    expect(model.prop3).to.equal('should be removed');
    expect(model.prop4).to.eql({also: 'this'});

    json = model.$toJson();

    expect(json.prop1).to.equal(10);
    expect(json.prop2).to.equal('10');
    expect(json.prop3).to.equal('should be removed');
    expect(json.prop4).to.eql({also: 'this'});
  });

  it('if pickJsonSchemaProperties = false, should select all properties even if jsonSchema is defined', () => {
    let Model = modelClass('Model');

    Model.jsonSchema = {
      type: 'object',
      properties: {
        prop1: {type: 'number'},
        prop2: {type: 'string'}
      }
    };

    Model.pickJsonSchemaProperties = false;

    let model = Model.fromJson({
      prop1: 10,
      prop2: '10',
      prop3: 'should not be removed',
      prop4: {also: 'this'}
    });

    let json = model.$toDatabaseJson();

    expect(json.prop1).to.equal(10);
    expect(json.prop2).to.equal('10');
    expect(json.prop3).to.equal('should not be removed');
    expect(json.prop4).to.eql({also: 'this'});

    expect(model.prop1).to.equal(10);
    expect(model.prop2).to.equal('10');
    expect(model.prop3).to.equal('should not be removed');
    expect(model.prop4).to.eql({also: 'this'});

    json = model.$toJson();

    expect(json.prop1).to.equal(10);
    expect(json.prop2).to.equal('10');
    expect(json.prop3).to.equal('should not be removed');
    expect(json.prop4).to.eql({also: 'this'});
  });

  it('should convert objects to json based on jsonSchema type', () => {
    let Model = modelClass('Model');

    Model.jsonSchema = {
      type: 'object',
      properties: {
        prop1: {type: 'string'},
        prop2: {
          type: 'object',
          properties: {
            subProp1: {type: 'number'}
          }
        },
        prop3: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subProp2: {type: 'boolean'}
            }
          }
        },
        prop4: {
          anyOf: [{
            type: 'array'
          }, {
            type: 'string'
          }]
        },
        prop5: {
          oneOf: [{
            type: 'object'
          }, {
            type: 'string'
          }]
        }
      }
    };

    let inputJson = {
      prop1: 'text',
      prop2: {
        subProp1: 1000
      },
      prop3: [
        {subProp2: true},
        {subProp2: false}
      ],
      prop4: [
        1, 2, 3
      ],
      prop5: {
        subProp3: 'str'
      }
    };

    let model = Model.fromJson(inputJson);

    expect(model).to.eql(inputJson);

    let dbJson = model.$toDatabaseJson();

    expect(dbJson.prop1).to.equal('text');
    expect(dbJson.prop2).to.equal('{"subProp1":1000}');
    expect(dbJson.prop3).to.equal('[{"subProp2":true},{"subProp2":false}]');
    expect(dbJson.prop4).to.equal('[1,2,3]');
    expect(dbJson.prop5).to.equal('{"subProp3":"str"}');

    let model2 = Model.fromDatabaseJson(dbJson);

    expect(model2).to.eql(inputJson);
  });

  it('should convert objects to json based on jsonAttributes array', () => {
    let Model = modelClass('Model');

    Model.jsonSchema = {
      type: 'object',
      properties: {
        prop1: {type: 'string'},
        prop2: {
          type: 'object',
          properties: {
            subProp1: {type: 'number'}
          }
        },
        prop3: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subProp2: {type: 'boolean'}
            }
          }
        }
      }
    };

    Model.jsonAttributes = ['prop2'];

    let inputJson = {
      prop1: 'text',
      prop2: {
        subProp1: 1000
      },
      prop3: [
        {subProp2: true},
        {subProp2: false}
      ]
    };

    let model = Model.fromJson(inputJson);

    expect(model).to.eql(inputJson);

    let dbJson = model.$toDatabaseJson();

    expect(dbJson.prop1).to.equal('text');
    expect(dbJson.prop2).to.equal('{"subProp1":1000}');
    expect(dbJson.prop3).to.eql(inputJson.prop3);

    let model2 = Model.fromDatabaseJson(dbJson);

    expect(model2).to.eql(inputJson);
  });

  it('formatter() should return a knex formatter', () => {
    let Model = modelClass('Model');

    Model.knex(knex({client: 'sqlite3'}));
    expect(Model.formatter().wrap('SomeTable.id')).to.equal('"SomeTable"."id"');

    Model.knex(knex({client: 'pg'}));
    expect(Model.formatter().wrap('SomeTable.id')).to.equal('"SomeTable"."id"');

    Model.knex(knex({client: 'mysql'}));
    expect(Model.formatter().wrap('SomeTable.id')).to.equal('`SomeTable`.`id`');
  });

  it('$setJson should do nothing if null is given', () => {
    let Model = modelClass('Model');
    let model = Model.fromJson({a: 1, b: 2});
    model.$setJson(null);
    expect(model).to.eql({a: 1, b: 2});
  });

  it('$toJson should return result without relations if true is given as argument', () => {
    let Model = modelClass('Model');

    Model.relationMappings = {
      someRelation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Model,
        join: {
          from: 'Model.id',
          to: 'Model.model1Id'
        }
      }
    };

    let model = Model.fromJson({a: 1, b: 2, someRelation: {a: 3, b: 4}});

    expect(model.$toJson(false)).to.eql({a: 1, b: 2, someRelation: {a: 3, b: 4}});
    expect(model.$toJson(true)).to.eql({a: 1, b: 2});
  });

  it('null relations should be null in the result', () => {
    let Model = modelClass('Model');

    Model.relationMappings = {
      someRelation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Model,
        join: {
          from: 'Model.id',
          to: 'Model.model1Id'
        }
      }
    };

    let model = Model.fromJson({a: 1, b: 2, someRelation: null});
    expect(model.someRelation).to.equal(null);
  });

  it('raw method should be a shortcut to knex().raw', () => {
    let Model = modelClass('Model');
    Model.knex(knex({client: 'pg'}));

    let sql = Model.raw('SELECT * FROM "Model" where "id" = ?', [10]).toString();
    expect(sql).to.eql('SELECT * FROM "Model" where "id" = 10');
  });

  it('ensureModel should return null for null input', () => {
    let Model = modelClass('Model');
    expect(Model.ensureModel(null)).to.equal(null);
  });

  it('ensureModelArray should return [] for null input', () => {
    let Model = modelClass('Model');
    expect(Model.ensureModelArray(null)).to.eql([]);
  });

  it('loadRelated should return a QueryBuilder', () => {
    let Model = modelClass('Model1');
    expect(Model.loadRelated([], '[]')).to.be.a(QueryBuilder);
  });

  it('$loadRelated should return a QueryBuilder', () => {
    let Model = modelClass('Model1');
    expect(Model.fromJson({}).$loadRelated('[]')).to.be.a(QueryBuilder);
  });

  it('loadRelated should throw if an invalid expression is given', () => {
    let Model = modelClass('Model1');
    expect(() => {
      Model.loadRelated([], 'notAValidExpression.');
    }).to.throwException();
  });

  it('loadRelated should throw if an invalid expression is given', () => {
    let Model = modelClass('Model1');
    expect(() => {
      Model.loadRelated([], 'notAValidExpression.');
    }).to.throwException();
  });

  it('should use Model.QueryBuilder to create `query()` and `$query()`', () => {
    class MyQueryBuilder extends QueryBuilder {

    }

    let Model = modelClass('Model');

    Model.relationMappings = {
      someRelation: {
        relation: Model.HasManyRelation,
        modelClass: Model,
        join: {
          from: 'Model.id',
          to: 'Model.someId'
        }
      }
    };

    Model.QueryBuilder = MyQueryBuilder;

    expect(Model.query()).to.be.a(MyQueryBuilder);
    expect(Model.fromJson({}).$query()).to.be.a(MyQueryBuilder);
    expect(Model.fromJson({}).$relatedQuery('someRelation')).to.not.be.a(MyQueryBuilder);
  });

  it('should use Model.RelatedQueryBuilder to create `$relatedQuery()`', () => {
    class MyQueryBuilder extends QueryBuilder {

    }

    let Model = modelClass('Model');

    Model.relationMappings = {
      someRelation: {
        relation: Model.HasManyRelation,
        modelClass: Model,
        join: {
          from: 'Model.id',
          to: 'Model.someId'
        }
      }
    };

    Model.RelatedQueryBuilder = MyQueryBuilder;

    expect(Model.query()).to.not.be.a(MyQueryBuilder);
    expect(Model.fromJson({}).$query()).to.not.be.a(MyQueryBuilder);
    expect(Model.fromJson({}).$relatedQuery('someRelation')).to.be.a(MyQueryBuilder);
  });

  describe('traverse() and $traverse()', () => {
    let Model1;
    let Model2;
    let model;

    beforeEach(() => {
      Model1 = modelClass('Model1');
      Model2 = modelClass('Model2');

      Model1.relationMappings = {
        relation1: {
          relation: Model.HasManyRelation,
          modelClass: Model2,
          join: {
            from: 'Model1.id',
            to: 'Model2.model1Id'
          }
        },
        relation2: {
          relation: Model.BelongsToOneRelation,
          modelClass: Model1,
          join: {
            from: 'Model1.id',
            to: 'Model1.model1Id'
          }
        }
      };
    });

    beforeEach(() => {
      model = Model1.fromJson({
        id: 1,
        model1Id: 2,
        relation1: [
          {id: 4, model1Id: 1},
          {id: 5, model1Id: 1}
        ],
        relation2: {
          id: 2,
          model1Id: 3,
          relation1: [
            {id: 6, model1Id: 2},
            {id: 7, model1Id: 2}
          ],
          relation2: {
            id: 3,
            model1Id: null,
            relation1: [
              {id: 8, model1Id: 3},
              {id: 9, model1Id: 3},
              {id: 10, model1Id: 3},
              {id: 11, model1Id: 3},
              {id: 12, model1Id: 3},
              {id: 13, model1Id: 3},
              {id: 14, model1Id: 3},
              {id: 15, model1Id: 3},
              {id: 16, model1Id: 3},
              {id: 17, model1Id: 3},
              {id: 18, model1Id: 3},
              {id: 19, model1Id: 3},
              {id: 20, model1Id: 3},
              {id: 21, model1Id: 3},
              {id: 22, model1Id: 3},
              {id: 23, model1Id: 3},
              {id: 24, model1Id: 3},
              {id: 25, model1Id: 3}
            ]
          }
        }
      });
    });

    it('traverse(modelArray, traverser) should traverse through the relation tree', () => {
      let model1Ids = [];
      let model2Ids = [];

      Model1.traverse([model], model => {
        if (model instanceof Model1) {
          model1Ids.push(model.id);
        } else if (model instanceof Model2) {
          model2Ids.push(model.id);
        }
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('traverse([], traverser) should not throw', () => {
      expect(() => {
        Model1.traverse([], function () {});
      }).to.not.throwException();
    });

    it('traverse(undefined, traverser) should not throw', () => {
      expect(() => {
        Model1.traverse(undefined, function () {});
      }).to.not.throwException();
    });

    it('traverse callback should be passed the model, its parent (if any) and the relation it is in (if any)', () => {
      Model1.traverse([model], (model, parent, relationName) => {
        if (model instanceof Model1) {
          if (model.id === 1) {
            expect(parent).to.equal(null);
            expect(relationName).to.equal(null);
          } else if (model.id === 2) {
            expect(parent.id).to.equal(1);
            expect(relationName).to.equal('relation2');
          } else if (model.id === 3) {
            expect(parent.id).to.equal(2);
            expect(relationName).to.equal('relation2');
          } else {
            throw new Error('should never get here');
          }
        } else if (model instanceof Model2) {
          if (model.id >= 4 && model.id <= 5) {
            expect(parent).to.be.a(Model1);
            expect(parent.id).to.equal(1);
            expect(relationName).to.equal('relation1');
          } else if (model.id >= 6 && model.id <= 7) {
            expect(parent).to.be.a(Model1);
            expect(parent.id).to.equal(2);
            expect(relationName).to.equal('relation1');
          } else if (model.id >= 8 && model.id <= 25) {
            expect(parent).to.be.a(Model1);
            expect(parent.id).to.equal(3);
            expect(relationName).to.equal('relation1');
          } else {
            throw new Error('should never get here');
          }
        }
      });
    });

    it('traverse(singleModel, traverser) should traverse through the relation tree', () => {
      let model1Ids = [];
      let model2Ids = [];

      Model1.traverse(model, model => {
        if (model instanceof Model1) {
          model1Ids.push(model.id);
        } else if (model instanceof Model2) {
          model2Ids.push(model.id);
        }
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('traverse(null, singleModel, traverser) should traverse through the relation tree', () => {
      let model1Ids = [];
      let model2Ids = [];

      Model1.traverse(null, model, model => {
        if (model instanceof Model1) {
          model1Ids.push(model.id);
        } else if (model instanceof Model2) {
          model2Ids.push(model.id);
        }
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('traverse(ModelClass, model, traverser) should traverse through all ModelClass instances in the relation tree', () => {
      let model1Ids = [];
      let model2Ids = [];

      Model1.traverse(Model2, model, model => {
        model2Ids.push(model.id);
      }).traverse(Model1, model, model => {
        model1Ids.push(model.id);
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('$traverse(traverser) should traverse through the relation tree', () => {
      let model1Ids = [];
      let model2Ids = [];

      model.$traverse(model => {
        if (model instanceof Model1) {
          model1Ids.push(model.id);
        } else if (model instanceof Model2) {
          model2Ids.push(model.id);
        }
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

    it('$traverse(ModelClass, traverser) should traverse through the ModelClass instances in the relation tree', () => {
      let model1Ids = [];
      let model2Ids = [];

      model.$traverse(Model1, model => {
        model1Ids.push(model.id);
      }).$traverse(Model2, model => {
        model2Ids.push(model.id);
      });

      expect(_.sortBy(model1Ids)).to.eql([1, 2, 3]);
      expect(_.sortBy(model2Ids)).to.eql(_.range(4, 26));
    });

  });

  it('$validate should run run hooks and strip relations', () => {
    let Model1 = modelClass('Model1');

    Model1.prototype.$parseJson = function (json, opt) {
      json = Model.prototype.$parseJson.apply(this, arguments);
      json.foo = parseInt(json.foo);
      return json;
    };

    Model1.prototype.$formatJson = function (json, opt) {
      json = Model.prototype.$formatJson.apply(this, arguments);
      json.foo = json.foo.toString();
      return json;
    };

    Model1.jsonSchema = {
      type: 'object',
      properties: {
        foo: {type: 'integer'}
      }
    };

    Model1.relationMappings = {
      someRelation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Model1,
        join: {
          from: 'Model1.id',
          to: 'Model1.someId'
        }
      }
    };

    let model = Model1.fromJson({foo: '10'});
    model.someRelation = Model1.fromJson({foo: '20'});

    expect(model.foo).to.equal(10);
    model.$validate();
    expect(model.foo).to.equal(10);

    expect(model.$toJson().foo).to.equal('10');
  });

  it('fn() should be a shortcut to knex.fn', () => {
    let Model1 = modelClass('Model1');
    Model1.knex({fn: {a: 1}});
    expect(Model1.fn()).to.eql({a: 1});
  });

  function modelClass(tableName) {
    return class TestModel extends Model {
      static get tableName() {
        return tableName;
      }
    }
  }

  function createModelClass(proto, staticStuff) {
    class Model1 extends Model {}

    _.merge(Model1.prototype, proto);
    _.merge(Model1, staticStuff);

    return Model1;
  }
});
