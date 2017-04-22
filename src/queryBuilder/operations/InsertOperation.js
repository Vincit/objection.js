const QueryBuilderOperation = require('./QueryBuilderOperation');
const {fromJson, toDatabaseJson} = require('../../model/modelFactory');
const {mapAfterAllReturn} = require('../../utils/promiseUtils');
const {isPostgres} = require('../../utils/knexUtils');

module.exports = class InsertOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    /**
     * The models we are inserting.
     *
     * @type {Array.<Model>}
     */
    this.models = null;

    /**
     * this.models is always an array, this is true if the
     * original input was an array.
     *
     * @type {boolean}
     */
    this.isArray = false;

    /**
     * Options for the Model.fromJson call.
     *
     * @type {ModelOptions}
     */
    this.modelOptions = Object.assign({}, this.opt.modelOptions || {});

    /**
     * Set this to true if the the input should be split into models
     * and query properties deeply (with relations).
     *
     * @type {boolean}
     */
    this.splitQueryPropsDeep = false;

    /**
     * Maps models in this.models into query properties that were
     * separated from them.
     *
     * @type {Map}
     */
    this.queryProps = null;

    /**
     * @type {boolean}
     */
    this.isWriteOperation = true;
  }

  call(builder, args) {
    // The objects to insert.
    let json = args[0];
    let modelClass = builder.modelClass();

    this.isArray = Array.isArray(json);

    if (!this.isArray) {
      json = [json];
    }

    if (json.every(it => it instanceof modelClass)) {
      // No need to convert, already model instances.
      this.models = json;
    } else {
      // Convert into model instances and separate query properties like
      // query builders, knex raw calls etc.
      const split = fromJson({
        modelOptions: this.modelOptions,
        modelClass: modelClass,
        deep: this.splitQueryPropsDeep,
        json
      });

      this.models = split.model;
      this.queryProps = split.queryProps;
    }

    return true;
  }

  onBeforeInternal(builder, result) {
    if (this.models.length > 1 && !isPostgres(builder.knex())) {
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

    const json = new Array(this.models.length);
    // Builder options can contain a queryProps map. Use it
    // if there isn't a local one.
    const queryProps = this.queryProps || builder.internalOptions().queryProps;

    // Convert the models into database json and merge the query
    // properties back.
    for (let i = 0, l = this.models.length; i < l; ++i) {
      json[i] = toDatabaseJson({
        model: this.models[i],
        queryProps
      });
    }

    knexBuilder.insert(json);
  }

  onAfterQuery(builder, ret) {
    if (!Array.isArray(ret) || !ret.length || ret === this.models) {
      // Early exit if there is nothing to do.
      return this.models;
    }

    if (ret[0] && typeof ret[0] === 'object') {
      // If the user specified a `returning` clause the result may be an array of objects.
      // Merge all values of the objects to our models.
      for (let i = 0, l = this.models.length; i < l; ++i) {
        this.models[i].$set(ret[i]);
      }
    } else {
      // If the return value is not an array of objects, we assume it is an array of identifiers.
      for (let i = 0, l = this.models.length; i < l; ++i) {
        const model = this.models[i];

        // Don't set the id if the model already has one. MySQL and Sqlite don't return the correct
        // primary key value if the id is not generated in db, but given explicitly.
        if (!model.$id()) {
          model.$id(ret[i]);
        }
      }
    }

    return this.models;
  }

  onAfterInternal(builder, models) {
    const result = this.isArray ? models : (models[0] || null);
    return mapAfterAllReturn(models, model => model.$afterInsert(builder.context()), result);
  }
}
