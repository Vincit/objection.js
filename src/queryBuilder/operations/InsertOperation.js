import _ from 'lodash';
import QueryBuilderOperation from './QueryBuilderOperation';
import {mapAfterAllReturn} from '../../utils/promiseUtils';
import {isPostgres} from '../../utils/dbUtils';

export default class InsertOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.models = null;
    this.isArray = false;
    this.modelOptions = this.opt.modelOptions || {};
    this.isWriteOperation = true;
  }

  call(builder, args) {
    this.isArray = _.isArray(args[0]);
    this.models = builder.modelClass().ensureModelArray(args[0], this.modelOptions);
    return true;
  }

  onBeforeInternal(builder, result) {
    if (this.models.length > 1 && !isPostgres(this.knex)) {
      throw new Error('batch insert only works with Postgresql');
    } else {
      return mapAfterAllReturn(this.models, model => model.$beforeInsert(builder.context()), result);
    }
  }

  onBuild(knexBuilder, builder) {
    if (!builder.has(/returning/)) {
      // If the user hasn't specified a `returning` clause, we make sure
      // that at least the identifier is returned.
      knexBuilder.returning(builder.modelClass().idColumn);
    }

    knexBuilder.insert(_.map(this.models, model => {
      return model.$toDatabaseJson()
    }));
  }

  onAfterQuery(builder, ret) {
    if (!_.isArray(ret) || _.isEmpty(ret) || ret === this.models) {
      // Early exit if there is nothing to do.
      return this.models;
    }

    if (_.isObject(ret[0])) {
      // If the user specified a `returning` clause the result may be an array of objects.
      // Merge all values of the objects to our models.
      _.each(this.models, (model, index) => model.$set(ret[index]));
    } else {
      // If the return value is not an array of objects, we assume it is an array of identifiers.
      _.each(this.models, (model, idx) => {
        // Don't set the id if the model already has one. MySQL and Sqlite don't return the correct
        // primary key value if the id is not generated in db, but given explicitly.
        if (!model.$id()) {
          model.$id(ret[idx]);
        }
      });
    }

    return this.models;
  }

  onAfterInternal(builder, models) {
    const result = this.isArray ? models : (models[0] || null);
    return mapAfterAllReturn(models, model => model.$afterInsert(builder.context()), result);
  }
}
