'use strict';

const { ref } = require('../../queryBuilder/ReferenceBuilder');
const { isEmpty } = require('../../utils/objectUtils');
const { isKnexRaw, isKnexQueryBuilder } = require('../../utils/knexUtils');
const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { StaticHookArguments } = require('../StaticHookArguments');

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

  async onBefore2(builder, result) {
    await callBeforeUpdate(builder, this.model, this.modelOptions);
    return result;
  }

  onBefore3(builder) {
    const row = this.model.$toDatabaseJson(builder);

    if (isEmpty(row)) {
      // Resolve the query if there is nothing to update.
      builder.resolve(0);
    }
  }

  onBuildKnex(knexBuilder, builder) {
    const json = this.model.$toDatabaseJson(builder);
    const convertedJson = this.convertFieldExpressionsToRaw(builder, json);

    knexBuilder.update(convertedJson);
  }

  onAfter2(builder, numUpdated) {
    return callAfterUpdate(builder, this.model, this.modelOptions, numUpdated);
  }

  convertFieldExpressionsToRaw(builder, json) {
    const knex = builder.knex();
    const convertedJson = {};

    for (const key of Object.keys(json)) {
      let val = json[key];

      if (key.indexOf(':') > -1) {
        // 'col:attr' : ref('other:lol') is transformed to
        // "col" : raw(`jsonb_set("col", '{attr}', to_jsonb("other"#>'{lol}'), true)`)

        let parsed = ref(key);
        let jsonRefs = '{' + parsed.parsedExpr.access.map(it => it.ref).join(',') + '}';
        let valuePlaceholder = '?';

        if (isKnexQueryBuilder(val) || isKnexRaw(val)) {
          valuePlaceholder = 'to_jsonb(?)';
        } else {
          val = JSON.stringify(val);
        }

        convertedJson[
          parsed.column
        ] = knex.raw(`jsonb_set(??, '${jsonRefs}', ${valuePlaceholder}, true)`, [
          convertedJson[parsed.column] || parsed.column,
          val
        ]);

        delete this.model[key];
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

async function callBeforeUpdate(builder, model, modelOptions) {
  await callInstanceBeforeUpdate(builder, model, modelOptions);
  return callStaticBeforeUpdate(builder);
}

function callInstanceBeforeUpdate(builder, model, modelOptions) {
  return model.$beforeUpdate(modelOptions, builder.context());
}

function callStaticBeforeUpdate(builder) {
  const args = StaticHookArguments.create({ builder });
  return builder.modelClass().beforeUpdate(args);
}

async function callAfterUpdate(builder, model, modelOptions, result) {
  await callInstanceAfterUpdate(builder, model, modelOptions);
  return callStaticAfterUpdate(builder, result);
}

function callInstanceAfterUpdate(builder, model, modelOptions) {
  return model.$afterUpdate(modelOptions, builder.context());
}

async function callStaticAfterUpdate(builder, result) {
  const args = StaticHookArguments.create({ builder, result });
  const maybeResult = await builder.modelClass().afterUpdate(args);

  if (maybeResult === undefined) {
    return result;
  } else {
    return maybeResult;
  }
}

module.exports = {
  UpdateOperation
};
