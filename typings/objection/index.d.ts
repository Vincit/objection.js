// Type definitions for Objection.js
// Project: <http://vincit.github.io/objection.js/>
// Contributions by:
// * Matthew McEachen <https://github.com/mceachen>
// * Sami Koskimäki <https://github.com/koskimas>
// * Mikael Lepistö <https://github.com/elhigu>
// * Joseph T Lapp <https://github.com/jtlapp>
// * Drew R. <https://github.com/drew-r>
// * Karl Blomster <https://github.com/kblomster>
// * And many others: See <https://github.com/Vincit/objection.js/blob/master/typings/objection/index.d.ts>
// TypeScript Version: 2.8

// PLEASE NOTE, the generic type symbols in this file follow this definition:
//   QM - queried model
//   RM - candidate result model or model array
//   RV - actual result value
//   T  - `<T>(this: T, ...): T` workaround

/// <reference types="node" />
import * as knex from 'knex';
import * as ajv from 'ajv';

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
    asArray(): this;
    castType(sqlType: string): this;
    castTo(sqlType: string): this;
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

  export interface Page<QM> {
    total: number;
    results: QM[];
  }

  export interface ModelOptions {
    patch?: boolean;
    skipValidation?: boolean;
    old?: object;
  }

  export interface ValidatorContext {
    [key: string]: any;
  }

  export interface ValidatorArgs {
    ctx: ValidatorContext;
    model: Model;
    json: Pojo;
    options: ModelOptions;
  }

  export class Validator {
    beforeValidate(args: ValidatorArgs): void;
    validate(args: ValidatorArgs): Pojo;
    afterValidate(args: ValidatorArgs): void;
  }

  export interface AjvConfig {
    onCreateAjv(ajv: ajv.Ajv): void;
    options?: ajv.Options;
  }

  export class AjvValidator extends Validator {
    constructor(config: AjvConfig);
  }

  export interface CloneOptions {
    shallow?: boolean;
  }

  export interface ToJsonOptions extends CloneOptions {
    virtuals?: boolean | Array<string>;
  }

  export class NotFoundError extends Error {
    statusCode: number;
    data?: any;
  }

  export type ValidationErrorType =
    | 'ModelValidation'
    | 'RelationExpression'
    | 'UnallowedRelation'
    | 'InvalidGraph';

  export class ValidationError extends Error {
    constructor(args: CreateValidationErrorArgs);

    statusCode: number;
    message: string;
    data?: ErrorHash | any;
    type: ValidationErrorType;
  }

  export interface ValidationErrorItem {
    message: string;
    keyword: string;
    params: Pojo;
  }

  export interface ErrorHash {
    [columnName: string]: ValidationErrorItem[];
  }

  export interface CreateValidationErrorArgs {
    message?: string;
    data?: ErrorHash | any;
    // This can be any string for custom errors. ValidationErrorType is there
    // only to document the default values objection uses internally.
    type: ValidationErrorType | string;
  }

  export interface RelationMappings {
    [relationName: string]: RelationMapping;
  }

  interface RelationProperty {
    size: number;
    modelClass: ModelClass<any>;
    props: string[];
    cols: string[];
  }

  interface Relation {
    name: string;
    ownerModelClass: ModelClass<any>;
    relatedModelClass: ModelClass<any>;
    ownerProp: RelationProperty;
    relatedProp: RelationProperty;
    joinModelClass: ModelClass<any>;
    joinTable: string;
    joinTableOwnerProp: RelationProperty;
    joinTableRelatedProp: RelationProperty;
  }

  export interface RelationJoin {
    from: string | Reference | (string | Reference)[];
    to: string | Reference | (string | Reference)[];
    through?: RelationThrough;
  }

  export interface RelationThrough {
    from: string | Reference | (string | Reference)[];
    to: string | Reference | (string | Reference)[];
    modelClass?: ModelClass<any> | string;
    extra?: string[] | object;
    beforeInsert?: (model: Model, context: QueryContext) => Promise<void> | void;
  }

  export interface RelationMapping {
    relation: Relation;
    modelClass: (() => ModelClass<any>) | ModelClass<any> | string;
    join: RelationJoin;
    modify?: ((queryBuilder: QueryBuilder<any>) => QueryBuilder<any>) | string | object;
    filter?: ((queryBuilder: QueryBuilder<any>) => QueryBuilder<any>) | string | object;
    beforeInsert?: (model: Model, context: QueryContext) => Promise<void> | void;
  }

  export interface EagerAlgorithm {
    // TODO should this be something other than a tagging interface?
  }

  export interface EagerOptions {
    minimize?: boolean;
    separator?: string;
    aliases?: string[];
  }

  export interface UpsertGraphOptions {
    relate?: boolean | string[];
    unrelate?: boolean | string[];
    insertMissing?: boolean | string[];
    update?: boolean | string[];
    noInsert?: boolean | string[];
    noUpdate?: boolean | string[];
    noDelete?: boolean | string[];
    noRelate?: boolean | string[];
    noUnrelate?: boolean | string[];
  }

  type GraphModel<T> =
    | ({ '#id'?: string; '#ref'?: never; '#dbRef'?: never } & T)
    | ({ '#id'?: never; '#ref': string; '#dbRef'?: never } & { [P in keyof T]?: never })
    | ({ '#id'?: never; '#ref'?: never; '#dbRef': number } & { [P in keyof T]?: never });

  type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

  interface DeepPartialGraphArray<T> extends Array<DeepPartialGraph<T>> {}

  type DeepPartialGraphModel<T> =
    | GraphModel<{ [P in NonFunctionPropertyNames<T>]?: DeepPartialGraph<T[P]> }>
    | Partial<T>;

  type DeepPartialGraph<T> = T extends (any[] | ReadonlyArray<any>)
    ? DeepPartialGraphArray<T[number]>
    : T extends Model ? DeepPartialGraphModel<T> : T;

  export interface InsertGraphOptions {
    relate?: boolean | string[];
  }

  export interface QueryContext {
    transaction: Transaction;
    [key: string]: any;
  }

  export interface TableMetadata {
    columns: Array<string>;
  }

  export interface TableMetadataOptions {
    table: string;
  }

  export interface FetchTableMetadataOptions {
    knex?: knex;
    force?: boolean;
    table?: string;
  }

  /**
   * @see http://vincit.github.io/objection.js/#fieldexpression
   */
  type FieldExpression = string;

  /**
   * @see http://vincit.github.io/objection.js/#relationexpression
   */
  type RelationExpression = string | object;

  interface FilterFunction<QM extends Model> {
    (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>): void;
  }

  interface FilterExpression<QM extends Model> {
    [namedFilter: string]: FilterFunction<QM>;
  }

  interface RelationExpressionMethod<QM extends Model, RM, RV> {
    (relationExpression: RelationExpression): QueryBuilder<QM, RM, RV>;
  }

  export interface Modifiers {
    [name: string]: (builder: QueryBuilder<any>) => void;
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
    <QM extends Model>(relationName: string, opt?: RelationOptions): QueryBuilder<QM, QM[]>;
  }

  type JsonObjectOrFieldExpression = object | object[] | FieldExpression;

  interface WhereJson<QM extends Model, RM, RV> {
    (
      fieldExpression: FieldExpression,
      jsonObjectOrFieldExpression: JsonObjectOrFieldExpression
    ): QueryBuilder<QM, RM, RV>;
  }

  interface WhereFieldExpression<QM extends Model, RM, RV> {
    (fieldExpression: FieldExpression): QueryBuilder<QM, RM, RV>;
  }

  interface WhereJsonExpression<QM extends Model, RM, RV> {
    (fieldExpression: FieldExpression, keys: string | string[]): QueryBuilder<QM, RM, RV>;
  }

  interface WhereJsonField<QM extends Model, RM, RV> {
    (
      fieldExpression: FieldExpression,
      operator: string,
      value: boolean | number | string | null
    ): QueryBuilder<QM, RM, RV>;
  }

  interface ModifyEager<QM1 extends Model, RM1, RV1> {
    <QM2 extends Model>(
      relationExpression: RelationExpression,
      modifier: (builder: QueryBuilder<QM2, QM2[]>) => void
    ): QueryBuilder<QM1, RM1, RV1>;
    <QM2 extends Model>(
      relationExpression: RelationExpression,
      modifier: string | string[]
    ): QueryBuilder<QM1, RM1, RV1>;
  }

  interface BluebirdMapper<T, Result> {
    (item: T, index: number): Result;
  }

  interface NodeStyleCallback {
    (err: any, result?: any): void;
  }

  interface Filters<QM extends Model> {
    [filterName: string]: (
      this: QueryBuilder<QM, QM[]>,
      queryBuilder: QueryBuilder<QM, QM[]>
    ) => void;
  }

  interface Properties {
    [propertyName: string]: boolean;
  }

  interface TimeoutOptions {
    cancel: boolean;
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
    useLimitInFirst?: boolean;
    defaultEagerAlgorithm?: EagerAlgorithm;
    defaultEagerOptions?: EagerOptions;
    QueryBuilder: typeof QueryBuilder;
    columnNameMappers: ColumnNameMappers;
    relatedFindQueryMutates: boolean;
    relatedInsertQueryMutates: boolean;
    modifiers: Modifiers;

    raw: knex.RawBuilder;
    fn: knex.FunctionHelper;

    BelongsToOneRelation: Relation;
    HasOneRelation: Relation;
    HasManyRelation: Relation;
    ManyToManyRelation: Relation;
    HasOneThroughRelation: Relation;

    query(trxOrKnex?: Transaction | knex): QueryBuilder<M, M[]>;
    // This can only be used as a subquery so the result model type is irrelevant.
    relatedQuery(relationName: string): QueryBuilder<any, any[]>;
    knex(knex?: knex): knex;
    knexQuery(): knex.QueryBuilder;

    bindKnex(knex: knex): this;
    bindTransaction(transaction: Transaction): this;
    createValidator(): Validator;
    createValidationError(args: CreateValidationErrorArgs): Error;
    createNotFoundError(): Error;

    fromJson(json: object, opt?: ModelOptions): M;
    fromDatabaseJson(row: object): M;

    omitImpl(f: (obj: object, prop: string) => void): void;

    // loadRelated is overloaded to support both Model and Model[] variants:
    loadRelated(
      models: M[],
      expression: RelationExpression,
      filters?: Filters<M>,
      trxOrKnex?: Transaction | knex
    ): QueryBuilder<M>;

    loadRelated(
      model: M,
      expression: RelationExpression,
      filters?: Filters<M>,
      trxOrKnex?: Transaction | knex
    ): QueryBuilderYieldingOne<M>;

    traverse(
      filterConstructor: typeof Model,
      models: Model | Model[],
      traverser: TraverserFunction
    ): void;
    traverse(models: Model | Model[], traverser: TraverserFunction): void;
    tableMetadata(opt?: TableMetadataOptions): TableMetadata;
    fetchTableMetadata(opt?: FetchTableMetadataOptions): Promise<TableMetadata>;
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
    static modifiers: Modifiers;

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

    static getRelations(): { [key: string]: Relation };

    static query<QM extends Model>(
      this: Constructor<QM>,
      trxOrKnex?: Transaction | knex
    ): QueryBuilder<QM>;
    // This can only be used as a subquery so the result model type is irrelevant.
    static relatedQuery(relationName: string): QueryBuilder<any, any[]>;
    static knex(knex?: knex): knex;
    static knexQuery(): knex.QueryBuilder;
    static bindKnex<M>(this: M, knex: knex): M;
    static bindTransaction<M>(this: M, transaction: Transaction): M;
    static createValidator(): Validator;
    static createValidationError(args: CreateValidationErrorArgs): Error;
    static createNotFoundError(): Error;

    // fromJson and fromDatabaseJson both return an instance of Model, not a Model class:
    static fromJson<M>(this: Constructor<M>, json: Pojo, opt?: ModelOptions): M;
    static fromDatabaseJson<M>(this: Constructor<M>, row: Pojo): M;

    static omitImpl(f: (obj: object, prop: string) => void): void;

    // loadRelated is overloaded to support both Model and Model[] variants:
    static loadRelated<QM extends Model>(
      this: Constructor<QM>,
      models: QM[],
      expression: RelationExpression,
      filters?: Filters<QM>,
      trxOrKnex?: Transaction | knex
    ): QueryBuilder<QM>;

    static loadRelated<QM extends Model>(
      this: Constructor<QM>,
      model: QM,
      expression: RelationExpression,
      filters?: Filters<QM>,
      trxOrKnex?: Transaction | knex
    ): QueryBuilderYieldingOne<QM>;

    static traverse(
      filterConstructor: typeof Model,
      models: Model | Model[],
      traverser: TraverserFunction
    ): void;
    static traverse(models: Model | Model[], traverser: TraverserFunction): void;

    static tableMetadata(opt?: TableMetadataOptions): TableMetadata;
    static fetchTableMetadata(opt?: FetchTableMetadataOptions): Promise<TableMetadata>;
    // Implementation note: At least as of TypeScript 2.7, subclasses of
    // methods that return `this` are not compatible with their superclass.
    // For example, `class Movie extends Model` could not be passed as a
    // "Model" to a function, because the methods that return `this` return
    // `Movie`, and not `Model`. The `foo<M>(this: M, ...` is a workaround.

    $id(): any;
    $id(id: any): void;

    $beforeValidate(jsonSchema: JsonSchema, json: Pojo, opt: ModelOptions): JsonSchema;
    $validate(json: Pojo, opt: ModelOptions): Pojo; // may throw ValidationError if validation fails
    $afterValidate(json: Pojo, opt: ModelOptions): void; // may throw ValidationError if validation fails

    $toDatabaseJson(): object;
    $toJson(opt?: ToJsonOptions): object;
    toJSON(opt?: ToJsonOptions): object;
    $parseDatabaseJson(json: Pojo): Pojo;
    $formatDatabaseJson(json: Pojo): Pojo;
    $parseJson(json: Pojo, opt?: ModelOptions): Pojo;
    $formatJson(json: Pojo): Pojo;
    $setJson<T>(this: T, json: Pojo, opt?: ModelOptions): T;
    $setDatabaseJson<M>(this: M, json: Pojo): M;
    $setRelated<T, RelatedM extends Model>(
      this: T,
      relation: String | Relation,
      related: RelatedM | RelatedM[] | null | undefined
    ): T;
    $appendRelated<T, RelatedM extends Model>(
      this: T,
      relation: String | Relation,
      related: RelatedM | RelatedM[] | null | undefined
    ): T;

    $set<T>(this: T, obj: Pojo): T;
    $omit<T>(this: T, keys: string | string[] | Properties): T;
    $pick<T>(this: T, keys: string | string[] | Properties): T;
    $clone<T>(this: T, opt?: CloneOptions): T;

    $query<QM extends Model>(this: QM, trxOrKnex?: Transaction | knex): QueryBuilder<QM, QM>;

    /**
     * If you add fields to your model, you get $relatedQuery typings for
     * free.
     *
     * Note that if you make any chained calls to the QueryBuilder,
     * though, you should apply a cast, which will make your code use not this
     * signatue, but the following signature.
     */
    $relatedQuery<K extends keyof this, V extends this[K] & Model>(
      relationName: K,
      trxOrKnex?: Transaction | knex
    ): QueryBuilder<V, V, V>;

    /**
     * Builds a query that only affects the models related to this instance
     * through a relation. Note that this signature requires a
     * type cast (like `bob.$relatedQuery<Animal>('pets')`).
     */
    $relatedQuery<QM extends Model, RM = QM[]>(
      relationName: keyof this | string,
      trxOrKnex?: Transaction | knex
    ): QueryBuilder<QM, RM>;

    $loadRelated<QM extends Model>(
      this: QM,
      expression: keyof this | RelationExpression,
      filters?: Filters<QM>,
      trxOrKnex?: Transaction | knex
    ): QueryBuilder<QM, QM>;

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

  export class QueryBuilder<QM extends Model, RM, RV> {
    static forClass<M extends Model, MC extends ModelClass<M>>(modelClass: MC): QueryBuilder<M>;
  }

  export interface Executable<RV> extends Promise<RV> {
    execute(): Promise<RV>;
  }

  export interface QueryBuilder<QM extends Model, RM = QM[], RV = RM>
    extends QueryBuilderBase<QM, RM, RV>,
      Executable<RV> {
    throwIfNotFound(): QueryBuilder<QM, RM>;
    castTo<T extends typeof Model>(model: T): QueryBuilder<QM, InstanceType<T>[]>;
  }

  export interface QueryBuilderYieldingOne<QM extends Model> extends QueryBuilder<QM, QM, QM> {}

  export interface QueryBuilderYieldingOneOrNone<QM extends Model>
    extends QueryBuilder<QM, QM, QM | undefined> {}

  export interface QueryBuilderYieldingCount<QM extends Model, RM = QM[]>
    extends QueryBuilderBase<QM, RM, number>,
      Executable<number> {
    throwIfNotFound(): this;
  }

  interface Insert<QM extends Model> {
    (modelsOrObjects?: Partial<QM>[]): QueryBuilder<QM, QM[]>;
    (modelOrObject?: Partial<QM>): QueryBuilder<QM, QM>;
    (): this;
  }

  interface InsertGraph<QM extends Model> {
    (modelsOrObjects?: DeepPartialGraph<QM>[], options?: InsertGraphOptions): QueryBuilder<
      QM,
      QM[]
    >;
    (modelOrObject?: DeepPartialGraph<QM>, options?: InsertGraphOptions): QueryBuilder<QM, QM>;
    (): this;
  }

  interface InsertGraphAndFetch<QM extends Model> {
    (modelsOrObjects?: DeepPartialGraph<QM>[], options?: InsertGraphOptions): QueryBuilder<
      QM,
      QM[]
    >;
    (modelOrObject?: DeepPartialGraph<QM>, options?: InsertGraphOptions): QueryBuilder<QM, QM>;
  }

  interface UpsertGraph<QM extends Model> {
    (modelsOrObjects?: DeepPartialGraph<QM>[], options?: UpsertGraphOptions): QueryBuilder<
      QM,
      QM[]
    >;
    (modelOrObject?: DeepPartialGraph<QM>, options?: UpsertGraphOptions): QueryBuilder<QM, QM>;
  }

  interface UpsertGraphAndFetch<QM extends Model> {
    (modelsOrObjects?: DeepPartialGraph<QM>[], options?: UpsertGraphOptions): QueryBuilder<
      QM,
      QM[]
    >;
    (modelOrObject?: DeepPartialGraph<QM>, options?: UpsertGraphOptions): QueryBuilder<QM, QM>;
  }

  type PartialUpdate<QM extends Model> = {
    [P in keyof QM]?: QM[P] | Raw | Reference | QueryBuilder<any, any[]>
  };

  interface QueryBuilderBase<QM extends Model, RM, RV> extends QueryInterface<QM, RM, RV> {
    modify(func: (builder: this) => void): this;
    modify(namedFilter: string): this;

    applyFilter(...namedFilters: string[]): this;

    findById(id: Id): QueryBuilderYieldingOneOrNone<QM>;
    findById(idOrIds: IdOrIds): this;
    findByIds(ids: Id[] | Id[][]): this;
    /** findOne is shorthand for .where(...whereArgs).first() */
    findOne: FindOne<QM>;

    insert: Insert<QM>;
    insertAndFetch(modelOrObject: Partial<QM>): QueryBuilder<QM, QM>;
    insertAndFetch(modelsOrObjects?: Partial<QM>[]): QueryBuilder<QM, QM[]>;

    insertGraph: InsertGraph<QM>;
    insertGraphAndFetch: InsertGraphAndFetch<QM>;

    /**
     * insertWithRelated is an alias for insertGraph.
     */
    insertWithRelated: InsertGraph<QM>;
    insertWithRelatedAndFetch: InsertGraphAndFetch<QM>;

    /**
     * @return a Promise of the number of updated rows
     */
    update(modelOrObject: PartialUpdate<QM>): QueryBuilderYieldingCount<QM, RM>;
    updateAndFetch(modelOrObject: PartialUpdate<QM>): QueryBuilder<QM, QM>;
    updateAndFetchById(id: Id, modelOrObject: PartialUpdate<QM>): QueryBuilder<QM, QM>;

    /**
     * @return a Promise of the number of patched rows
     */
    patch(modelOrObject: PartialUpdate<QM>): QueryBuilderYieldingCount<QM, RM>;
    patchAndFetchById(idOrIds: IdOrIds, modelOrObject: PartialUpdate<QM>): QueryBuilder<QM, QM>;
    patchAndFetch(modelOrObject: PartialUpdate<QM>): QueryBuilder<QM, QM>;

    upsertGraph: UpsertGraph<QM>;
    upsertGraphAndFetch: UpsertGraphAndFetch<QM>;

    /**
     * @return a Promise of the number of deleted rows
     */
    deleteById(idOrIds: IdOrIds): QueryBuilderYieldingCount<QM, RM>;

    relate<RelatedM extends Model>(ids: IdOrIds | Partial<RelatedM> | Partial<RelatedM>[]): this;
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

    whereComposite(column: ColumnRef, value: Value | QueryBuilder<any, any[]>): this;
    whereComposite(column: ColumnRef[], value: Value[] | QueryBuilder<any, any[]>): this;
    whereComposite(
      column: ColumnRef,
      operator: string,
      value: Value | QueryBuilder<any, any[]>
    ): this;
    whereComposite(
      column: ColumnRef[],
      operator: string,
      value: Value[] | QueryBuilder<any, any[]>
    ): this;
    whereInComposite(column: ColumnRef | ColumnRef[], values: Value[] | QueryBuilder<any, any[]>): this;

    whereJsonSupersetOf: WhereJson<QM, RM, RV>;
    orWhereJsonSupersetOf: WhereJson<QM, RM, RV>;

    whereJsonNotSupersetOf: WhereJson<QM, RM, RV>;
    orWhereJsonNotSupersetOf: WhereJson<QM, RM, RV>;

    whereJsonSubsetOf: WhereJson<QM, RM, RV>;
    orWhereJsonSubsetOf: WhereJson<QM, RM, RV>;

    whereJsonNotSubsetOf: WhereJson<QM, RM, RV>;
    orWhereJsonNotSubsetOf: WhereJson<QM, RM, RV>;

    whereJsonIsArray: WhereFieldExpression<QM, RM, RV>;
    orWhereJsonIsArray: WhereFieldExpression<QM, RM, RV>;

    whereJsonNotArray: WhereFieldExpression<QM, RM, RV>;
    orWhereJsonNotArray: WhereFieldExpression<QM, RM, RV>;

    whereJsonIsObject: WhereFieldExpression<QM, RM, RV>;
    orWhereJsonIsObject: WhereFieldExpression<QM, RM, RV>;

    whereJsonNotObject: WhereFieldExpression<QM, RM, RV>;
    orWhereJsonNotObject: WhereFieldExpression<QM, RM, RV>;

    whereJsonHasAny: WhereJsonExpression<QM, RM, RV>;
    orWhereJsonHasAny: WhereJsonExpression<QM, RM, RV>;

    whereJsonHasAll: WhereJsonExpression<QM, RM, RV>;
    orWhereJsonHasAll: WhereJsonExpression<QM, RM, RV>;

    // Non-query methods:

    context(queryContext: object): this;
    context(): QueryContext;
    mergeContext(queryContext: object): this;

    reject(reason: any): this;
    resolve(value: any): this;

    isExecutable(): boolean;
    isFind(): boolean;
    isInsert(): boolean;
    isUpdate(): boolean;
    isDelete(): boolean;
    isRelate(): boolean;
    isUnrelate(): boolean;
    hasWheres(): boolean;
    hasSelects(): boolean;
    hasEager(): boolean;

    runBefore(fn: (result: any, builder: QueryBuilder<QM, any>) => any): this;
    runAfter(fn: (result: any, builder: QueryBuilder<QM, any>) => any): this;
    onBuild(fn: (builder: this) => void): this;
    onBuildKnex(fn: (knexBuilder: knex.QueryBuilder, builder: this) => void): this;
    onError(fn: (error: Error, builder: this) => any): this;

    eagerAlgorithm(algo: EagerAlgorithm): this;
    eagerOptions(opts: EagerOptions): this;

    eager(relationExpression: RelationExpression, filters?: FilterExpression<QM>): this;
    mergeEager(relationExpression: RelationExpression, filters?: FilterExpression<QM>): this;

    joinEager(relationExpression: RelationExpression, filters?: FilterExpression<QM>): this;
    mergeJoinEager(relationExpression: RelationExpression, filters?: FilterExpression<QM>): this;

    naiveEager(relationExpression: RelationExpression, filters?: FilterExpression<QM>): this;
    mergeNaiveEager(relationExpression: RelationExpression, filters?: FilterExpression<QM>): this;

    allowEager: RelationExpressionMethod<QM, RM, RV>;
    modifyEager: ModifyEager<QM, RM, RV>;
    filterEager: ModifyEager<QM, RM, RV>;

    allowInsert: RelationExpressionMethod<QM, RM, RV>;
    allowUpsert: RelationExpressionMethod<QM, RM, RV>;

    modelClass(): typeof Model;

    toString(): string;

    toSql(): string;

    skipUndefined(): this;

    transacting(transaction: Transaction): this;

    clone(): this;

    // We get `then` and `catch` by extending Promise

    map<V, Result>(mapper: BluebirdMapper<V, Result>): Promise<Result[]>;
    return<V>(returnValue: V): Promise<V>;
    bind(context: any): Promise<QM>;
    reflect(): Promise<QM>;

    asCallback(callback: NodeStyleCallback): Promise<QM>;

    nodeify(callback: NodeStyleCallback): Promise<QM>;

    resultSize(): Promise<number>;

    page(page: number, pageSize: number): QueryBuilder<QM, Page<QM>>;
    range(): QueryBuilder<QM, Page<QM>>;
    range(start: number, end: number): QueryBuilder<QM, Page<QM>>;
    pluck(propertyName: string): this;
    first(): QueryBuilderYieldingOneOrNone<QM>;

    alias(alias: string): this;
    aliasFor(modelClassOrTableName: string | ModelClass<any>, alias:string): this;
    tableRefFor(modelClass: ModelClass<any>): string;
    tableNameFor(modelClass: ModelClass<any>): string;

    traverse(modelClass: typeof Model, traverser: TraverserFunction): this;

    pick(modelClass: typeof Model, properties: string[]): this;
    pick(properties: string[]): this;

    omit(modelClass: typeof Model, properties: string[]): this;
    omit(properties: string[]): this;

    returning(columns: string | string[]): QueryBuilder<QM, RM>;

    timeout(ms: number, options?: TimeoutOptions): this;
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
  type ColumnRef = string | Raw | Reference | QueryBuilder<any, any[]>;
  type TableName = string | Raw | Reference | QueryBuilder<any, any[]>;

  interface QueryInterface<QM extends Model, RM, RV> {
    select: Select<QM, RM, RV>;
    as: As<QM, RM, RV>;
    columns: Select<QM, RM, RV>;
    column: Select<QM, RM, RV>;
    from: Table<QM, RM, RV>;
    into: Table<QM, RM, RV>;
    table: Table<QM, RM, RV>;
    distinct: Distinct<QM, RM, RV>;

    // Joins
    join: Join<QM, RM, RV>;
    joinRaw: JoinRaw<QM, RM, RV>;
    innerJoin: Join<QM, RM, RV>;
    leftJoin: Join<QM, RM, RV>;
    leftOuterJoin: Join<QM, RM, RV>;
    rightJoin: Join<QM, RM, RV>;
    rightOuterJoin: Join<QM, RM, RV>;
    outerJoin: Join<QM, RM, RV>;
    fullOuterJoin: Join<QM, RM, RV>;
    crossJoin: Join<QM, RM, RV>;

    // Withs
    with: With<QM, RM, RV>;
    withRaw: WithRaw<QM, RM, RV>;
    withWrapped: WithWrapped<QM, RM, RV>;

    // Wheres
    where: Where<QM, RM, RV>;
    andWhere: Where<QM, RM, RV>;
    orWhere: Where<QM, RM, RV>;
    whereNot: Where<QM, RM, RV>;
    andWhereNot: Where<QM, RM, RV>;
    orWhereNot: Where<QM, RM, RV>;
    whereRaw: WhereRaw<QM, RM, RV>;
    orWhereRaw: WhereRaw<QM, RM, RV>;
    andWhereRaw: WhereRaw<QM, RM, RV>;
    whereWrapped: WhereWrapped<QM, RM, RV>;
    havingWrapped: WhereWrapped<QM, RM, RV>;
    whereExists: WhereExists<QM, RM, RV>;
    orWhereExists: WhereExists<QM, RM, RV>;
    whereNotExists: WhereExists<QM, RM, RV>;
    orWhereNotExists: WhereExists<QM, RM, RV>;
    whereIn: WhereIn<QM, RM, RV>;
    orWhereIn: WhereIn<QM, RM, RV>;
    whereNotIn: WhereIn<QM, RM, RV>;
    orWhereNotIn: WhereIn<QM, RM, RV>;
    whereNull: WhereNull<QM, RM, RV>;
    orWhereNull: WhereNull<QM, RM, RV>;
    whereNotNull: WhereNull<QM, RM, RV>;
    orWhereNotNull: WhereNull<QM, RM, RV>;
    whereBetween: WhereBetween<QM, RM, RV>;
    orWhereBetween: WhereBetween<QM, RM, RV>;
    andWhereBetween: WhereBetween<QM, RM, RV>;
    whereNotBetween: WhereBetween<QM, RM, RV>;
    orWhereNotBetween: WhereBetween<QM, RM, RV>;
    andWhereNotBetween: WhereBetween<QM, RM, RV>;
    whereColumn: Where<QM, RM, RV>;
    andWhereColumn: Where<QM, RM, RV>;
    orWhereColumn: Where<QM, RM, RV>;
    whereNotColumn: Where<QM, RM, RV>;
    andWhereNotColumn: Where<QM, RM, RV>;
    orWhereNotColumn: Where<QM, RM, RV>;

    // Group by
    groupBy: GroupBy<QM, RM, RV>;
    groupByRaw: RawMethod<QM, RM, RV>;

    // Order by
    orderBy: OrderBy<QM, RM, RV>;
    orderByRaw: RawMethod<QM, RM, RV>;

    // Union
    union: SetOperations<QM>;
    unionAll: SetOperations<QM>;
    intersect: SetOperations<QM>;

    // Having
    having: Where<QM, RM, RV>;
    andHaving: Where<QM, RM, RV>;
    orHaving: Where<QM, RM, RV>;
    havingRaw: WhereRaw<QM, RM, RV>;
    orHavingRaw: WhereRaw<QM, RM, RV>;
    havingIn: WhereIn<QM, RM, RV>;
    orHavingIn: WhereIn<QM, RM, RV>;
    havingNotIn: WhereIn<QM, RM, RV>;
    orHavingNotIn: WhereIn<QM, RM, RV>;
    havingNull: WhereNull<QM, RM, RV>;
    orHavingNull: WhereNull<QM, RM, RV>;
    havingNotNull: WhereNull<QM, RM, RV>;
    orHavingNotNull: WhereNull<QM, RM, RV>;
    havingExists: WhereExists<QM, RM, RV>;
    orHavingExists: WhereExists<QM, RM, RV>;
    havingNotExists: WhereExists<QM, RM, RV>;
    orHavingNotExists: WhereExists<QM, RM, RV>;
    havingBetween: WhereBetween<QM, RM, RV>;
    orHavingBetween: WhereBetween<QM, RM, RV>;
    havingNotBetween: WhereBetween<QM, RM, RV>;
    orHavingNotBetween: WhereBetween<QM, RM, RV>;

    // Clear
    clearSelect(): this;
    clearOrder(): this;
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

    del(): QueryBuilderYieldingCount<QM, RM>;
    delete(): QueryBuilderYieldingCount<QM, RM>;
    truncate(): this;

    transacting(trx: Transaction): this;
    connection(connection: any): this;

    clone(): this;
  }

  interface As<QM extends Model, RM, RV> {
    (alias: string): QueryBuilder<QM, RM, RV>;
  }

  interface Select<QM extends Model, RM, RV> extends ColumnNamesMethod<QM, RM, RV> {}

  interface Table<QM extends Model, RM, RV> {
    (tableName: TableName): QueryBuilder<QM, RM, RV>;
    (
      callback: (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void
    ): QueryBuilder<QM, RM, RV>;
  }

  interface Distinct<QM extends Model, RM, RV> extends ColumnNamesMethod<QM, RM, RV> {}

  interface Join<QM extends Model, RM, RV> {
    (raw: Raw): QueryBuilder<QM, RM, RV>;
    (
      tableName: TableName,
      clause: (this: knex.JoinClause, join: knex.JoinClause) => void
    ): QueryBuilder<QM, RM, RV>;
    (
      tableName: TableName,
      columns: { [key: string]: string | number | Raw | Reference }
    ): QueryBuilder<QM, RM, RV>;
    (tableName: TableName, raw: Raw): QueryBuilder<QM, RM, RV>;
    (tableName: TableName, column1: ColumnRef, column2: ColumnRef): QueryBuilder<QM, RM, RV>;
    (tableName: TableName, column1: ColumnRef, operator: string, column2: ColumnRef): QueryBuilder<
      QM,
      RM,
      RV
    >;
    (queryBuilder: QueryBuilder<Model>): QueryBuilder<QM, RM, RV>;
  }

  interface JoinRaw<QM extends Model, RM, RV> {
    (sql: string, bindings?: any): QueryBuilder<QM, RM, RV>;
  }

  interface With<QM extends Model, RM, RV> extends WithRaw<QM, RM, RV>, WithWrapped<QM, RM, RV> {}

  interface WithRaw<QM extends Model, RM, RV> {
    (alias: string, raw: Raw): QueryBuilder<QM, RM, RV>;
    join: knex.JoinClause;
    (alias: string, sql: string, bindings?: any): QueryBuilder<QM, RM, RV>;
  }

  interface WithWrapped<QM extends Model, RM, RV> {
    (alias: string, callback: (queryBuilder: QueryBuilder<QM, QM[]>) => any): QueryBuilder<
      QM,
      RM,
      RV
    >;
  }

  interface Where<QM extends Model, RM, RV> extends WhereRaw<QM, RM, RV> {
    (
      callback: (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void
    ): QueryBuilder<QM, RM, RV>;
    (object: object): QueryBuilder<QM, RM, RV>;
    (
      column: keyof QM | ColumnRef,
      value: Value | Reference | QueryBuilder<any, any[]>
    ): QueryBuilder<QM, RM, RV>;
    (
      column: keyof QM | ColumnRef,
      operator: string,
      value: Value | Reference | QueryBuilder<any, any[]>
    ): QueryBuilder<QM, RM, RV>;
    (
      column: ColumnRef,
      callback: (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void
    ): QueryBuilder<QM, RM, RV>;
  }

  interface FindOne<QM extends Model> {
    (condition: boolean): QueryBuilderYieldingOneOrNone<QM>;
    (
      callback: (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void
    ): QueryBuilderYieldingOneOrNone<QM>;
    (object: object): QueryBuilderYieldingOneOrNone<QM>;
    (sql: string, ...bindings: any[]): QueryBuilderYieldingOneOrNone<QM>;
    (sql: string, bindings: any): QueryBuilderYieldingOneOrNone<QM>;
    (
      column: ColumnRef,
      value: Value | Reference | QueryBuilder<any, any[]>
    ): QueryBuilderYieldingOneOrNone<QM>;
    (
      column: ColumnRef,
      operator: string,
      value: Value | Reference | QueryBuilder<any, any[]>
    ): QueryBuilderYieldingOneOrNone<QM>;
    (
      column: ColumnRef,
      callback: (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void
    ): QueryBuilderYieldingOneOrNone<QM>;
  }

  interface WhereRaw<QM extends Model, RM, RV> extends RawMethod<QM, RM, RV> {
    (condition: boolean): QueryBuilder<QM, RM, RV>;
  }

  interface WhereWrapped<QM extends Model, RM, RV> {
    (callback: (queryBuilder: QueryBuilder<QM, QM[]>) => void): QueryBuilder<QM, RM, RV>;
  }

  interface WhereNull<QM extends Model, RM, RV> {
    (column: ColumnRef): QueryBuilder<QM, RM, RV>;
  }

  interface WhereIn<QM extends Model, RM, RV> {
    (column: ColumnRef | ColumnRef[], values: Value[]): QueryBuilder<QM, RM, RV>;
    (
      column: ColumnRef | ColumnRef[],
      callback: (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void
    ): QueryBuilder<QM, RM, RV>;
    (column: ColumnRef | ColumnRef[], query: QueryBuilder<any, any[]>): QueryBuilder<QM, RM, RV>;
  }

  interface WhereBetween<QM extends Model, RM, RV> {
    (column: ColumnRef, range: [Value, Value]): QueryBuilder<QM, RM, RV>;
  }

  interface WhereExists<QM extends Model, RM, RV> {
    (
      callback: (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void
    ): QueryBuilder<QM, RM, RV>;
    (query: QueryBuilder<any, any[]>): QueryBuilder<QM, RM, RV>;
    (raw: Raw): QueryBuilder<QM, RM, RV>;
  }

  interface GroupBy<QM extends Model, RM, RV>
    extends RawMethod<QM, RM, RV>,
      ColumnNamesMethod<QM, RM, RV> {}

  interface OrderBy<QM extends Model, RM, RV> {
    (column: ColumnRef, direction?: string): QueryBuilder<QM, RM, RV>;
  }

  interface SetOperations<QM extends Model> {
    (
      callback: (this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void,
      wrap?: boolean
    ): QueryBuilder<QM, QM[]>;
    (
      callbacks: ((this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void)[],
      wrap?: boolean
    ): QueryBuilder<QM, QM[]>;
    (
      ...callbacks: ((this: QueryBuilder<QM, QM[]>, queryBuilder: QueryBuilder<QM, QM[]>) => void)[]
    ): QueryBuilder<QM, QM[]>;
  }

  // commons

  interface ColumnNamesMethod<QM extends Model, RM, RV> {
    (...columnNames: ColumnRef[]): QueryBuilder<QM, RM, RV>;
    (columnNames: ColumnRef[]): QueryBuilder<QM, RM, RV>;
  }

  interface RawMethod<QM extends Model, RM, RV> {
    (sql: string, ...bindings: any[]): QueryBuilder<QM, RM, RV>;
    (sql: string, bindings: any): QueryBuilder<QM, RM, RV>;
    (raw: Raw): QueryBuilder<QM, RM, RV>;
  }

  interface Transaction extends knex {
    savepoint(transactionScope: (trx: Transaction) => any): Promise<any>;
    commit<QM>(value?: any): Promise<QM>;
    rollback<QM>(error?: Error): Promise<QM>;
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
    definitions?: { [key: string]: JsonSchema };
    /**
     * The keys that can exist on the object with the
     * json schema that should validate their value
     */
    properties?: { [property: string]: JsonSchema };
    /**
     * The key of this object is a regex for which
     * properties the schema applies to
     */
    patternProperties?: { [pattern: string]: JsonSchema };
    /**
     * If the key is present as a property then the
     * string of properties must also be present.
     * If the value is a JSON Schema then it must
     * also be valid for the object if the key is
     * present.
     */
    dependencies?: { [key: string]: JsonSchema | string[] };

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
