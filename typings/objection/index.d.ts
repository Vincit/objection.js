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
import Knex = require('knex');

// Export the entire Objection namespace.
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
  const initialize: initialize;

  const DBError: typeof dbErrors.DBError;
  const DataError: typeof dbErrors.DataError;
  const CheckViolationError: typeof dbErrors.CheckViolationError;
  const UniqueViolationError: typeof dbErrors.UniqueViolationError;
  const ConstraintViolationError: typeof dbErrors.ConstraintViolationError;
  const ForeignKeyViolationError: typeof dbErrors.ForeignKeyViolationError;
  const NotNullViolationError: typeof dbErrors.NotNullViolationError;

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
    <MC extends AnyModelConstructor>(modelClass: MC, ...plugins: Plugin[]): MC;
    <MC extends AnyModelConstructor>(modelClass: MC, plugins: Plugin[]): MC;
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

  type Raw = RawBuilder | knex.Raw;
  type Operator = string;
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

  type Expression<T> = T | Raw | ReferenceBuilder | ValueBuilder | AnyQueryBuilder;

  type Id = string | number;
  type CompositeId = Id[];
  type MaybeCompositeId = Id | CompositeId;

  interface ExpressionObject {
    [key: string]: Expression<PrimitiveValue>;
  }

  interface PrimitiveValueObject {
    [key: string]: PrimitiveValue;
  }

  interface CallbackVoid<T> {
    (this: T, arg: T): void;
  }

  type Identity<T> = (value: T) => T;
  type AnyQueryBuilder = QueryBuilder<any, any>;
  type AnyModelConstructor = ModelConstructor<Model>;
  type ModifierFunction<QB extends AnyQueryBuilder> = (qb: QB, ...args: any[]) => void;
  type Modifier<QB extends AnyQueryBuilder = AnyQueryBuilder> =
    | ModifierFunction<QB>
    | string
    | string[]
    | Record<string, Expression<PrimitiveValue>>;
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
   * Removes `undefined` from a type.
   */
  type Defined<T> = Exclude<T, undefined>;

  /**
   * A Pojo version of model.
   */
  type ModelObject<T extends Model> = {
    [K in NonFunctionPropertyNames<T>]: T[K];
  };

  /**
   * Any object that has some of the properties of model class T match this type.
   */
  type PartialModelObject<T extends Model> = {
    [K in NonFunctionPropertyNames<T>]?: Defined<T[K]> extends Model
      ? T[K]
      : Defined<T[K]> extends Array<infer I>
      ? I extends Model
        ? I[]
        : Expression<T[K]>
      : Expression<T[K]>;
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
  type PartialModelGraph<M, T = M & GraphParameters> = {
    [K in NonFunctionPropertyNames<T>]?: Defined<T[K]> extends Model
      ? PartialModelGraph<Defined<T[K]>>
      : Defined<T[K]> extends Array<infer I>
      ? I extends Model
        ? PartialModelGraph<I>[]
        : Expression<T[K]>
      : Expression<T[K]>;
  };

  /**
   * Extracts the property names (excluding relations) of a model class.
   */
  type ModelProps<T extends Model> = Exclude<
    {
      [K in keyof T]?: Defined<T[K]> extends Model
        ? never
        : Defined<T[K]> extends Array<infer I>
        ? I extends Model
          ? never
          : K
        : T[K] extends Function
        ? never
        : K;
    }[keyof T],
    undefined | 'QueryBuilderType'
  >;

  /**
   * Extracts the relation names of the a model class.
   */
  type ModelRelations<T extends Model> = Defined<
    {
      [K in keyof T]?: Defined<T[K]> extends Model
        ? K
        : Defined<T[K]> extends Array<infer I>
        ? I extends Model
          ? K
          : never
        : never;
    }[keyof T]
  >;

  /**
   * Given a model property type, returns a query builer type of
   * correct kind if the property is a model or a model array.
   */
  type RelatedQueryBuilder<T> = T extends Model
    ? SingleQueryBuilder<QueryBuilderType<T>>
    : T extends Array<infer I>
    ? I extends Model
      ? QueryBuilderType<I>
      : never
    : never;

  /**
   * Just like RelatedQueryBuilder but always returns an array
   * query builder even if the property type is a model and not
   * an array of models.
   */
  type ArrayRelatedQueryBuilder<T> = T extends Model
    ? QueryBuilderType<T>
    : T extends Array<infer I>
    ? I extends Model
      ? QueryBuilderType<I>
      : never
    : never;

  /**
   * Gets the query builder type for a model type.
   */
  type QueryBuilderType<T extends { QueryBuilderType: any }> = T['QueryBuilderType'];

  /**
   * Gets the model type from a query builder type.
   */
  type ModelType<T extends { ModelType: any }> = T['ModelType'];

  /**
   * Gets the result type from a query builder type.
   */
  type ResultType<T extends { ResultType: any }> = T['ResultType'];

  /**
   * Gets the single item query builder type for a query builder.
   */
  type SingleQueryBuilder<T extends { SingleQueryBuilderType: any }> = T['SingleQueryBuilderType'];

  /**
   * Gets the multi-item query builder type for a query builder.
   */
  type ArrayQueryBuilder<T extends { ArrayQueryBuilderType: any }> = T['ArrayQueryBuilderType'];

  /**
   * Gets the number query builder type for a query builder.
   */
  type NumberQueryBuilder<T extends { NumberQueryBuilderType: any }> = T['NumberQueryBuilderType'];

  /**
   * Gets the page query builder type for a query builder.
   */
  type PageQueryBuilder<T extends { PageQueryBuilderType: any }> = T['PageQueryBuilderType'];

  interface ForClassMethod {
    <M extends Model>(modelClass: ModelConstructor<M>): QueryBuilderType<M>;
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
    <QBP extends QB>(
      col: ModelProps<ModelType<QBP>>,
      op: Operator,
      expr: Expression<PrimitiveValue>
    ): QB;

    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, expr: Expression<PrimitiveValue>): QB;

    (col: ColumnRef, op: Operator, expr: Expression<PrimitiveValue>): QB;
    (col: ColumnRef, expr: Expression<PrimitiveValue>): QB;

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
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, expr: Expression<PrimitiveValue>): QB;
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, cb: CallbackVoid<QB>): QB;
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, qb: AnyQueryBuilder): QB;

    (col: ColumnRef | ColumnRef[], expr: Expression<PrimitiveValue>[]): QB;
    (col: ColumnRef | ColumnRef[], cb: CallbackVoid<QB>): QB;
    (col: ColumnRef | ColumnRef[], qb: AnyQueryBuilder): QB;
  }

  interface WhereBetweenMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, range: [Expression<PrimitiveValue>, Expression<PrimitiveValue>]): QB;
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

  interface WhereJsonMethod<QB extends AnyQueryBuilder> {
    (
      fieldExpression: FieldExpression,
      jsonObjectOrFieldExpression: JsonObjectOrFieldExpression
    ): QB;
  }

  interface WhereFieldExpressionMethod<QB extends AnyQueryBuilder> {
    (fieldExpression: FieldExpression): QB;
  }

  interface WhereJsonExpressionMethod<QB extends AnyQueryBuilder> {
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
    (column: ColumnRef[], op: Operator, expr: Expression<PrimitiveValue>[]): QB;
    (column: ColumnRef, expr: Expression<PrimitiveValue>): QB;
    (column: ColumnRef, op: Operator, expr: Expression<PrimitiveValue>): QB;
    (column: ColumnRef[], expr: Expression<PrimitiveValue>[]): QB;
    (column: ColumnRef[], qb: AnyQueryBuilder): QB;
  }

  interface WhereInCompositeMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, expr: Expression<PrimitiveValue>[]): QB;
    (column: ColumnRef, qb: AnyQueryBuilder): QB;
    (column: ColumnRef[], expr: Expression<PrimitiveValue>[][]): QB;
    (column: ColumnRef[], qb: AnyQueryBuilder): QB;
  }

  type QBOrCallback<QB extends AnyQueryBuilder> = AnyQueryBuilder | CallbackVoid<QB>;

  interface BaseSetOperations<QB extends AnyQueryBuilder> {
    (callbackOrBuilder: QBOrCallback<QB>, wrap?: boolean): QB;
    (callbacksOrBuilders: QBOrCallback<QB>[], wrap?: boolean): QB;
  }

  interface SetOperationsMethod<QB extends AnyQueryBuilder> extends BaseSetOperations<QB> {
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

  interface JoinRelatedOptions {
    alias?: string | boolean;
    aliases?: Record<string, string>;
  }

  interface JoinRelatedMethod<QB extends AnyQueryBuilder> {
    (expr: RelationExpression<ModelType<QB>>, opt?: JoinRelatedOptions): QB;
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

  interface OrderByDescriptor {
    column: ColumnRef;
    order?: OrderByDirection;
  }

  type ColumnRefOrOrderByDescriptor = ColumnRef | OrderByDescriptor;

  interface OrderByMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, order?: OrderByDirection): QB;
    (columns: ColumnRefOrOrderByDescriptor[]): QB;
  }

  interface OrderByRawMethod<QB extends AnyQueryBuilder> extends RawInterface<QB> {}

  interface FirstMethod {
    <QB extends AnyQueryBuilder>(this: QB): QB extends ArrayQueryBuilder<QB>
      ? SingleQueryBuilder<QB>
      : QB;
  }

  type ForIdValue = MaybeCompositeId | AnyQueryBuilder;

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

  interface HasMethod {
    (selector: string | RegExp): boolean;
  }

  interface ClearMethod<QB extends AnyQueryBuilder> {
    (selector: string | RegExp): QB;
  }

  interface ColumnInfoMethod<QB extends AnyQueryBuilder> {
    (): Promise<knex.ColumnInfo>;
  }

  interface TableRefForMethod {
    (modelClass: typeof Model): string;
  }

  interface AliasForMethod<QB extends AnyQueryBuilder> {
    (modelClassOrTableName: string | AnyModelConstructor, alias: string): QB;
  }

  interface ModelClassMethod<M extends Model> {
    (): ModelClass<M>;
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

  export interface Page<M extends Model> {
    total: number;
    results: M[];
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

  interface InsertGraphMethod<M extends Model> {
    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<M>,
      options?: InsertGraphOptions
    ): SingleQueryBuilder<QB>;

    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<M>[],
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

  interface UpsertGraphMethod<M extends Model> {
    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<M>[],
      options?: UpsertGraphOptions
    ): ArrayQueryBuilder<QB>;

    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<M>,
      options?: UpsertGraphOptions
    ): SingleQueryBuilder<QB>;
  }

  interface GraphExpressionObjectMethod<QB extends AnyQueryBuilder> {
    (): any;
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
      modifier: Modifier<QueryBuilderType<M>>
    ): QB;
  }

  interface ContextMethod<QB extends AnyQueryBuilder> {
    (context: object): QB;
    (): QueryContext;
  }

  interface ClearContextMethod<QB extends AnyQueryBuilder> {
    (): QB;
  }

  interface ModifyMethod<QB extends AnyQueryBuilder> {
    (modifier: Modifier<QB> | Modifier<QB>[], ...args: any[]): QB;
  }

  interface ModifiersMethod<QB extends AnyQueryBuilder> {
    (modifiers: Modifiers): QB;
    (): QB;
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

    whereJsonSupersetOf: WhereJsonMethod<this>;
    orWhereJsonSupersetOf: WhereJsonMethod<this>;
    whereJsonNotSupersetOf: WhereJsonMethod<this>;
    orWhereJsonNotSupersetOf: WhereJsonMethod<this>;
    whereJsonSubsetOf: WhereJsonMethod<this>;
    orWhereJsonSubsetOf: WhereJsonMethod<this>;
    whereJsonNotSubsetOf: WhereJsonMethod<this>;
    orWhereJsonNotSubsetOf: WhereJsonMethod<this>;
    whereJsonIsArray: WhereFieldExpressionMethod<this>;
    orWhereJsonIsArray: WhereFieldExpressionMethod<this>;
    whereJsonNotArray: WhereFieldExpressionMethod<this>;
    orWhereJsonNotArray: WhereFieldExpressionMethod<this>;
    whereJsonIsObject: WhereFieldExpressionMethod<this>;
    orWhereJsonIsObject: WhereFieldExpressionMethod<this>;
    whereJsonNotObject: WhereFieldExpressionMethod<this>;
    orWhereJsonNotObject: WhereFieldExpressionMethod<this>;
    whereJsonHasAny: WhereJsonExpressionMethod<this>;
    orWhereJsonHasAny: WhereJsonExpressionMethod<this>;
    whereJsonHasAll: WhereJsonExpressionMethod<this>;
    orWhereJsonHasAll: WhereJsonExpressionMethod<this>;

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
    intersect: SetOperationsMethod<this>;

    with: WithMethod<this>;
    withRecursive: WithMethod<this>;
    withWrapped: WithMethod<this>;

    // Deprecated
    joinRelation: JoinRelatedMethod<this>;
    // Deprecated
    innerJoinRelation: JoinRelatedMethod<this>;
    // Deprecated
    outerJoinRelation: JoinRelatedMethod<this>;
    // Deprecated
    leftJoinRelation: JoinRelatedMethod<this>;
    // Deprecated
    leftOuterJoinRelation: JoinRelatedMethod<this>;
    // Deprecated
    rightJoinRelation: JoinRelatedMethod<this>;
    // Deprecated
    rightOuterJoinRelation: JoinRelatedMethod<this>;
    // Deprecated
    fullOuterJoinRelation: JoinRelatedMethod<this>;

    joinRelated: JoinRelatedMethod<this>;
    innerJoinRelated: JoinRelatedMethod<this>;
    outerJoinRelated: JoinRelatedMethod<this>;
    leftJoinRelated: JoinRelatedMethod<this>;
    leftOuterJoinRelated: JoinRelatedMethod<this>;
    rightJoinRelated: JoinRelatedMethod<this>;
    rightOuterJoinRelated: JoinRelatedMethod<this>;
    fullOuterJoinRelated: JoinRelatedMethod<this>;

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
    first: FirstMethod;

    orderBy: OrderByMethod<this>;
    orderByRaw: OrderByRawMethod<this>;

    groupBy: GroupByMethod<this>;
    groupByRaw: RawInterface<this>;

    findById(id: MaybeCompositeId): SingleQueryBuilder<this>;
    findByIds(ids: MaybeCompositeId[]): this;
    findOne: WhereMethod<SingleQueryBuilder<this>>;

    execute(): Promise<R>;
    castTo<MC extends Model>(modelClass: ModelConstructor<MC>): QueryBuilderType<MC>;

    update(update: PartialModelObject<M>): NumberQueryBuilder<this>;
    update(): NumberQueryBuilder<this>;
    updateAndFetch(update: PartialModelObject<M>): SingleQueryBuilder<this>;
    updateAndFetchById(
      id: MaybeCompositeId,
      update: PartialModelObject<M>
    ): SingleQueryBuilder<this>;

    patch(update: PartialModelObject<M>): NumberQueryBuilder<this>;
    patch(): NumberQueryBuilder<this>;
    patchAndFetch(update: PartialModelObject<M>): SingleQueryBuilder<this>;
    patchAndFetchById(
      id: MaybeCompositeId,
      update: PartialModelObject<M>
    ): SingleQueryBuilder<this>;

    del(): NumberQueryBuilder<this>;
    delete(): NumberQueryBuilder<this>;
    deleteById(id: MaybeCompositeId): NumberQueryBuilder<this>;

    insert(insert: PartialModelObject<M>): SingleQueryBuilder<this>;
    insert(insert: PartialModelObject<M>[]): ArrayQueryBuilder<this>;
    insert(): SingleQueryBuilder<this>;

    insertAndFetch(insert: PartialModelObject<M>): SingleQueryBuilder<this>;
    insertAndFetch(insert: PartialModelObject<M>[]): ArrayQueryBuilder<this>;
    insertAndFetch(): SingleQueryBuilder<this>;

    relate(
      ids: MaybeCompositeId | MaybeCompositeId[] | PartialModelObject<M> | PartialModelObject<M>[]
    ): NumberQueryBuilder<this>;

    unrelate(): NumberQueryBuilder<this>;
    for(ids: ForIdValue | ForIdValue[]): this;

    withGraphFetched(expr: RelationExpression<M>, options?: GraphOptions): this;
    withGraphJoined(expr: RelationExpression<M>, options?: GraphOptions): this;

    truncate(): Promise<void>;

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
    modelClass: ModelClassMethod<M>;
    tableNameFor: TableRefForMethod;
    tableRefFor: TableRefForMethod;
    reject: OneArgMethod<any, this>;
    resolve: OneArgMethod<any, this>;
    transacting: OneArgMethod<TransactionOrKnex, this>;
    connection: OneArgMethod<TransactionOrKnex, this>;
    timeout: TimeoutMethod<this>;
    columnInfo: ColumnInfoMethod<this>;

    toKnexQuery<T = ModelObject<M>>(): Knex.QueryBuilder<T, T[]>;
    clone(): this;

    // Deprecated
    pluck(property: string): this;
    // Deprecated
    pick(modelClass: typeof Model, properties: string[]): this;
    // Deprecated
    pick(properties: string[]): this;
    // Deprecated
    omit(modelClass: typeof Model, properties: string[]): this;
    // Deprecated
    omit(properties: string[]): this;
    // Deprecated
    traverse(filterConstructor: typeof Model, traverser: TraverserFunction): R;
    // Deprecated
    traverse(traverser: TraverserFunction): R;

    page(page: number, pageSize: number): PageQueryBuilder<this>;
    range(): PageQueryBuilder<this>;
    range(start: number, end: number): PageQueryBuilder<this>;
    offset(offset: number): this;
    limit(limit: number): this;
    resultSize(): Promise<number>;

    runBefore: RunBeforeMethod<this>;
    runAfter: RunAfterMethod<this>;

    onBuild: OnBuildMethod<this>;
    onBuildKnex: OnBuildKnexMethod<this>;
    onError: OnErrorMethod<this>;

    insertGraph: InsertGraphMethod<M>;
    insertGraphAndFetch: InsertGraphMethod<M>;
    insertWithRelated: InsertGraphMethod<M>;
    insertWithRelatedAndFetch: InsertGraphMethod<M>;

    upsertGraph: UpsertGraphMethod<M>;
    upsertGraphAndFetch: UpsertGraphMethod<M>;

    graphExpressionObject: GraphExpressionObjectMethod<this>;

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
    clearContext: ClearContextMethod<this>;
    // Deprecated
    mergeContext: ContextMethod<this>;

    modify: ModifyMethod<this>;
    modifiers: ModifiersMethod<this>;
    // Deprecated
    applyFilter: ApplyFilterMethod<this>;

    isFind: BooleanReturningMethod;
    isExecutable: BooleanReturningMethod;
    isInsert: BooleanReturningMethod;
    isUpdate: BooleanReturningMethod;
    isDelete: BooleanReturningMethod;
    isRelate: BooleanReturningMethod;
    isUnrelate: BooleanReturningMethod;
    isInternal: BooleanReturningMethod;
    hasWheres: BooleanReturningMethod;
    hasSelects: BooleanReturningMethod;
    // Deprecated
    hasEager: BooleanReturningMethod;
    hasWithGraph: BooleanReturningMethod;

    has: HasMethod;
    clear: ClearMethod<this>;

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

  interface FetchGraphOptions {
    transaction?: TransactionOrKnex;
    skipFetched?: boolean;
  }

  interface TraverserFunction {
    (model: Model, parentModel: Model, relationName: string): void;
  }

  type ArrayQueryBuilderThunk<M extends Model> = () => ArrayQueryBuilder<QueryBuilderType<M>>;
  type CancelQueryThunk = (result: any) => void;

  export interface StaticHookArguments<M extends Model, R = any> {
    asFindQuery: ArrayQueryBuilderThunk<M>;
    cancelQuery: CancelQueryThunk;
    context: QueryContext;
    transaction: TransactionOrKnex;
    relation?: Relation;
    modelOptions?: ModelOptions;
    items: Model[];
    inputItems: M[];
    result?: R;
  }

  export type Transaction = knex.Transaction;
  export type TransactionOrKnex = Transaction | knex;

  export interface RelationMappings {
    [relationName: string]: RelationMapping<any>;
  }

  export type RelationMappingsThunk = () => RelationMappings;

  type ModelClassFactory = () => AnyModelConstructor;
  type ModelClassSpecifier = ModelClassFactory | AnyModelConstructor | string;
  type RelationMappingHook<M extends Model> = (
    model: M,
    context: QueryContext
  ) => Promise<void> | void;
  type StringOrReferenceBuilder = string | ReferenceBuilder;
  type RelationMappingColumnRef = StringOrReferenceBuilder | StringOrReferenceBuilder[];

  export interface RelationMapping<M extends Model> {
    relation: RelationType;
    modelClass: ModelClassSpecifier;
    join: RelationJoin;
    modify?: Modifier<QueryBuilderType<M>>;
    filter?: Modifier<QueryBuilderType<M>>;
    beforeInsert?: RelationMappingHook<M>;
  }

  export interface RelationJoin {
    from: RelationMappingColumnRef;
    to: RelationMappingColumnRef;
    through?: RelationThrough<any>;
  }

  export interface RelationThrough<M extends Model> {
    from: RelationMappingColumnRef;
    to: RelationMappingColumnRef;
    extra?: string[] | Record<string, string>;
    modelClass?: ModelClassSpecifier;
    beforeInsert?: RelationMappingHook<M>;
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
    underscoreBetweenUppercaseLetters?: boolean;
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
    type: ValidationErrorType | string;
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
    statusCode?: number;
    message?: string;
    data?: ErrorHash | any;
    // This can be any string for custom errors. ValidationErrorType is there
    // only to document the default values objection uses internally.
    type: ValidationErrorType | string;
  }

  export class NotFoundError extends Error {
    constructor(data?: any);

    statusCode: number;
    data?: any;
    type: 'NotFound';
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

  export interface Constructor<T> {
    new (): T;
  }

  export interface ModelConstructor<M extends Model> extends Constructor<M> {}

  export interface ModelClass<M extends Model> extends ModelConstructor<M> {
    QueryBuilder: typeof QueryBuilder;

    tableName: string;
    idColumn: string | string[];
    jsonSchema: JSONSchema;
    relationMappings: RelationMappings | RelationMappingsThunk;
    modelPaths: string[];
    jsonAttributes: string[];
    virtualAttributes: string[];
    uidProp: string;
    uidRefProp: string;
    dbRefProp: string;
    propRefRegex: RegExp;
    pickJsonSchemaProperties: boolean;
    relatedFindQueryMutates: boolean;
    relatedInsertQueryMutates: boolean;
    modifiers: Modifiers;
    columnNameMappers: ColumnNameMappers;

    raw: RawFunction;
    ref: ReferenceFunction;
    fn: FunctionFunction;

    BelongsToOneRelation: RelationType;
    HasOneRelation: RelationType;
    HasManyRelation: RelationType;
    ManyToManyRelation: RelationType;
    HasOneThroughRelation: RelationType;

    defaultGraphOptions?: GraphOptions;
    // Deprecated
    defaultEagerAlgorithm?: EagerAlgorithm;
    // Deprecated
    defaultEagerOptions?: EagerOptions;

    // Deprecated
    WhereInEagerAlgorithm: EagerAlgorithm;
    // Deprecated
    NaiveEagerAlgorithm: EagerAlgorithm;
    // Deprecated
    JoinEagerAlgorithm: EagerAlgorithm;

    query(this: Constructor<M>, trxOrKnex?: TransactionOrKnex): QueryBuilderType<M>;

    relatedQuery<K extends keyof M>(
      relationName: K,
      trxOrKnex?: TransactionOrKnex
    ): ArrayRelatedQueryBuilder<M[K]>;

    relatedQuery<RM extends Model>(
      relationName: string,
      trxOrKnex?: TransactionOrKnex
    ): QueryBuilderType<RM>;

    fromJson(json: object, opt?: ModelOptions): M;
    fromDatabaseJson(json: object): M;

    createValidator(): Validator;
    createValidationError(args: CreateValidationErrorArgs): Error;
    createNotFoundError(): Error;

    tableMetadata(opt?: TableMetadataOptions): TableMetadata;
    fetchTableMetadata(opt?: FetchTableMetadataOptions): Promise<TableMetadata>;

    knex(knex?: knex): knex;
    knexQuery(): knex.QueryBuilder;
    startTransaction(knexOrTransaction?: TransactionOrKnex): Promise<Transaction>;

    transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
    transaction<T>(
      trxOrKnex: TransactionOrKnex,
      callback: (trx: Transaction) => Promise<T>
    ): Promise<T>;

    bindKnex(trxOrKnex: TransactionOrKnex): this;
    bindTransaction(trxOrKnex: TransactionOrKnex): this;

    // Deprecated
    loadRelated(
      modelOrObject: PartialModelObject<M>,
      expression: RelationExpression<M>,
      modifiers?: Modifiers<QueryBuilderType<M>>,
      trxOrKnex?: TransactionOrKnex
    ): SingleQueryBuilder<QueryBuilderType<M>>;

    // Deprecated
    loadRelated(
      modelOrObject: PartialModelObject<M>[],
      expression: RelationExpression<M>,
      modifiers?: Modifiers<QueryBuilderType<M>>,
      trxOrKnex?: TransactionOrKnex
    ): QueryBuilderType<M>;

    fetchGraph(
      modelOrObject: PartialModelObject<M>,
      expression: RelationExpression<M>,
      options?: FetchGraphOptions
    ): SingleQueryBuilder<QueryBuilderType<M>>;

    fetchGraph(
      modelOrObject: PartialModelObject<M>[],
      expression: RelationExpression<M>,
      options?: FetchGraphOptions
    ): QueryBuilderType<M>;

    getRelations(): Relations;
    getRelation(name: string): Relation;

    traverse(models: Model | Model[], traverser: TraverserFunction): void;
    traverse(
      filterConstructor: ModelConstructor<Model>,
      models: Model | Model[],
      traverser: TraverserFunction
    ): void;

    beforeFind(args: StaticHookArguments<any>): any;
    afterFind(args: StaticHookArguments<any>): any;
    beforeInsert(args: StaticHookArguments<any>): any;
    afterInsert(args: StaticHookArguments<any>): any;
    beforeUpdate(args: StaticHookArguments<any>): any;
    afterUpdate(args: StaticHookArguments<any>): any;
    beforeDelete(args: StaticHookArguments<any>): any;
    afterDelete(args: StaticHookArguments<any>): any;
  }

  export class Model {
    static QueryBuilder: typeof QueryBuilder;

    static tableName: string;
    static idColumn: string | string[];
    static jsonSchema: JSONSchema;
    static relationMappings: RelationMappings | RelationMappingsThunk;
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
    static columnNameMappers: ColumnNameMappers;

    static raw: RawFunction;
    static ref: ReferenceFunction;
    static fn: FunctionFunction;

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

    static query<M extends Model>(
      this: Constructor<M>,
      trxOrKnex?: TransactionOrKnex
    ): QueryBuilderType<M>;

    static relatedQuery<M extends Model, K extends keyof M>(
      this: Constructor<M>,
      relationName: K,
      trxOrKnex?: TransactionOrKnex
    ): ArrayRelatedQueryBuilder<M[K]>;

    static relatedQuery<RM extends Model>(
      relationName: string,
      trxOrKnex?: TransactionOrKnex
    ): QueryBuilderType<RM>;

    static fromJson<M extends Model>(this: Constructor<M>, json: object, opt?: ModelOptions): M;
    static fromDatabaseJson<M extends Model>(this: Constructor<M>, json: object): M;

    static createValidator(): Validator;
    static createValidationError(args: CreateValidationErrorArgs): Error;
    static createNotFoundError(): Error;

    static tableMetadata(opt?: TableMetadataOptions): TableMetadata;
    static fetchTableMetadata(opt?: FetchTableMetadataOptions): Promise<TableMetadata>;

    static knex(knex?: knex): knex;
    static knexQuery(): knex.QueryBuilder;
    static startTransaction(knexOrTransaction?: TransactionOrKnex): Promise<Transaction>;

    static transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
    static transaction<T>(
      trxOrKnex: TransactionOrKnex,
      callback: (trx: Transaction) => Promise<T>
    ): Promise<T>;

    static bindKnex<M>(this: M, trxOrKnex: TransactionOrKnex): M;
    static bindTransaction<M>(this: M, trxOrKnex: TransactionOrKnex): M;

    // Deprecated
    static loadRelated<M extends Model>(
      this: Constructor<M>,
      modelOrObject: PartialModelObject<M>,
      expression: RelationExpression<M>,
      modifiers?: Modifiers<QueryBuilderType<M>>,
      trxOrKnex?: TransactionOrKnex
    ): SingleQueryBuilder<QueryBuilderType<M>>;

    // Deprecated
    static loadRelated<M extends Model>(
      this: Constructor<M>,
      modelOrObject: PartialModelObject<M>[],
      expression: RelationExpression<M>,
      modifiers?: Modifiers<QueryBuilderType<M>>,
      trxOrKnex?: TransactionOrKnex
    ): QueryBuilderType<M>;

    static fetchGraph<M extends Model>(
      this: Constructor<M>,
      modelOrObject: PartialModelObject<M>,
      expression: RelationExpression<M>,
      options?: FetchGraphOptions
    ): SingleQueryBuilder<QueryBuilderType<M>>;

    static fetchGraph<M extends Model>(
      this: Constructor<M>,
      modelOrObject: PartialModelObject<M>[],
      expression: RelationExpression<M>,
      options?: FetchGraphOptions
    ): QueryBuilderType<M>;

    static getRelations(): Relations;
    static getRelation(name: string): Relation;

    static traverse(models: Model | Model[], traverser: TraverserFunction): void;
    static traverse(
      filterConstructor: typeof Model,
      models: Model | Model[],
      traverser: TraverserFunction
    ): void;

    static beforeFind(args: StaticHookArguments<any>): any;
    static afterFind(args: StaticHookArguments<any>): any;
    static beforeInsert(args: StaticHookArguments<any>): any;
    static afterInsert(args: StaticHookArguments<any>): any;
    static beforeUpdate(args: StaticHookArguments<any>): any;
    static afterUpdate(args: StaticHookArguments<any>): any;
    static beforeDelete(args: StaticHookArguments<any>): any;
    static afterDelete(args: StaticHookArguments<any>): any;

    $relatedQuery<K extends keyof this>(
      relationName: K,
      trxOrKnex?: TransactionOrKnex
    ): RelatedQueryBuilder<this[K]>;

    $relatedQuery<RM extends Model>(
      relationName: string,
      trxOrKnex?: TransactionOrKnex
    ): QueryBuilderType<RM>;

    $query(trxOrKnex?: TransactionOrKnex): SingleQueryBuilder<QueryBuilderType<this>>;

    $id(id: any): void;
    $id(): any;

    // Deprecated
    $loadRelated(
      expression: RelationExpression<this>,
      modifiers?: Modifiers<QueryBuilderType<this>>,
      trxOrKnex?: TransactionOrKnex
    ): SingleQueryBuilder<QueryBuilderType<this>>;

    $fetchGraph(
      expression: RelationExpression<this>,
      options?: FetchGraphOptions
    ): SingleQueryBuilder<QueryBuilderType<this>>;

    $formatDatabaseJson(json: Pojo): Pojo;
    $parseDatabaseJson(json: Pojo): Pojo;

    $formatJson(json: Pojo): Pojo;
    $parseJson(json: Pojo, opt?: ModelOptions): Pojo;

    $beforeValidate(jsonSchema: JSONSchema, json: Pojo, opt: ModelOptions): JSONSchema;
    $validate(json?: Pojo, opt?: ModelOptions): Pojo; // may throw ValidationError if validation fails
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
    $traverse(filterConstructor: typeof Model, traverser: TraverserFunction): this;
    $traverse(traverser: TraverserFunction): this;

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
    start(knexOrModel: knex | AnyModelConstructor): Promise<Transaction>;

    <MC1 extends AnyModelConstructor, ReturnValue>(
      modelClass1: MC1,
      callback: (boundModelClass: MC1, trx?: Transaction) => Promise<ReturnValue>
    ): Promise<ReturnValue>;

    <MC1 extends AnyModelConstructor, MC2 extends AnyModelConstructor, ReturnValue>(
      modelClass1: MC1,
      modelClass2: MC2,
      callback: (
        boundModelClass1: MC1,
        boundModelClass2: MC2,
        trx?: Transaction
      ) => Promise<ReturnValue>
    ): Promise<ReturnValue>;

    <
      MC1 extends AnyModelConstructor,
      MC2 extends AnyModelConstructor,
      MC3 extends AnyModelConstructor,
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
      MC1 extends AnyModelConstructor,
      MC2 extends AnyModelConstructor,
      MC3 extends AnyModelConstructor,
      MC4 extends AnyModelConstructor,
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
      MC1 extends AnyModelConstructor,
      MC2 extends AnyModelConstructor,
      MC3 extends AnyModelConstructor,
      MC4 extends AnyModelConstructor,
      MC5 extends AnyModelConstructor,
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

  interface initialize {
    (knex: Knex, modelClasses: AnyModelConstructor[]): Promise<void>;
    (modelClasses: AnyModelConstructor[]): Promise<void>;
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
    | 'null'
    | string;

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
