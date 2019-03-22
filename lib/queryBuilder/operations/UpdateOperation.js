'use strict';

const { ref } = require('../../queryBuilder/ReferenceBuilder');
const { isEmpty } = require('../../utils/objectUtils');
const { afterReturn } = require('../../utils/promiseUtils');
const { isKnexRaw, isKnexQueryBuilder } = require('../../utils/knexUtils');
const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class UpdateOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.model = null;
    this.modelOptions = Object.assign({}, this.opt.modelOptions || {});
  }

  onAdd(builder, args) {
    const json = args[0];
    const modelClass = builder.modelClass();

    this.model = modelClass.ensureModel(json, this.modelOptions);

    return true;
  }

  onBefore2(builder, result) {
    const maybePromise = this.model.$beforeUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, result);
  }

  onBefore3(builder) {
    const row = this.model.$toDatabaseJson(builder);

    if (isEmpty(row)) {
      // Resolve the query if there is nothing to update.
      builder.resolve([0]);
    }
  }

  onBuildKnex(knexBuilder, builder) {
    const json = this.model.$toDatabaseJson(builder);
    const convertedJson = this.convertFieldExpressionsToRaw(builder, json);

    knexBuilder.update(convertedJson);
  }

  onAfter2(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }

  convertFieldExpressionsToRaw(builder, json) {
    const knex = builder.knex();
    const modelClass = builder.modelClass();
    const convertedJson = {};

    for (const key of Object.keys(json)) {
      let val = json[key];

      if (key.indexOf(':') > -1) {
        // 'col:attr' : ref('other:lol') is transformed to
        // "col" : raw(`jsonb_set("col", '{attr}', to_jsonb("other"#>'{lol}'), true)`)

        let parsed = ref(key);
        let jsonRefs =
          '{' +
          parsed.parsedExpr.access
            .map(it => modelClass.columnNameToPropertyName(it.ref))
            .join(',') +
          '}';
        let valuePlaceholder = '?';

        if (isKnexQueryBuilder(val) || isKnexRaw(val)) {
          valuePlaceholder = 'to_jsonb(?)';
        } else {
          val = JSON.stringify(val);
        }

        convertedJson[parsed.column] = knex.raw(
          `jsonb_set(??, '${jsonRefs}', ${valuePlaceholder}, true)`,
          [convertedJson[parsed.column] || parsed.column, val]
        );
      } else {
        convertedJson[key] = val;
      }
    }

    return convertedJson;
  }

  clone() {
    const clone = super.clone();
    clone.model = this.model;
    return clone;
  }
}

module.exports = {
  UpdateOperation
};
