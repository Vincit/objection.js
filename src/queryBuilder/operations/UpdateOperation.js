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
    // convert ref syntax to knex.raw
    // TODO: jsonb attr update implementation for mysql and sqlite..
    const knex = builder.knex();

    _.forOwn(args[0], (val, key) => {
      // convert ref values to raw
      let loweredValue = (val instanceof ReferenceBuilder) ?
        knex.raw(...(val.toRawArgs())) : val;

      // convert update to jsonb_set format if attr inside jsonb column is set
      if (key.indexOf(':') > -1) {
        // e.g. 'col:attr' : ref('other:lol') is transformed to
        // "col" : raw(`jsonb_set("col", '{attr}', to_jsonb("other"#>'{lol}'), true)`)

        let parsed = jsonFieldExpressionParser.parse(key);
        let jsonRefs = '{' + _(parsed.access).map('ref').value().join(',') + '}';

        args[0][parsed.columnName] = knex.raw(
          `jsonb_set(??, '${jsonRefs}', to_jsonb(?), true)`,
          [parsed.columnName, loweredValue]
        );
        // (looks like I just can't set new stuff to args[0] that
        //  would be the converted object so I just modify the
        //  original args|0] object)
        delete args[0][key];
      } else {
        args[0][key] = loweredValue;
      }
    });

    this.model = builder.modelClass().ensureModel(args[0], this.modelOptions);
    return true;
  }

  onBeforeInternal(builder, result) {
    const maybePromise = this.model.$beforeUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, result);
  }

  onBuild(knexBuilder, builder) {
    const json = this.model.$toDatabaseJson();
    knexBuilder.update(json);
  }

  onAfterInternal(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }
}
