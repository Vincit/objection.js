// Type definitions for objection v0.6.1
// Project: Objection.js <http://vincit.github.io/objection.js/>
// Definitions by: Matthew McEachen <https://github.com/mceachen>

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

  export type RelationMappings = { [relationName: string]: RelationMapping };

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
   * @see http://vincit.github.io/objection.js/#fieldexpression
   */
  type FieldExpression = string;

  /**
   * @see http://vincit.github.io/objection.js/#relationexpression
   */
  type RelationExpression = string;

  type FilterFunction = (queryBuilder: QueryBuilder) => void;

  type FilterExpression = { [namedFilter: string]: FilterFunction };

  interface RelationExpressionMethod {
    (relationExpression: RelationExpression): QueryBuilder;
  }

  type TraverserFunction = (model: typeof Model, parentModel: string | typeof Model, relationName: string) => void;

  type Id = string | number;

  type IdOrIds = Id | Id[];

  type ModelsOrObjects = Model | Object | Model[] | Object[];

  type RelationOptions = { alias: boolean | string };

  interface JoinRelation {
    (relationName: string, opt?: RelationOptions): QueryBuilder;
  }

  type JsonObjectOrFieldExpression = Object | Object[] | FieldExpression;

  interface WhereJson {
    (fieldExpression: FieldExpression, jsonObjectOrFieldExpression: JsonObjectOrFieldExpression): QueryBuilder;
  }

  interface WhereFieldExpression {
    (fieldExpression: FieldExpression): QueryBuilder;
  }

  interface WhereJsonExpression {
    (fieldExpression: FieldExpression, keys: string | string[]): QueryBuilder;
  }

  interface WhereJsonField {
    (fieldExpression: FieldExpression, operator: string, value: boolean | number | string | null): QueryBuilder;
  }

  interface ModifyEager {
    (relationExpression: string | RelationExpression, modifier: (builder: QueryBuilder) => void): QueryBuilder;
  }

  interface BluebirdMapper<T, Result> {
    (item: T, index: number): Result
  }

  interface NodeStyleCallback {
    (err: any, result?: any): void
  }

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
    raw: knex.RawBuilder;
    fn: knex.FunctionHelper;
    BelongsToOneRelation: Relation;
    HasOneRelation: Relation;
    HasManyRelation: Relation;
    ManyToManyRelation: Relation;

    query(transaction?: Transaction): QueryBuilder;
    knex(knex?: knex): knex;
    formatter(): any; // < the knex typings punts here too
    knexQuery(): QueryBuilder;

    bindKnex(knex: knex): T & ModelClass<T>;
    bindTransaction(transaction: Transaction): T & ModelClass<T>;
    extend(subclass: T): T & ModelClass<T>;

    fromJson(json: Object, opt?: ModelOptions): T & Model;
    fromDatabaseJson(row: Object): T & Model;

    omitImpl(f: (obj: Object, prop: string) => void): void;

    loadRelated(models: Model[], expression: RelationExpression, filters: Filters): void;

    traverse(filterConstructor: ModelClass<any>, models: Model | Model[], traverser: TraverserFunction): void;
    traverse(models: Model | Model[], traverser: TraverserFunction): void;
  }

  type Filters = { [filterName: string]: (queryBuilder: QueryBuilder) => void };
  type Properties = { [propertyName: string]: boolean };

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

    static raw: knex.RawBuilder;
    static fn: knex.FunctionHelper;

    static BelongsToOneRelation: Relation;
    static HasOneRelation: Relation;
    static HasManyRelation: Relation;
    static ManyToManyRelation: Relation;

    static query(transaction?: Transaction): QueryBuilder;
    static knex(knex?: knex): knex;
    static formatter(): any; // < the knex typings punts here too
    static knexQuery(): QueryBuilder;

    // This approach should be applied to all other references of Model that 
    // should return the subclass:
    static bindKnex<T extends Model>(this: ModelClass<T>, knex: knex): ModelClass<T>;
    static bindTransaction<T extends Model>(this: ModelClass<T>, transaction: Transaction): ModelClass<T>;
    static extend<T>(subclass: T): ModelClass<T>;

    static fromJson<T extends Model>(this: ModelClass<T>, json: Object, opt?: ModelOptions): T;
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
    $parseJson(json: Object, opt?: ModelOptions): Object;
    $formatJson(json: Object): Object;
    $setJson(json: Object, opt?: ModelOptions): this;
    $setDatabaseJson(json: Object): this;

    $set(obj: Object): this;
    $omit(keys: string | string[] | Properties): this
    $pick(keys: string | string[] | Properties): this;
    $clone(): this;

    $query(): QueryBuilder;
    $relatedQuery(relationName: string, transaction?: Transaction): QueryBuilder;

    $loadRelated(expression: RelationExpression, filters?: Filters): QueryBuilder;

    $traverse(traverser: TraverserFunction): void;
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

  export interface QueryBuilder extends QueryInterface, Promise<any> {

    findById(idOrIds: IdOrIds): QueryBuilder;

    insert(modelsOrObjects: ModelsOrObjects): QueryBuilder;
    insertAndFetch(modelsOrObjects: ModelsOrObjects): QueryBuilder;

    insertGraph(modelsOrObjects: ModelsOrObjects): QueryBuilder;
    insertGraphAndFetch(modelsOrObjects: ModelsOrObjects): QueryBuilder;

    insertWithRelated(graph: ModelsOrObjects): QueryBuilder;
    insertWithRelatedAndFetch(graph: ModelsOrObjects): QueryBuilder;

    update(modelOrObject: Object | Model): QueryBuilder;
    updateAndFetchById(id: Id, modelOrObject: Object | Model): QueryBuilder;

    patch(modelOrObject: Object | Model): QueryBuilder;
    patchAndFetchById(id: Id, modelOrObject: Object | Model): QueryBuilder;
    patchAndFetch(modelOrObject: Object | Model): QueryBuilder;

    deleteById(idOrIds: IdOrIds): QueryBuilder;

    relate(ids: IdOrIds | ModelsOrObjects): QueryBuilder;
    unrelate(): QueryBuilder;

    forUpdate(): QueryBuilder;
    forShare(): QueryBuilder;

    withSchema(schemaName: string): QueryBuilder;

    joinRelation: JoinRelation;
    innerJoinRelation: JoinRelation;
    outerJoinRelation: JoinRelation;
    leftJoinRelation: JoinRelation;
    leftOuterJoinRelation: JoinRelation;
    rightJoinRelation: JoinRelation;
    rightOuterJoinRelation: JoinRelation;
    fullOuterJoinRelation: JoinRelation;

    // TODO: fromJS does not exist in current knex documentation: http://knexjs.org/#Builder-fromJS
    // TODO: avgDistinct does not exist in current knex documentation: http://knexjs.org/#Builder-avgDistinct
    // TODO: modify does not exist in current knex documentation: http://knexjs.org/#Builder-modify

    // TODO: the return value of this method matches the knex typescript and documentation.
    // The Objection documentation incorrectly states this returns a QueryBuilder.  
    columnInfo(column?: string): Promise<knex.ColumnInfo>;

    whereRef(leftRef: string, operator: string, rightRef: string): QueryBuilder;
    orWhereRef(leftRef: string, operator: string, rightRef: string): QueryBuilder;
    whereComposite(column: string, value: any): QueryBuilder;
    whereComposite(columns: string[], operator: string, values: any[]): QueryBuilder;
    whereComposite(columns: string[], operator: string, values: any[]): QueryBuilder;
    whereInComposite(column: string, values: any[]): QueryBuilder;
    whereInComposite(columns: string[], values: any[]): QueryBuilder;

    whereJsonEquals: WhereJson;
    whereJsonNotEquals: WhereJson;
    orWhereJsonEquals: WhereJson;
    orWhereJsonNotEquals: WhereJson;

    whereJsonSupersetOf: WhereJson;
    orWhereJsonSupersetOf: WhereJson;

    whereJsonNotSupersetOf: WhereJson;
    orWhereJsonNotSupersetOf: WhereJson;

    whereJsonSubsetOf: WhereJson;
    orWhereJsonSubsetOf: WhereJson;

    whereJsonNotSubsetOf: WhereJson;
    orWhereJsonNotSubsetOf: WhereJson;

    whereJsonIsArray: WhereFieldExpression;
    orWhereJsonIsArray: WhereFieldExpression;

    whereJsonNotArray: WhereFieldExpression;
    orWhereJsonNotArray: WhereFieldExpression;

    whereJsonIsObject: WhereFieldExpression;
    orWhereJsonIsObject: WhereFieldExpression;

    whereJsonNotObject: WhereFieldExpression;
    orWhereJsonNotObject: WhereFieldExpression;

    whereJsonHasAny: WhereJsonExpression;
    orWhereJsonHasAny: WhereJsonExpression;

    whereJsonHasAll: WhereJsonExpression;
    orWhereJsonHasAll: WhereJsonExpression;

    whereJsonField: WhereJsonField;
    orWhereJsonField: WhereJsonField;

    // Non-query methods:

    context(queryContext: Object): QueryBuilder;

    reject(reason: any): QueryBuilder;
    resolve(value: any): QueryBuilder;

    isExecutable(): boolean;

    runBefore(fn: (builder: QueryBuilder) => void): QueryBuilder;
    onBuild(fn: (builder: QueryBuilder) => void): QueryBuilder;
    runAfter(fn: (builder: QueryBuilder) => void): QueryBuilder;

    eagerAlgorithm(algo: EagerAlgorithm): QueryBuilder;
    eager(relationExpression: RelationExpression, filters?: FilterExpression): QueryBuilder;

    allowEager: RelationExpressionMethod;
    modifyEager: ModifyEager;
    filterEager: ModifyEager;

    allowInsert: RelationExpressionMethod;

    modelClass(): typeof Model;

    toString(): string;

    toSql(): string;

    skipUndefined(): QueryBuilder;

    transacting(transation: Transaction): QueryBuilder;

    clone(): QueryBuilder;

    execute(): Promise<any>

    // We get `then` and `catch` by extending Promise

    map<T, Result>(mapper: BluebirdMapper<T, Result>): Promise<Result[]>

    return<T>(returnValue: T): Promise<T>

    bind(context: any): Promise<any>;

    asCallback(callback: NodeStyleCallback): Promise<any>;

    nodeify(callback: NodeStyleCallback): Promise<any>;

    resultSize(): Promise<number>;

    page(page: number, pageSize: number): QueryBuilder;
    range(start: number, end: number): QueryBuilder;
    pluck(propertyName: string): QueryBuilder;
    first(): QueryBuilder;

    traverse(modelClass: typeof Model, traverser: TraverserFunction): QueryBuilder;

    pick(modelClass: typeof Model, properties: string[]): QueryBuilder;
    pick(properties: string[]): QueryBuilder;

    omit(modelClass: typeof Model, properties: string[]): QueryBuilder;
    omit(properties: string[]): QueryBuilder;
  }

  export interface transaction {
    start(knexOrModel: knex | ModelClass<any>): Promise<Transaction>;

    <M extends Model, T>(
      modelClass: ModelClass<M>,
      callback: (boundModelClass: ModelClass<M>) => Promise<T>
    ): Promise<T>;

    <M1 extends Model, M2 extends Model, T>(
      modelClass1: ModelClass<M1>,
      modelClass2: ModelClass<M2>,
      callback: (
        boundModelClass1: ModelClass<M1>,
        boundModelClass2: ModelClass<M2>
      ) => Promise<T>
    ): Promise<T>;

    <M1 extends Model, M2 extends Model, M3 extends Model, T>(
      modelClass1: ModelClass<M1>,
      modelClass2: ModelClass<M2>,
      modelClass3: ModelClass<M3>,
      callback: (
        boundModelClass1: ModelClass<M1>,
        boundModelClass2: ModelClass<M2>,
        boundModelClass3: ModelClass<M3>
      ) => Promise<T>
    ): Promise<T>;

    <M1 extends Model, M2 extends Model, M3 extends Model, M4 extends Model, T>(
      modelClass1: ModelClass<M1>,
      modelClass2: ModelClass<M2>,
      modelClass3: ModelClass<M3>,
      modelClass4: ModelClass<M4>,
      callback: (
        boundModelClass1: ModelClass<M1>,
        boundModelClass2: ModelClass<M2>,
        boundModelClass3: ModelClass<M3>,
        boundModelClass4: ModelClass<M4>
      ) => Promise<T>
    ): Promise<T>;
  }

  export const transaction: transaction

  export interface Transaction {
    commit(): void;
    rollback(): void;
  }

  type Raw = knex.Raw

  //
  // The following is lifted from knex's index.d.ts, to change the signatures 
  // to return Objection's QueryBuilder wrapper, rather than the knex QueryBuilder:
  //

  type Value = string | number | boolean | Date | string[] | number[] | Date[] | boolean[] | Buffer | Raw;
  type ColumnName = string | Raw | QueryBuilder;
  type TableName = string | Raw | QueryBuilder;

  interface QueryInterface {
    select: Select;
    as: As;
    columns: Select;
    column: Select;
    from: Table;
    into: Table;
    table: Table;
    distinct: Distinct;

    // Joins
    join: Join;
    joinRaw: JoinRaw;
    innerJoin: Join;
    leftJoin: Join;
    leftOuterJoin: Join;
    rightJoin: Join;
    rightOuterJoin: Join;
    outerJoin: Join;
    fullOuterJoin: Join;
    crossJoin: Join;

    // Wheres
    where: Where;
    andWhere: Where;
    orWhere: Where;
    whereNot: Where;
    andWhereNot: Where;
    orWhereNot: Where;
    whereRaw: WhereRaw;
    orWhereRaw: WhereRaw;
    andWhereRaw: WhereRaw;
    whereWrapped: WhereWrapped;
    havingWrapped: WhereWrapped;
    whereExists: WhereExists;
    orWhereExists: WhereExists;
    whereNotExists: WhereExists;
    orWhereNotExists: WhereExists;
    whereIn: WhereIn;
    orWhereIn: WhereIn;
    whereNotIn: WhereIn;
    orWhereNotIn: WhereIn;
    whereNull: WhereNull;
    orWhereNull: WhereNull;
    whereNotNull: WhereNull;
    orWhereNotNull: WhereNull;
    whereBetween: WhereBetween;
    orWhereBetween: WhereBetween;
    andWhereBetween: WhereBetween;
    whereNotBetween: WhereBetween;
    orWhereNotBetween: WhereBetween;
    andWhereNotBetween: WhereBetween;

    // Group by
    groupBy: GroupBy;
    groupByRaw: RawQueryBuilder;

    // Order by
    orderBy: OrderBy;
    orderByRaw: RawQueryBuilder;

    // Union
    union: Union;
    unionAll(callback: Function): QueryBuilder;

    // Having
    having: Having;
    andHaving: Having;
    havingRaw: RawQueryBuilder;
    orHaving: Having;
    orHavingRaw: RawQueryBuilder;

    // Paging
    offset(offset: number): QueryBuilder;
    limit(limit: number): QueryBuilder;

    // Aggregation
    count(columnName?: string): QueryBuilder;
    min(columnName: string): QueryBuilder;
    max(columnName: string): QueryBuilder;
    sum(columnName: string): QueryBuilder;
    avg(columnName: string): QueryBuilder;
    increment(columnName: string, amount?: number): QueryBuilder;
    decrement(columnName: string, amount?: number): QueryBuilder;

    // Others
    first(...columns: string[]): QueryBuilder;

    debug(enabled?: boolean): QueryBuilder;
    pluck(column: string): QueryBuilder;

    insert(data: any, returning?: string | string[]): QueryBuilder;
    update(data: any, returning?: string | string[]): QueryBuilder;
    update(columnName: string, value: Value, returning?: string | string[]): QueryBuilder;
    returning(column: string | string[]): QueryBuilder;

    del(returning?: string | string[]): QueryBuilder;
    delete(returning?: string | string[]): QueryBuilder;
    truncate(): QueryBuilder;

    transacting(trx: Transaction): QueryBuilder;
    connection(connection: any): QueryBuilder;

    clone(): QueryBuilder;
  }

  interface As {
    (columnName: string): QueryBuilder;
  }

  interface Select extends ColumnNameQueryBuilder {
  }

  interface Table {
    (tableName: string): QueryBuilder;
    (callback: Function): QueryBuilder;
  }

  interface Distinct extends ColumnNameQueryBuilder {
  }

  interface Join {
    (raw: Raw): QueryBuilder;
    (tableName: string, columns: { [key: string]: string | Raw }): QueryBuilder;
    (tableName: string, callback: Function): QueryBuilder;
    (tableName: TableName, raw: Raw): QueryBuilder;
    (tableName: TableName, column1: string, column2: string): QueryBuilder;
    (tableName: TableName, column1: string, raw: Raw): QueryBuilder;
    (tableName: TableName, column1: string, operator: string, column2: string): QueryBuilder;
  }

  interface JoinClause {
    on(raw: Raw): JoinClause;
    on(callback: Function): JoinClause;
    on(columns: { [key: string]: string | Raw }): JoinClause;
    on(column1: string, column2: string): JoinClause;
    on(column1: string, raw: Raw): JoinClause;
    on(column1: string, operator: string, column2: string): JoinClause;
    andOn(raw: Raw): JoinClause;
    andOn(callback: Function): JoinClause;
    andOn(columns: { [key: string]: string | Raw }): JoinClause;
    andOn(column1: string, column2: string): JoinClause;
    andOn(column1: string, raw: Raw): JoinClause;
    andOn(column1: string, operator: string, column2: string): JoinClause;
    orOn(raw: Raw): JoinClause;
    orOn(callback: Function): JoinClause;
    orOn(columns: { [key: string]: string | Raw }): JoinClause;
    orOn(column1: string, column2: string): JoinClause;
    orOn(column1: string, raw: Raw): JoinClause;
    orOn(column1: string, operator: string, column2: string): JoinClause;
    using(column: string | string[] | Raw | { [key: string]: string | Raw }): JoinClause;
    type(type: string): JoinClause;
  }

  interface JoinRaw {
    (tableName: string, binding?: Value): QueryBuilder;
  }

  interface Where extends WhereRaw, WhereWrapped, WhereNull {
    (raw: Raw): QueryBuilder;
    (callback: (queryBuilder: QueryBuilder) => any): QueryBuilder;
    (object: Object): QueryBuilder;
    (columnName: string, value: Value): QueryBuilder;
    (columnName: string, operator: string, value: Value): QueryBuilder;
    (columnName: string, operator: string, query: QueryBuilder): QueryBuilder;
  }

  interface WhereRaw extends RawQueryBuilder {
    (condition: boolean): QueryBuilder;
  }

  interface WhereWrapped {
    (callback: Function): QueryBuilder;
  }

  interface WhereNull {
    (columnName: string): QueryBuilder;
  }

  interface WhereIn {
    (columnName: string, values: Value[]): QueryBuilder;
    (columnName: string, callback: Function): QueryBuilder;
    (columnName: string, query: QueryBuilder): QueryBuilder;
  }

  interface WhereBetween {
    (columnName: string, range: [Value, Value]): QueryBuilder;
  }

  interface WhereExists {
    (callback: Function): QueryBuilder;
    (query: QueryBuilder): QueryBuilder;
  }

  interface WhereNull {
    (columnName: string): QueryBuilder;
  }

  interface WhereIn {
    (columnName: string, values: Value[]): QueryBuilder;
  }

  interface GroupBy extends RawQueryBuilder, ColumnNameQueryBuilder {
  }

  interface OrderBy {
    (columnName: string, direction?: string): QueryBuilder;
  }

  interface Union {
    (callback: Function, wrap?: boolean): QueryBuilder;
    (callbacks: Function[], wrap?: boolean): QueryBuilder;
    (...callbacks: Function[]): QueryBuilder;
    // (...callbacks: Function[], wrap?: boolean): QueryInterface;
  }

  interface Having extends RawQueryBuilder, WhereWrapped {
    (tableName: string, column1: string, operator: string, column2: string): QueryBuilder;
  }

  // commons

  interface ColumnNameQueryBuilder {
    (...columnNames: ColumnName[]): QueryBuilder;
    (columnNames: ColumnName[]): QueryBuilder;
  }

  interface RawQueryBuilder {
    (sql: string, ...bindings: Value[]): QueryBuilder;
    (sql: string, bindings: Value[]): QueryBuilder;
    (raw: Raw): QueryBuilder;
  }
}
