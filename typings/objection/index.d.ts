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

import * as ajv from 'ajv';
import * as dbErrors from 'db-errors';
import * as knex from 'knex';

export = Objection;

declare namespace Objection {
  const raw: RawFunction;
  // Deprecated
  const lit: ValueFunction;
  const val: ValueFunction;
  const ref: ReferenceFunction;
  const fn: FunctionFunction;

  const compose: ComposeFunction;
  const mixin: MixinFunction;

  const snakeCaseMappers: SnakeCaseMappersFactory;
  const knexSnakeCaseMappers: KnexSnakeCaseMappersFactory;

  const transaction: transaction;

  const DBError: typeof dbErrors.DBError;
  const DataError: typeof dbErrors.DataError;
  const CheckViolationError: typeof dbErrors.CheckViolationError;
  const UniqueViolationError: typeof dbErrors.UniqueViolationError;
  const ConstraintViolationError: typeof dbErrors.ConstraintViolationError;
  const ForeignKeyViolationError: typeof dbErrors.ForeignKeyViolationError;

  export interface RawBuilder extends Aliasable {}

  export interface RawFunction extends RawInterface<RawBuilder> {}
  export interface RawInterface<R> {
    (sql: string, ...bindings: any[]): R;
  }

  export interface ValueBuilder extends Castable {}
  export interface ValueFunction {
    (
      value: PrimitiveValue | PrimitiveValue[] | PrimitiveValueObject | PrimitiveValueObject[]
    ): ValueBuilder;
  }

  export interface ReferenceBuilder extends Castable {}
  export interface ReferenceFunction {
    (expression: string): ReferenceBuilder;
  }

  export interface FunctionBuilder extends Castable {}
  export interface SqlFunctionShortcut {
    (...args: any[]): FunctionBuilder;
  }
  export interface FunctionFunction {
    (functionName: string, ...arguments: any[]): FunctionBuilder;

    now(precision: number): FunctionBuilder;
    now(): FunctionBuilder;

    coalesce: SqlFunctionShortcut;
    concat: SqlFunctionShortcut;
    sum: SqlFunctionShortcut;
    avg: SqlFunctionShortcut;
    min: SqlFunctionShortcut;
    max: SqlFunctionShortcut;
    count: SqlFunctionShortcut;
    upper: SqlFunctionShortcut;
    lower: SqlFunctionShortcut;
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
  type NonPrimitiveValue = Raw | ReferenceBuilder | ValueBuilder | AnyQueryBuilder;
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
    | ((qb: QB, ...args: any[]) => void)
    | string
    | object;
  type OrderByDirection = 'asc' | 'desc' | 'ASC' | 'DESC';

  interface Modifiers<QB extends AnyQueryBuilder = AnyQueryBuilder> {
    [key: string]: Modifier<QB>;
  }

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
      : (T[K] | NonPrimitiveValue);
  };

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
      : (T[K] | NonPrimitiveValue);
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
   * Extracts the property names (excluding relations) of a model class.
   */
  type ModelProps<T extends Model> = Exclude<
    {
      [K in keyof T]?: Exclude<T[K], undefined> extends Model
        ? never
        : Exclude<T[K], undefined> extends Array<infer I>
        ? (I extends Model ? never : K)
        : T[K] extends Function
        ? never
        : K;
    }[keyof T],
    undefined | 'QueryBuilderType'
  >;

  /**
   * Extracts the relation names of the a model class.
   */
  type ModelRelations<T extends Model> = Exclude<
    {
      [K in keyof T]?: Exclude<T[K], undefined> extends Model
        ? K
        : Exclude<T[K], undefined> extends Array<infer I>
        ? (I extends Model ? K : never)
        : never;
    }[keyof T],
    undefined
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
    // These must come first so that we get autocomplete.
    <QBP extends QB>(...columns: ModelProps<ModelType<QBP>>[]): QB;
    <QBP extends QB>(columns: ModelProps<ModelType<QBP>>[]): QB;

    <QBP extends QB>(...columns: Selection<QBP>[]): QB;
    <QBP extends QB>(columns: Selection<QBP>[]): QB;

    // Allows things like `select(1)`, not sure if we should be more specific here?
    <QBP extends QB>(...args: any[]): QB;
  }

  interface AsMethod<QB extends AnyQueryBuilder> {
    (alias: string): QB;
  }

  interface FromMethod<QB extends AnyQueryBuilder> {
    (table: string): QB;
    (cb: CallbackVoid<QB>): QB;
    (raw: Raw): QB;
    <QBP extends AnyQueryBuilder>(qb: QBP): QB;
  }

  interface WhereMethod<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, op: Operator, value: Value): QB;
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, value: Value): QB;

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
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, value: Value): QB;
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, cb: CallbackVoid<QB>): QB;
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, qb: AnyQueryBuilder): QB;

    (col: ColumnRef | ColumnRef[], value: Value[]): QB;
    (col: ColumnRef | ColumnRef[], cb: CallbackVoid<QB>): QB;
    (col: ColumnRef | ColumnRef[], qb: AnyQueryBuilder): QB;
  }

  interface WhereBetweenMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, range: [Value, Value]): QB;
  }

  interface WhereNullMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef): QB;
  }

  interface WhereColumnMethod<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(col1: ModelProps<ModelType<QBP>>, op: Operator, col2: ColumnRef): QB;
    <QBP extends QB>(col1: ModelProps<ModelType<QBP>>, col2: ColumnRef): QB;

    (col1: ColumnRef, op: Operator, col2: ColumnRef): QB;
    (col1: ColumnRef, col2: ColumnRef): QB;
  }

  interface WhereJson<QB extends AnyQueryBuilder> {
    (
      fieldExpression: FieldExpression,
      jsonObjectOrFieldExpression: JsonObjectOrFieldExpression
    ): QB;
  }

  interface WhereFieldExpression<QB extends AnyQueryBuilder> {
    (fieldExpression: FieldExpression): QB;
  }

  interface WhereJsonExpression<QB extends AnyQueryBuilder> {
    (fieldExpression: FieldExpression, keys: string | string[]): QB;
  }

  interface WhereJsonField<QB extends AnyQueryBuilder> {
    (
      fieldExpression: FieldExpression,
      operator: string,
      value: boolean | number | string | null
    ): QB;
  }

  interface WhereCompositeMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, value: Value): QB;
    (column: ColumnRef, op: Operator, value: Value): QB;
    (column: ColumnRef[], value: Value[]): QB;
    (column: ColumnRef[], qb: AnyQueryBuilder): QB;
  }

  interface WhereInCompositeMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, value: Value[]): QB;
    (column: ColumnRef, qb: AnyQueryBuilder): QB;
    (column: ColumnRef[], value: Value[][]): QB;
    (column: ColumnRef[], qb: AnyQueryBuilder): QB;
  }

  type QBOrCallback<QB extends AnyQueryBuilder> = AnyQueryBuilder | CallbackVoid<QB>;

  interface BaseSetOperations<QB extends AnyQueryBuilder> {
    (callbackOrBuilder: QBOrCallback<QB>, wrap?: boolean): QB;
    (callbacksOrBuilders: QBOrCallback<QB>[], wrap?: boolean): QB;
  }

  interface SetOperations<QB extends AnyQueryBuilder> extends BaseSetOperations<QB> {
    (...callbacksOrBuilders: QBOrCallback<QB>[]): QB;
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

  interface WithMethod<QB extends AnyQueryBuilder> {
    (alias: string, expr: CallbackVoid<QB> | AnyQueryBuilder | Raw): QB;
  }

  interface WithRawMethod<QB extends AnyQueryBuilder> {
    (alias: string, sql: string, ...bindings: any[]): QB;
    (alias: string, sql: string, bindings: any[]): QB;
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

  interface AggregateMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef): QB;
  }

  interface CountMethod<QB extends AnyQueryBuilder> {
    (column?: ColumnRef, options?: { as: string }): QB;
    (aliasToColumnDict: { [alias: string]: string | string[] }): QB;
    (...columns: ColumnRef[]): QB;
  }

  interface GroupByMethod<QB extends AnyQueryBuilder> {
    (...columns: ColumnRef[]): QB;
    (columns: ColumnRef[]): QB;
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

  interface RelateMethod<QB extends AnyQueryBuilder> {
    <RelatedModel extends Model>(
      ids: MaybeCompositeId | Partial<RelatedModel> | Partial<RelatedModel>[]
    ): NumberQueryBuilder<QB>;

    <RelatedModel extends Model>(
      ids: MaybeCompositeId | Partial<RelatedModel> | Partial<RelatedModel>[]
    ): NumberQueryBuilder<QB>;
  }

  interface UnrelateMethod<QB extends AnyQueryBuilder> {
    (): NumberQueryBuilder<QB>;
  }

  type ForIdValue = MaybeCompositeId | AnyQueryBuilder;

  interface ForMethod<QB extends AnyQueryBuilder> {
    (ids: ForIdValue | ForIdValue[]): QB;
  }

  interface WithGraphFetchedMethod<QB extends AnyQueryBuilder> {
    (expr: RelationExpression<ModelType<QB>>, options?: GraphOptions): QB;
  }

  interface WithGraphJoinedMethod<QB extends AnyQueryBuilder> {
    (expr: RelationExpression<ModelType<QB>>, options?: GraphOptions): QB;
  }

  // Deprecated
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

  interface ColumnInfoMethod<QB extends AnyQueryBuilder> {
    (): Promise<knex.ColumnInfo>;
  }

  interface TableRefForMethod {
    (modelClass: typeof Model): string;
  }

  interface AliasForMethod<QB extends AnyQueryBuilder> {
    (modelClassOrTableName: string | ModelClass<any>, alias: string): QB;
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

  interface TimeoutOptions {
    cancel: boolean;
  }

  interface TimeoutMethod<QB extends AnyQueryBuilder> {
    (ms: number, options?: TimeoutOptions): QB;
  }

  // Deprecated
  interface PickMethod<QB extends AnyQueryBuilder> {
    (modelClass: typeof Model, properties: string[]): QB;
    (properties: string[]): QB;
  }

  // Deprecated
  interface OmitMethod<QB extends AnyQueryBuilder> {
    (modelClass: typeof Model, properties: string[]): QB;
    (properties: string[]): QB;
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

  interface OffsetMethod<QB extends AnyQueryBuilder> {
    (offset: number): PageQueryBuilder<QB>;
  }

  interface LimitMethod<QB extends AnyQueryBuilder> {
    (limit: number): PageQueryBuilder<QB>;
  }

  interface ResultSizeMethod {
    (): Promise<number>;
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
    allowRefs?: boolean;
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
    allowRefs?: boolean;
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

  // Deprecated
  export interface EagerAlgorithm {}

  // Deprecated
  interface EagerAlgorithmMethod<QB extends AnyQueryBuilder> {
    (algorithm: EagerAlgorithm): QB;
  }

  // Deprecated
  export interface EagerOptions {
    minimize?: boolean;
    separator?: string;
    aliases?: string[];
    joinOperation: string;
  }

  export interface GraphOptions {
    minimize?: boolean;
    separator?: string;
    aliases?: string[];
    joinOperation: string;
    maxBatchSize?: number;
  }

  // Deprecated
  interface EagerOptionsMethod<QB extends AnyQueryBuilder> {
    (options: EagerOptions): QB;
  }

  interface ModifyGraphMethod<QB extends AnyQueryBuilder> {
    <M extends Model>(
      expr: RelationExpression<ModelType<QB>>,
      modifier: Modifier<M['QueryBuilderType']>
    ): QB;
  }

  interface ContextMethod<QB extends AnyQueryBuilder> {
    (context: object): QB;
    (): QueryContext;
  }

  interface ModifyMethod<QB extends AnyQueryBuilder> {
    (modifier: Modifier<QB> | Modifier<QB>[], ...args: any[]): QB;
  }

  // Deprecated
  interface ApplyFilterMethod<QB extends AnyQueryBuilder> {
    (...filters: string[]): QB;
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
    as: AsMethod<this>;

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
    orWhereBetween: WhereBetweenMethod<this>;
    andWhereBetween: WhereBetweenMethod<this>;
    whereNotBetween: WhereBetweenMethod<this>;
    orWhereNotBetween: WhereBetweenMethod<this>;
    andWhereNotBetween: WhereBetweenMethod<this>;

    whereNull: WhereNullMethod<this>;
    orWhereNull: WhereNullMethod<this>;
    whereNotNull: WhereNullMethod<this>;
    orWhereNotNull: WhereNullMethod<this>;

    whereColumn: WhereColumnMethod<this>;
    orWhereColumn: WhereColumnMethod<this>;
    andWhereColumn: WhereColumnMethod<this>;
    whereNotColumn: WhereColumnMethod<this>;
    orWhereNotColumn: WhereColumnMethod<this>;
    andWhereNotColumn: WhereColumnMethod<this>;

    whereJsonSupersetOf: WhereJson<this>;
    orWhereJsonSupersetOf: WhereJson<this>;
    whereJsonNotSupersetOf: WhereJson<this>;
    orWhereJsonNotSupersetOf: WhereJson<this>;
    whereJsonSubsetOf: WhereJson<this>;
    orWhereJsonSubsetOf: WhereJson<this>;
    whereJsonNotSubsetOf: WhereJson<this>;
    orWhereJsonNotSubsetOf: WhereJson<this>;
    whereJsonIsArray: WhereFieldExpression<this>;
    orWhereJsonIsArray: WhereFieldExpression<this>;
    whereJsonNotArray: WhereFieldExpression<this>;
    orWhereJsonNotArray: WhereFieldExpression<this>;
    whereJsonIsObject: WhereFieldExpression<this>;
    orWhereJsonIsObject: WhereFieldExpression<this>;
    whereJsonNotObject: WhereFieldExpression<this>;
    orWhereJsonNotObject: WhereFieldExpression<this>;
    whereJsonHasAny: WhereJsonExpression<this>;
    orWhereJsonHasAny: WhereJsonExpression<this>;
    whereJsonHasAll: WhereJsonExpression<this>;
    orWhereJsonHasAll: WhereJsonExpression<this>;

    having: WhereMethod<this>;
    andHaving: WhereMethod<this>;
    orHaving: WhereMethod<this>;
    havingRaw: WhereMethod<this>;
    orHavingRaw: WhereMethod<this>;
    havingIn: WhereMethod<this>;
    orHavingIn: WhereMethod<this>;
    havingNotIn: WhereMethod<this>;
    orHavingNotIn: WhereMethod<this>;
    havingNull: WhereMethod<this>;
    orHavingNull: WhereMethod<this>;
    havingNotNull: WhereMethod<this>;
    orHavingNotNull: WhereMethod<this>;
    havingExists: WhereMethod<this>;
    orHavingExists: WhereMethod<this>;
    havingNotExists: WhereMethod<this>;
    orHavingNotExists: WhereMethod<this>;
    havingBetween: WhereMethod<this>;
    orHavingBetween: WhereMethod<this>;
    havingNotBetween: WhereMethod<this>;
    orHavingNotBetween: WhereMethod<this>;

    whereComposite: WhereCompositeMethod<this>;
    whereInComposite: WhereInCompositeMethod<this>;

    union: UnionMethod<this>;
    unionAll: UnionMethod<this>;
    intersect: SetOperations<this>;

    with: WithMethod<this>;
    withRaw: WithRawMethod<this>;
    withWrapped: WithMethod<this>;

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
    countDistinct: CountMethod<this>;
    min: AggregateMethod<this>;
    max: AggregateMethod<this>;
    sum: AggregateMethod<this>;
    sumDistinct: AggregateMethod<this>;
    avg: AggregateMethod<this>;
    avgDistinct: AggregateMethod<this>;
    increment: IncrementDecrementMethod<this>;
    decrement: IncrementDecrementMethod<this>;

    findById: FindByIdMethod<this>;
    findByIds: FindByIdsMethod<this>;
    findOne: FindOneMethod<this>;

    first: FirstMethod<this>;

    orderBy: OrderByMethod<this>;
    orderByRaw: OrderByRawMethod<this>;

    groupBy: GroupByMethod<this>;
    groupByRaw: RawInterface<this>;

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

    relate: RelateMethod<this>;
    unrelate: UnrelateMethod<this>;
    for: ForMethod<this>;

    withGraphFetched: WithGraphFetchedMethod<this>;
    withGraphJoined: WithGraphJoinedMethod<this>;

    // Deprecated
    eager: EagerMethod<this>;
    // Deprecated
    mergeEager: EagerMethod<this>;

    // Deprecated
    joinEager: EagerMethod<this>;
    // Deprecated
    mergeJoinEager: EagerMethod<this>;

    // Deprecated
    naiveEager: EagerMethod<this>;
    // Deprecated
    mergeNaiveEager: EagerMethod<this>;

    // Deprecated
    allowEager: AllowGraphMethod<this>;
    // Deprecated
    mergeAllowEager: AllowGraphMethod<this>;

    allowGraph: AllowGraphMethod<this>;
    // Deprecated
    allowInsert: AllowGraphMethod<this>;
    // Deprecated
    allowUpsert: AllowGraphMethod<this>;

    throwIfNotFound: IdentityMethod<this>;
    returning: ReturningMethod;
    forUpdate: IdentityMethod<this>;
    forShare: IdentityMethod<this>;
    skipUndefined: IdentityMethod<this>;
    debug: IdentityMethod<this>;
    alias: OneArgMethod<string, this>;
    aliasFor: AliasForMethod<this>;
    withSchema: OneArgMethod<string, this>;
    modelClass: ModelClassMethod;
    tableNameFor: TableRefForMethod;
    tableRefFor: TableRefForMethod;
    toSql: StringReturningMethod;
    toString: StringReturningMethod;
    reject: OneArgMethod<any, this>;
    resolve: OneArgMethod<any, this>;
    transacting: OneArgMethod<knex | Transaction, this>;
    connection: OneArgMethod<knex | Transaction, this>;
    timeout: TimeoutMethod<this>;
    clone: IdentityMethod<this>;
    columnInfo: ColumnInfoMethod<this>;

    // Deprecated
    pluck: OneArgMethod<string, this>;
    // Deprecated
    pick: PickMethod<this>;
    // Deprecated
    omit: OmitMethod<this>;
    // Deprecated
    traverse: TraverseMethod<this>;

    page: PageMethod<this>;
    range: RangeMethod<this>;
    offset: OffsetMethod<this>;
    limit: LimitMethod<this>;
    resultSize: ResultSizeMethod;

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

    // Deprecated
    eagerAlgorithm: EagerAlgorithmMethod<this>;
    // Deprecated
    eagerOptions: EagerOptionsMethod<this>;
    // Deprecated
    modifyEager: ModifyGraphMethod<this>;
    // Deprecated
    filterEager: ModifyGraphMethod<this>;
    modifyGraph: ModifyGraphMethod<this>;

    context: ContextMethod<this>;
    mergeContext: ContextMethod<this>;

    modify: ModifyMethod<this>;
    // Deprecated
    applyFilter: ApplyFilterMethod<this>;

    isFind: BooleanReturningMethod;
    isExecutable: BooleanReturningMethod;
    isInsert: BooleanReturningMethod;
    isUpdate: BooleanReturningMethod;
    isDelete: BooleanReturningMethod;
    isRelate: BooleanReturningMethod;
    isUnrelate: BooleanReturningMethod;
    hasWheres: BooleanReturningMethod;
    hasSelects: BooleanReturningMethod;
    // Deprecated
    hasEager: BooleanReturningMethod;
    hasWithGraph: BooleanReturningMethod;

    clearSelect: IdentityMethod<this>;
    clearOrder: IdentityMethod<this>;
    clearWhere: IdentityMethod<this>;
    clearWithGraph: IdentityMethod<this>;
    clearAllowGraph: IdentityMethod<this>;
    // Deprecated
    clearEager: IdentityMethod<this>;

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

  type ArrayRelatedQueryBuilder<T> = T extends Model
    ? T['QueryBuilderType']
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

  interface StaticRelatedQueryMethod {
    <M extends Model, K extends keyof M>(
      this: ModelClass<M>,
      relationName: K,
      trxOrKnex?: Transaction | knex
    ): ArrayRelatedQueryBuilder<M[K]>;

    <RM extends Model>(
      relationName: string,
      trxOrKnex?: Transaction | knex
    ): RM['QueryBuilderType'];
  }

  // Deprecated
  interface LoadRelatedMethod<M extends Model> {
    (
      expression: RelationExpression<M>,
      modifiers?: Modifiers<M['QueryBuilderType']>,
      trxOrKnex?: Transaction | knex
    ): SingleQueryBuilder<M['QueryBuilderType']>;
  }

  interface FetchGraphMethod<M extends Model> {
    (expression: RelationExpression<M>, options?: FetchGraphOptions): SingleQueryBuilder<
      M['QueryBuilderType']
    >;
  }

  interface FetchGraphOptions {
    transaction?: Transaction | knex;
  }

  // Deprecated
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

  interface StaticFetchGraphMethod {
    <M extends Model>(
      this: ModelClass<M>,
      modelOrObject: PartialModelObject<M>,
      expression: RelationExpression<M>,
      options?: FetchGraphOptions
    ): SingleQueryBuilder<M['QueryBuilderType']>;

    <M extends Model>(
      this: ModelClass<M>,
      modelOrObject: PartialModelObject<M>[],
      expression: RelationExpression<M>,
      options?: FetchGraphOptions
    ): M['QueryBuilderType'];
  }

  interface TraverserFunction {
    (model: Model, parentModel: Model, relationName: string): void;
  }

  interface StaticTraverseMethod {
    (filterConstructor: typeof Model, models: Model | Model[], traverser: TraverserFunction): void;
    (models: Model | Model[], traverser: TraverserFunction): void;
  }

  interface TraverseMethod<R> {
    (filterConstructor: typeof Model, traverser: TraverserFunction): R;
    (traverser: TraverserFunction): R;
  }

  interface IdMethod {
    (id: any): void;
    (): any;
  }

  export type Transaction = knex.Transaction;

  export interface RelationMappings {
    [relationName: string]: RelationMapping;
  }

  type ModelClassFactory = () => AnyModelClass;
  type ModelClassSpecifier = ModelClassFactory | AnyModelClass | string;
  type RelationMappingHook = (model: Model, context: QueryContext) => Promise<void> | void;
  type RelationMappingColumnRef = string | ReferenceBuilder | (string | ReferenceBuilder)[];

  export interface RelationMapping<M extends Model = Model> {
    relation: RelationType;
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

  export interface RelationType extends Constructor<Relation> {}

  export interface Relation {
    name: string;
    ownerModelClass: typeof Model;
    relatedModelClass: typeof Model;
    ownerProp: RelationProperty;
    relatedProp: RelationProperty;
    joinModelClass: typeof Model;
    joinTable: string;
    joinTableOwnerProp: RelationProperty;
    joinTableRelatedProp: RelationProperty;
  }

  export interface RelationProperty {
    size: number;
    modelClass: typeof Model;
    props: string[];
    cols: string[];
  }

  export interface Relations {
    [name: string]: Relation;
  }

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

  interface TransactionMethod {
    <T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
    <T>(trxOrKnex: Transaction | knex, callback: (trx: Transaction) => Promise<T>): Promise<T>;
  }

  interface BindKnexMethod {
    <M>(this: M, trxOrKnex: Transaction | knex): M;
  }

  interface FromJsonMethod {
    <M extends Model>(this: ModelClass<M>, json: object): M;
  }

  export interface Constructor<T> {
    new (): T;
  }

  export interface ModelClass<M> extends Constructor<M> {}

  export class Model {
    static tableName: string;
    static idColumn: string | string[];
    static jsonSchema: JSONSchema;
    static modelPaths: string[];
    static jsonAttributes: string[];
    static virtualAttributes: string[];
    static uidProp: string;
    static uidRefProp: string;
    static dbRefProp: string;
    static propRefRegex: RegExp;
    static pickJsonSchemaProperties: boolean;
    static relatedFindQueryMutates: boolean;
    static relatedInsertQueryMutates: boolean;
    static modifiers: Modifiers;

    static QueryBuilder: typeof QueryBuilder;

    static raw: RawFunction;
    static ref: ReferenceFunction;
    static fn: knex.FunctionHelper;

    static BelongsToOneRelation: RelationType;
    static HasOneRelation: RelationType;
    static HasManyRelation: RelationType;
    static ManyToManyRelation: RelationType;
    static HasOneThroughRelation: RelationType;

    static defaultGraphOptions?: GraphOptions;
    // Deprecated
    static defaultEagerAlgorithm?: EagerAlgorithm;
    // Deprecated
    static defaultEagerOptions?: EagerOptions;

    // Deprecated
    static WhereInEagerAlgorithm: EagerAlgorithm;
    // Deprecated
    static NaiveEagerAlgorithm: EagerAlgorithm;
    // Deprecated
    static JoinEagerAlgorithm: EagerAlgorithm;

    static query: StaticQueryMethod;
    static relatedQuery: StaticRelatedQueryMethod;
    static columnNameMappers: ColumnNameMappers;
    static relationMappings: RelationMappings | (() => RelationMappings);

    static fromJson: FromJsonMethod;
    static fromDatabaseJson: FromJsonMethod;

    static createValidator(): Validator;
    static createValidationError(args: CreateValidationErrorArgs): Error;
    static createNotFoundError(): Error;

    static tableMetadata(opt?: TableMetadataOptions): TableMetadata;
    static fetchTableMetadata(opt?: FetchTableMetadataOptions): Promise<TableMetadata>;

    static knex(knex?: knex): knex;
    static knexQuery(): knex.QueryBuilder;
    static startTransaction(knexOrTransaction?: Transaction | knex): Transaction;
    static transaction: TransactionMethod;

    static bindKnex: BindKnexMethod;
    static bindTransaction: BindKnexMethod;

    // Deprecated
    static loadRelated: StaticLoadRelatedMethod;
    static fetchGraph: StaticFetchGraphMethod;

    static getRelations(): Relations;
    static getRelation(name: string): Relation;

    static traverse: StaticTraverseMethod;

    $query: QueryMethod;
    $relatedQuery: RelatedQueryMethod<this>;
    $id: IdMethod;
    // Deprecated
    $loadRelated: LoadRelatedMethod<this>;
    $fetchGraph: FetchGraphMethod<this>;

    $formatDatabaseJson(json: Pojo): Pojo;
    $parseDatabaseJson(json: Pojo): Pojo;

    $formatJson(json: Pojo): Pojo;
    $parseJson(json: Pojo, opt?: ModelOptions): Pojo;

    $beforeValidate(jsonSchema: JSONSchema, json: Pojo, opt: ModelOptions): JSONSchema;
    $validate(json: Pojo, opt: ModelOptions): Pojo; // may throw ValidationError if validation fails
    $afterValidate(json: Pojo, opt: ModelOptions): void; // may throw ValidationError if validation fails

    $beforeInsert(queryContext: QueryContext): Promise<any> | void;
    $afterInsert(queryContext: QueryContext): Promise<any> | void;
    $afterUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<any> | void;
    $beforeUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<any> | void;
    $afterGet(queryContext: QueryContext): Promise<any> | void;
    $beforeDelete(queryContext: QueryContext): Promise<any> | void;
    $afterDelete(queryContext: QueryContext): Promise<any> | void;

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
    $traverse: TraverseMethod<void>;

    $knex(): knex;
    $transaction(): knex;

    QueryBuilderType: QueryBuilder<this, this[]>;
  }

  /**
   * Overloading is required here until the following issues (at least) are resolved:
   *
   * - https://github.com/microsoft/TypeScript/issues/1360
   * - https://github.com/Microsoft/TypeScript/issues/5453
   *
   * @tutorial https://vincit.github.io/objection.js/guide/transactions.html#creating-a-transaction
   */
  export interface transaction {
    start(knexOrModel: knex | ModelClass<any>): Promise<Transaction>;

    <MC1 extends ModelClass<any>, ReturnValue>(
      modelClass1: MC1,
      callback: (boundModelClass: MC1, trx?: Transaction) => Promise<ReturnValue>
    ): Promise<ReturnValue>;

    <MC1 extends ModelClass<any>, MC2 extends ModelClass<any>, ReturnValue>(
      modelClass1: MC1,
      modelClass2: MC2,
      callback: (
        boundModelClass1: MC1,
        boundModelClass2: MC2,
        trx?: Transaction
      ) => Promise<ReturnValue>
    ): Promise<ReturnValue>;

    <
      MC1 extends ModelClass<any>,
      MC2 extends ModelClass<any>,
      MC3 extends ModelClass<any>,
      ReturnValue
    >(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      callback: (
        boundModelClass1: MC1,
        boundModelClass2: MC2,
        boundModelClass3: MC3,
        trx?: Transaction
      ) => Promise<ReturnValue>
    ): Promise<ReturnValue>;

    <
      MC1 extends ModelClass<any>,
      MC2 extends ModelClass<any>,
      MC3 extends ModelClass<any>,
      MC4 extends ModelClass<any>,
      ReturnValue
    >(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      modelClass4: MC4,
      callback: (
        boundModelClass1: MC1,
        boundModelClass2: MC2,
        boundModelClass3: MC3,
        boundModelClass4: MC4,
        trx?: Transaction
      ) => Promise<ReturnValue>
    ): Promise<ReturnValue>;

    <
      MC1 extends ModelClass<any>,
      MC2 extends ModelClass<any>,
      MC3 extends ModelClass<any>,
      MC4 extends ModelClass<any>,
      MC5 extends ModelClass<any>,
      ReturnValue
    >(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      modelClass4: MC4,
      modelClass5: MC5,
      callback: (
        boundModelClass1: MC1,
        boundModelClass2: MC2,
        boundModelClass3: MC3,
        boundModelClass4: MC4,
        boundModelClass5: MC5,
        trx?: Transaction
      ) => Promise<ReturnValue>
    ): Promise<ReturnValue>;

    <ReturnValue>(knex: knex, callback: (trx: Transaction) => Promise<ReturnValue>): Promise<
      ReturnValue
    >;
  }

  /**
   * JSON Schema 7
   * Draft 07
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01
   *
   * These definitions were written by
   *
   * Boris Cherny https://github.com/bcherny,
   * Cyrille Tuzi https://github.com/cyrilletuzi,
   * Lucian Buzzo https://github.com/lucianbuzzo,
   * Roland Groza https://github.com/rolandjitsu.
   *
   * https://www.npmjs.com/package/@types/json-schema
   */

  /**
   * Primitive type
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1.1
   */
  export type JSONSchemaTypeName =
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null';
  export type JSONSchemaType = JSONSchemaArray[] | boolean | number | null | object | string;

  // Workaround for infinite type recursion
  // https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
  export interface JSONSchemaArray extends Array<JSONSchemaType> {}

  /**
   * Meta schema
   *
   * Recommended values:
   * - 'http://json-schema.org/schema#'
   * - 'http://json-schema.org/hyper-schema#'
   * - 'http://json-schema.org/draft-07/schema#'
   * - 'http://json-schema.org/draft-07/hyper-schema#'
   *
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-5
   */
  export type JSONSchemaVersion = string;

  /**
   * JSON Schema v7
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01
   */
  export type JSONSchemaDefinition = JSONSchema | boolean;
  export interface JSONSchema {
    $id?: string;
    $ref?: string;
    $schema?: JSONSchemaVersion;
    $comment?: string;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1
     */
    type?: JSONSchemaTypeName | JSONSchemaTypeName[];
    enum?: JSONSchemaType[];
    const?: JSONSchemaType;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
     */
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
     */
    maxLength?: number;
    minLength?: number;
    pattern?: string;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
     */
    items?: JSONSchemaDefinition | JSONSchemaDefinition[];
    additionalItems?: JSONSchemaDefinition;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    contains?: JSONSchema;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
     */
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    properties?: {
      [key: string]: JSONSchemaDefinition;
    };
    patternProperties?: {
      [key: string]: JSONSchemaDefinition;
    };
    additionalProperties?: JSONSchemaDefinition;
    dependencies?: {
      [key: string]: JSONSchemaDefinition | string[];
    };
    propertyNames?: JSONSchemaDefinition;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.6
     */
    if?: JSONSchemaDefinition;
    then?: JSONSchemaDefinition;
    else?: JSONSchemaDefinition;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.7
     */
    allOf?: JSONSchemaDefinition[];
    anyOf?: JSONSchemaDefinition[];
    oneOf?: JSONSchemaDefinition[];
    not?: JSONSchemaDefinition;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-7
     */
    format?: string;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-8
     */
    contentMediaType?: string;
    contentEncoding?: string;

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-9
     */
    definitions?: {
      [key: string]: JSONSchemaDefinition;
    };

    /**
     * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-10
     */
    title?: string;
    description?: string;
    default?: JSONSchemaType;
    readOnly?: boolean;
    writeOnly?: boolean;
    examples?: JSONSchemaType;
  }
}
