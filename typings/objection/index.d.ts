// Type definitions for objection v0.9.0
// Project: Objection.js <http://vincit.github.io/objection.js/>
// Definitions by: Matthew McEachen <https://github.com/mceachen> & Drew R. <https://github.com/drew-r>

/// <reference types="node" />
import * as knex from 'knex';

export = Objection;

declare namespace Objection {
  const lit: LiteralBuilder;
  const raw: knex.RawBuilder;
  const ref: ReferenceBuilder;
  const compose: Compose;
  const mixin: Mixin;

  const snakeCaseMappers: () => ColumnNameMappers;
  const knexSnakeCaseMappers: () => KnexMappers;

  interface LiteralObject {
    [key: string]: Value;
  }

  export interface Pojo {
    [key: string]: any;
  }

  export interface LiteralBuilder {
    (value: Value | LiteralObject): Literal;
  }

  export interface ReferenceBuilder {
    (expression: string): Reference;
  }

  interface Castable {
    castText(): this;
    castInt(): this;
    castBigInt(): this;
    castFloat(): this;
    castDecimal(): this;
    castReal(): this;
    castBool(): this;
    castJson(): this;
    castArray(): this;
    castType(sqlType: string): this;
    as(alias: string): this;
  }

  export interface Literal extends Castable {}

  export interface Reference extends Castable {}

  // "{ new(): T }"
  // is from https://www.typescriptlang.org/docs/handbook/generics.html#using-class-types-in-generics
  export interface Constructor<M> {
    new (...args: any[]): M;
  }

  export interface Plugin {
    <M extends typeof Model>(modelClass: M): M;
  }

  export interface Compose {
    (...plugins: Plugin[]): Plugin;
    (plugins: Plugin[]): Plugin;
  }

  export interface Mixin {
    // Using ModelClass<M> causes TS 2.5 to render ModelClass<any> rather
    // than an identity function type. <M extends typeof Model> retains the
    // model subclass type in the return value, without requiring the user
    // to type the Mixin call.
    <MC extends ModelClass<any>>(modelClass: MC, ...plugins: Plugin[]): MC;
    <MC extends ModelClass<any>>(modelClass: MC, plugins: Plugin[]): MC;
  }

  export interface ColumnNameMappers {
    parse(json: Pojo): Pojo;
    format(json: Pojo): Pojo;
  }

  export interface KnexMappers {
    wrapIdentifier(identifier: string, origWrap: (identifier: string) => string): string;
    postProcessResponse(response: any): any;
  }

  export interface Page<T> {
    total: number;
    results: T[];
  }

  export interface ModelOptions {
    patch?: boolean;
    skipValidation?: boolean;
  }

  export class ValidationError extends Error {
    constructor(errors: any);
    statusCode: number;
    data: any;
    message: string;
  }

  export interface RelationMappings {
    [relationName: string]: RelationMapping;
  }

  interface Relation {
    // TODO should this be something other than a tagging interface?
  }

  export interface RelationJoin {
    from: string | Reference | (string | Reference)[];
    to: string | Reference | (string | Reference)[];
    through?: RelationThrough;
  }

  export interface RelationThrough {
    from: string | Reference | (string | Reference)[];
    to: string | Reference | (string | Reference)[];
    modelClass?: string | typeof Model;
    extra?: string[];
  }

  export interface RelationMapping {
    relation: Relation;
    modelClass: ModelClass<any> | string;
    join: RelationJoin;
    modify?: <T>(queryBuilder: QueryBuilder<T>) => QueryBuilder<T>;
    filter?: <T>(queryBuilder: QueryBuilder<T>) => QueryBuilder<T>;
  }

  export interface EagerAlgorithm {
    // TODO should this be something other than a tagging interface?
  }

  export interface EagerOptions {
    minimize?: boolean;
    separator?: string;
    aliases?: string[];
  }

  export interface UpsertOptions {
    relate?: boolean;
    unrelate?: boolean;
    insertMissing?: boolean;
  }

  export interface InsertGraphOptions {
    relate?: boolean;
  }

  export interface QueryContext {
    transaction: Transaction;
    [key: string]: any;
  }

  /**
   * @see http://vincit.github.io/objection.js/#fieldexpression
   */
  type FieldExpression = string;

  /**
   * @see http://vincit.github.io/objection.js/#relationexpression
   */
  type RelationExpression = string;

  interface FilterFunction<T> {
    (queryBuilder: QueryBuilder<T>): void;
  }

  interface FilterExpression<T> {
    [namedFilter: string]: FilterFunction<T>;
  }

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

  interface RelationOptions {
    alias: boolean | string;
  }

  interface JoinRelation {
    <T>(relationName: string, opt?: RelationOptions): QueryBuilder<T>;
  }

  type JsonObjectOrFieldExpression = object | object[] | FieldExpression;

  interface WhereJson<T> {
    (
      fieldExpression: FieldExpression,
      jsonObjectOrFieldExpression: JsonObjectOrFieldExpression
    ): QueryBuilder<T>;
  }

  interface WhereFieldExpression<T> {
    (fieldExpression: FieldExpression): QueryBuilder<T>;
  }

  interface WhereJsonExpression<T> {
    (fieldExpression: FieldExpression, keys: string | string[]): QueryBuilder<T>;
  }

  interface WhereJsonField<T> {
    (
      fieldExpression: FieldExpression,
      operator: string,
      value: boolean | number | string | null
    ): QueryBuilder<T>;
  }

  interface ModifyEager<T1> {
    <T2>(
      relationExpression: string | RelationExpression,
      modifier: (builder: QueryBuilder<T2>) => void
    ): QueryBuilder<T1>;
  }

  interface BluebirdMapper<T, Result> {
    (item: T, index: number): Result;
  }

  interface NodeStyleCallback {
    (err: any, result?: any): void;
  }

  interface Filters<T> {
    [filterName: string]: (queryBuilder: QueryBuilder<T>) => void;
  }

  interface Properties {
    [propertyName: string]: boolean;
  }

  /**
   * ModelClass is a TypeScript hack to support referencing a Model
   * subclass constructor and not losing access to static members. See
   * https://github.com/Microsoft/TypeScript/issues/5863#issuecomment-242782664
   */
  interface ModelClass<M extends Model> extends Constructor<M> {
    tableName: string;
    jsonSchema: JsonSchema;
    idColumn: string | string[];
    modelPaths: string[];
    relationMappings: RelationMappings | (() => RelationMappings);
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
    columnNameMappers: ColumnNameMappers;
    relatedFindQueryMutates: boolean;
    relatedInsertQueryMutates: boolean;

    raw: knex.RawBuilder;
    fn: knex.FunctionHelper;

    BelongsToOneRelation: Relation;
    HasOneRelation: Relation;
    HasManyRelation: Relation;
    ManyToManyRelation: Relation;
    HasOneThroughRelation: Relation;

    query(trxOrKnex?: Transaction | knex): QueryBuilder<M>;
    knex(knex?: knex): knex;
    formatter(): any; // < the knex typings punts here too
    knexQuery(): knex.QueryBuilder;

    bindKnex(knex: knex): this;
    bindTransaction(transaction: Transaction): this;

    fromJson(json: object, opt?: ModelOptions): M;
    fromDatabaseJson(row: object): M;

    omitImpl(f: (obj: object, prop: string) => void): void;

    loadRelated(
      models: (Model | object)[],
      expression: RelationExpression,
      filters?: Filters<M>,
      trxOrKnex?: Transaction | knex
    ): Promise<M[]>;

    traverse(
      filterConstructor: typeof Model,
      models: Model | Model[],
      traverser: TraverserFunction
    ): void;
    traverse(models: Model | Model[], traverser: TraverserFunction): void;
  }

  // TS 2.5 doesn't support interfaces with static methods or fields, so
  // this must be declared as a class:
  export class Model {
    static tableName: string;
    static jsonSchema: JsonSchema;
    static idColumn: string | string[];
    static modelPaths: string[];
    static relationMappings: RelationMappings | (() => RelationMappings);
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
    static columnNameMappers: ColumnNameMappers;
    static relatedFindQueryMutates: boolean;
    static relatedInsertQueryMutates: boolean;

    static raw: knex.RawBuilder;
    static fn: knex.FunctionHelper;

    static BelongsToOneRelation: Relation;
    static HasOneRelation: Relation;
    static HasManyRelation: Relation;
    static ManyToManyRelation: Relation;
    static HasOneThroughRelation: Relation;

    static JoinEagerAlgorithm: EagerAlgorithm;
    static WhereInEagerAlgorithm: EagerAlgorithm;
    static NaiveEagerAlgorithm: EagerAlgorithm;

    static query<T>(this: Constructor<T>, trxOrKnex?: Transaction | knex): QueryBuilder<T>;
    static knex(knex?: knex): knex;
    static formatter(): any; // < the knex typings punts here too
    static knexQuery(): knex.QueryBuilder;
    static bindKnex<T>(this: T, knex: knex): T;
    static bindTransaction<T>(this: T, transaction: Transaction): T;

    // fromJson and fromDatabaseJson both return an instance of Model, not a Model class:
    static fromJson<T>(this: Constructor<T>, json: Pojo, opt?: ModelOptions): T;
    static fromDatabaseJson<T>(this: Constructor<T>, row: Pojo): T;

    static omitImpl(f: (obj: object, prop: string) => void): void;

    static loadRelated<T>(
      this: Constructor<T>,
      models: (T | object)[],
      expression: RelationExpression,
      filters?: Filters<T>,
      trxOrKnex?: Transaction | knex
    ): Promise<T[]>;

    static traverse(
      filterConstructor: typeof Model,
      models: Model | Model[],
      traverser: TraverserFunction
    ): void;
    static traverse(models: Model | Model[], traverser: TraverserFunction): void;

    $id(): any;
    $id(id: any): void;

    $beforeValidate(jsonSchema: JsonSchema, json: Pojo, opt: ModelOptions): JsonSchema;
    $validate(): void; // may throw ValidationError if validation fails
    $afterValidate(json: Pojo, opt: ModelOptions): void; // may throw ValidationError if validation fails

    $toDatabaseJson(): object;
    $toJson(): object;
    toJSON(): object;
    $parseDatabaseJson(json: Pojo): Pojo;
    $formatDatabaseJson(json: Pojo): Pojo;
    $parseJson(json: Pojo, opt?: ModelOptions): Pojo;
    $formatJson(json: Pojo): Pojo;
    $setJson(json: Pojo, opt?: ModelOptions): this;
    $setDatabaseJson(json: Pojo): this;
    $setRelated<M extends Model>(
      relation: String | Relation,
      related: M | M[] | null | undefined
    ): this;
    $appendRelated<M extends Model>(
      relation: String | Relation,
      related: M | M[] | null | undefined
    ): this;

    $set(obj: Pojo): this;
    $omit(keys: string | string[] | Properties): this;
    $pick(keys: string | string[] | Properties): this;
    $clone(): this;

    /**
     * AKA `reload` in ActiveRecord parlance
     */
    $query(trxOrKnex?: Transaction | knex): QueryBuilderSingle<this>;

    /**
     * Users need to explicitly type these calls, as the relationName doesn't
     * indicate the type (and if it returned Model directly, Partial<Model>
     * guards are worthless)
     */
    $relatedQuery<M extends Model>(
      relationName: string,
      trxOrKnex?: Transaction | knex
    ): QueryBuilder<M>;

    $loadRelated<T>(
      expression: RelationExpression,
      filters?: Filters<T>,
      trxOrKnex?: Transaction | knex
    ): QueryBuilderSingle<this>;

    $traverse(traverser: TraverserFunction): void;
    $traverse(filterConstructor: this, traverser: TraverserFunction): void;

    $knex(): knex;
    $transaction(): knex;

    $beforeInsert(queryContext: QueryContext): Promise<any> | void;
    $afterInsert(queryContext: QueryContext): Promise<any> | void;
    $afterUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<any> | void;
    $beforeUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<any> | void;
    $afterGet(queryContext: QueryContext): Promise<any> | void;
    $beforeDelete(queryContext: QueryContext): Promise<any> | void;
    $afterDelete(queryContext: QueryContext): Promise<any> | void;
  }

  export class QueryBuilder<T> {
    static forClass<M extends Model>(modelClass: ModelClass<M>): QueryBuilder<M>;
  }

  export interface ThrowIfNotFound {
    throwIfNotFound(): this;
  }

  export interface Executable<T> extends Promise<T> {
    execute(): Promise<T>;
  }

  /**
   * QueryBuilder with one expected result
   */
  export interface QueryBuilderSingle<T>
    extends QueryBuilderBase<T>,
      ThrowIfNotFound,
      Executable<T> {
    runAfter(fn: (result: T, builder: this) => any): this;
  }

  /**
   * Query builder for update operations
   */
  export interface QueryBuilderUpdate<T>
    extends QueryBuilderBase<T>,
      ThrowIfNotFound,
      Executable<number> {
    returning(columns: string | string[]): QueryBuilder<T>;
    runAfter(fn: (result: number, builder: this) => any): this;
  }

  /**
   * Query builder for delete operations
   */
  export interface QueryBuilderDelete<T>
    extends QueryBuilderBase<T>,
      ThrowIfNotFound,
      Executable<number> {
    returning(columns: string | string[]): QueryBuilder<T>;
    runAfter(fn: (result: number, builder: this) => any): this;
  }

  /**
   * Query builder for batch insert operations
   */
  export interface QueryBuilderInsert<T>
    extends QueryBuilderBase<T>,
      ThrowIfNotFound,
      Executable<T[]> {
    returning(columns: string | string[]): this;
    runAfter(fn: (result: T[], builder: this) => any): this;
  }

  /**
   * Query builder for single insert operations
   */
  export interface QueryBuilderInsertSingle<T>
    extends QueryBuilderBase<T>,
      ThrowIfNotFound,
      Executable<T> {
    returning(columns: string | string[]): this;
    runAfter(fn: (result: T, builder: this) => any): this;
  }

  /**
   * QueryBuilder with zero or one expected result
   * (Using the Scala `Option` terminology)
   */
  export interface QueryBuilderOption<T> extends QueryBuilderBase<T>, Executable<T | undefined> {
    throwIfNotFound(): QueryBuilderSingle<T>;
    runAfter(fn: (result: T | undefined, builder: this) => any): this;
  }

  /**
   * QueryBuilder with zero or more expected results
   */
  export interface QueryBuilder<T> extends QueryBuilderBase<T>, ThrowIfNotFound, Executable<T[]> {
    runAfter(fn: (result: T[], builder: this) => any): this;
  }

  /**
   * QueryBuilder with a page result.
   */
  export interface QueryBuilderPage<T>
    extends QueryBuilderBase<T>,
      ThrowIfNotFound,
      Executable<Page<T>> {}

  interface Insert<T> {
    (modelsOrObjects?: Partial<T>[]): QueryBuilderInsert<T>;
    (modelOrObject?: Partial<T>): QueryBuilderInsertSingle<T>;
    (): this;
  }

  interface InsertGraph<T> {
    (modelsOrObjects?: Partial<T>[], options?: InsertGraphOptions): QueryBuilderInsert<T>;
    (modelOrObject?: Partial<T>, options?: InsertGraphOptions): QueryBuilderInsertSingle<T>;
    (): this;
  }

  interface Upsert<T> {
    (modelsOrObjects?: Partial<T>[], options?: UpsertOptions): QueryBuilder<T>;
    (modelOrObject?: Partial<T>, options?: UpsertOptions): QueryBuilderSingle<T>;
  }

  interface InsertGraphAndFetch<T> {
    (modelsOrObjects?: Partial<T>, options?: InsertGraphOptions): QueryBuilderInsertSingle<T>;
    (modelsOrObjects?: Partial<T>[], options?: InsertGraphOptions): QueryBuilderInsert<T>;
  }

  interface QueryBuilderBase<T> extends QueryInterface<T> {
    modify(func: (builder: this) => void): this;
    modify(namedFilter: string): this;

    findById(id: Id): QueryBuilderOption<T>;
    findById(idOrIds: IdOrIds): this;
    findByIds(ids: Id[] | Id[][]): this;
    /** findOne is shorthand for .where(...whereArgs).first() */
    findOne: FindOne<T>;

    insert: Insert<T>;
    insertAndFetch(modelOrObject: Partial<T>): QueryBuilderInsertSingle<T>;
    insertAndFetch(modelsOrObjects?: Partial<T>[]): QueryBuilderInsert<T>;

    insertGraph: InsertGraph<T>;
    insertGraphAndFetch: InsertGraphAndFetch<T>;

    /**
     * insertWithRelated is an alias for insertGraph.
     */
    insertWithRelated: InsertGraph<T>;
    insertWithRelatedAndFetch: InsertGraphAndFetch<T>;

    /**
     * @return a Promise of the number of updated rows
     */
    update(modelOrObject: Partial<T>): QueryBuilderUpdate<T>;
    updateAndFetch(modelOrObject: Partial<T>): QueryBuilderSingle<T>;
    updateAndFetchById(id: Id, modelOrObject: Partial<T>): QueryBuilderSingle<T>;

    /**
     * @return a Promise of the number of patched rows
     */
    patch(modelOrObject: Partial<T>): QueryBuilderUpdate<T>;
    patchAndFetchById(id: Id, modelOrObject: Partial<T>): QueryBuilderSingle<T>;
    patchAndFetch(modelOrObject: Partial<T>): QueryBuilderSingle<T>;

    upsertGraph: Upsert<T>;
    upsertGraphAndFetch: Upsert<T>;

    /**
     * @return a Promise of the number of deleted rows
     */
    deleteById(idOrIds: IdOrIds): QueryBuilderDelete<T>;

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
    whereComposite(column: ColumnRef, value: Value | QueryBuilder<any>): this;
    whereComposite(column: ColumnRef[], value: Value[] | QueryBuilder<any>): this;
    whereComposite(column: ColumnRef, operator: string, value: Value | QueryBuilder<any>): this;
    whereComposite(column: ColumnRef[], operator: string, value: Value[] | QueryBuilder<any>): this;
    whereInComposite(column: ColumnRef, values: Value[] | QueryBuilder<any>): this;

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

    whereJsonField: WhereJsonField<T>;
    orWhereJsonField: WhereJsonField<T>;

    // Non-query methods:

    context(queryContext: object): this;
    context(): QueryContext;
    mergeContext(queryContext: object): this;

    reject(reason: any): this;
    resolve(value: any): this;

    isExecutable(): boolean;
    isFindQuery(): boolean;

    runBefore(fn: (result: any, builder: this) => any): this;
    onBuild(fn: (builder: this) => void): this;
    onError(fn: (error: Error, builder: this) => any): this;

    eagerAlgorithm(algo: EagerAlgorithm): this;

    eager(relationExpression: RelationExpression, filters?: FilterExpression<T>): this;
    mergeEager(relationExpression: RelationExpression, filters?: FilterExpression<T>): this;

    joinEager(relationExpression: RelationExpression, filters?: FilterExpression<T>): this;
    mergeJoinEager(relationExpression: RelationExpression, filters?: FilterExpression<T>): this;

    naiveEager(relationExpression: RelationExpression, filters?: FilterExpression<T>): this;
    mergeNaiveEager(relationExpression: RelationExpression, filters?: FilterExpression<T>): this;

    allowEager: RelationExpressionMethod;
    modifyEager: ModifyEager<T>;
    filterEager: ModifyEager<T>;

    allowInsert: RelationExpressionMethod;
    allowUpsert: RelationExpressionMethod;

    modelClass(): typeof Model;

    toString(): string;

    toSql(): string;

    skipUndefined(): this;

    transacting(transation: Transaction): this;

    clone(): this;

    // We get `then` and `catch` by extending Promise

    map<V, Result>(mapper: BluebirdMapper<V, Result>): Promise<Result[]>;
    return<V>(returnValue: V): Promise<V>;
    bind(context: any): Promise<T>;
    reflect(): Promise<T>;

    asCallback(callback: NodeStyleCallback): Promise<T>;

    nodeify(callback: NodeStyleCallback): Promise<T>;

    resultSize(): Promise<number>;

    page(page: number, pageSize: number): QueryBuilderPage<T>;
    range(start: number, end: number): QueryBuilderPage<T>;
    pluck(propertyName: string): this;
    first(): QueryBuilderOption<T>;

    alias(alias: string): this;
    tableRefFor(modelClass: ModelClass<any>): string;
    tableNameFor(modelClass: ModelClass<any>): string;

    traverse(modelClass: typeof Model, traverser: TraverserFunction): this;

    pick(modelClass: typeof Model, properties: string[]): this;
    pick(properties: string[]): this;

    omit(modelClass: typeof Model, properties: string[]): this;
    omit(properties: string[]): this;
  }

  export interface transaction<T> {
    start(knexOrModel: knex | ModelClass<any>): Promise<Transaction>;

    <MC extends ModelClass<any>, V>(
      modelClass: MC,
      callback: (boundModelClass: MC, trx?: Transaction) => Promise<V>
    ): Promise<V>;

    <MC1 extends ModelClass<any>, MC2 extends ModelClass<any>, V>(
      modelClass1: MC1,
      modelClass2: MC2,
      callback: (boundModel1Class: MC1, boundModel2Class: MC2, trx?: Transaction) => Promise<V>
    ): Promise<V>;

    <MC1 extends ModelClass<any>, MC2 extends ModelClass<any>, MC3 extends ModelClass<any>, V>(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      callback: (
        boundModel1Class: MC1,
        boundModel2Class: MC2,
        boundModel3Class: MC3,
        trx?: Transaction
      ) => Promise<V>
    ): Promise<V>;

    <
      MC1 extends ModelClass<any>,
      MC2 extends ModelClass<any>,
      MC3 extends ModelClass<any>,
      MC4 extends ModelClass<any>,
      V
    >(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      modelClass4: MC4,
      callback: (
        boundModel1Class: MC1,
        boundModel2Class: MC2,
        boundModel3Class: MC3,
        boundModel4Class: MC4,
        trx?: Transaction
      ) => Promise<V>
    ): Promise<V>;

    <
      MC1 extends ModelClass<any>,
      MC2 extends ModelClass<any>,
      MC3 extends ModelClass<any>,
      MC4 extends ModelClass<any>,
      MC5 extends ModelClass<any>,
      V
    >(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      modelClass4: MC4,
      modelClass5: MC5,
      callback: (
        boundModel1Class: MC1,
        boundModel2Class: MC2,
        boundModel3Class: MC3,
        boundModel4Class: MC4,
        boundModel5Class: MC5,
        trx?: Transaction
      ) => Promise<V>
    ): Promise<V>;

    <V>(knex: knex, callback: (trx: Transaction) => Promise<V>): Promise<V>;
  }

  export const transaction: transaction<any>;

  type Raw = knex.Raw;

  //
  // Partial revision of
  // https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/knex/index.d.ts,
  // to change the signatures to return Objection's typed QueryBuilder wrapper:
  //

  type Value =
    | string
    | number
    | boolean
    | Date
    | string[]
    | number[]
    | boolean[]
    | Date[]
    | null
    | Buffer
    | Raw
    | Literal;
  type ColumnRef = string | Raw | Reference | QueryBuilder<any>;
  type TableName = string | Raw | Reference | QueryBuilder<any>;

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

    // Withs
    with: With<T>;
    withRaw: WithRaw<T>;
    withWrapped: WithWrapped<T>;

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
    groupByRaw: RawMethod<T>;

    // Order by
    orderBy: OrderBy<T>;
    orderByRaw: RawMethod<T>;

    // Union
    union: Union<T>;
    unionAll(callback: () => void): this;

    // Having
    having: Where<T>;
    andHaving: Where<T>;
    orHaving: Where<T>;
    havingRaw: WhereRaw<T>;
    orHavingRaw: WhereRaw<T>;
    havingIn: WhereIn<T>;
    orHavingIn: WhereIn<T>;
    havingNotIn: WhereIn<T>;
    orHavingNotIn: WhereIn<T>;
    havingNull: WhereNull<T>;
    orHavingNull: WhereNull<T>;
    havingNotNull: WhereNull<T>;
    orHavingNotNull: WhereNull<T>;
    havingExists: WhereExists<T>;
    orHavingExists: WhereExists<T>;
    havingNotExists: WhereExists<T>;
    orHavingNotExists: WhereExists<T>;
    havingBetween: WhereBetween<T>;
    orHavingBetween: WhereBetween<T>;
    havingNotBetween: WhereBetween<T>;
    orHavingNotBetween: WhereBetween<T>;

    // Clear
    clearSelect(): this;
    clearWhere(): this;

    // Paging
    offset(offset: number): this;
    limit(limit: number): this;

    // Aggregation
    count(columnName?: string): this;
    countDistinct(columnName?: string): this;
    min(columnName: string): this;
    max(columnName: string): this;
    sum(columnName: string): this;
    sumDistinct(columnName: string): this;
    avg(columnName: string): this;
    avgDistinct(columnName: string): this;
    increment(columnName: string, amount?: number): this;
    decrement(columnName: string, amount?: number): this;

    debug(enabled?: boolean): this;
    pluck(column: string): this;

    del(): QueryBuilderDelete<T>;
    delete(): QueryBuilderDelete<T>;
    truncate(): this;

    transacting(trx: Transaction): this;
    connection(connection: any): this;

    clone(): this;
  }

  interface As<T> {
    (alias: string): QueryBuilder<T>;
  }

  interface Select<T> extends ColumnNamesMethod<T> {}

  interface Table<T> {
    (tableName: TableName): QueryBuilder<T>;
    (callback: (queryBuilder: QueryBuilder<T>) => void): QueryBuilder<T>;
  }

  interface Distinct<T> extends ColumnNamesMethod<T> {}

  interface Join<T> {
    (raw: Raw): QueryBuilder<T>;
    (
      tableName: TableName,
      clause: (this: knex.JoinClause, join: knex.JoinClause) => void
    ): QueryBuilder<T>;
    (
      tableName: TableName,
      columns: {[key: string]: string | number | Raw | Reference}
    ): QueryBuilder<T>;
    (tableName: TableName, raw: Raw): QueryBuilder<T>;
    (tableName: TableName, column1: ColumnRef, column2: ColumnRef): QueryBuilder<T>;
    (tableName: TableName, column1: ColumnRef, operator: string, column2: ColumnRef): QueryBuilder<
      T
    >;
  }

  interface JoinRaw<T> {
    (sql: string, bindings?: any): QueryBuilder<T>;
  }

  interface With<T> extends WithRaw<T>, WithWrapped<T> {}

  interface WithRaw<T> {
    (alias: string, raw: Raw): QueryBuilder<T>;
    join: knex.JoinClause;
    (alias: string, sql: string, bindings?: any): QueryBuilder<T>;
  }

  interface WithWrapped<T> {
    (alias: string, callback: (queryBuilder: QueryBuilder<T>) => any): QueryBuilder<T>;
  }

  interface Where<T> extends WhereRaw<T> {
    (callback: (queryBuilder: QueryBuilder<T>) => void): QueryBuilder<T>;
    (object: object): QueryBuilder<T>;
    (column: ColumnRef, value: Value | Reference | QueryBuilder<any>): QueryBuilder<T>;
    (
      column: ColumnRef,
      operator: string,
      value: Value | Reference | QueryBuilder<any>
    ): QueryBuilder<T>;
    (
      column: ColumnRef,
      callback: (this: QueryBuilder<T>, queryBuilder: QueryBuilder<T>) => void
    ): QueryBuilder<T>;
  }

  interface FindOne<T> {
    (condition: boolean): QueryBuilderOption<T>;
    (callback: (queryBuilder: QueryBuilder<T>) => void): QueryBuilderOption<T>;
    (object: object): QueryBuilderOption<T>;
    (sql: string, ...bindings: any[]): QueryBuilderOption<T>;
    (sql: string, bindings: any): QueryBuilderOption<T>;
    (column: ColumnRef, value: Value | Reference | QueryBuilder<any>): QueryBuilderOption<T>;
    (
      column: ColumnRef,
      operator: string,
      value: Value | Reference | QueryBuilder<any>
    ): QueryBuilderOption<T>;
    (
      column: ColumnRef,
      callback: (this: QueryBuilder<T>, queryBuilder: QueryBuilder<T>) => void
    ): QueryBuilderOption<T>;
  }

  interface WhereRaw<T> extends RawMethod<T> {
    (condition: boolean): QueryBuilder<T>;
  }

  interface WhereWrapped<T> {
    (callback: (queryBuilder: QueryBuilder<T>) => void): QueryBuilder<T>;
  }

  interface WhereNull<T> {
    (column: ColumnRef): QueryBuilder<T>;
  }

  interface WhereIn<T> {
    (column: ColumnRef, values: Value[]): QueryBuilder<T>;
    (
      column: ColumnRef,
      callback: (this: QueryBuilder<T>, queryBuilder: QueryBuilder<T>) => void
    ): QueryBuilder<T>;
    (column: ColumnRef, query: QueryBuilder<any>): QueryBuilder<T>;
  }

  interface WhereBetween<T> {
    (column: ColumnRef, range: [Value, Value]): QueryBuilder<T>;
  }

  interface WhereExists<T> {
    (callback: (this: QueryBuilder<T>, queryBuilder: QueryBuilder<T>) => void): QueryBuilder<T>;
    (query: QueryBuilder<any>): QueryBuilder<T>;
    (raw: Raw): QueryBuilder<T>;
  }

  interface GroupBy<T> extends RawMethod<T>, ColumnNamesMethod<T> {}

  interface OrderBy<T> {
    (column: ColumnRef, direction?: string): QueryBuilder<T>;
  }

  interface Union<T> {
    (callback: () => void, wrap?: boolean): QueryBuilder<T>;
    (callbacks: (() => void)[], wrap?: boolean): QueryBuilder<T>;
    (...callbacks: (() => void)[]): QueryBuilder<T>;
  }

  // commons

  interface ColumnNamesMethod<T> {
    (...columnNames: ColumnRef[]): QueryBuilder<T>;
    (columnNames: ColumnRef[]): QueryBuilder<T>;
  }

  interface RawMethod<T> {
    (sql: string, ...bindings: any[]): QueryBuilder<T>;
    (sql: string, bindings: any): QueryBuilder<T>;
    (raw: Raw): QueryBuilder<T>;
  }

  interface Transaction extends knex {
    savepoint(transactionScope: (trx: Transaction) => any): Promise<any>;
    commit<T>(value?: any): Promise<T>;
    rollback<T>(error?: Error): Promise<T>;
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
    $ref?: string;
    /////////////////////////////////////////////////
    // Schema Metadata
    /////////////////////////////////////////////////
    /**
     * This is important because it tells refs where
     * the root of the document is located
     */
    id?: string;
    /**
     * It is recommended that the meta-schema is
     * included in the root of any JSON Schema
     */
    $schema?: JsonSchema;
    /**
     * Title of the schema
     */
    title?: string;
    /**
     * Schema description
     */
    description?: string;
    /**
     * Default json for the object represented by
     * this schema
     */
    default?: any;

    /////////////////////////////////////////////////
    // Number Validation
    /////////////////////////////////////////////////
    /**
     * The value must be a multiple of the number
     * (e.g. 10 is a multiple of 5)
     */
    multipleOf?: number;
    maximum?: number;
    /**
     * If true maximum must be > value, >= otherwise
     */
    exclusiveMaximum?: boolean;
    minimum?: number;
    /**
     * If true minimum must be < value, <= otherwise
     */
    exclusiveMinimum?: boolean;

    /////////////////////////////////////////////////
    // String Validation
    /////////////////////////////////////////////////
    maxLength?: number;
    minLength?: number;
    /**
     * This is a regex string that the value must
     * conform to
     */
    pattern?: string;

    /////////////////////////////////////////////////
    // Array Validation
    /////////////////////////////////////////////////
    additionalItems?: boolean | JsonSchema;
    items?: JsonSchema | JsonSchema[];
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;

    /////////////////////////////////////////////////
    // Object Validation
    /////////////////////////////////////////////////
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    additionalProperties?: boolean | JsonSchema;
    /**
     * Holds simple JSON Schema definitions for
     * referencing from elsewhere.
     */
    definitions?: {[key: string]: JsonSchema};
    /**
     * The keys that can exist on the object with the
     * json schema that should validate their value
     */
    properties?: {[property: string]: JsonSchema};
    /**
     * The key of this object is a regex for which
     * properties the schema applies to
     */
    patternProperties?: {[pattern: string]: JsonSchema};
    /**
     * If the key is present as a property then the
     * string of properties must also be present.
     * If the value is a JSON Schema then it must
     * also be valid for the object if the key is
     * present.
     */
    dependencies?: {[key: string]: JsonSchema | string[]};

    /////////////////////////////////////////////////
    // Generic
    /////////////////////////////////////////////////
    /**
     * Enumerates the values that this schema can be
     * e.g.
     * {"type": "string",
     *  "enum": ["red", "green", "blue"]}
     */
    enum?: any[];
    /**
     * The basic type of this schema, can be one of
     * [string, number, object, array, boolean, null]
     * or an array of the acceptable types
     */
    type?: string | string[];

    /////////////////////////////////////////////////
    // Combining Schemas
    /////////////////////////////////////////////////
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    /**
     * The entity being validated must not match this schema
     */
    not?: JsonSchema;
  }
}
