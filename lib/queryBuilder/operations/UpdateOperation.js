'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');
const jsonFieldExpressionParser = require('../parsers/jsonFieldExpressionParser');
const fromJson = require('../../model/modelFactory').fromJson;
const toDatabaseJson = require('../../model/modelFactory').toDatabaseJson;
const afterReturn = require('../../utils/promiseUtils').afterReturn;

class UpdateOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.model = null;
    this.modelOptions = Object.assign({}, this.opt.modelOptions || {});
    this.queryProps = null;
    this.isWriteOperation = true;
  }

  onAdd(builder, args) {
    const modelClass = builder.modelClass();
    let json = args[0];

    if (json instanceof modelClass) {
      this.model = json;
    } else if (json) {
      // Convert into model instance and separate query properties like
      // query builders, knex raw calls etc.
      const split = fromJson({
        modelOptions: this.modelOptions,
        modelClass: modelClass,
        deep: false,
        json: json
      });

      this.model = split.model;
      this.queryProps = split.queryProps;
    }

    return true;
  }

  onBefore2(builder, result) {
    const maybePromise = this.model.$beforeUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, result);
  }

  onBuildKnex(knexBuilder, builder) {
    // Builder options can contain a queryProps map. Use it
    // if there isn't a local one.
    const queryProps = this.queryProps || builder.internalOptions().queryProps;

    const json = toDatabaseJson({
      model: this.model,
      knex: builder.knex(),
      queryProps
    });

    // convert ref syntax to knex.raw
    // TODO: jsonb attr update implementation for mysql and sqlite..
    const knex = builder.knex();
    const loweredJson = {};
    const keys = Object.keys(json);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const val = json[key];

      // convert update to jsonb_set format if attr inside jsonb column is set
      if (key.indexOf(':') > -1) {
        // e.g. 'col:attr' : ref('other:lol') is transformed to
        // "col" : raw(`jsonb_set("col", '{attr}', to_jsonb("other"#>'{lol}'), true)`)

        let parsed = jsonFieldExpressionParser.parse(key);
        let jsonRefs = '{' + parsed.access.map(it => it.ref).join(',') + '}';

        loweredJson[parsed.columnName] = knex.raw(
          `jsonb_set(??, '${jsonRefs}', to_jsonb(?), true)`,
          [parsed.columnName, val]
        );
      } else {
        loweredJson[key] = val;
      }
    }

    knexBuilder.update(loweredJson);
  }

  onAfter2(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }
}

module.exports = UpdateOperation;
