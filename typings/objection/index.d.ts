// Type definitions for objection v0.6.1
// Project: Objection.js <http://vincit.github.io/objection.js/>
// Definitions by: Matthew McEachen <https://github.com/mceachen> & Drew R. <https://github.com/drew-r>

/// <reference types="node" />
/// <reference types="knex" />

declare module "objection" {

  import * as knex from "knex";

  export interface ModelOptions {
    patch: boolean;
    skipValidation: boolean;
  }

  export class ValidationError extends Error {
    constructor(errors: any);
    statusCode: number;
    data: any;
    message: string;
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
    modify?: <T>(queryBuilder: QueryBuilder<T>) => {};
    filter?: <T>(queryBuilder: QueryBuilder<T>) => {};
    orderBy?: string;
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

  type FilterFunction = <T>(queryBuilder: QueryBuilder<T>) => void;

  type FilterExpression = { [namedFilter: string]: FilterFunction };

  interface RelationExpressionMethod {
    <T>(relationExpression: RelationExpression): QueryBuilder<T>;
  }

  interface TraverserFunction {
    /** 
     * Called if model is in a relation of some other model.
     * @param model the model itself
     * @param parentModel the parent model
     * @param relationName the name of the relation
     */
    (model: Model, parentModel: Model, relationName: string): void;
  }

  type Id = string | number;

  type Ids = Id[];

  type IdOrIds = Id | Ids;

  type RelationOptions = { alias: boolean | string };

  interface JoinRelation {
    <T>(relationName: string, opt?: RelationOptions): QueryBuilder<T>;
  }

  type JsonObjectOrFieldExpression = Object | Object[] | FieldExpression;

  interface WhereJson<T> {
    (fieldExpression: FieldExpression, jsonObjectOrFieldExpression: JsonObjectOrFieldExpression): QueryBuilder<T>;
  }

  interface WhereFieldExpression<T> {
    (fieldExpression: FieldExpression): QueryBuilder<T>;
  }

  interface WhereJsonExpression<T> {
    (fieldExpression: FieldExpression, keys: string | string[]): QueryBuilder<T>;
  }

  interface WhereJsonField<T> {
    (fieldExpression: FieldExpression, operator: string, value: boolean | number | string | null): QueryBuilder<T>;
  }

  interface ModifyEager<T1> {
    <T2>(relationExpression: string | RelationExpression, modifier: (builder: QueryBuilder<T2>) => void): QueryBuilder<T1>;
  }

  interface BluebirdMapper<T, Result> {
    (item: T, index: number): Result;
  }

  interface NodeStyleCallback {
    (err: any, result?: any): void
  }

  type Filters<T> = { [filterName: string]: (queryBuilder: QueryBuilder<T>) => void };
  type Properties = { [propertyName: string]: boolean };

  /**
   * This is a hack to support referencing a given Model subclass constructor.
   * See https://github.com/Microsoft/TypeScript/issues/5863#issuecomment-242782664
   */
  interface ModelClass<T extends Model> {
    new(): T;
    tableName: string;
    jsonSchema: JsonSchema;
    idColumn: string | string[];
    modelPaths: string[];
    relationMappings: RelationMappings;
    jsonAttributes: string[];
    virtualAttributes: string[];
    uidProp: string;
    uidRefProp: string;
    dbRefProp: string;
    propRefRegex: RegExp;
    pickJsonSchemaProperties: boolean;
    defaultEagerAlgorithm?: EagerAlgorithm;
    defaultEagerOptions?: EagerOptions;
    QueryBuilder: typeof QueryBuilder;
    RelatedQueryBuilder: typeof QueryBuilder;

    raw: knex.RawBuilder;
    fn: knex.FunctionHelper;

    BelongsToOneRelation: Relation;
    HasOneRelation: Relation;
    HasManyRelation: Relation;
    ManyToManyRelation: Relation;

    query(trx?: Transaction): QueryBuilder<T>;
    knex(knex?: knex): knex;
    formatter(): any; // < the knex typings punts here too
    knexQuery(): QueryBuilder<T>;

    bindKnex(knex: knex): this;
    bindTransaction(transaction: Transaction): this;
    extend<S>(subclass: S): S & this;

    fromJson(json: Object, opt?: ModelOptions): T;
    fromDatabaseJson(row: Object): T;

    omitImpl(f: (obj: Object, prop: string) => void): void;

    loadRelated(models: (Model | Object)[], expression: RelationExpression, filters?: Filters<T>): Promise<T[]>;

    traverse(filterConstructor: typeof Model, models: Model | Model[], traverser: TraverserFunction): void;
    traverse(models: Model | Model[], traverser: TraverserFunction): void;
  }

  export class Model {
    static tableName: string;
    static jsonSchema: JsonSchema;
    static idColumn: string | string[];
    static modelPaths: string[];
    static relationMappings: RelationMappings;
    static jsonAttributes: string[];
    static virtualAttributes: string[];
    static uidProp: string;
    static uidRefProp: string;
    static dbRefProp: string;
    static propRefRegex: RegExp;
    static pickJsonSchemaProperties: boolean;
    static defaultEagerAlgorithm?: EagerAlgorithm;
    static defaultEagerOptions?: EagerOptions;
    static QueryBuilder: typeof QueryBuilder;
    static RelatedQueryBuilder: typeof QueryBuilder;

    static raw: knex.RawBuilder;
    static fn: knex.FunctionHelper;

    static BelongsToOneRelation: Relation;
    static HasOneRelation: Relation;
    static HasManyRelation: Relation;
    static ManyToManyRelation: Relation;

    static JoinEagerAlgorithm: () => any;
    static WhereInEagerAlgorithm: () => any;

    // "{ new(): T }" 
    // is from https://www.typescriptlang.org/docs/handbook/generics.html#using-class-types-in-generics
    static query<T>(this: { new (): T }, trx?: Transaction): QueryBuilder<T>;
    static knex(knex?: knex): knex;
    static formatter(): any; // < the knex typings punts here too
    static knexQuery<T>(this: { new (): T }): QueryBuilder<T>;

    static bindKnex<T>(this: T, knex: knex): T;
    static bindTransaction<T>(this: T, transaction: Transaction): T;

    // TODO: It'd be nicer to expose an actual T&S union class here: 
    static extend<M extends Model, S>(
      this: { new (): M },
      subclass: { new (): S }
    ): ModelClass<M> & { new (...args: any[]): M & S };

    static fromJson<T>(this: T, json: Object, opt?: ModelOptions): T;
    static fromDatabaseJson<T>(this: T, row: Object): T;

    static omitImpl(f: (obj: Object, prop: string) => void): void;

    static loadRelated<T>(this: { new (): T }, models: (T | Object)[], expression: RelationExpression, filters?: Filters<T>): Promise<T[]>;

    static traverse(filterConstructor: typeof Model, models: Model | Model[], traverser: TraverserFunction): void;
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
    $omit(keys: string | string[] | Properties): this;
    $pick(keys: string | string[] | Properties): this;
    $clone(): this;

    /**
     * AKA `reload` in ActiveRecord parlance
     */
    $query(trx?: Transaction): QueryBuilderSingle<this>;

    /**
     * Users need to explicitly type these calls, as the relationName doesn't
     * indicate the type (and if it returned Model directly, Partial<Model>
     * guards are worthless)
     */
    $relatedQuery<M extends Model>(relationName: string, transaction?: Transaction): QueryBuilder<M>;

    $loadRelated<T>(expression: RelationExpression, filters?: Filters<T>): QueryBuilderSingle<this>;

    $traverse(traverser: TraverserFunction): void;
    $traverse(filterConstructor: this, traverser: TraverserFunction): void;

    $knex(): knex;
    $transaction(): knex;

    $beforeInsert(queryContext: Object): Promise<any> | void;
    $afterInsert(queryContext: Object): Promise<any> | void;
    $afterUpdate(opt: ModelOptions, queryContext: Object): Promise<any> | void;
    $beforeUpdate(opt: ModelOptions, queryContext: Object): Promise<any> | void;
  }

  export class QueryBuilder<T> {
    static extend(subclassConstructor: FunctionConstructor): void;
    static forClass<M extends Model>(modelClass: ModelClass<M>): QueryBuilder<M>;
  }

  /**
   * QueryBuilder with one expected result
   */
  export interface QueryBuilderSingle<T> extends QueryBuilderBase<T>, Promise<T> { }

  /**
   * QueryBuilder with zero or one expected result
   * (Using the Scala `Option` terminology)
   */
  export interface QueryBuilderOption<T> extends QueryBuilderBase<T>, Promise<T | undefined> { }

  /**
   * QueryBuilder with zero or more expected results
   */
  export interface QueryBuilder<T> extends QueryBuilderBase<T>, Promise<T[]> { }

  interface Insert<T> {
    (modelsOrObjects?: Array<Partial<T>>): QueryBuilder<T>;
    (modelOrObject?: Partial<T>): QueryBuilderSingle<T>;
    (): this;
  }

  interface InsertGraphAndFetch<T> {
    (modelsOrObjects?: Partial<T>): QueryBuilderSingle<T>;
    (modelsOrObjects?: Partial<T>[]): QueryBuilder<T>;
  }

  interface QueryBuilderBase<T> extends QueryInterface<T> {

    findById(id: Id): QueryBuilderOption<T>;
    findById(idOrIds: IdOrIds): this;

    insert: Insert<T>;
    insertAndFetch(modelOrObject: Partial<T>): QueryBuilderSingle<T>;
    insertAndFetch(modelsOrObjects?: Partial<T>[]): QueryBuilder<T>;

    insertGraph: Insert<T>;
    insertGraphAndFetch: InsertGraphAndFetch<T>

    /**
     * insertWithRelated is an alias for insertGraph.
     */
    insertWithRelated: Insert<T>;
    insertWithRelatedAndFetch: InsertGraphAndFetch<T>

    /**
     * @return a Promise of the number of updated rows
     */
    update(modelOrObject: Partial<T>): QueryBuilderSingle<number>;
    updateAndFetch(modelOrObject: Partial<T>): QueryBuilderSingle<T>;
    updateAndFetchById(id: Id, modelOrObject: Partial<T>): QueryBuilderSingle<T>;

    /**
     * @return a Promise of the number of patched rows
     */
    patch(modelOrObject: Partial<T>): QueryBuilderSingle<number>;
    patchAndFetchById(id: Id, modelOrObject: Partial<T>): QueryBuilderSingle<T>;
    patchAndFetch(modelOrObject: Partial<T>): QueryBuilderSingle<T>;

    /**
     * @return a Promise of the number of deleted rows
     */
    deleteById(idOrIds: IdOrIds): QueryBuilderSingle<number>;

    relate<M extends Model>(ids: IdOrIds | Partial<M> | Partial<M>[]): this;
    unrelate(): this;

    forUpdate(): this;
    forShare(): this;

    // TODO: fromJS does not exist in current knex documentation: http://knexjs.org/#Builder-fromJS
    withSchema(schemaName: string): this;

    joinRelation: JoinRelation;
    innerJoinRelation: JoinRelation;
    outerJoinRelation: JoinRelation;
    leftJoinRelation: JoinRelation;
    leftOuterJoinRelation: JoinRelation;
    rightJoinRelation: JoinRelation;
    rightOuterJoinRelation: JoinRelation;
    fullOuterJoinRelation: JoinRelation;

    // TODO: avgDistinct does not exist in current knex documentation: http://knexjs.org/#Builder-fromJS
    // TODO: modify does not exist in current knex documentation: http://knexjs.org/#Builder-modify

    // TODO: the return value of this method matches the knex typescript and documentation.
    // The Objection documentation incorrectly states this returns a QueryBuilder.  
    columnInfo(column?: string): Promise<knex.ColumnInfo>;

    whereRef(leftRef: string, operator: string, rightRef: string): this;
    orWhereRef(leftRef: string, operator: string, rightRef: string): this;
    whereComposite(column: string, value: any): this;
    whereComposite(columns: string[], operator: string, values: any[]): this;
    whereComposite(columns: string[], operator: string, values: any[]): this;
    whereInComposite(column: string, values: any[]): this;
    whereInComposite(columns: string[], values: any[]): this;

    whereJsonEquals: WhereJson<T>;
    whereJsonNotEquals: WhereJson<T>;
    orWhereJsonEquals: WhereJson<T>;
    orWhereJsonNotEquals: WhereJson<T>;

    whereJsonSupersetOf: WhereJson<T>;
    orWhereJsonSupersetOf: WhereJson<T>;

    whereJsonNotSupersetOf: WhereJson<T>;
    orWhereJsonNotSupersetOf: WhereJson<T>;

    whereJsonSubsetOf: WhereJson<T>;
    orWhereJsonSubsetOf: WhereJson<T>;

    whereJsonNotSubsetOf: WhereJson<T>;
    orWhereJsonNotSubsetOf: WhereJson<T>;

    whereJsonIsArray: WhereFieldExpression<T>;
    orWhereJsonIsArray: WhereFieldExpression<T>;

    whereJsonNotArray: WhereFieldExpression<T>;
    orWhereJsonNotArray: WhereFieldExpression<T>;

    whereJsonIsObject: WhereFieldExpression<T>;
    orWhereJsonIsObject: WhereFieldExpression<T>;

    whereJsonNotObject: WhereFieldExpression<T>;
    orWhereJsonNotObject: WhereFieldExpression<T>;

    whereJsonHasAny: WhereJsonExpression<T>;
    orWhereJsonHasAny: WhereJsonExpression<T>;

    whereJsonHasAll: WhereJsonExpression<T>;
    orWhereJsonHasAll: WhereJsonExpression<T>;

    whereJsonField: WhereJsonField<T>
    orWhereJsonField: WhereJsonField<T>;

    // Non-query methods:

    context(queryContext: Object): this;

    reject(reason: any): this;
    resolve(value: any): this;

    isExecutable(): boolean;

    runBefore(fn: (builder: this) => void): this;
    onBuild(fn: (builder: this) => void): this;
    runAfter(fn: (builder: this) => void): this;

    eagerAlgorithm(algo: EagerAlgorithm): this;
    eager(relationExpression: RelationExpression, filters?: FilterExpression): this;

    allowEager: RelationExpressionMethod;
    modifyEager: ModifyEager<T>;
    filterEager: ModifyEager<T>;

    allowInsert: RelationExpressionMethod;

    modelClass(): typeof Model;

    toString(): string;

    toSql(): string;

    skipUndefined(): this;

    transacting(transation: Transaction): this;

    clone(): this;

    execute(): Promise<any>

    // We get `then` and `catch` by extending Promise

    map<T, Result>(mapper: BluebirdMapper<T, Result>): Promise<Result[]>

    return<T>(returnValue: T): Promise<T>

    bind(context: any): Promise<any>;

    asCallback(callback: NodeStyleCallback): Promise<any>;

    nodeify(callback: NodeStyleCallback): Promise<any>;

    resultSize(): Promise<number>;

    page(page: number, pageSize: number): this;
    range(start: number, end: number): this;
    pluck(propertyName: string): this;
    first(): QueryBuilderOption<T>;

    traverse(modelClass: typeof Model, traverser: TraverserFunction): this;

    pick(modelClass: typeof Model, properties: string[]): this;
    pick(properties: string[]): this;

    omit(modelClass: typeof Model, properties: string[]): this;
    omit(properties: string[]): this;
  }

  export interface transaction {
    start(knexOrModel: knex | ModelClass<any>): Promise<Transaction>;

    <MC extends ModelClass<any>, T>(
      modelClass: MC,
      callback: (boundModelClass: MC) => Promise<T>
    ): Promise<T>;

    <MC1 extends ModelClass<any>, MC2 extends ModelClass<any>, T>(
      modelClass1: MC1,
      modelClass2: MC2,
      callback: (boundModel1Class: MC1, boundModel2Class: MC2) => Promise<T>
    ): Promise<T>;

    <MC1 extends ModelClass<any>, MC2 extends ModelClass<any>, MC3 extends ModelClass<any>, T>(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      callback: (boundModel1Class: MC1, boundModel2Class: MC2, boundModel3Class: MC3) => Promise<T>
    ): Promise<T>;

    <MC1 extends ModelClass<any>, MC2 extends ModelClass<any>, MC3 extends ModelClass<any>, MC4 extends ModelClass<any>, T>(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      modelClass4: MC4,
      callback: (boundModel1Class: MC1, boundModel2Class: MC2, boundModel3Class: MC3, boundModel4Class: MC4) => Promise<T>
    ): Promise<T>;

    <MC1 extends ModelClass<any>, MC2 extends ModelClass<any>, MC3 extends ModelClass<any>, MC4 extends ModelClass<any>, MC5 extends ModelClass<any>, T>(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      modelClass4: MC4,
      modelClass5: MC5,
      callback: (boundModel1Class: MC1, boundModel2Class: MC2, boundModel3Class: MC3, boundModel4Class: MC4, boundModel5Class: MC5) => Promise<T>
    ): Promise<T>;

    <T>(knex: knex, callback: (trx: Transaction) => Promise<T>): Promise<T>;

  }

  export const transaction: transaction

  export interface Transaction {
    commit(): void;
    rollback(): void;
  }

  type Raw = knex.Raw

  //
  // Lifted from knex's index.d.ts, to change the signatures 
  // to return Objection's typed QueryBuilder wrapper:
  //

  /**
   * Value encompasses any where clause operand.
   * `null` is valid and represents SQL `NULL`. Also see `WhereNull`.
   * `undefined` is not valid, most likely resulting from programmer error.
   */
  type Value = string | number | boolean | Date | string[] | number[] | Date[] | boolean[] | Buffer | Raw | null;
  type ColumnName<T> = string | Raw | QueryBuilder<T>;
  type TableName<T> = string | Raw | QueryBuilder<T>;

  interface QueryInterface<T> {
    select: Select<T>;
    as: As<T>;
    columns: Select<T>;
    column: Select<T>;
    from: Table<T>;
    into: Table<T>;
    table: Table<T>;
    distinct: Distinct<T>;

    // Joins
    join: Join<T>;
    joinRaw: JoinRaw<T>;
    innerJoin: Join<T>;
    leftJoin: Join<T>;
    leftOuterJoin: Join<T>;
    rightJoin: Join<T>;
    rightOuterJoin: Join<T>;
    outerJoin: Join<T>;
    fullOuterJoin: Join<T>;
    crossJoin: Join<T>;

    // Wheres
    where: Where<T>;
    andWhere: Where<T>;
    orWhere: Where<T>;
    whereNot: Where<T>;
    andWhereNot: Where<T>;
    orWhereNot: Where<T>;
    whereRaw: WhereRaw<T>;
    orWhereRaw: WhereRaw<T>;
    andWhereRaw: WhereRaw<T>;
    whereWrapped: WhereWrapped<T>;
    havingWrapped: WhereWrapped<T>;
    whereExists: WhereExists<T>;
    orWhereExists: WhereExists<T>;
    whereNotExists: WhereExists<T>;
    orWhereNotExists: WhereExists<T>;
    whereIn: WhereIn<T>;
    orWhereIn: WhereIn<T>;
    whereNotIn: WhereIn<T>;
    orWhereNotIn: WhereIn<T>;
    whereNull: WhereNull<T>;
    orWhereNull: WhereNull<T>;
    whereNotNull: WhereNull<T>;
    orWhereNotNull: WhereNull<T>;
    whereBetween: WhereBetween<T>;
    orWhereBetween: WhereBetween<T>;
    andWhereBetween: WhereBetween<T>;
    whereNotBetween: WhereBetween<T>;
    orWhereNotBetween: WhereBetween<T>;
    andWhereNotBetween: WhereBetween<T>;

    // Group by
    groupBy: GroupBy<T>;
    groupByRaw: RawQueryBuilder<T>;

    // Order by
    orderBy: OrderBy<T>;
    orderByRaw: RawQueryBuilder<T>;

    // Union
    union: Union<T>;
    unionAll(callback: Function): this;

    // Having
    having: Having<T>;
    andHaving: Having<T>;
    havingRaw: RawQueryBuilder<T>;
    orHaving: Having<T>;
    orHavingRaw: RawQueryBuilder<T>;

    // Paging
    offset(offset: number): this;
    limit(limit: number): this;

    // Aggregation
    count(columnName?: string): this;
    min(columnName: string): this;
    max(columnName: string): this;
    sum(columnName: string): this;
    avg(columnName: string): this;
    increment(columnName: string, amount?: number): this;
    decrement(columnName: string, amount?: number): this;

    // Others
    first(...columns: string[]): QueryBuilderOption<T>;
    first<T>(...columns: string[]): QueryBuilderOption<T>;

    debug(enabled?: boolean): this;
    pluck(column: string): this;

    returning(column: string | string[]): this;

    del(returning?: string | string[]): this;
    del<T>(returning?: string | string[]): QueryBuilderOption<T>;
    delete(returning?: string | string[]): this;
    delete<T>(returning?: string | string[]): QueryBuilderOption<T>;
    truncate(): this;

    transacting(trx: Transaction): this;
    connection(connection: any): this;

    clone(): this;
  }

  interface As<T> {
    (columnName: string): QueryBuilder<T>;
  }

  interface Select<T> extends ColumnNameQueryBuilder<T> {
  }

  interface Table<T> {
    (tableName: string): QueryBuilder<T>;
    (callback: Function): QueryBuilder<T>;
    (raw: Raw): QueryBuilder<T>;
  }

  interface Distinct<T> extends ColumnNameQueryBuilder<T> {
  }

  interface Join<T> {
    (raw: Raw): QueryBuilder<T>;
    (tableName: string, columns: { [key: string]: string | Raw }): QueryBuilder<T>;
    (tableName: string, callback: Function): QueryBuilder<T>;
    <T1>(tableName: TableName<T1>, raw: Raw): QueryBuilder<T>;
    <T1>(tableName: TableName<T1>, column1: string, column2: string): QueryBuilder<T>;
    <T1>(tableName: TableName<T1>, column1: string, raw: Raw): QueryBuilder<T>;
    <T1>(tableName: TableName<T1>, column1: string, operator: string, column2: string): QueryBuilder<T>;
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

  interface JoinRaw<T> {
    (tableName: string, binding?: Value): QueryBuilder<T>;
  }

  interface Where<T> extends WhereRaw<T>, WhereWrapped<T>, WhereNull<T> {
    (raw: Raw): QueryBuilder<T>;
    <T1>(callback: (queryBuilder: QueryBuilder<T1>) => any): QueryBuilder<T>;
    (object: Object): QueryBuilder<T>;
    (columnName: string, value: Value): QueryBuilder<T>;
    (columnName: string | Raw, operator: string, value: Value): QueryBuilder<T>;
    <T1>(columnName: string | Raw, operator: string, query: QueryBuilder<T1>): QueryBuilder<T>;
  }

  interface WhereRaw<T> extends RawQueryBuilder<T> {
    (condition: boolean): QueryBuilder<T>;
  }

  interface WhereWrapped<T> {
    (callback: Function): QueryBuilder<T>;
  }

  interface WhereNull<T> {
    (columnName: string): QueryBuilder<T>;
  }

  interface WhereIn<T> {
    (columnName: string, values: Value[]): QueryBuilder<T>;
    (columnName: string, callback: Function): QueryBuilder<T>;
    <T1>(columnName: string, query: QueryBuilder<T1>): QueryBuilder<T>;
  }

  interface WhereBetween<T> {
    (columnName: string, range: [Value, Value]): QueryBuilder<T>;
  }

  interface WhereExists<T> {
    (callback: Function): QueryBuilder<T>;
    <T1>(query: QueryBuilder<T1>): QueryBuilder<T>;
  }

  interface WhereNull<T> {
    (columnName: string): QueryBuilder<T>;
  }

  interface WhereIn<T> {
    (columnName: string, values: Value[]): QueryBuilder<T>;
  }

  interface GroupBy<T> extends RawQueryBuilder<T>, ColumnNameQueryBuilder<T> {
  }

  interface OrderBy<T> {
    (columnName: string, direction?: string): QueryBuilder<T>;
  }

  interface Union<T> {
    (callback: Function, wrap?: boolean): QueryBuilder<T>;
    (callbacks: Function[], wrap?: boolean): QueryBuilder<T>;
    (...callbacks: Function[]): QueryBuilder<T>;
    // (...callbacks: Function[], wrap?: boolean): QueryInterface;
  }

  interface Having<T> extends RawQueryBuilder<T>, WhereWrapped<T> {
    (tableName: string, column1: string, operator: string, column2: string): QueryBuilder<T>;
  }

  // commons

  interface ColumnNameQueryBuilder<T> {
    (...columnNames: ColumnName<T>[]): QueryBuilder<T>;
    (columnNames: ColumnName<T>[]): QueryBuilder<T>;
  }

  interface RawQueryBuilder<T> {
    (sql: string, ...bindings: Value[]): QueryBuilder<T>;
    (sql: string, bindings: Value[]): QueryBuilder<T>;
    (raw: Raw): QueryBuilder<T>;
  }

  // The following is from https://gist.github.com/enriched/c84a2a99f886654149908091a3183e15

  /*
   * MIT License
   *
   * Copyright (c) 2016 Richard Adams (https://github.com/enriched)
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   */

  export interface JsonSchema {
    $ref?: string
    /////////////////////////////////////////////////
    // Schema Metadata
    /////////////////////////////////////////////////
    /**
     * This is important because it tells refs where
     * the root of the document is located
     */
    id?: string
    /**
     * It is recommended that the meta-schema is
     * included in the root of any JSON Schema
     */
    $schema?: JsonSchema
    /**
     * Title of the schema
     */
    title?: string
    /**
     * Schema description
     */
    description?: string
    /**
     * Default json for the object represented by
     * this schema
     */
    default?: any

    /////////////////////////////////////////////////
    // Number Validation
    /////////////////////////////////////////////////
    /**
     * The value must be a multiple of the number
     * (e.g. 10 is a multiple of 5)
     */
    multipleOf?: number
    maximum?: number
    /**
     * If true maximum must be > value, >= otherwise
     */
    exclusiveMaximum?: boolean
    minimum?: number
    /**
     * If true minimum must be < value, <= otherwise
     */
    exclusiveMinimum?: boolean

    /////////////////////////////////////////////////
    // String Validation
    /////////////////////////////////////////////////
    maxLength?: number
    minLength?: number
    /**
     * This is a regex string that the value must
     * conform to
     */
    pattern?: string

    /////////////////////////////////////////////////
    // Array Validation
    /////////////////////////////////////////////////
    additionalItems?: boolean | JsonSchema
    items?: JsonSchema | JsonSchema[]
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean

    /////////////////////////////////////////////////
    // Object Validation
    /////////////////////////////////////////////////
    maxProperties?: number
    minProperties?: number
    required?: string[]
    additionalProperties?: boolean | JsonSchema
    /**
     * Holds simple JSON Schema definitions for
     * referencing from elsewhere.
     */
    definitions?: { [key: string]: JsonSchema }
    /**
     * The keys that can exist on the object with the
     * json schema that should validate their value
     */
    properties?: { [property: string]: JsonSchema }
    /**
     * The key of this object is a regex for which
     * properties the schema applies to
     */
    patternProperties?: { [pattern: string]: JsonSchema }
    /**
     * If the key is present as a property then the
     * string of properties must also be present.
     * If the value is a JSON Schema then it must
     * also be valid for the object if the key is
     * present.
     */
    dependencies?: { [key: string]: JsonSchema | string[] }

    /////////////////////////////////////////////////
    // Generic
    /////////////////////////////////////////////////
    /**
     * Enumerates the values that this schema can be
     * e.g.
     * {"type": "string",
     *  "enum": ["red", "green", "blue"]}
     */
    enum?: any[]
    /**
     * The basic type of this schema, can be one of
     * [string, number, object, array, boolean, null]
     * or an array of the acceptable types
     */
    type?: string | string[]

    /////////////////////////////////////////////////
    // Combining Schemas
    /////////////////////////////////////////////////
    allOf?: JsonSchema[]
    anyOf?: JsonSchema[]
    oneOf?: JsonSchema[]
    /**
     * The entity being validated must not match this schema
     */
    not?: JsonSchema
  }
}
