// Type definitions for objection v0.6.1
// Project: Objection.js <http://vincit.github.io/objection.js/>
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

declare module "objection" {

  import * as knex from 'knex';
  import { JsonSchema } from 'jsonschema';

  export interface ModelOptions {
    patch: boolean;
    skipValidation: boolean;
  }

  export interface ValidationError {
    statusCode: number;
    data: any;
  }

  export type RelationMappings = { [relationName: string]: RelationMapping }

  interface Relation {
    // TODO should this be something other than a tagging interface?
  }

  export interface RelationJoin {
    from: string | string[];
    to: string | string[];
    through?: RelationThrough;
  }

  export interface RelationThrough {
    from: string | string[];
    to: string | string[];
    modelClass?: string | typeof Model;
    extra?: string[];
  }

  export interface RelationMapping {
    relation: Relation;
    modelClass: typeof Model | String;
    join: RelationJoin;
    modify?: (queryBuilder: QueryBuilder) => {};
    filter?: (queryBuilder: QueryBuilder) => {};
  }

  export interface EagerAlgorithm {
    // TODO should this be something other than a tagging interface?
  }

  export interface EagerOptions {
    minimize?: boolean;
    separator?: string;
    aliases?: string[];
  }

  /**
   * This is a hack to make bindKnex return subclasses
   * See https://github.com/Microsoft/TypeScript/issues/5863#issuecomment-242782664
   */
  interface ModelClass<T extends Model> {
    new (...a: any[]): T;
    bindKnex<T extends Model>(this: ModelClass<T>, knex: knex): T;
  }


  export class Model {
    static tableName: string;
    static jsonSchema?: JsonSchema;
    static idColumn?: string;
    static modelPaths?: string[];
    static relationMappings?: RelationMappings;
    static jsonAttributes?: string[];
    static virtualAttributes?: string[];
    static uidProp: string;
    static uidRefProp: string;
    static dbRefProp: string;
    static propRefRegex: RegExp;
    static pickJsonSchemaProperties: boolean;
    static defaultEagerAlgorithm?: EagerAlgorithm
    static defaultEagerOptions?: EagerOptions;
    static QueryBuilder: typeof QueryBuilder;
    static RelatedQueryBuilder: typeof QueryBuilder;

    static raw: knex.RawBuilder
    static fn: knex.FunctionHelper

    static BelongsToOneRelation: Relation
    static HasOneRelation: Relation
    static HasManyRelation: Relation
    static ManyToManyRelation: Relation

    static query(): QueryBuilder;
    static knex(knex?: knex): knex;
    static formatter(): any; // < the knex typings punts here too
    static knexQuery(): QueryBuilder;

    // This approach should be applied to all other references of Model that 
    // should return the subclass:
    static bindKnex<T extends Model>(this: ModelClass<T>, knex: knex): T;
    static bindTransaction(transaction: Transaction): any;

    // !!!!
    // TODO: The remainder of this file should be examined. Most references to "any" are probably wrong:
    // !!!!

    static extend<T>(subclassConstructor: () => T): QueryBuilder & T;
    static fromDatabaseJson(row: Object): Model;
    static fromJson(json: Object, opt: ModelOptions): Model;
    static loadRelated(models: Array<Model | Object>, expression: string, filters: { filterName: string, filterFunction: (queryBuilder: QueryBuilder) => void }): void;
    static omitImpl(obj: Object, prop: string): void;
    static traverse(filterConstructor: FunctionConstructor, models: Model | Array<Model>, traverser: (model: Model, parentModel: string, relationName: string) => void): void;
    static traverse(models: Model | Array<Model>, traverser: (model: Model, parentModel: string, relationName: string) => void): void;

    $afterInsert(queryContext: Object): Promise<any>;
    $afterUpdate(opt: ModelOptions, queryContext: Object): Promise<any>;
    $afterValidate(json: Object, opt: ModelOptions): void;
    $beforeInsert(queryContext: Object): Promise<any>;
    $beforeUpdate(opt: ModelOptions, queryContext: Object): Promise<any>;
    $beforeValidate(jsonSchema: Object, json: Object, opt: ModelOptions): Object;
    $clone(): Model;
    $formatDatabaseJson(json: Object): Object;
    $formatJson(json: Object): Object;
    $id(): number | string;
    $id(id: number | string): void;
    $loadRelated(expression: string, filters: Object): Promise<any>;
    $omit(keys: string | Array<string | Object>): Model;
    $parseDatabaseJson(json: Object): Object;
    $parseJson(json: Object, opt: ModelOptions): Object;
    $pick(...keys: string[]): Model;
    $pick(keys: string | Array<string> | Object): Model
    $query(): Model;
    $relatedQuery(relationName: string): QueryBuilder;
    $set(obj: Object): Model;
    $setDatabaseJson(json: Object): Model;
    $setJson(json: Object, opt: ModelOptions): Model;
    $toDatabaseJson(): Object;
    $toJson(): Object;
    $traverse(...args: any[]): void;
    $validate(): ValidationError;
    toJSON(): Object;
  }

  export class QueryBuilder {
    static extend(subclassConstructor: FunctionConstructor): void;
    static forClass(modelClass: Model): QueryBuilder;
  }

  export interface QueryBuilder extends knex.QueryBuilder {
    allowEager(relationExpression: string): QueryBuilder;
    allowInsert(relationExpression: any): QueryBuilder;
    asCallback(callback: Function): Promise<any>;
    bind(context: any): Promise<any>;
    clone(): QueryBuilder;
    context(queryContext: Object): QueryBuilder;
    delete(): QueryBuilder;
    deleteById(id: any | Array<any>): QueryBuilder;
    dumpSql(logger: (sql: string) => any): QueryBuilder;
    eager(relationExpression: string, filters?: Object): QueryBuilder;
    findById(id: any | Array<any>): QueryBuilder;
    insert(modelsOrObjects: Object | Model | Array<Object> | Array<Model>): QueryBuilder;
    insertAndFetch(modelsOrObjects: Object | Model | Array<Object> | Array<Model>): QueryBuilder;
    insertWithRelated(graph: Object | Model | Array<Object> | Array<Model>): QueryBuilder;
    isExecutable(): boolean;
    map(mapper: () => any): Promise<any>;
    modelClass(): typeof Model;
    nodeify(callback: Function): Promise<any>;
    omit(modelClass: Model, properties: Array<string>): QueryBuilder;
    omit(properties: Array<string>): QueryBuilder;
    onBuild(fn: (builder: QueryBuilder) => QueryBuilder): QueryBuilder;
    orWhereJsonEquals(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    orWhereJsonField(fieldExpression: any, operator: string, value: boolean | number | string): QueryBuilder;
    orWhereJsonHasAll(fieldExpression: any, keys: string | Array<string>): QueryBuilder;
    orWhereJsonHasAny(fieldExpression: any, keys: string | Array<string>): QueryBuilder;
    orWhereJsonIsArray(fieldExpression: any): QueryBuilder;
    orWhereJsonIsObject(fieldExpression: any): QueryBuilder;
    orWhereJsonNotArray(fieldExpression: any): QueryBuilder;
    orWhereJsonNotEquals(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    orWhereJsonNotObject(fieldExpression: any): QueryBuilder;
    orWhereJsonNotSubsetOf(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    orWhereJsonNotSupersetOf(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    orWhereJsonSubsetOf(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    orWhereJsonSupersetOf(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    orWhereRef(leftRef: string, operator: string, rightRef: string): QueryBuilder;
    page(page: number, pageSize: number): QueryBuilder;
    patch(modelOrObject: Object | Model): QueryBuilder;
    patchAndFetchById(id: string | number, modelOrObject: Object | Model): QueryBuilder;
    pick(modelClass: Model, properties: Array<string>): QueryBuilder;
    pick(properties: Array<string>): QueryBuilder;
    pluck(propertyName: string): QueryBuilder;
    range(start: number, end: number): QueryBuilder;
    reject(reason: any): QueryBuilder;
    relate(ids: Array<any>): QueryBuilder;
    resolve(value: any): QueryBuilder;
    resultSize(): Promise<any>;
    runAfter(fn: (builder: QueryBuilder) => QueryBuilder): QueryBuilder;
    runBefore(fn: (builder: QueryBuilder) => QueryBuilder): QueryBuilder;
    skipUndefined(): QueryBuilder;
    traverse(modelClass: Model, traverser: (model: Model, parentModel: Model, relationName: string) => any): QueryBuilder;
    traverse(traverser: (model: Model, parentModel: Model, relationName: string) => any): QueryBuilder;
    unrelate(): QueryBuilder;
    update(modelOrObject: Object | Model): QueryBuilder;
    updateAndFetchById(id: string | number, modelOrObject: Object | Model): QueryBuilder;
    whereComposite(columns: Array<string>, operator: string, values: Array<any>): QueryBuilder;
    whereInComposite(column: string, values: Array<any>): QueryBuilder;
    whereInComposite(columns: Array<string>, values: Array<any>): QueryBuilder;
    whereJsonEquals(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    whereJsonField(fieldExpression: any, operator: string, value: boolean | number | string): QueryBuilder;
    whereJsonHasAll(fieldExpression: any, keys: string | Array<string>): QueryBuilder;
    whereJsonHasAny(fieldExpression: any, keys: string | Array<string>): QueryBuilder;
    whereJsonIsArray(fieldExpression: any): QueryBuilder;
    whereJsonIsObject(fieldExpression: any): QueryBuilder;
    whereJsonNotArray(fieldExpression: any): QueryBuilder;
    whereJsonNotEquals(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    whereJsonNotObject(fieldExpression: any): QueryBuilder;
    whereJsonNotSubsetOf(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    whereJsonNotSupersetOf(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    whereJsonSubsetOf(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    whereJsonSupersetOf(fieldExpression: any, jsonObjectOrFieldExpression: any): QueryBuilder;
    whereRef(leftRef: string, operator: string, rightRef: string): QueryBuilder;
  }

  export function transaction<T>(model: typeof Model, callback: (model: typeof Model) => Promise<T>): Promise<T>;

  export class Transaction {
    static start(knexOrModel: knex | Model): Promise<Transaction>;
    commit(): void;
    rollback(): void;
  }
}
