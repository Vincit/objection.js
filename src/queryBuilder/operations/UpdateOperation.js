import _ from 'lodash';
import clone from 'lodash/clone';
import QueryBuilderOperation from './QueryBuilderOperation';
import ReferenceBuilder from '../ReferenceBuilder';
import jsonFieldExpressionParser from '../parsers/jsonFieldExpressionParser';
import {afterReturn} from '../../utils/promiseUtils';


export default class UpdateOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.model = null;
    this.modelOptions = clone(this.opt.modelOptions) || {};
    this.isWriteOperation = true;
  }

  call(builder, args) {
    this.model = builder.modelClass().ensureModel(args[0], this.modelOptions);
    return true;
  }

  onBeforeInternal(builder, result) {
    const maybePromise = this.model.$beforeUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, result);
  }

  onBuild(knexBuilder, builder) {
    const json = this.model.$toDatabaseJson();

    // TODO: jsonb attr update implementation for mysql and sqlite..
    const loweredJson = {};

    _.forOwn(json, (val, key) => {
      // convert ref values to raw
      let loweredValue = (val instanceof ReferenceBuilder) ?
        knexBuilder.client.raw(...(val.toRawArgs())) : val;


      // convert update to jsonb_set format if attr inside jsonb column is set
      if (key.indexOf(':') > -1) {
        // e.g. 'col:attr' : ref('other:lol') is transformed to
        // "col" : raw(`jsonb_set("col", '{attr}', to_jsonb("other"#>'{lol}'), true)`)

        let parsed = jsonFieldExpressionParser.parse(key);
        let jsonRefs = '{' + _(parsed.access).map('ref').value().join(',') + '}';

        loweredJson[parsed.columnName] = knexBuilder.client.raw(
          `jsonb_set(??, '${jsonRefs}', to_jsonb(?), true)`,
          [parsed.columnName, loweredValue]
        );
      } else {
        loweredJson[key] = loweredValue;
      }
    });

    knexBuilder.update(loweredJson);
  }

  onAfterInternal(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }
}
