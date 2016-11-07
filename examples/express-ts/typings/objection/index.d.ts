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
   * @see http://vincit.github.io/objection.js/#relationexpression
   */
  export type RelationExpression = string
  export type TraverserFunction = (model: Model, parentModel: string, relationName: string) => void

  /**
   * This is a hack to make bindKnex and other static methods return the subclass type, rather than Model.
   * See https://github.com/Microsoft/TypeScript/issues/5863#issuecomment-242782664
   */
  interface ModelClass<T> {
    new (...a: any[]): T;
    tableName: string;
    jsonSchema: JsonSchema;
    idColumn: string;
    modelPaths: string[];
    relationMappings: RelationMappings;
    jsonAttributes: string[];
    virtualAttributes: string[];
    uidProp: string;
    uidRefProp: string;
    dbRefProp: string;
    propRefRegex: RegExp;
    pickJsonSchemaProperties: boolean;
    defaultEagerAlgorithm?: EagerAlgorithm
    defaultEagerOptions?: EagerOptions;
    QueryBuilder: typeof QueryBuilder;
    RelatedQueryBuilder: typeof QueryBuilder;
    raw: knex.RawBuilder
    fn: knex.FunctionHelper
    BelongsToOneRelation: Relation
    HasOneRelation: Relation
    HasManyRelation: Relation
    ManyToManyRelation: Relation

    query(): QueryBuilder;
    knex(knex?: knex): knex;
    formatter(): any; // < the knex typings punts here too
    knexQuery(): QueryBuilder;

    bindKnex(knex: knex): T & ModelClass<T>;
    bindTransaction(transaction: Transaction): T & ModelClass<T>;
    extend(subclass: T): T & ModelClass<T>;

    fromJson(json: Object, opt: ModelOptions): T & Model;
    fromDatabaseJson(row: Object): T & Model;

    omitImpl(f: (obj: Object, prop: string) => void): void;

    loadRelated(models: Model[], expression: RelationExpression, filters: Filters): void;

    traverse(filterConstructor: ModelClass<any>, models: Model | Model[], traverser: TraverserFunction): void;
    traverse(models: Model | Model[], traverser: TraverserFunction): void;
  }

  type Filters = { [filterName: string]: (queryBuilder: QueryBuilder) => void }
  type Properties = { [propertyName: string]: boolean }

  export class Model {
    static tableName: string;
    static jsonSchema: JsonSchema;
    static idColumn: string;
    static modelPaths: string[];
    static relationMappings: RelationMappings;
    static jsonAttributes: string[];
    static virtualAttributes: string[];
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
    static bindKnex<T extends Model>(this: ModelClass<T>, knex: knex): ModelClass<T>;
    static bindTransaction<T extends Model>(this: ModelClass<T>, transaction: Transaction): ModelClass<T>;
    static extend<T>(subclass: T): ModelClass<T>;

    static fromJson<T extends Model>(this: ModelClass<T>, json: Object, opt: ModelOptions): T;
    static fromDatabaseJson<T extends Model>(this: ModelClass<T>, row: Object): T;

    static omitImpl(f: (obj: Object, prop: string) => void): void;

    static loadRelated(models: Model[], expression: RelationExpression, filters: Filters): void;

    static traverse(filterConstructor: ModelClass<any>, models: Model | Model[], traverser: TraverserFunction): void;
    static traverse(models: Model | Model[], traverser: TraverserFunction): void;

    $id(): any;
    $id(id: any): void;

    $beforeValidate(jsonSchema: JsonSchema, json: Object, opt: ModelOptions): JsonSchema;
    $validate(): void // may throw ValidationError if validation fails
    $afterValidate(json: Object, opt: ModelOptions): void; // may throw ValidationError if validation fails

    $toDatabaseJson(): Object;
    $toJson(): Object;
    toJSON(): Object;
    $parseDatabaseJson(json: Object): Object;
    $formatDatabaseJson(json: Object): Object;
    $parseJson(json: Object, opt: ModelOptions): Object;
    $formatJson(json: Object): Object;
    $setJson<T extends Model>(this: ModelClass<T>, json: Object, opt: ModelOptions): T;
    $setDatabaseJson<T extends Model>(this: ModelClass<T>, json: Object): T;

    $set<T extends Model>(this: ModelClass<T>, obj: Object): T;
    $omit<T extends Model>(this: ModelClass<T>, keys: string | string[] | Properties): T;
    $pick<T extends Model>(this: ModelClass<T>, keys: string | string[] | Properties): T;
    $clone<T extends Model>(this: ModelClass<T>): T;

    $query(): QueryBuilder;
    $relatedQuery(relationName: string): QueryBuilder;

    $loadRelated(expression: RelationExpression, filters: Filters): QueryBuilder;

    $traverse<T extends Model>(this: ModelClass<T>, traverser: TraverserFunction): void;
    $traverse<T extends Model>(this: ModelClass<T>, filterConstructor: ModelClass<T>, traverser: TraverserFunction): void;

    $knex(): knex;
    $transaction(): knex; // TODO: this is based on the documentation, but doesn't make sense (why not Transaction?)

    $beforeInsert(queryContext: Object): Promise<any> | void;
    $afterInsert(queryContext: Object): Promise<any> | void;
    $afterUpdate(opt: ModelOptions, queryContext: Object): Promise<any> | void;
    $beforeUpdate(opt: ModelOptions, queryContext: Object): Promise<any> | void;
  }

  export class QueryBuilder {
    static extend(subclassConstructor: FunctionConstructor): void;
    static forClass(modelClass: Model): QueryBuilder;
  }

  // TODO: QueryBuilder types are not complete and may have mistakes:  
  export interface QueryBuilder extends knex.QueryBuilder {
    allowEager(relationExpression: string): QueryBuilder;
    allowInsert(relationExpression: any): QueryBuilder;
    asCallback(callback: Function): Promise<any>;
    bind(context: any): Promise<any>;
    clone(): QueryBuilder;
    context(queryContext: Object): QueryBuilder;
    delete(): QueryBuilder;
    deleteById(id: any): QueryBuilder;
    dumpSql(logger: (sql: string) => any): QueryBuilder;
    eager(relationExpression: string, filters?: Object): QueryBuilder;
    findById(id: any): QueryBuilder;
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
