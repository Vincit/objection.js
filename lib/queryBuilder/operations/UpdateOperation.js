'use strict';

const ref = require('../../queryBuilder/ReferenceBuilder').ref;
const fromJson = require('../../model/modelFactory').fromJson;
const isKnexRaw = require('../../utils/knexUtils').isKnexRaw;
const toDatabaseJson = require('../../model/modelFactory').toDatabaseJson;
const isKnexQueryBuilder = require('../../utils/knexUtils').isKnexQueryBuilder;
const QueryBuilderOperation = require('./QueryBuilderOperation');
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
    const internalOpts = builder.internalOptions();
    // Builder options can contain a queryProps map. Use it
    // if there isn't a local one.
    const queryProps = this.queryProps || internalOpts.queryProps;

    const json = toDatabaseJson({
      model: this.model,
      knex: builder.knex(),
      queryProps
    });

    const convertedJson = this.convertFieldExpressionsToRaw(builder, json);
    knexBuilder.update(convertedJson);
  }

  onAfter2(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }

  convertFieldExpressionsToRaw(builder, json) {
    const knex = builder.knex();
    const convertedJson = {};
    const keys = Object.keys(json);

    for (let i = 0, l = keys.length; i < l; ++i) {
      let key = keys[i];
      let val = json[key];

      if (key.indexOf(':') > -1) {
        // 'col:attr' : ref('other:lol') is transformed to
        // "col" : raw(`jsonb_set("col", '{attr}', to_jsonb("other"#>'{lol}'), true)`)

        let parsed = ref(key);
        let jsonRefs = '{' + parsed.reference.access.map(it => it.ref).join(',') + '}';
        let valuePlaceholder = '?';

        if (isKnexQueryBuilder(val) || isKnexRaw(val)) {
          valuePlaceholder = 'to_jsonb(?)';
        } else {
          val = JSON.stringify(val);
        }

        convertedJson[parsed.column] = knex.raw(
          `jsonb_set(??, '${jsonRefs}', ${valuePlaceholder}, true)`,
          [parsed.column, val]
        );
      } else {
        convertedJson[key] = val;
      }
    }

    return convertedJson;
  }
}

module.exports = UpdateOperation;
