/// <reference types="node" />

// Type definitions for Objection.js
// Project: <http://vincit.github.io/objection.js/>
//
// Contributions by:
// * Matthew McEachen <https://github.com/mceachen>
// * Sami Koskimäki <https://github.com/koskimas>
// * Mikael Lepistö <https://github.com/elhigu>
// * Joseph T Lapp <https://github.com/jtlapp>
// * Drew R. <https://github.com/drew-r>
// * Karl Blomster <https://github.com/kblomster>
// * And many others: See <https://github.com/Vincit/objection.js/blob/master/typings/objection/index.d.ts>

import * as knex from 'knex';
import * as ajv from 'ajv';

export = Objection;

declare namespace Objection {
  const raw: RawFunction;
  const lit: LiteralFunction;
  const ref: ReferenceFunction;

  const compose: ComposeFunction;
  const mixin: MixinFunction;

  const snakeCaseMappers: SnakeCaseMappersFactory;
  const knexSnakeCaseMappers: KnexSnakeCaseMappersFactory;

  export interface RawBuilder extends Aliasable {}

  export interface RawFunction extends RawInterface<RawBuilder> {}
  export interface RawInterface<R> {
    (sql: string, ...bindings: any[]): R;
  }

  export interface LiteralBuilder extends Castable {}
  export interface LiteralFunction {
    (
      value: PrimitiveValue | PrimitiveValue[] | PrimitiveValueObject | PrimitiveValueObject[]
    ): LiteralBuilder;
  }

  export interface ReferenceBuilder extends Castable {}
  export interface ReferenceFunction {
    (expression: string): ReferenceBuilder;
  }

  export interface ComposeFunction {
    (...plugins: Plugin[]): Plugin;
    (plugins: Plugin[]): Plugin;
  }

  export interface Plugin {
    <M extends typeof Model>(modelClass: M): M;
  }

  export interface MixinFunction {
    // Using ModelClass<M> causes TS 2.5 to render ModelClass<any> rather
    // than an identity function type. <M extends typeof Model> retains the
    // model subclass type in the return value, without requiring the user
    // to type the Mixin call.
    <MC extends ModelClass<any>>(modelClass: MC, ...plugins: Plugin[]): MC;
    <MC extends ModelClass<any>>(modelClass: MC, plugins: Plugin[]): MC;
  }

  interface Aliasable {
    as(alias: string): this;
  }

  interface Castable extends Aliasable {
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
  }

  type Raw = RawBuilder;
  type Operator = string;
  type NonPrimitiveValue = Raw | ReferenceBuilder | LiteralBuilder | AnyQueryBuilder;
  type ColumnRef = string | Raw | ReferenceBuilder;
  type TableRef = ColumnRef | AnyQueryBuilder;

  type PrimitiveValue =
    | string
    | number
    | boolean
    | Date
    | string[]
    | number[]
    | boolean[]
    | Date[]
    | null
    | Buffer;

  type Value = NonPrimitiveValue | PrimitiveValue;

  type Id = string | number;
  type CompositeId = Id[];
  type MaybeCompositeId = Id | CompositeId;

  interface ValueObject {
    [key: string]: Value;
  }

  interface PrimitiveValueObject {
    [key: string]: PrimitiveValue;
  }

  interface CallbackVoid<T> {
    (this: T, arg: T): void;
  }

  type Identity<T> = (value: T) => T;
  type AnyQueryBuilder = QueryBuilder<any, any>;
  type AnyModelClass = ModelClass<any>;
  type Modifier<QB extends AnyQueryBuilder = AnyQueryBuilder> =
    | ((qb: QB) => void)
    | string
    | object;
  type OrderByDirection = 'asc' | 'desc' | 'ASC' | 'DESC';

  interface Modifiers<QB extends AnyQueryBuilder = AnyQueryBuilder> {
    [key: string]: Modifier<QB>;
  }

  // TODO: This can be improved by typing the object using M's relations.
  type RelationExpression<M extends Model> = string | object;

  /**
   * If T is an array, returns the item type, otherwise returns T.
   */
  type ItemType<T> = T extends Array<unknown> ? T[number] : T;

  /**
   * Type for keys of non-function properties of T.
   */
  type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

  /**
   * Any object that has some of the properties of model class T match this type.
   */
  type PartialModelObject<T extends Model> = {
    [K in NonFunctionPropertyNames<T>]?: Exclude<T[K], undefined> extends Model
      ? T[K]
      : Exclude<T[K], undefined> extends Array<infer I>
      ? (I extends Model ? I[] : (T[K] | NonPrimitiveValue))
      : (T[K] | NonPrimitiveValue)
  } &
    object;

  /**
   * Additional optional parameters that may be used in graphs.
   */
  type GraphParameters = {
    '#dbRef'?: MaybeCompositeId;
    '#ref'?: string;
    '#id'?: string;
  };

  /**
   * Just like PartialModelObject but this is applied recursively to relations.
   */
  type PartialModelGraph<T> = {
    [K in NonFunctionPropertyNames<T>]?: Exclude<T[K], undefined> extends Model
      ? PartialModelGraph<Exclude<T[K], undefined>>
      : Exclude<T[K], undefined> extends Array<infer I>
      ? (I extends Model ? PartialModelGraph<I>[] : (T[K] | NonPrimitiveValue))
      : (T[K] | NonPrimitiveValue)
  } &
    GraphParameters;

  /**
   * Extracts the model type from a query builder type QB.
   */
  type ModelType<QB extends AnyQueryBuilder> = QB['ModelType'];

  /**
   * Extracts the result type from a query builder type QB.
   */
  type ResultType<QB extends AnyQueryBuilder> = QB['ResultType'];

  /**
   * Extracts the property names of the query builder's model class.
   */
  type ModelProps<QB extends AnyQueryBuilder> = Exclude<
    NonFunctionPropertyNames<ModelType<QB>>,
    'QueryBuilderType'
  >;

  /**
   * Gets the single item query builder type for a query builder.
   */
  type SingleQueryBuilder<QB extends AnyQueryBuilder> = QB['SingleQueryBuilderType'];

  /**
   * Gets the multi-item query builder type for a query builder.
   */
  type ArrayQueryBuilder<QB extends AnyQueryBuilder> = QB['ArrayQueryBuilderType'];

  /**
   * Gets the number query builder type for a query builder.
   */
  type NumberQueryBuilder<QB extends AnyQueryBuilder> = QB['NumberQueryBuilderType'];

  /**
   * Gets the page query builder type for a query builder.
   */
  type PageQueryBuilder<QB extends AnyQueryBuilder> = QB['PageQueryBuilderType'];

  interface ForClassMethod {
    <M extends Model>(modelClass: ModelClass<M>): M['QueryBuilderType'];
  }

  /**
   * https://vincit.github.io/objection.js/api/types/#type-fieldexpression
   */
  type FieldExpression = string;

  type JsonObjectOrFieldExpression = object | object[] | FieldExpression;

  type Selection<QB extends AnyQueryBuilder> = ColumnRef | AnyQueryBuilder | CallbackVoid<QB>;

  interface SelectMethod<QB extends AnyQueryBuilder> {
    <AQB extends AnyQueryBuilder>(...columns: Selection<AQB>[]): QB;
    <AQB extends AnyQueryBuilder>(columns: Selection<AQB>[]): QB;
  }

  interface FromMethod<QB extends AnyQueryBuilder> {
    (table: string): QB;
    (cb: CallbackVoid<QB>): QB;
    (raw: Raw): QB;
    <QBA extends AnyQueryBuilder>(qb: QBA): QB;
  }

  interface WhereMethod<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(col: ModelProps<QBP>, op: Operator, value: Value): QB;
    <QBP extends QB>(col: ModelProps<QBP>, value: Value): QB;

    (col: ColumnRef, op: Operator, value: Value): QB;
    (col: ColumnRef, value: Value): QB;

    (condition: boolean): QB;
    (cb: CallbackVoid<QB>): QB;
    (raw: Raw): QB;
    <QBA extends AnyQueryBuilder>(qb: QBA): QB;

    (obj: PartialModelObject<ModelType<QB>>): QB;
    // We must allow any keys in the object. The previous type
    // is kind of useless, but maybe one day vscode and other
    // tools can autocomplete using it.
    (obj: object): QB;
  }

  interface WhereRawMethod<QB extends AnyQueryBuilder> extends RawInterface<QB> {}

  interface WhereWrappedMethod<QB extends AnyQueryBuilder> {
    (cb: CallbackVoid<QB>): QB;
  }

  interface WhereExistsMethod<QB extends AnyQueryBuilder> {
    (cb: CallbackVoid<QB>): QB;
    (raw: Raw): QB;
    <QBA extends AnyQueryBuilder>(qb: QBA): QB;
  }

  interface WhereInMethod<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(col: ModelProps<QBP>, value: Value): QB;
    <QBP extends QB>(col: ModelProps<QBP>, cb: CallbackVoid<QB>): QB;
    <QBP extends QB>(col: ModelProps<QBP>, qb: AnyQueryBuilder): QB;

    (col: ColumnRef | ColumnRef[], value: Value[]): QB;
    (col: ColumnRef | ColumnRef[], cb: CallbackVoid<QB>): QB;
    (col: ColumnRef | ColumnRef[], qb: AnyQueryBuilder): QB;
  }

  interface WhereBetweenMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, range: [Value, Value]): QB;
  }

  interface WhereJsonSupersetOfMethod<QB extends AnyQueryBuilder> {
    (
      fieldExpression: FieldExpression,
      jsonObjectOrFieldExpression: JsonObjectOrFieldExpression
    ): QB;
  }

  interface WhereJsonIsArrayMethod<QB extends AnyQueryBuilder> {
    (fieldExpression: FieldExpression): QB;
  }

  type QBOrCallback<QB extends AnyQueryBuilder> = AnyQueryBuilder | CallbackVoid<QB>;

  interface SetOperations<QB extends AnyQueryBuilder> extends BaseSetOperations<QB> {
    (...callbacksOrBuilders: QBOrCallback<QB>[]): QB;
  }

  interface BaseSetOperations<QB extends AnyQueryBuilder> {
    (callbackOrBuilder: QBOrCallback<QB>, wrap?: boolean): QB;
    (callbacksOrBuilders: QBOrCallback<QB>[], wrap?: boolean): QB;
  }

  interface UnionMethod<QB extends AnyQueryBuilder> extends BaseSetOperations<QB> {
    (arg1: QBOrCallback<QB>, wrap?: boolean): QB;
    (arg1: QBOrCallback<QB>, arg2: QBOrCallback<QB>, wrap?: boolean): QB;
    (arg1: QBOrCallback<QB>, arg2: QBOrCallback<QB>, arg3: QBOrCallback<QB>, wrap?: boolean): QB;
    (
      arg1: QBOrCallback<QB>,
      arg2: QBOrCallback<QB>,
      arg3: QBOrCallback<QB>,
      arg4: QBOrCallback<QB>,
      wrap?: boolean
    ): QB;
    (
      arg1: QBOrCallback<QB>,
      arg2: QBOrCallback<QB>,
      arg3: QBOrCallback<QB>,
      arg4: QBOrCallback<QB>,
      arg5: QBOrCallback<QB>,
      wrap?: boolean
    ): QB;
    (
      arg1: QBOrCallback<QB>,
      arg2: QBOrCallback<QB>,
      arg3: QBOrCallback<QB>,
      arg4: QBOrCallback<QB>,
      arg5: QBOrCallback<QB>,
      arg6: QBOrCallback<QB>,
      wrap?: boolean
    ): QB;
    (
      arg1: QBOrCallback<QB>,
      arg2: QBOrCallback<QB>,
      arg3: QBOrCallback<QB>,
      arg4: QBOrCallback<QB>,
      arg5: QBOrCallback<QB>,
      arg6: QBOrCallback<QB>,
      arg7: QBOrCallback<QB>,
      wrap?: boolean
    ): QB;
  }

  interface JoinRelationOptions {
    alias?: string | boolean;
    aliases?: Record<string, string>;
  }

  interface JoinRelationMethod<QB extends AnyQueryBuilder> {
    (expr: RelationExpression<ModelType<QB>>, opt?: JoinRelationOptions): QB;
  }

  interface JoinMethod<QB extends AnyQueryBuilder> {
    (table: TableRef, leftCol: ColumnRef, op: Operator, rightCol: ColumnRef): QB;
    (table: TableRef, leftCol: ColumnRef, rightCol: ColumnRef): QB;
    (table: TableRef, cb: CallbackVoid<knex.JoinClause>): QB;
    (table: TableRef, raw: Raw): QB;
    (raw: Raw): QB;
  }

  interface JoinRawMethod<QB extends AnyQueryBuilder> extends RawInterface<QB> {}

  interface IncrementDecrementMethod<QB extends AnyQueryBuilder> {
    (column: string, amount?: number): QB;
  }

  interface CountMethod<QB extends AnyQueryBuilder> {
    (column?: ColumnRef, options?: { as: string }): QB;
    (aliasToColumnDict: { [alias: string]: string | string[] }): QB;
    (...columns: ColumnRef[]): QB;
  }

  interface OrderByMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, order?: OrderByDirection): QB;
    (columns: ({ column: ColumnRef; order?: OrderByDirection } | ColumnRef)[]): QB;
  }

  interface OrderByRawMethod<QB extends AnyQueryBuilder> extends RawInterface<QB> {}

  interface FindByIdMethod<QB extends AnyQueryBuilder> {
    (id: MaybeCompositeId): SingleQueryBuilder<QB>;
  }

  interface FindByIdsMethod<QB extends AnyQueryBuilder> {
    (ids: MaybeCompositeId[]): QB;
  }

  interface FindOneMethod<QB extends AnyQueryBuilder> extends WhereMethod<SingleQueryBuilder<QB>> {}

  interface FirstMethod<QB extends AnyQueryBuilder> {
    <QB extends AnyQueryBuilder>(this: QB): QB extends ArrayQueryBuilder<QB>
      ? SingleQueryBuilder<QB>
      : QB;
  }

  interface ExecuteMethod<R> {
    (): Promise<R>;
  }

  interface CastToMethod {
    <M extends Model>(modelClass: ModelClass<M>): M['QueryBuilderType'];
  }

  interface UpdateMethod<QB extends AnyQueryBuilder> {
    (update: PartialModelObject<ModelType<QB>>): NumberQueryBuilder<QB>;
  }

  interface UpdateAndFetchMethod<QB extends AnyQueryBuilder> {
    (update: PartialModelObject<ModelType<QB>>): SingleQueryBuilder<QB>;
  }

  interface UpdateAndFetchByIdMethod<QB extends AnyQueryBuilder> {
    (id: MaybeCompositeId, update: PartialModelObject<ModelType<QB>>): SingleQueryBuilder<QB>;
  }

  interface DeleteMethod<QB extends AnyQueryBuilder> {
    (): NumberQueryBuilder<QB>;
  }

  interface DeleteByIdMethod<QB extends AnyQueryBuilder> {
    (id: MaybeCompositeId): NumberQueryBuilder<QB>;
  }

  interface InsertMethod<QB extends AnyQueryBuilder> {
    (insert: PartialModelObject<ModelType<QB>>): SingleQueryBuilder<QB>;
    (insert: PartialModelObject<ModelType<QB>>[]): ArrayQueryBuilder<QB>;
  }

  interface EagerMethod<QB extends AnyQueryBuilder> {
    (expr: RelationExpression<ModelType<QB>>, modifiers?: Modifiers): QB;
  }

  interface AllowGraphMethod<QB extends AnyQueryBuilder> {
    (expr: RelationExpression<ModelType<QB>>): QB;
  }

  interface IdentityMethod<QB extends AnyQueryBuilder> {
    (): QB;
  }

  interface OneArgMethod<T, QB extends AnyQueryBuilder> {
    (arg: T): QB;
  }

  interface StringReturningMethod {
    (): string;
  }

  interface BooleanReturningMethod {
    (): boolean;
  }

  interface TableRefForMethod {
    (modelClass: typeof Model): string;
  }

  interface ModelClassMethod {
    (): typeof Model;
  }

  interface ReturningMethod {
    <QB extends AnyQueryBuilder>(this: QB, column: string | string[]): QB extends ArrayQueryBuilder<
      QB
    >
      ? ArrayQueryBuilder<QB>
      : QB extends NumberQueryBuilder<QB>
      ? ArrayQueryBuilder<QB>
      : SingleQueryBuilder<QB>;
  }

  export interface Page<M extends Model> {
    total: number;
    results: M[];
  }

  interface PageMethod<QB extends AnyQueryBuilder> {
    (page: number, pageSize: number): PageQueryBuilder<QB>;
  }

  interface RangeMethod<QB extends AnyQueryBuilder> {
    (): PageQueryBuilder<QB>;
    (start: number, end: number): PageQueryBuilder<QB>;
  }

  interface RunBeforeCallback<QB extends AnyQueryBuilder> {
    (this: QB, result: any, query: QB): any;
  }

  interface RunBeforeMethod<QB extends AnyQueryBuilder> {
    (cb: RunBeforeCallback<QB>): QB;
  }

  interface RunAfterCallback<QB extends AnyQueryBuilder> {
    (this: QB, result: ResultType<QB>, query: QB): any;
  }

  interface RunAfterMethod<QB extends AnyQueryBuilder> {
    (cb: RunAfterCallback<QB>): QB;
  }

  interface OnBuildMethod<QB extends AnyQueryBuilder> {
    (cb: CallbackVoid<QB>): QB;
  }

  interface OnBuildKnexCallback<QB extends AnyQueryBuilder> {
    (this: QB, knexQuery: knex.QueryBuilder, query: QB): void;
  }

  interface OnBuildKnexMethod<QB extends AnyQueryBuilder> {
    (cb: OnBuildKnexCallback<QB>): QB;
  }

  interface OnErrorCallback<QB extends AnyQueryBuilder> {
    (this: QB, error: Error, query: QB): any;
  }

  interface OnErrorMethod<QB extends AnyQueryBuilder> {
    (cb: OnErrorCallback<QB>): QB;
  }

  export interface InsertGraphOptions {
    relate?: boolean | string[];
  }

  interface InsertGraphMethod {
    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<ModelType<QB>>,
      options?: InsertGraphOptions
    ): SingleQueryBuilder<QB>;

    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<ModelType<QB>>[],
      options?: InsertGraphOptions
    ): ArrayQueryBuilder<QB>;
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

  interface UpsertGraphMethod {
    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<ModelType<QB>>,
      options?: UpsertGraphOptions
    ): SingleQueryBuilder<QB>;

    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<ModelType<QB>>[],
      options?: UpsertGraphOptions
    ): ArrayQueryBuilder<QB>;
  }

  export interface EagerAlgorithm {}

  interface EagerAlgorithmMethod<QB extends AnyQueryBuilder> {
    (algorithm: EagerAlgorithm): QB;
  }

  export interface EagerOptions {
    minimize?: boolean;
    separator?: string;
    aliases?: string[];
    joinOperation: string;
  }

  interface EagerOptionsMethod<QB extends AnyQueryBuilder> {
    (options: EagerOptions): QB;
  }

  interface ModifyEagerMethod<QB extends AnyQueryBuilder> {
    <M extends Model>(
      expr: RelationExpression<ModelType<QB>>,
      modifier: Modifier<M['QueryBuilderType']>
    ): QB;
  }

  interface ContextMethod<QB extends AnyQueryBuilder> {
    (context: object): QB;
    (): QueryContext;
  }

  export interface Pojo {
    [key: string]: any;
  }

  export class QueryBuilder<M extends Model, R = M[]> extends Promise<R> {
    static forClass: ForClassMethod;

    select: SelectMethod<this>;
    columns: SelectMethod<this>;
    column: SelectMethod<this>;
    distinct: SelectMethod<this>;

    from: FromMethod<this>;
    table: FromMethod<this>;
    into: FromMethod<this>;

    where: WhereMethod<this>;
    andWhere: WhereMethod<this>;
    orWhere: WhereMethod<this>;
    whereNot: WhereMethod<this>;
    andWhereNot: WhereMethod<this>;
    orWhereNot: WhereMethod<this>;

    whereRaw: WhereRawMethod<this>;
    orWhereRaw: WhereRawMethod<this>;
    andWhereRaw: WhereRawMethod<this>;

    whereWrapped: WhereWrappedMethod<this>;
    havingWrapped: WhereWrappedMethod<this>;

    whereExists: WhereExistsMethod<this>;
    orWhereExists: WhereExistsMethod<this>;
    whereNotExists: WhereExistsMethod<this>;
    orWhereNotExists: WhereExistsMethod<this>;

    whereIn: WhereInMethod<this>;
    orWhereIn: WhereInMethod<this>;
    whereNotIn: WhereInMethod<this>;
    orWhereNotIn: WhereInMethod<this>;

    whereBetween: WhereBetweenMethod<this>;

    whereJsonSupersetOf: WhereJsonSupersetOfMethod<this>;
    whereJsonIsArray: WhereJsonIsArrayMethod<this>;

    union: UnionMethod<this>;
    unionAll: UnionMethod<this>;

    joinRelation: JoinRelationMethod<this>;
    innerJoinRelation: JoinRelationMethod<this>;
    outerJoinRelation: JoinRelationMethod<this>;
    leftJoinRelation: JoinRelationMethod<this>;
    leftOuterJoinRelation: JoinRelationMethod<this>;
    rightJoinRelation: JoinRelationMethod<this>;
    rightOuterJoinRelation: JoinRelationMethod<this>;
    fullOuterJoinRelation: JoinRelationMethod<this>;

    join: JoinMethod<this>;
    joinRaw: JoinRawMethod<this>;
    innerJoin: JoinMethod<this>;
    leftJoin: JoinMethod<this>;
    leftOuterJoin: JoinMethod<this>;
    rightJoin: JoinMethod<this>;
    rightOuterJoin: JoinMethod<this>;
    outerJoin: JoinMethod<this>;
    fullOuterJoin: JoinMethod<this>;
    crossJoin: JoinMethod<this>;

    count: CountMethod<this>;
    increment: IncrementDecrementMethod<this>;
    decrement: IncrementDecrementMethod<this>;

    findById: FindByIdMethod<this>;
    findByIds: FindByIdsMethod<this>;
    findOne: FindOneMethod<this>;

    first: FirstMethod<this>;

    orderBy: OrderByMethod<this>;
    orderByRaw: OrderByRawMethod<this>;

    execute: ExecuteMethod<R>;
    castTo: CastToMethod;

    update: UpdateMethod<this>;
    updateAndFetch: UpdateAndFetchMethod<this>;
    updateAndFetchById: UpdateAndFetchByIdMethod<this>;

    patch: UpdateMethod<this>;
    patchAndFetch: UpdateAndFetchMethod<this>;
    patchAndFetchById: UpdateAndFetchByIdMethod<this>;

    del: DeleteMethod<this>;
    delete: DeleteMethod<this>;
    deleteById: DeleteByIdMethod<this>;

    insert: InsertMethod<this>;
    insertAndFetch: InsertMethod<this>;

    eager: EagerMethod<this>;
    mergeEager: EagerMethod<this>;

    joinEager: EagerMethod<this>;
    mergeJoinEager: EagerMethod<this>;

    naiveEager: EagerMethod<this>;
    mergeNaiveEager: EagerMethod<this>;

    allowEager: AllowGraphMethod<this>;
    mergeAllowEager: AllowGraphMethod<this>;

    allowInsert: AllowGraphMethod<this>;
    allowUpsert: AllowGraphMethod<this>;

    throwIfNotFound: IdentityMethod<this>;
    returning: ReturningMethod;
    forUpdate: IdentityMethod<this>;
    skipUndefined: IdentityMethod<this>;
    debug: IdentityMethod<this>;
    as: OneArgMethod<string, this>;
    alias: OneArgMethod<string, this>;
    withSchema: OneArgMethod<string, this>;
    modelClass: ModelClassMethod;
    tableNameFor: TableRefForMethod;
    tableRefFor: TableRefForMethod;
    toSql: StringReturningMethod;
    reject: OneArgMethod<any, this>;
    resolve: OneArgMethod<any, this>;

    page: PageMethod<this>;
    range: RangeMethod<this>;

    runBefore: RunBeforeMethod<this>;
    runAfter: RunAfterMethod<this>;

    onBuild: OnBuildMethod<this>;
    onBuildKnex: OnBuildKnexMethod<this>;
    onError: OnErrorMethod<this>;

    insertGraph: InsertGraphMethod;
    insertGraphAndFetch: InsertGraphMethod;
    insertWithRelated: InsertGraphMethod;
    insertWithRelatedAndFetch: InsertGraphMethod;

    upsertGraph: UpsertGraphMethod;
    upsertGraphAndFetch: UpsertGraphMethod;

    eagerAlgorithm: EagerAlgorithmMethod<this>;
    eagerOptions: EagerOptionsMethod<this>;
    modifyEager: ModifyEagerMethod<this>;

    context: ContextMethod<this>;
    mergeContext: ContextMethod<this>;

    isFind: BooleanReturningMethod;
    isInsert: BooleanReturningMethod;
    isUpdate: BooleanReturningMethod;
    isDelete: BooleanReturningMethod;
    isRelate: BooleanReturningMethod;
    isUnrelate: BooleanReturningMethod;
    hasWheres: BooleanReturningMethod;
    hasSelects: BooleanReturningMethod;
    hasEager: BooleanReturningMethod;

    ModelType: M;
    ResultType: R;

    ArrayQueryBuilderType: QueryBuilder<M, M[]>;
    SingleQueryBuilderType: QueryBuilder<M, M>;
    NumberQueryBuilderType: QueryBuilder<M, number>;
    PageQueryBuilderType: QueryBuilder<M, Page<M>>;
  }

  interface StaticQueryMethod {
    <M extends Model>(this: ModelClass<M>, trxOrKnex?: Transaction | knex): M['QueryBuilderType'];
  }

  interface QueryMethod {
    <M extends Model>(this: M, trxOrKnex?: Transaction | knex): SingleQueryBuilder<
      M['QueryBuilderType']
    >;
  }

  type RelatedQueryBuilder<T> = T extends Model
    ? SingleQueryBuilder<T['QueryBuilderType']>
    : T extends Array<infer I>
    ? (I extends Model ? I['QueryBuilderType'] : never)
    : never;

  interface RelatedQueryMethod<M extends Model> {
    <K extends keyof M>(relationName: K, trxOrKnex?: Transaction | knex): RelatedQueryBuilder<M[K]>;
    <RM extends Model>(
      relationName: string,
      trxOrKnex?: Transaction | knex
    ): RM['QueryBuilderType'];
  }

  interface LoadRelatedMethod<M extends Model> {
    (
      expression: RelationExpression<M>,
      modifiers?: Modifiers<M['QueryBuilderType']>,
      trxOrKnex?: Transaction | knex
    ): SingleQueryBuilder<M['QueryBuilderType']>;
  }

  interface StaticLoadRelatedMethod {
    <M extends Model>(
      this: ModelClass<M>,
      modelOrObject: PartialModelObject<M>,
      expression: RelationExpression<M>,
      modifiers?: Modifiers<M['QueryBuilderType']>,
      trxOrKnex?: Transaction | knex
    ): SingleQueryBuilder<M['QueryBuilderType']>;

    <M extends Model>(
      this: ModelClass<M>,
      modelOrObject: PartialModelObject<M>[],
      expression: RelationExpression<M>,
      modifiers?: Modifiers<M['QueryBuilderType']>,
      trxOrKnex?: Transaction | knex
    ): M['QueryBuilderType'];
  }

  interface IdMethod {
    (id: any): void;
    (): any;
  }

  export interface Transaction extends knex {
    savepoint(transactionScope: (trx: Transaction) => any): Promise<any>;
    commit<QM>(value?: any): Promise<QM>;
    rollback<QM>(error?: Error): Promise<QM>;
  }

  export interface RelationMappings {
    [relationName: string]: RelationMapping;
  }

  type ModelClassFactory = () => AnyModelClass;
  type ModelClassSpecifier = ModelClassFactory | AnyModelClass | string;
  type RelationMappingHook = (model: Model, context: QueryContext) => Promise<void> | void;
  type RelationMappingColumnRef = string | ReferenceBuilder | (string | ReferenceBuilder)[];

  export interface RelationMapping<M extends Model = Model> {
    relation: Relation;
    modelClass: ModelClassSpecifier;
    join: RelationJoin;
    modify?: Modifier<M['QueryBuilderType']>;
    filter?: Modifier<M['QueryBuilderType']>;
    beforeInsert?: RelationMappingHook;
  }

  export interface RelationJoin {
    from: RelationMappingColumnRef;
    to: RelationMappingColumnRef;
    through?: RelationThrough;
  }

  export interface RelationThrough {
    from: RelationMappingColumnRef;
    to: RelationMappingColumnRef;
    extra?: string[] | object;
    modelClass?: ModelClassSpecifier;
    beforeInsert?: RelationMappingHook;
  }

  export interface Relation {}

  export interface QueryContext {
    transaction: Transaction;
    [key: string]: any;
  }

  export interface ModelOptions {
    patch?: boolean;
    skipValidation?: boolean;
    old?: object;
  }

  export interface CloneOptions {
    shallow?: boolean;
  }

  export interface ToJsonOptions extends CloneOptions {
    virtuals?: boolean | string[];
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

  export interface SnakeCaseMappersOptions {
    upperCase?: boolean;
    underscoreBeforeDigits?: boolean;
  }

  export interface ColumnNameMappers {
    parse(json: Pojo): Pojo;
    format(json: Pojo): Pojo;
  }

  export interface SnakeCaseMappersFactory {
    (options?: SnakeCaseMappersOptions): ColumnNameMappers;
  }

  export interface KnexMappers {
    wrapIdentifier(identifier: string, origWrap: Identity<string>): string;
    postProcessResponse(response: any): any;
  }

  export interface KnexSnakeCaseMappersFactory {
    (options?: SnakeCaseMappersOptions): KnexMappers;
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

  interface BindKnexMethod {
    <M>(this: M, trxOrKnex: Transaction | knex): M;
  }

  interface FromJsonMethod {
    <M extends Model>(this: ModelClass<M>, json: object): M;
  }

  export interface ModelClass<M> {
    new (): M;
  }

  export class Model {
    static tableName: string;
    static idColumn: string | string[];

    static BelongsToOneRelation: Relation;
    static HasOneRelation: Relation;
    static HasManyRelation: Relation;
    static ManyToManyRelation: Relation;
    static HasOneThroughRelation: Relation;

    static WhereInEagerAlgorithm: EagerAlgorithm;
    static NaiveEagerAlgorithm: EagerAlgorithm;
    static JoinEagerAlgorithm: EagerAlgorithm;

    static query: StaticQueryMethod;
    static relatedQuery: RelatedQueryMethod<Model>;
    static columnNameMappers: ColumnNameMappers;
    static relationMappings: RelationMappings | (() => RelationMappings);

    static fromJson: FromJsonMethod;
    static fromDatabaseJson: FromJsonMethod;

    static createValidationError(args: CreateValidationErrorArgs): Error;
    static tableMetadata(opt?: TableMetadataOptions): TableMetadata;
    static fetchTableMetadata(opt?: FetchTableMetadataOptions): Promise<TableMetadata>;

    static bindKnex: BindKnexMethod;
    static bindTransaction: BindKnexMethod;
    static loadRelated: StaticLoadRelatedMethod;
    static raw: RawFunction;

    $query: QueryMethod;
    $relatedQuery: RelatedQueryMethod<this>;
    $id: IdMethod;
    $loadRelated: LoadRelatedMethod<this>;

    $formatDatabaseJson(json: Pojo): Pojo;
    $parseDatabaseJson(json: Pojo): Pojo;

    $formatJson(json: Pojo): Pojo;
    $parseJson(json: Pojo, opt?: ModelOptions): Pojo;

    $toDatabaseJson(): Pojo;
    $toJson(opt?: ToJsonOptions): Pojo;
    toJSON(opt?: ToJsonOptions): Pojo;

    $setJson(json: object, opt?: ModelOptions): this;
    $setDatabaseJson(json: object): this;

    $setRelated<RM extends Model>(
      relation: String | Relation,
      related: RM | RM[] | null | undefined
    ): this;

    $appendRelated<RM extends Model>(
      relation: String | Relation,
      related: RM | RM[] | null | undefined
    ): this;

    $set(obj: Pojo): this;
    $omit(keys: string | string[] | { [key: string]: boolean }): this;
    $pick(keys: string | string[] | { [key: string]: boolean }): this;
    $clone(opt?: CloneOptions): this;

    QueryBuilderType: QueryBuilder<this, this[]>;
  }

  export interface transaction<T> {}

  export const transaction: transaction<any>;
}
