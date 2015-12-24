import _ from 'lodash';
import QueryBuilderBase from './QueryBuilderBase';

/**
 * Internal representation of insert and update data.
 *
 * Data passed to update or insert queries can be:
 *
 *  1. Javascript primitives
 *  2. knex raw SQL expressions
 *  3. knex queries
 *  4. objection queries
 *
 * This class splits the insert data into two parts:
 *
 *  Part 1:
 *    * Javascript primitives
 *
 *  Part 2:
 *    * everything else
 *
 * The part 1 is converted into `Model` instances and the part 2 is left untouched. As the `InsertionOrUpdate`
 * instance passes through objection during an insert or update operation, the different functions can operate
 * on the models (for example call $beforeInsert etc. methods on them). When the `InsertionOrUpdate` instance
 * finally reaches knex, the two parts are glued back together.
 *
 * @ignore
 */
export default class InsertionOrUpdate {

  constructor({ModelClass, modelsOrObjects, modelOptions}) {
    this.ModelClass = ModelClass;

    this._models = [];
    this._rawOrQuery = [];
    this._arrayInput = false;

    this.setData(modelsOrObjects, modelOptions);
  }

  model() {
    return this._models[0];
  }

  models() {
    return this._models;
  }

  /**
   * Returns true if the input to `setData` method was an array.
   *
   * @ignore
   * @returns {boolean}
   */
  isArray() {
    return this._arrayInput;
  }

  /**
   * Sets the actual insert/update data.
   *
   * @ignore
   * @param {(Object|Array.<Object>)} data
   * @param {ModelOptions} modelOptions
   */
  setData(data, modelOptions) {
    let knex = this.ModelClass.knex();
    let KnexQueryBuilder = knex.client.QueryBuilder;
    let Raw = knex.client.Raw;

    // knex.QueryBuilder and knex.Raw are not documented properties.
    // We make sure here that things break if knex changes things.
    if (!_.isFunction(KnexQueryBuilder) || !_.isFunction(Raw)) {
      throw new Error('knex API has changed: knex.QueryBuilder or knex.Raw constructor missing.');
    }

    this._models = [];
    this._rawOrQuery = [];
    this._arrayInput = _.isArray(data);

    if (!this._arrayInput) {
      data = _.isObject(data) ? [data] : [];
    }

    // Separate raw queries and query builders from javascript primitives.
    // The javascript primitives are converted into a Model instance and the
    // "query" properties are stored separately.
    _.forEach(data, obj => {
      if (obj instanceof this.ModelClass) {
        this._models.push(obj);
        this._rawOrQuery.push({});
      } else {
        let modelJson = {};
        let rawOrSubquery = {};

        _.forEach(obj, (value, key) => {
          if (value instanceof KnexQueryBuilder|| value instanceof Raw) {
            rawOrSubquery[key] = value;
          } else if (value instanceof QueryBuilderBase) {
            rawOrSubquery[key] = value.build();
          } else {
            modelJson[key] = value;
          }
        });

        this._models.push(this.ModelClass.fromJson(modelJson, modelOptions));
        this._rawOrQuery.push(rawOrSubquery);
      }
    });
  }

  /**
   * Create an object that can be given for the knex update or insert method.
   *
   * @ignore
   * @returns {Object|Array.<Object>}
   */
  toKnexInput() {
    let knexInput = _.map(this._models, (model, i) => {
      return _.merge(model.$toDatabaseJson(), _.mapKeys(this._rawOrQuery[i], (value, key) => {
        return model.constructor.propertyNameToColumnName(key);
      }));
    });

    return knexInput.length === 1 ? knexInput[0] : knexInput;
  }
}

