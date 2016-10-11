'use strict';

var _ = require('lodash')
  , expect = require('expect.js')
  , ModelBase = require('../../../').ModelBase
  , ValidationError = require('../../../').ValidationError;

describe('ModelBase', function () {

  describe('extend', function () {

    it('should create a subclass', function () {
      function Model() {
        ModelBase.apply(this, arguments);
      }

      ModelBase.extend(Model);

      var model = new Model();

      expect(model).to.be.a(Model);
      expect(model).to.be.a(ModelBase);
    });

    it('should create a subclass of subclass', function () {
      function Model() {
        ModelBase.apply(this, arguments);
      }
      function Model2() {
        Model.apply(this, arguments);
      }

      ModelBase.extend(Model).extend(Model2);

      var model = new Model2();

      expect(model).to.be.a(Model2);
      expect(model).to.be.a(Model);
      expect(model).to.be.a(ModelBase);
    });

  });

  describe('fromJson', function () {
    var Model;

    beforeEach(function () {
      Model = createModelClass();
    });

    it('should copy attributes to the created object', function () {
      var json = {a: 1, b: 2, c: {d: 'str1'}, e: [3, 4, {f: 'str2'}]};
      var model = Model.fromJson(json);

      expect(model.a).to.equal(1);
      expect(model.b).to.equal(2);
      expect(model.c.d).to.equal('str1');
      expect(model.e[0]).to.equal(3);
      expect(model.e[1]).to.equal(4);
      expect(model.e[2].f).to.equal('str2');
    });

    it('should skip properties starting with $', function () {
      var model = Model.fromJson({a: 1, $b: 2});

      expect(model.a).to.equal(1);
      expect(model).not.to.have.property('$b');
    });

    it('should skip functions', function () {
      var model = Model.fromJson({a: 1, b: function () {}});

      expect(model.a).to.equal(1);
      expect(model).not.to.have.property('b');
    });

    it('should call $parseJson', function () {
      var calls = 0;
      var json = {a: 1};
      var options = {b: 2};

      Model.prototype.$parseJson = function (jsn, opt) {
        ++calls;
        expect(jsn).to.eql(json);
        expect(opt).to.eql(options);
        return {c: 3};
      };

      var model = Model.fromJson(json, options);

      expect(model).not.to.have.property('a');
      expect(model.c).to.equal(3);
      expect(calls).to.equal(1);
    });

    it('should validate if jsonSchema is defined', function () {
      Model.jsonSchema = {
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

      expect(function () {
        Model.fromJson({a: 'str', b: 1});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({a: 'str'});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({a: 'a', c: {d: 'test'}});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({a: 'a', c: {d: 'test', e: [{f: 1}]}});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({a: 1, b: '1'});
      }).to.throwException(function (exp) {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('a');
        expect(exp.data).to.have.property('b');
      });

      expect(function () {
        Model.fromJson({b: 1});
      }).to.throwException(function (exp) {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('a');
      });

      expect(function () {
        Model.fromJson({a: 'a', additional: 1});
      }).to.throwException(function (exp) {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('additional');
      });

      expect(function () {
        Model.fromJson({a: 'a', c: {d: 10}});
      }).to.throwException(function (exp) {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('c.d');
      });

      expect(function () {
        Model.fromJson({a: 'a', c: {d: 'test', e: [{f: 'not a number'}]}});
      }).to.throwException(function (exp) {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('c.e[0].f');
      });

      expect(function () {
        Model.fromJson({a: 'a', c: {d: 'test', e: [{additional: true}]}});
      }).to.throwException(function (exp) {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('c.e[0]');
      });

    });

    it('should call $validate if jsonSchema is defined', function () {
      var calls = 0;
      var json = {a: 'str', b: 2};
      var options = {some: 'option'};

      Model.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      Model.prototype.$validate = function (jsn, opt) {
        ModelBase.prototype.$validate.call(this, jsn, opt);

        ++calls;
        expect(opt).to.eql(options);
        expect(jsn).to.eql(json);
      };

      expect(function () {
        Model.fromJson(json, options);
      }).not.to.throwException(function (err) {
        console.log(err.stack)
      });

      expect(calls).to.equal(1);
    });

    it('should only call jsonSchema once if jsonSchema is a getter', function () {
      var calls = 0;

      Object.defineProperty(Model, "jsonSchema", {
        get: function () {
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

      for (var i = 0; i < 10; ++i) {
        Model.fromJson({a: 'str', b: 2});
      }

      var model = Model.fromJson({a: 'str', b: 2});
      model.$validate();
      model.$validate();
      model.$toJson();
      model.$toDatabaseJson();

      expect(calls).to.equal(1);
    });

    it('should call $beforeValidate if jsonSchema is defined', function () {
      var calls = 0;
      var json = {a: 1, b: 2};
      var options = {some: 'option'};

      Model.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      Model.prototype.$beforeValidate = function (schema, jsn, opt) {
        ++calls;

        expect(opt).to.eql(options);
        expect(jsn).to.eql(json);
        expect(schema).to.eql(Model.jsonSchema);

        schema.properties.a.type = 'number';
        return schema;
      };

      expect(function () {
        Model.fromJson(json, options);
      }).not.to.throwException();

      expect(calls).to.equal(1);
    });

    it('should call $afterValidate if jsonSchema is defined', function () {
      var calls = 0;
      var json = {a: 'str', b: 2};
      var options = {some: 'option'};

      Model.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      Model.prototype.$afterValidate = function (jsn, opt) {
        ++calls;
        expect(opt).to.eql(options);
        expect(jsn).to.eql(json);
      };

      expect(function () {
        Model.fromJson(json, options);
      }).not.to.throwException();

      expect(calls).to.equal(1);
    });

    it('should skip requirement validation if options.patch == true', function () {
      Model.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      expect(function () {
        Model.fromJson({a: 'str', b: 1}, {patch: true});
      }).not.to.throwException();

      // b is not required.
      expect(function () {
        Model.fromJson({a: 'str'}, {patch: true});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({a: 1, b: '1'}, {patch: true});
      }).to.throwException(function (exp) {
        expect(exp).to.be.a(ValidationError);
        expect(exp.data).to.have.property('a');
        expect(exp.data).to.have.property('b');
      });

      expect(function () {
        Model.fromJson({b: 1}, {patch: true});
      }).not.to.throwException();

    });

    it('should skip validation if options.skipValidation == true', function () {
      Model.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string'},
          b: {type: 'number'}
        }
      };

      expect(function () {
        Model.fromJson({a: 'str', b: 1}, {skipValidation: true});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({a: 'str'}, {skipValidation: true});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({a: 1, b: '1'}, {skipValidation: true});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({b: 1}, {skipValidation: true});
      }).not.to.throwException();
    });

    it('should merge default values from jsonSchema', function () {
      var obj = {a: 100, b: 200};

      Model.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string', default: 'default string'},
          b: {type: 'number', default: 666},
          c: {type: 'object', default: obj}
        }
      };

      var model = Model.fromJson({a: 'str'});

      expect(model.a).to.equal('str');
      expect(model.b).to.equal(666);
      expect(model.c).to.eql(obj);
      expect(model.c).not.to.equal(obj);
    });

    // regression introduced in 0.6
    // https://github.com/Vincit/objection.js/issues/205
    it('should not throw TypeError when jsonSchema.properties == undefined', function () {
      Model.jsonSchema = {
        required: ['a']
      };

      var model = Model.fromJson({a: 100});

      expect(model.a).to.equal(100);
    });

    it('should validate but not pass if jsonSchema.required exists and jsonSchema.properties == undefined', function () {
      Model.jsonSchema = {
        required: ['a']
      };

      expect(function () {
        Model.fromJson({b: 200});
      }).to.throwException(function (exp) {
        expect(exp).to.be.a(ValidationError);
      });
    });

    it('should not merge default values from jsonSchema if options.patch == true', function () {
      var obj = {a: 100, b: 200};

      Model.jsonSchema = {
        required: ['a'],
        properties: {
          a: {type: 'string', default: 'default string'},
          b: {type: 'number', default: 666},
          c: {type: 'object', default: obj}
        }
      };

      var model = Model.fromJson({b: 10}, {patch: true});

      expect(model).to.not.have.property('a');
      expect(model.b).to.equal(10);
      expect(model).to.not.have.property('c');
    });

    it('should throw if anything non-object is given', function () {
      function SomeClass() {}

      expect(function () {
        Model.fromJson();
      }).not.to.throwException();

      expect(function () {
        Model.fromJson(null);
      }).not.to.throwException();

      expect(function () {
        Model.fromJson(undefined);
      }).not.to.throwException();

      expect(function () {
        Model.fromJson({});
      }).not.to.throwException();

      expect(function () {
        Model.fromJson(new SomeClass());
      }).not.to.throwException();

      expect(function () {
        Model.fromJson('hello');
      }).to.throwException();

      expect(function () {
        Model.fromJson(new String('hello'));
      }).to.throwException();

      expect(function () {
        Model.fromJson(1);
      }).to.throwException();

      expect(function () {
        Model.fromJson(new Number(1));
      }).to.throwException();

      expect(function () {
        Model.fromJson([{a: 1}]);
      }).to.throwException();

      expect(function () {
        Model.fromJson(/.*/);
      }).to.throwException();

      expect(function () {
        Model.fromJson(new Date());
      }).to.throwException();

      expect(function () {
        Model.fromJson(function () {});
      }).to.throwException();

      expect(function () {
        Model.fromJson(new Int16Array(100));
      }).to.throwException();
    });
  });

  describe('fromDatabaseJson', function () {
    var Model;

    beforeEach(function () {
      Model = createModelClass();
    });

    it('should copy attributes to the created object', function () {
      var json = {a: 1, b: 2, c: {d: 'str1'}, e: [3, 4, {f: 'str2'}]};
      var model = Model.fromDatabaseJson(json);

      expect(model.a).to.equal(1);
      expect(model.b).to.equal(2);
      expect(model.c.d).to.equal('str1');
      expect(model.e[0]).to.equal(3);
      expect(model.e[1]).to.equal(4);
      expect(model.e[2].f).to.equal('str2');
    });

    it('should call $parseDatabaseJson', function () {
      var calls = 0;
      var json = {a: 1};

      Model.prototype.$parseDatabaseJson = function (jsn) {
        ++calls;
        expect(jsn).to.eql(json);
        return {c: 3};
      };

      var model = Model.fromDatabaseJson(json);

      expect(model).not.to.have.property('a');
      expect(model.c).to.equal(3);
      expect(calls).to.equal(1);
    });

  });

  describe('$toJson', function () {
    var Model;

    beforeEach(function () {
      Model = createModelClass();
    });

    it('should return the internal representation by default', function () {
      expect(Model.fromJson({a: 1, b: 2, c: {d: [1, 3]}}).$toJson()).to.eql({a: 1, b: 2, c: {d: [1, 3]}});
    });

    it('should call $formatJson', function () {
      var calls = 0;
      var json = {a: 1};

      Model.prototype.$formatJson = function (jsn) {
        ++calls;
        expect(jsn).to.eql(json);
        jsn.b = 2;
        return jsn;
      };

      var model = Model.fromJson(json);
      var output = model.$toJson();

      expect(output.a).to.equal(1);
      expect(output.b).to.equal(2);
      expect(calls).to.equal(1);
    });

    it('should call $toJson for properties of class ModelBase', function () {
      var Model2 = createModelClass();

      Model2.prototype.$formatJson = function (jsn) {
        jsn.d = 3;
        return jsn;
      };

      var model = Model.fromJson({a: 1});
      model.b = Model2.fromJson({c: 2});
      model.e = [Model2.fromJson({f: 100})];

      expect(model.$toJson()).to.eql({a: 1, b: {c: 2, d: 3}, e: [{f:100, d:3}]});
    });

    it('should return a deep copy', function () {
      var json = {a: 1, b: [{c:2}], d: {e: 'str'}};
      var model = Model.fromJson(json);
      var output = model.$toJson();

      expect(output).to.eql(json);
      expect(output.b).to.not.equal(json.b);
      expect(output.b[0]).to.not.equal(json.b[0]);
      expect(output.d).to.not.equal(json.d);
    });

    it('should be called by JSON.stringify', function () {
      Model.prototype.$formatJson = function (jsn) {
        jsn.b = 2;
        return jsn;
      };

      var model = Model.fromJson({a: 1});
      expect(JSON.stringify(model)).to.equal('{"a":1,"b":2}');
    });

    it('properties registered using $omitFromJson method should be removed from the json', function () {
      var model = Model.fromJson({a: 1, b: 2, c: 3});
      model.$omitFromJson(['b', 'c']);
      expect(model.$toJson()).to.eql({a: 1});
      expect(model).to.eql({a: 1, b: 2, c: 3});
    });

    it('properties registered using $omitFromJson method should be removed from the json (multiple calls)', function () {
      var model = Model.fromJson({a: 1, b: 2, c: 3});
      model.$omitFromJson(['b']);
      model.$omitFromJson(['c']);
      model.$omitFromDatabaseJson(['a']);
      expect(model.$toJson()).to.eql({a: 1});
      expect(model).to.eql({a: 1, b: 2, c: 3});
    });

  });

  describe('$toDatabaseJson', function () {
    var Model;

    beforeEach(function () {
      Model = createModelClass();
    });

    it('should return then internal representation by default', function () {
      expect(Model.fromJson({a: 1, b: 2, c: {d: [1, 3]}}).$toDatabaseJson()).to.eql({a: 1, b: 2, c: {d: [1, 3]}});
    });

    it('should call $formatDatabaseJson', function () {
      var calls = 0;
      var json = {a: 1};

      Model.prototype.$formatDatabaseJson = function (jsn) {
        ++calls;
        expect(jsn).to.eql(json);
        jsn.b = 2;
        return jsn;
      };

      var model = Model.fromJson(json);
      var output = model.$toDatabaseJson();

      expect(output.a).to.equal(1);
      expect(output.b).to.equal(2);
      expect(calls).to.equal(1);
    });

    it('should call $toDatabaseJson for properties of class ModelBase', function () {
      var Model2 = createModelClass();

      Model2.prototype.$formatDatabaseJson = function (jsn) {
        jsn.d = 3;
        return jsn;
      };

      var model = Model.fromJson({a: 1});
      model.b = Model2.fromJson({c: 2});
      model.e = [Model2.fromJson({f: 100})];

      expect(model.$toDatabaseJson()).to.eql({a: 1, b: {c: 2, d: 3}, e: [{f:100, d:3}]});
    });

    it('should return a deep copy', function () {
      var json = {a: 1, b: [{c:2}], d: {e: 'str'}};
      var model = Model.fromJson(json);
      var output = model.$toDatabaseJson();

      expect(output).to.eql(json);
      expect(output.b).to.not.equal(json.b);
      expect(output.b[0]).to.not.equal(json.b[0]);
      expect(output.d).to.not.equal(json.d);
    });

    it('properties registered using $omitFromDatabaseJson method should be removed from the json', function () {
      var model = Model.fromJson({a: 1, b: 2, c: 3});
      model.$omitFromDatabaseJson(['b', 'c']);
      expect(model.$toDatabaseJson()).to.eql({a: 1});
      expect(model).to.eql({a: 1, b: 2, c: 3});
    });

    it('properties registered using $omitFromDatabaseJson method should be removed from the json (multiple calls)', function () {
      var model = Model.fromJson({a: 1, b: 2, c: 3});
      model.$omitFromDatabaseJson(['b']);
      model.$omitFromDatabaseJson(['c']);
      model.$omitFromJson(['a']);
      expect(model.$toDatabaseJson()).to.eql({a: 1});
      expect(model).to.eql({a: 1, b: 2, c: 3});
    });

  });

  describe('$clone', function () {
    var Model;

    beforeEach(function () {
      Model = createModelClass();
    });

    it('should clone', function () {
      var Model2 = createModelClass();

      Model2.prototype.$formatJson = function (jsn) {
        jsn.d = 3;
        return jsn;
      };

      var model = Model.fromJson({a: 1, g: {h: 100}, r: [{h: 50}]});
      model.b = Model2.fromJson({c: 2});
      model.e = [Model2.fromJson({f: 100})];

      var clone = model.$clone();

      expect(clone).to.eql(model);
      expect(clone.$toJson()).to.eql(model.$toJson());
      expect(clone.$toJson()).to.eql({a: 1, g: {h: 100}, r: [{h: 50}], b: {c: 2, d: 3}, e: [{f: 100, d: 3}]});

      expect(clone.g).to.not.equal(model.g);
      expect(clone.r[0]).to.not.equal(model.r[0]);
      expect(clone.b).to.not.equal(model.b);
      expect(clone.e[0]).to.not.equal(model.e[0]);
    });
  });

  describe('propertyNameToColumnName', function () {
    var Model;

    beforeEach(function () {
      Model = createModelClass({
        $formatDatabaseJson: function (json) {
          return _.mapKeys(json, function (value, key) {
            return _.snakeCase(key);
          });
        }
      });
    });

    it('should convert a property name to column name', function () {
      expect(Model.propertyNameToColumnName('someProperty')).to.equal('some_property');
    });
  });

  describe('columnNameToPropertyName', function () {
    var Model;

    beforeEach(function () {
      Model = createModelClass({
        $parseDatabaseJson: function (json) {
          return _.mapKeys(json, function (value, key) {
            return _.camelCase(key);
          });
        }
      });
    });

    it('should convert a column name to property name', function () {
      expect(Model.columnNameToPropertyName('some_property')).to.equal('someProperty');
    });
  });

  describe('$pick', function () {

    it('should pick only the given properties to be visible in JSON representations', function () {
      var Model = createModelClass();

      var model = Model.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$pick('a').toJSON()).to.eql({a:1});
      expect(model.$pick('a').$toDatabaseJson()).to.eql({a:1});
      expect(model.$pick('a').$e).to.eql('5');

      model = Model.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$pick('a', 'c').toJSON()).to.eql({a:1, c:3});
      expect(model.$pick('a', 'c').$toDatabaseJson()).to.eql({a:1, c:3});
      expect(model.$pick('a', 'c').$e).to.eql('5');

      model = Model.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$pick(['a', 'b']).toJSON()).to.eql({a:1, b:2});
      expect(model.$pick(['a', 'b']).$toDatabaseJson()).to.eql({a:1, b:2});
      expect(model.$pick(['a', 'b']).$e).to.eql('5');

      model = Model.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$pick({a:true, b:false, d:true}).toJSON()).to.eql({a:1, d:'4'});
      expect(model.$pick({a:true, b:false, d:true}).$toDatabaseJson()).to.eql({a:1, d:'4'});
      expect(model.$pick({a:true, b:false, d:true}).$e).to.eql('5');
    });

  });

  describe('$omit', function () {

    it('should omit the given properties from the JSON representations', function () {
      var Model = createModelClass();

      var model = Model.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$omit('a').toJSON()).to.eql({b:2, c:3, d:'4'});
      expect(model.$omit('a').$toDatabaseJson()).to.eql({b:2, c:3, d:'4'});
      expect(model.$omit('$e').$e).to.eql('5');

      model = Model.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$omit('b', 'd').toJSON()).to.eql({a:1, c:3});
      expect(model.$omit('b', 'd').$toDatabaseJson()).to.eql({a:1, c:3});
      expect(model.$omit('b', 'd', '$e').$e).to.eql('5');

      model = Model.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$omit(['c', 'd']).toJSON()).to.eql({a:1, b:2});
      expect(model.$omit(['c', 'd']).$toDatabaseJson()).to.eql({a:1, b:2});
      expect(model.$omit(['c', 'd', '$e']).$e).to.eql('5');

      model = Model.fromJson({a:1, b:2, c:3, d:'4'});
      model.$e = '5';

      expect(model.$omit({a:false, b:true, c:true}).toJSON()).to.eql({a:1, d:'4'});
      expect(model.$omit({a:false, b:true, c:true}).$toDatabaseJson()).to.eql({a:1, d:'4'});
      expect(model.$omit({a:false, b:true, c:true, $e: true}).$e).to.eql('5');
    });

  });

  describe('virtualAttributes', function () {
    var Model;

    beforeEach(function () {
      Model = createModelClass();
    });

    it('should include getters', function () {
      Object.defineProperty(Model.prototype, "foo", {
        get: function () {
          return this.a + this.b;
        }
      });

      Object.defineProperty(Model.prototype, "bar", {
        get: function () {
          return this.a + this.b;
        }
      });

      Model.virtualAttributes = ['foo'];

      expect(Model.fromJson({a: 100, b: 10}).toJSON()).to.eql({
        a: 100,
        b: 10,
        foo: 110
      })
    });

    it('should include methods', function () {
      Model.prototype.foo = function () {
        return this.a + this.b;
      };

      Model.prototype.bar = function () {
        return this.a + this.b;
      };

      Model.virtualAttributes = ['foo'];

      expect(Model.fromJson({a: 100, b: 10}).toJSON()).to.eql({
        a: 100,
        b: 10,
        foo: 110
      })
    });
  });

  function createModelClass(proto, staticStuff) {
    function Model() {
      ModelBase.apply(this, arguments);
    }

    ModelBase.extend(Model);

    _.merge(Model.prototype, proto);
    _.merge(Model, staticStuff);

    return Model;
  }

});
