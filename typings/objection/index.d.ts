/// <reference types="node" />

// Type definitions for Objection.js
// Project: <https://ditojs.github.io/objection/>
//
// Contributions by:
// * Matthew McEachen <https://github.com/mceachen>
// * Sami Koskimäki <https://github.com/koskimas>
// * Mikael Lepistö <https://github.com/elhigu>
// * Joseph T Lapp <https://github.com/jtlapp>
// * Drew R. <https://github.com/drew-r>
// * Karl Blomster <https://github.com/kblomster>
// * And many others: See <https://github.com/Vincit/objection.js/blob/main/typings/objection/index.d.ts>

import Ajv, { Options as AjvOptions } from 'ajv';
import * as dbErrors from 'db-errors';
import { Knex } from 'knex';

// Export the entire Objection namespace.
export = Objection;

// Phantom brand of the relation types, used by `TypedRelationMappings`.
declare const relationKind: unique symbol;
// Phantom brand of `Generated` properties.
declare const generated: unique symbol;

declare namespace Objection {
  const raw: RawFunction;
  const val: ValueFunction;
  const ref: ReferenceFunction;
  const fn: FunctionFunction;

  const compose: ComposeFunction;
  const mixin: MixinFunction;

  const snakeCaseMappers: SnakeCaseMappersFactory;
  const knexSnakeCaseMappers: KnexSnakeCaseMappersFactory;
  const knexIdentifierMapping: KnexIdentifierMappingFactory;

  const transaction: transaction;
  const initialize: initialize;

  // Import aliases re-export both the value and the type side of the classes,
  // so they can be used with `instanceof` as well as in type annotations.
  export import DBError = dbErrors.DBError;
  export import DataError = dbErrors.DataError;
  export import CheckViolationError = dbErrors.CheckViolationError;
  export import UniqueViolationError = dbErrors.UniqueViolationError;
  export import ConstraintViolationError = dbErrors.ConstraintViolationError;
  export import ForeignKeyViolationError = dbErrors.ForeignKeyViolationError;
  export import NotNullViolationError = dbErrors.NotNullViolationError;

  export interface RawBuilder extends Aliasable {}

  export interface RawFunction extends RawInterface<RawBuilder> {}
  export interface RawInterface<R> {
    (sql: string, ...bindings: any[]): R;
  }

  export interface ValueBuilder extends Castable {}
  export interface ValueFunction {
    (
      value: PrimitiveValue | PrimitiveValue[] | PrimitiveValueObject | PrimitiveValueObject[],
    ): ValueBuilder;
  }

  export interface ReferenceBuilder extends Castable {
    from(tableReference: string): this;
  }
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

  type Raw = RawBuilder | Knex.Raw;
  type Operator = string;
  type ColumnRef = string | Raw | ReferenceBuilder;
  type TableRef<QB extends AnyQueryBuilder> = ColumnRef | AnyQueryBuilder | CallbackVoid<QB>;

  type PrimitiveValue =
    | string
    | number
    | boolean
    | bigint
    | Date
    | Buffer
    | string[]
    | number[]
    | boolean[]
    | bigint[]
    | Date[]
    | Buffer[]
    | null;

  type Expression<T> = T | Raw | ReferenceBuilder | ValueBuilder | AnyQueryBuilder;

  type Id = string | number | BigInt | Buffer;
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
    ModifierFunction<QB> | string | string[] | Record<string, Expression<PrimitiveValue>>;
  type OrderByDirection = 'asc' | 'desc' | 'ASC' | 'DESC';
  type OrderByNulls = 'first' | 'last';

  interface Modifiers<QB extends AnyQueryBuilder = AnyQueryBuilder> {
    [key: string]: Modifier<QB>;
  }

  type RelationExpression<M extends Model> = string | object;

  // Type-level parsing of relation expressions, used to narrow the result
  // types of `withGraphFetched()`, `withGraphJoined()` and `fetchGraph()`.

  /**
   * Parses a relation expression, in string or object notation, into a tree
   * of fetched relations: '[pets.owner, children]' and
   * `{ pets: { owner: true }, children: true }` both become
   * `{ pets: { owner: {} }, children: {} }`.
   *
   * Anything that isn't a literal expression (e.g. a `string` variable) yields
   * `{}`, and so do nodes the parser doesn't understand (aliases, `*`,
   * recursion with `^`), so these simply don't narrow.
   */
  type ParseRelationExpression<E> = string extends E
    ? {}
    : E extends string
      ? ParseRelationString<E>
      : ParseRelationObject<E>;

  type Whitespace = ' ' | '\n' | '\r' | '\t';

  type Trim<S extends string> = S extends `${Whitespace}${infer R}`
    ? Trim<R>
    : S extends `${infer L}${Whitespace}`
      ? Trim<L>
      : S;

  /**
   * Counts the occurrences of character C in S, as a tuple length.
   */
  type CountChar<
    S extends string,
    C extends string,
    N extends 0[] = [],
  > = S extends `${string}${C}${infer R}` ? CountChar<R, C, [...N, 0]> : N['length'];

  /**
   * True if S has as many opening as closing brackets and parentheses.
   */
  type IsBalanced<S extends string> =
    CountChar<S, '['> extends CountChar<S, ']'>
      ? CountChar<S, '('> extends CountChar<S, ')'>
        ? true
        : false
      : false;

  /**
   * Splits a list of expressions at the commas that aren't nested inside
   * brackets or parentheses: 'a, b.[c, d]' -> ['a', 'b.[c, d]'].
   */
  type SplitList<
    S extends string,
    Acc extends string = '',
    Out extends string[] = [],
  > = S extends `${infer Head},${infer Rest}`
    ? IsBalanced<`${Acc}${Head}`> extends true
      ? SplitList<Rest, '', [...Out, `${Acc}${Head}`]>
      : SplitList<Rest, `${Acc}${Head},`, Out>
    : [...Out, `${Acc}${S}`];

  type ParseRelationList<L extends string[], Acc = {}> = L extends [
    infer H extends string,
    ...infer T extends string[],
  ]
    ? ParseRelationList<T, Acc & ParseRelationString<H>>
    : Acc;

  /**
   * Parses '[a, b]', 'a.b' and 'a' style expressions.
   */
  type ParseRelationString<S extends string> =
    Trim<S> extends `[${infer Inner}]`
      ? ParseRelationList<SplitList<Inner>>
      : Trim<S> extends `${infer Head}.${infer Rest}`
        ? IsBalanced<Head> extends true
          ? RelationNode<RelationName<Head>, ParseRelationString<Rest>>
          : {}
        : RelationNode<RelationName<S>, {}>;

  /**
   * Extracts the relation name from a single node, dropping modifiers:
   * 'pets(selectName)' -> 'pets'. Returns never for nodes that can't be
   * narrowed: aliases ('pets as p'), '*' and recursion ('^', '^2').
   */
  type RelationName<S extends string> =
    Trim<S> extends `${infer Name}(${string})`
      ? RelationName<Name>
      : Trim<S> extends infer Name extends string
        ? Name extends '' | '*' | `^${string}` | `${string}${Whitespace}${string}`
          ? never
          : string extends Name
            ? never
            : Name
        : never;

  type RelationNode<Name extends string, Children> = [Name] extends [never]
    ? {}
    : { [K in Name]: Children };

  /**
   * Parses `{ a: true, b: { c: true } }` style expressions. Keys starting with
   * `$` are options, and aliased nodes (`{ p: { $relation: 'pets' } }`) are
   * skipped.
   */
  type ParseRelationObject<E> = string extends keyof E
    ? {}
    : {
        [
          K in keyof E as K extends `$${string}`
            ? never
            : false extends E[K]
              ? never
              : E[K] extends { $relation: any }
                ? never
                : K
        ]: E[K] extends object ? ParseRelationObject<E[K]> : {};
      };

  /**
   * Marks the relations in tree T as fetched on model M: they become required
   * and are narrowed recursively. Only `undefined` is removed: declared `null`
   * is kept, as to-one relations can be null when there is no related row.
   */
  type WithGraph<M, T> = [keyof T] extends [never]
    ? M
    : WithGraphRelations<M, T, FetchedRelations<M, T>>;

  type WithGraphRelations<M, T, K extends keyof M & keyof T> = [K] extends [never]
    ? M
    : { -readonly [P in K]-?: WithGraphProperty<Defined<M[P]>, T[P]> } & UnnarrowedMethods<M> & M;

  /**
   * `$query()` of the un-narrowed model M, as it doesn't fetch the relations
   * that were fetched on the instance. Otherwise its polymorphic `this` would
   * resolve to the narrowed model. With chained narrowing, the first `$query`
   * signature of the intersection wins, which is the one of the innermost,
   * un-narrowed model.
   */
  type UnnarrowedMethods<M> = Pick<M, Extract<'$query', keyof M>>;

  /**
   * The keys of tree T that are relation properties of model M.
   */
  type FetchedRelations<M, T> = {
    [K in keyof M & keyof T]: NonNullable<M[K]> extends Model | Model[] ? K : never;
  }[keyof M & keyof T];

  type WithGraphProperty<P, T> = [keyof T] extends [never]
    ? P
    : P extends Array<infer I>
      ? WithGraph<I, T>[]
      : P extends Model
        ? WithGraph<P, T>
        : P;

  /**
   * The model type after fetching the relation expression E on model M.
   */
  type WithGraphModel<M, E> = WithGraph<M, ParseRelationExpression<E>>;

  /**
   * The query builder type for model M after fetching relation expression E.
   * `M extends unknown` makes this distributive, so that in generic code (e.g.
   * `this` in model methods), TypeScript can resolve it through the constraint
   * of M.
   */
  type WithGraphModelQueryBuilder<M extends Model, E> = M extends unknown
    ? WithGraphModel<M, E>['QueryBuilderType']
    : never;

  /**
   * The query builder type after `withGraphFetched(E)` / `withGraphJoined(E)`
   * on QB. The model type is narrowed, and the query builder for the narrowed
   * model is looked up through its `QueryBuilderType`, so custom query
   * builders are kept. Falls back to QB if nothing can be narrowed, or if the
   * model type is `any` (`0 extends 1 & M`), e.g. for AnyQueryBuilder.
   * `QB extends unknown` below serves the same purpose as in
   * WithGraphModelQueryBuilder.
   */
  type WithGraphQueryBuilder<QB extends AnyQueryBuilder, E> = WithGraphTreeQueryBuilder<
    QB,
    ParseRelationExpression<E>
  >;

  type WithGraphTreeQueryBuilder<QB extends AnyQueryBuilder, T> = [keyof T] extends [never]
    ? QB
    : QB extends unknown
      ? 0 extends 1 & ModelType<QB>
        ? QB
        : [FetchedRelations<ModelType<QB>, T>] extends [never]
          ? QB
          : WithResultKind<QB, WithGraph<ModelType<QB>, T>['QueryBuilderType']>
      : never;

  /**
   * Converts the query builder NQB to the same result kind as QB:
   * array, single, maybe-single or page. Any other result type, e.g. after
   * `castTo()` or `patch()`, falls back to QB, without narrowing.
   */
  type WithResultKind<QB extends AnyQueryBuilder, NQB extends AnyQueryBuilder> = [
    ResultType<QB>,
  ] extends [ModelType<QB>[]]
    ? ArrayQueryBuilder<NQB>
    : [ResultType<QB>] extends [ModelType<QB>]
      ? SingleQueryBuilder<NQB>
      : [ResultType<QB>] extends [ModelType<QB> | undefined]
        ? MaybeSingleQueryBuilder<NQB>
        : [ResultType<QB>] extends [Page<ModelType<QB>>]
          ? PageQueryBuilder<NQB>
          : QB;

  /**
   * If T is an array, returns the item type, otherwise returns T.
   */
  type ItemType<T> = T extends Array<unknown> ? T[number] : T;

  /**
   * Type for keys of non-function properties of T.
   */
  type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

  /**
   * Type that attempts to only select the user-defined model properties.
   */
  type DataPropertyNames<T> = Exclude<NonFunctionPropertyNames<T>, 'QueryBuilderType'>;

  /**
   * Removes `undefined` from a type.
   */
  type Defined<T> = Exclude<T, undefined>;

  /**
   * A Pojo version of model.
   */
  type ModelObject<T extends Model> = Pick<T, DataPropertyNames<T>>;

  /**
   * Any object that has some of the properties of model class T match this type.
   */
  type PartialModelObject<T extends Model> = {
    [K in DataPropertyNames<T>]?: Defined<T[K]> extends Model
      ? T[K] | PartialModelObject<Defined<T[K]>>
      : Defined<T[K]> extends Array<infer I>
        ? I extends Model
          ? I[] | PartialModelObject<I>[]
          : Expression<T[K]>
        : NonNullable<T[K]> extends Model
          ? Expression<T[K]> | PartialModelObject<NonNullable<T[K]>> // nullable to-one relations
          : Expression<T[K]>;
  };

  /**
   * Like PartialModelObject, but relation properties are not allowed. Unlike
   * PartialModelObject, this doesn't depend on the relation types, so query
   * builders for models with narrowed relations (see WithGraphModel) remain
   * assignable to the query builders for the plain models.
   */
  type PartialModelProps<T extends Model> = {
    [K in DataPropertyNames<T>]?: Defined<T[K]> extends Model | Model[] ? never : Expression<T[K]>;
  };

  /**
   * Additional optional parameters that may be used in graphs.
   */
  type GraphParameters = {
    '#dbRef'?: MaybeCompositeId;
    '#ref'?: string;
    '#id'?: string;
    '#unrelate'?: boolean;
    '#delete'?: boolean;
  };

  /**
   * Just like PartialModelObject but this is applied recursively to relations.
   */
  type PartialModelGraph<M, T = M & GraphParameters> = T extends any
    ? {
        [K in DataPropertyNames<T>]?: null extends T[K]
          ? PartialModelGraphField<NonNullable<T[K]>> | null // handle nullable BelongsToOneRelations
          : PartialModelGraphField<T[K]>;
      }
    : never;

  type PartialModelGraphField<F> =
    Defined<F> extends Model
      ? PartialModelGraph<Defined<F>>
      : Defined<F> extends Array<infer I>
        ? I extends Model
          ? PartialModelGraph<I>[]
          : Expression<F>
        : Expression<F>;

  /**
   * Marks a model property whose value the database generates, like an
   * auto-incremented id, a timestamp or a column with a default value. It
   * reads as T and accepts T, but `Insertable` and `InsertableGraph` treat
   * the property as optional:
   *
   *   id!: Generated<number>;
   */
  export type Generated<T> = T extends null | undefined ? T : T & GeneratedBrand;

  interface GeneratedBrand {
    readonly [generated]?: true;
  }

  /**
   * Insert keys are optional for optional, nullable and generated properties.
   */
  type OptionalInsertPropertyNames<M> = {
    [K in keyof M]-?: {} extends Pick<M, K>
      ? K
      : null extends M[K]
        ? K
        : typeof generated extends keyof NonNullable<M[K]>
          ? K
          : never;
  }[keyof M];

  type InsertablePropertyNames<M> = Exclude<DataPropertyNames<M>, RelationPropertyNames<M>>;

  /**
   * The data to insert a model M with `insert()`. Unlike `PartialModelObject`,
   * all properties are required except optional, nullable and `Generated`
   * ones. Relation properties are left out.
   */
  export type Insertable<M extends Model> = {
    [K in Exclude<InsertablePropertyNames<M>, OptionalInsertPropertyNames<M>>]: Expression<M[K]>;
  } & {
    [K in Extract<InsertablePropertyNames<M>, OptionalInsertPropertyNames<M>>]?: Expression<M[K]>;
  };

  /**
   * Like `Insertable`, but for `insertGraph()`: relation properties are
   * optional and hold the insertable graphs of the related models, or
   * references to existing ones through `#dbRef` or `#ref`.
   */
  export type InsertableGraph<M extends Model> = Insertable<M> &
    Omit<GraphParameters, '#dbRef' | '#ref'> & {
      [K in RelationPropertyNames<M>]?: InsertableGraphField<M[K]>;
    };

  type InsertableGraphReference = { '#dbRef': MaybeCompositeId } | { '#ref': string };

  type InsertableGraphField<F> =
    NonNullable<F> extends (infer I extends Model)[]
      ? (InsertableGraph<I> | InsertableGraphReference)[]
      : NonNullable<F> extends infer I extends Model
        ? InsertableGraph<I> | InsertableGraphReference | Extract<F, null>
        : never;

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
   * Gets the single or undefined item query builder type for a query builder.
   */
  type MaybeSingleQueryBuilder<QB extends AnyQueryBuilder> = QB['MaybeSingleQueryBuilderType'];

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
   * https://ditojs.github.io/objection/api/types/#type-fieldexpression
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
    (table: TableRef<QB>, options?: { only?: boolean }): QB;
  }

  interface FromRawMethod<QB extends AnyQueryBuilder> extends RawInterface<QB> {}

  interface JsonExtraction {
    column: string | Raw | Knex.QueryBuilder;
    path: string;
    alias?: string;
    singleValue?: boolean;
  }

  interface JsonExtract<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(
      column: ModelProps<ModelType<QBP>>,
      path: string,
      alias?: string,
      singleValue?: boolean,
    ): QB;

    (column: ColumnRef, path: string, alias?: string, singleValue?: boolean): QB;
    (column: JsonExtraction[] | any[][], singleValue?: boolean): QB;
  }

  interface JsonSet<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(
      column: ModelProps<ModelType<QBP>>,
      path: string,
      value: any,
      alias?: string,
    ): QB;

    (column: ColumnRef, path: string, value: any, alias?: string): QB;
  }

  interface JsonInsert<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(
      column: ModelProps<ModelType<QBP>>,
      path: string,
      value: any,
      alias?: string,
    ): QB;

    (column: ColumnRef, path: string, value: any, alias?: string): QB;
  }

  interface JsonRemove<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(column: ModelProps<ModelType<QBP>>, path: string, alias?: string): QB;

    (column: ColumnRef, path: string, alias?: string): QB;
  }

  interface WhereMethod<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(
      col: ModelProps<ModelType<QBP>>,
      op: Operator,
      expr: Expression<PrimitiveValue>,
    ): QB;

    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, expr: Expression<PrimitiveValue>): QB;

    (col: ColumnRef, op: Operator, expr: Expression<PrimitiveValue>): QB;
    (col: ColumnRef, expr: Expression<PrimitiveValue>): QB;

    (condition: boolean): QB;
    (cb: CallbackVoid<QB>): QB;
    (raw: Raw): QB;
    <QBA extends AnyQueryBuilder>(qb: QBA): QB;

    (obj: PartialModelProps<ModelType<QB>>): QB;
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

    (col: ColumnRef | ColumnRef[], expr: readonly Expression<PrimitiveValue>[]): QB;
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

  interface WhereJsonObject<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(col: ModelProps<ModelType<QBP>>, value: any): QB;

    (col: ColumnRef, value: any): QB;
  }

  interface WhereJsonPath<QB extends AnyQueryBuilder> {
    // These must come first so that we get autocomplete.
    <QBP extends QB>(
      col: ModelProps<ModelType<QBP>>,
      jsonPath: string,
      operator: string,
      value: any,
    ): QB;

    (col: ColumnRef, jsonPath: string, operator: string, value: any): QB;
  }

  interface WhereJsonMethod<QB extends AnyQueryBuilder> {
    (
      fieldExpression: FieldExpression,
      jsonObjectOrFieldExpression: JsonObjectOrFieldExpression,
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
      value: boolean | number | string | null,
    ): QB;
  }

  interface WhereCompositeMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef[], op: Operator, expr: readonly Expression<PrimitiveValue>[]): QB;
    (column: ColumnRef, expr: Expression<PrimitiveValue>): QB;
    (column: ColumnRef, op: Operator, expr: Expression<PrimitiveValue>): QB;
    (column: ColumnRef[], expr: readonly Expression<PrimitiveValue>[]): QB;
    (column: ColumnRef[], qb: AnyQueryBuilder): QB;
  }

  interface WhereInCompositeMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, expr: readonly Expression<PrimitiveValue>[]): QB;
    (column: ColumnRef, qb: AnyQueryBuilder): QB;
    (column: ColumnRef[], expr: readonly Expression<PrimitiveValue>[][]): QB;
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
      wrap?: boolean,
    ): QB;
    (
      arg1: QBOrCallback<QB>,
      arg2: QBOrCallback<QB>,
      arg3: QBOrCallback<QB>,
      arg4: QBOrCallback<QB>,
      arg5: QBOrCallback<QB>,
      wrap?: boolean,
    ): QB;
    (
      arg1: QBOrCallback<QB>,
      arg2: QBOrCallback<QB>,
      arg3: QBOrCallback<QB>,
      arg4: QBOrCallback<QB>,
      arg5: QBOrCallback<QB>,
      arg6: QBOrCallback<QB>,
      wrap?: boolean,
    ): QB;
    (
      arg1: QBOrCallback<QB>,
      arg2: QBOrCallback<QB>,
      arg3: QBOrCallback<QB>,
      arg4: QBOrCallback<QB>,
      arg5: QBOrCallback<QB>,
      arg6: QBOrCallback<QB>,
      arg7: QBOrCallback<QB>,
      wrap?: boolean,
    ): QB;
  }

  interface WithMethod<QB extends AnyQueryBuilder> {
    (alias: string, expr: CallbackVoid<QB> | AnyQueryBuilder | Raw): QB;
    (alias: string, columns: string[], expr: CallbackVoid<QB> | AnyQueryBuilder | Raw): QB;
  }

  interface JoinRelatedOptions {
    alias?: string | boolean;
    aliases?: Record<string, string>;
  }

  interface JoinRelatedMethod<QB extends AnyQueryBuilder> {
    (expr: RelationExpression<ModelType<QB>>, opt?: JoinRelatedOptions): QB;
  }

  interface JoinMethod<QB extends AnyQueryBuilder> {
    (table: TableRef<QB>, leftCol: ColumnRef, op: Operator, rightCol: ColumnRef): QB;
    (table: TableRef<QB>, leftCol: ColumnRef, rightCol: ColumnRef): QB;
    (table: TableRef<QB>, cb: CallbackVoid<Knex.JoinClause>): QB;
    (table: TableRef<QB>, columns: { [leftCol: string]: ColumnRef }): QB;
    (table: TableRef<QB>, raw: Raw): QB;
    (raw: Raw): QB;
  }

  interface JoinRawMethod<QB extends AnyQueryBuilder> extends RawInterface<QB> {}

  interface IncrementDecrementMethod<QB extends AnyQueryBuilder> {
    (column: string, amount?: number): QB;
  }

  interface AggregateMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef): QB;
    (aliasToColumnDict: { [alias: string]: ColumnRef }): QB;
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
    nulls?: OrderByNulls;
  }

  type ColumnRefOrOrderByDescriptor = ColumnRef | OrderByDescriptor;

  interface OrderByMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, order?: OrderByDirection, nulls?: OrderByNulls): QB;
    (columns: ColumnRefOrOrderByDescriptor[]): QB;
  }

  interface OrderByRawMethod<QB extends AnyQueryBuilder> extends RawInterface<QB> {}

  interface FirstMethod {
    <QB extends AnyQueryBuilder>(
      this: QB,
    ): [ResultType<QB>] extends [any[]] ? MaybeSingleQueryBuilder<QB> : QB;
  }

  type ForIdValue = MaybeCompositeId | AnyQueryBuilder;

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
    (): Promise<Knex.ColumnInfo>;
  }

  interface TableRefForMethod {
    (modelClassOrTableName: string | AnyModelConstructor): string;
  }

  interface AliasForMethod<QB extends AnyQueryBuilder> {
    (modelClassOrTableName: string | AnyModelConstructor): string | null;
    (modelClassOrTableName: string | AnyModelConstructor, alias: string): QB;
  }

  interface ModelClassMethod<M extends Model> {
    (): ModelClass<M>;
  }

  interface ReturningOptions {
    includeTriggerModifications?: boolean;
  }

  type ReturningColumn = string | Raw | readonly (string | Raw)[];

  /**
   * The arguments of `returning()`: any number of columns or column arrays,
   * optionally followed by an options object.
   */
  type ReturningArgs =
    ReturningColumn[] | [ReturningColumn, ...ReturningColumn[], ReturningOptions | undefined];

  interface ReturningMethod {
    <QB extends AnyQueryBuilder>(
      this: QB,
      ...args: ReturningArgs
    ): QB extends NumberQueryBuilder<QB> ? ArrayQueryBuilder<QB> : QB;
  }

  /**
   * With `returning()`, `relate()` returns the inserted join rows for
   * many-to-many relations, the updated related rows for has-many relations
   * and the updated owner rows for belongs-to-one relations. The typings can't
   * tell these apart, so the rows are typed as `any`.
   */
  interface RelateReturningMethod<M extends Model> {
    (...args: ReturningArgs): QueryBuilder<M, any[]>;
  }

  type RelateQueryBuilder<QB extends AnyQueryBuilder> = {
    returning: RelateReturningMethod<ModelType<QB>>;
  } & NumberQueryBuilder<QB>;

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
    (this: QB, knexQuery: Knex.QueryBuilder, query: QB): void;
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
    relate?: boolean | string | string[];
    allowRefs?: boolean;
  }

  interface InsertGraphMethod<M extends Model> {
    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<M>,
      options?: InsertGraphOptions,
    ): SingleQueryBuilder<QB>;

    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<M>[],
      options?: InsertGraphOptions,
    ): ArrayQueryBuilder<QB>;
  }

  export interface UpsertGraphOptions {
    relate?: boolean | string | string[];
    unrelate?: boolean | string | string[];
    insertMissing?: boolean | string | string[];
    update?: boolean | string | string[];
    noInsert?: boolean | string | string[];
    noUpdate?: boolean | string | string[];
    noDelete?: boolean | string | string[];
    noRelate?: boolean | string | string[];
    noUnrelate?: boolean | string | string[];
    allowRefs?: boolean;
    allowMarkers?: boolean;
  }

  interface UpsertGraphMethod<M extends Model> {
    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<M>[],
      options?: UpsertGraphOptions,
    ): ArrayQueryBuilder<QB>;

    <QB extends AnyQueryBuilder>(
      this: QB,
      graph: PartialModelGraph<M>,
      options?: UpsertGraphOptions,
    ): SingleQueryBuilder<QB>;
  }

  interface GraphExpressionObjectMethod<QB extends AnyQueryBuilder> {
    (): any;
  }

  export interface GraphOptions {
    minimize?: boolean;
    separator?: string;
    aliases?: { [key: string]: string };
    joinOperation?: string;
    maxBatchSize?: number;
  }

  export interface WithGraphOptions extends GraphOptions {
    algorithm?: 'fetch' | 'join';
  }

  interface ModifyGraphMethod<QB extends AnyQueryBuilder> {
    <M extends Model>(
      expr: RelationExpression<ModelType<QB>>,
      modifier: Modifier<QueryBuilderType<M>>,
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

  export interface Pojo {
    [key: string]: any;
  }

  export interface CatchablePromiseLike<R> extends PromiseLike<R> {
    catch<FR = never>(
      onrejected?: ((reason: any) => FR | PromiseLike<FR>) | undefined | null,
    ): Promise<R | FR>;
  }

  export class QueryBuilder<M extends Model, R = M[]> implements CatchablePromiseLike<R> {
    static forClass: ForClassMethod;

    constructor(modelClass: ModelConstructor<M>);

    select: SelectMethod<this>;
    columns: SelectMethod<this>;
    column: SelectMethod<this>;
    distinct: SelectMethod<this>;
    distinctOn: SelectMethod<this>;
    as: AsMethod<this>;

    from: FromMethod<this>;
    table: FromMethod<this>;
    into: FromMethod<this>;
    fromRaw: FromRawMethod<this>;

    jsonExtract: JsonExtract<this>;
    jsonSet: JsonSet<this>;
    jsonInsert: JsonInsert<this>;
    jsonRemove: JsonRemove<this>;

    where: WhereMethod<this>;
    andWhere: WhereMethod<this>;
    orWhere: WhereMethod<this>;
    whereNot: WhereMethod<this>;
    andWhereNot: WhereMethod<this>;
    orWhereNot: WhereMethod<this>;
    whereLike: WhereMethod<this>;
    andWhereLike: WhereMethod<this>;
    orWhereLike: WhereMethod<this>;
    whereILike: WhereMethod<this>;
    andWhereILike: WhereMethod<this>;
    orWhereILike: WhereMethod<this>;

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

    whereJsonObject: WhereJsonObject<this>;
    orWhereJsonObject: WhereJsonObject<this>;
    andWhereJsonObject: WhereJsonObject<this>;
    whereNotJsonObject: WhereJsonObject<this>;
    orWhereNotJsonObject: WhereJsonObject<this>;
    andWhereNotJsonObject: WhereJsonObject<this>;

    whereJsonPath: WhereJsonPath<this>;
    orWhereJsonPath: WhereJsonPath<this>;
    andWhereJsonPath: WhereJsonPath<this>;

    whereJsonSupersetOf: WhereJsonMethod<this>;
    andWhereJsonSupersetOf: WhereJsonMethod<this>;
    orWhereJsonSupersetOf: WhereJsonMethod<this>;
    whereJsonNotSupersetOf: WhereJsonMethod<this>;
    andWhereJsonNotSupersetOf: WhereJsonMethod<this>;
    orWhereJsonNotSupersetOf: WhereJsonMethod<this>;
    whereJsonSubsetOf: WhereJsonMethod<this>;
    andWhereJsonSubsetOf: WhereJsonMethod<this>;
    orWhereJsonSubsetOf: WhereJsonMethod<this>;
    whereJsonNotSubsetOf: WhereJsonMethod<this>;
    andWhereJsonNotSubsetOf: WhereJsonMethod<this>;
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

    havingRaw: WhereRawMethod<this>;
    orHavingRaw: WhereRawMethod<this>;

    havingIn: WhereInMethod<this>;
    orHavingIn: WhereInMethod<this>;
    havingNotIn: WhereInMethod<this>;
    orHavingNotIn: WhereInMethod<this>;

    havingNull: WhereNullMethod<this>;
    orHavingNull: WhereNullMethod<this>;
    havingNotNull: WhereNullMethod<this>;
    orHavingNotNull: WhereNullMethod<this>;

    havingExists: WhereExistsMethod<this>;
    orHavingExists: WhereExistsMethod<this>;
    havingNotExists: WhereExistsMethod<this>;
    orHavingNotExists: WhereExistsMethod<this>;

    havingBetween: WhereBetweenMethod<this>;
    orHavingBetween: WhereBetweenMethod<this>;
    havingNotBetween: WhereBetweenMethod<this>;
    orHavingNotBetween: WhereBetweenMethod<this>;

    whereComposite: WhereCompositeMethod<this>;
    whereInComposite: WhereInCompositeMethod<this>;
    whereNotInComposite: WhereInCompositeMethod<this>;

    union: UnionMethod<this>;
    unionAll: UnionMethod<this>;
    intersect: SetOperationsMethod<this>;
    except: SetOperationsMethod<this>;

    with: WithMethod<this>;
    withRecursive: WithMethod<this>;
    withWrapped: WithMethod<this>;
    withMaterialized: WithMethod<this>;
    withNotMaterialized: WithMethod<this>;

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
    none: IdentityMethod<this>;

    orderBy: OrderByMethod<this>;
    orderByRaw: OrderByRawMethod<this>;

    groupBy: GroupByMethod<this>;
    groupByRaw: RawInterface<this>;

    findById(id: MaybeCompositeId): MaybeSingleQueryBuilder<this>;
    findByIds(ids: MaybeCompositeId[]): this;
    findOne: WhereMethod<MaybeSingleQueryBuilder<this>>;

    execute(): Promise<R>;
    castTo<MC extends Model>(modelClass: ModelConstructor<MC>): QueryBuilderType<MC>;
    castTo<R>(): QueryBuilder<M, R>;

    update(update: PartialModelObject<M>): NumberQueryBuilder<this>;
    update(): NumberQueryBuilder<this>;
    updateById(id: MaybeCompositeId, update: PartialModelObject<M>): NumberQueryBuilder<this>;
    updateAndFetch(update: PartialModelObject<M>): SingleQueryBuilder<this>;
    updateAndFetchById(
      id: MaybeCompositeId,
      update: PartialModelObject<M>,
    ): SingleQueryBuilder<this>;

    patch(update: PartialModelObject<M>): NumberQueryBuilder<this>;
    patch(): NumberQueryBuilder<this>;
    patchById(id: MaybeCompositeId, update: PartialModelObject<M>): NumberQueryBuilder<this>;
    patchAndFetch(update: PartialModelObject<M>): SingleQueryBuilder<this>;
    patchAndFetchById(
      id: MaybeCompositeId,
      update: PartialModelObject<M>,
    ): SingleQueryBuilder<this>;

    del(): NumberQueryBuilder<this>;
    delete(): NumberQueryBuilder<this>;
    deleteById(id: MaybeCompositeId): NumberQueryBuilder<this>;

    insert(insert: PartialModelObject<M>): SingleQueryBuilder<this>;
    insert(insert: PartialModelObject<M>[]): ArrayQueryBuilder<this>;
    insert(): SingleQueryBuilder<this>;

    onConflict(column?: ColumnRef | ColumnRef[] | true): this;
    ignore(): this;
    merge(merge?: PartialModelObject<M> | string[]): this;

    insertAndFetch(insert: PartialModelObject<M>): SingleQueryBuilder<this>;
    insertAndFetch(insert: PartialModelObject<M>[]): ArrayQueryBuilder<this>;
    insertAndFetch(): SingleQueryBuilder<this>;

    relate(
      ids: MaybeCompositeId | MaybeCompositeId[] | PartialModelObject<M> | PartialModelObject<M>[],
    ): RelateQueryBuilder<this>;

    unrelate(): NumberQueryBuilder<this>;
    for(ids: ForIdValue | ForIdValue[]): this;

    // With literal relation expressions, the fetched relations become required
    // on the result type, see WithGraphQueryBuilder.
    withGraphFetched<const E extends RelationExpression<M>>(
      expr: E,
      options?: GraphOptions,
    ): WithGraphQueryBuilder<this, E>;
    withGraphJoined<const E extends RelationExpression<M>>(
      expr: E,
      options?: GraphOptions,
    ): WithGraphQueryBuilder<this, E>;
    withGraph<const E extends RelationExpression<M>>(
      expr: E,
      options?: WithGraphOptions,
    ): WithGraphQueryBuilder<this, E>;

    truncate(): Promise<void>;
    allowGraph: AllowGraphMethod<this>;

    throwIfNotFound: (arg?: any) => R extends Model | undefined ? SingleQueryBuilder<this> : this;

    returning: ReturningMethod;
    forUpdate: IdentityMethod<this>;
    forShare: IdentityMethod<this>;
    forNoKeyUpdate: IdentityMethod<this>;
    forKeyShare: IdentityMethod<this>;
    skipLocked: IdentityMethod<this>;
    noWait: IdentityMethod<this>;
    skipUndefined: IdentityMethod<this>;
    debug: IdentityMethod<this>;
    alias: OneArgMethod<string, this>;
    aliasFor: AliasForMethod<this>;
    withSchema: OneArgMethod<string, this>;
    modelClass: ModelClassMethod<M>;
    tableNameFor: TableRefForMethod;
    tableRefFor: TableRefForMethod;
    tableName(): string;
    tableRef(): string;
    reject: OneArgMethod<any, this>;
    resolve: OneArgMethod<any, this>;
    transacting: OneArgMethod<TransactionOrKnex, this>;
    connection: OneArgMethod<TransactionOrKnex, this>;
    timeout: TimeoutMethod<this>;
    columnInfo: ColumnInfoMethod<this>;

    toKnexQuery<T extends {} = ModelObject<M>>(): Knex.QueryBuilder<T, T[]>;
    knex(knex?: Knex): Knex;
    clone(): this;
    emptyInstance(): this;

    page(page: number, pageSize: number): PageQueryBuilder<this>;
    range(): PageQueryBuilder<this>;
    range(start: number, end: number): PageQueryBuilder<this>;
    offset(offset: number, options?: boolean | { skipBinding?: boolean }): this;
    limit(limit: number, options?: boolean | { skipBinding?: boolean }): this;
    resultSize(): Promise<number>;

    runBefore: RunBeforeMethod<this>;
    runAfter: RunAfterMethod<this>;

    onBuild: OnBuildMethod<this>;
    onBuildKnex: OnBuildKnexMethod<this>;
    onError: OnErrorMethod<this>;

    insertGraph: InsertGraphMethod<M>;
    insertGraphAndFetch: InsertGraphMethod<M>;

    upsertGraph: UpsertGraphMethod<M>;
    upsertGraphAndFetch: UpsertGraphMethod<M>;

    graphExpressionObject: GraphExpressionObjectMethod<this>;

    modifyGraph: ModifyGraphMethod<this>;

    context: ContextMethod<this>;
    clearContext: ClearContextMethod<this>;

    modify: ModifyMethod<this>;
    modifiers: ModifiersMethod<this>;

    isFind: BooleanReturningMethod;
    isExecutable: BooleanReturningMethod;
    isInsert: BooleanReturningMethod;
    isUpdate: BooleanReturningMethod;
    isDelete: BooleanReturningMethod;
    isRelate: BooleanReturningMethod;
    isUnrelate: BooleanReturningMethod;
    isInternal: BooleanReturningMethod;
    isJoinChildQuery: BooleanReturningMethod;
    hasWheres: BooleanReturningMethod;
    hasSelects: BooleanReturningMethod;
    hasWithGraph: BooleanReturningMethod;

    has: HasMethod;
    clear: ClearMethod<this>;

    clearSelect: IdentityMethod<this>;
    clearOrder: IdentityMethod<this>;
    clearWhere: IdentityMethod<this>;
    clearWithGraph: IdentityMethod<this>;
    clearAllowGraph: IdentityMethod<this>;

    ModelType: M;
    ResultType: R;

    ArrayQueryBuilderType: QueryBuilder<M, M[]>;
    SingleQueryBuilderType: QueryBuilder<M, M>;
    MaybeSingleQueryBuilderType: QueryBuilder<M, M | undefined>;
    NumberQueryBuilderType: QueryBuilder<M, number>;
    PageQueryBuilderType: QueryBuilder<M, Page<M>>;

    then<R1 = R, R2 = never>(
      onfulfilled?: ((value: R) => R1 | PromiseLike<R1>) | undefined | null,
      onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | undefined | null,
    ): Promise<R1 | R2>;

    catch<FR = never>(
      onrejected?: ((reason: any) => FR | PromiseLike<FR>) | undefined | null,
    ): Promise<R | FR>;
  }

  type X<T> = Promise<T>;

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

  export type Transaction = Knex.Transaction;
  export type TransactionOrKnex = Transaction | Knex;

  export interface RelationMappings {
    [relationName: string]: RelationMapping<any>;
  }

  export type RelationMappingsThunk = () => RelationMappings;

  type ModelClassFactory = () => AnyModelConstructor;
  type ModelClassSpecifier = ModelClassFactory | AnyModelConstructor | string;
  type RelationMappingHook<M extends Model> = (
    model: M,
    context: QueryContext,
  ) => Promise<void> | void;
  type RelationMappingBeforeInsertHook<M extends Model> = (
    model: M,
    context: QueryContext,
    owner?: Model,
  ) => Promise<void> | void;
  type StringOrReferenceBuilder = string | ReferenceBuilder;
  type RelationMappingColumnRef = StringOrReferenceBuilder | StringOrReferenceBuilder[];

  export interface RelationMapping<M extends Model> {
    relation: RelationType;
    modelClass: ModelClassSpecifier;
    join: RelationJoin;
    modify?: Modifier<QueryBuilderType<M>>;
    filter?: Modifier<QueryBuilderType<M>>;
    beforeInsert?: RelationMappingBeforeInsertHook<M>;
  }

  export interface RelationJoin {
    from: RelationMappingColumnRef;
    to: RelationMappingColumnRef;
    through?: RelationThrough<any>;
  }

  export interface RelationThrough<M extends Model> {
    from: RelationMappingColumnRef;
    to: RelationMappingColumnRef;
    extra?: string | string[] | Record<string, string>;
    modelClass?: ModelClassSpecifier;
    modify?: Modifier<QueryBuilderType<M>>;
    filter?: Modifier<QueryBuilderType<M>>;
    beforeInsert?: RelationMappingHook<M>;
  }

  export interface RelationType extends Constructor<Relation> {}

  // The relation types are branded so that `TypedRelationMappings` can tell
  // them apart. The brand is optional, so any `RelationType` is assignable.
  export interface BelongsToOneRelationType extends RelationType {
    readonly [relationKind]?: 'BelongsToOne';
  }
  export interface HasOneRelationType extends RelationType {
    readonly [relationKind]?: 'HasOne';
  }
  export interface HasManyRelationType extends RelationType {
    readonly [relationKind]?: 'HasMany';
  }
  export interface ManyToManyRelationType extends RelationType {
    readonly [relationKind]?: 'ManyToMany';
  }
  export interface HasOneThroughRelationType extends RelationType {
    readonly [relationKind]?: 'HasOneThrough';
  }

  /**
   * Names of the properties of M that hold related models.
   */
  type RelationPropertyNames<M> = {
    [K in keyof M]-?: NonNullable<M[K]> extends Model | Model[] ? K : never;
  }[keyof M];

  type TypedModelClassSpecifier<M extends Model> =
    string | ModelConstructor<M> | (() => ModelConstructor<M>);

  /**
   * A `RelationMapping` for related models of type M with relation type R.
   */
  export interface TypedRelationMapping<
    M extends Model,
    R extends RelationType = RelationType,
  > extends RelationMapping<M> {
    relation: R;
    modelClass: TypedModelClassSpecifier<M>;
  }

  type TypedRelationMappingFor<T> =
    NonNullable<T> extends (infer I extends Model)[]
      ? TypedRelationMapping<I, HasManyRelationType | ManyToManyRelationType>
      : NonNullable<T> extends infer I extends Model
        ? TypedRelationMapping<
            I,
            BelongsToOneRelationType | HasOneRelationType | HasOneThroughRelationType
          >
        : never;

  /**
   * Relation mappings checked against the relation properties of model M.
   * Use it with `satisfies`, so the inferred type of the mappings is kept:
   *
   *   static relationMappings = {
   *     pets: { ... },
   *   } satisfies TypedRelationMappings<Person>;
   */
  export type TypedRelationMappings<M extends Model> = [RelationPropertyNames<M>] extends [never]
    ? Record<string, never>
    : { [K in RelationPropertyNames<M>]?: TypedRelationMappingFor<M[K]> };

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
    isOneToOne(): boolean;
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
    format?: Pojo;
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
    onCreateAjv(ajv: Ajv): void;
    options?: AjvOptions;
  }

  export class AjvValidator extends Validator {
    constructor(config: AjvConfig);
  }

  /**
   * The options shared by `snakeCaseMappers` and `knexSnakeCaseMappers`.
   */
  export interface SnakeCaseOptions {
    upperCase?: boolean;
    underscoreBeforeDigits?: boolean;
    underscoreBetweenUppercaseLetters?: boolean;
    noDoubleUnderscores?: boolean;
  }

  export interface SnakeCaseMappersOptions extends SnakeCaseOptions {
    /**
     * Only convert the column part of field expressions like
     * `jsonColumn:someKey` and keep their JSON keys as written.
     */
    preserveJsonKeys?: boolean;
  }

  export interface KnexSnakeCaseMappersOptions extends SnakeCaseOptions {}

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
    (options?: KnexSnakeCaseMappersOptions): KnexMappers;
  }

  export interface KnexIdentifierMappingFactory {
    (colToProp: Record<string, string>): KnexMappers;
  }

  export type ValidationErrorType =
    'ModelValidation' | 'RelationExpression' | 'UnallowedRelation' | 'InvalidGraph';

  export class ValidationError extends Error {
    constructor(args: CreateValidationErrorArgs & { modelClass?: ModelClass<Model> });

    statusCode: number;
    message: string;
    data?: ErrorHash | any;
    type: ValidationErrorType | string;
    modelClass: ModelClass<Model>;
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
    constructor(args: CreateNotFoundErrorArgs & { modelClass?: ModelClass<Model> });

    statusCode: number;
    data?: any;
    type: 'NotFound';
    modelClass: ModelClass<Model>;
  }

  export interface CreateNotFoundErrorArgs {
    statusCode?: number;
    message?: string;
    data?: any;
    [key: string]: any;
  }

  export interface TableMetadata {
    columns: Array<string>;
  }

  export interface TableMetadataOptions {
    table: string;
  }

  export interface FetchTableMetadataOptions {
    knex?: Knex;
    force?: boolean;
    table?: string;
  }

  export interface Constructor<T> {
    new (): T;
  }

  interface PrototypeType<T> extends Function {
    prototype: T;
  }

  interface ConstructorFunctionType<T = any> extends PrototypeType<T> {
    new (...args: any[]): T;
  }

  // for internal use on generic static this deduction, copied from https://github.com/microsoft/TypeScript/issues/5863#issuecomment-1483978415
  type ConstructorType<T = unknown, Static extends Record<string, any> = PrototypeType<T>> = (
    ConstructorFunctionType<T> | PrototypeType<T>
  ) & {
    [Key in keyof Static]: Static[Key];
  };

  export interface ModelConstructor<M extends Model> extends Constructor<M> {}

  export interface ModelClass<M extends Model> extends ModelConstructor<M> {
    QueryBuilder: typeof QueryBuilder;

    tableName: string;
    idColumn: null | string | string[] | readonly string[];
    jsonSchema: JSONSchema;
    relationMappings: RelationMappings | RelationMappingsThunk;
    modelPaths: string[];
    jsonAttributes: string[] | readonly string[];
    virtualAttributes: string[];
    uidProp: string;
    uidRefProp: string;
    dbRefProp: string;
    propRefRegex: RegExp;
    graphUnrelateProp: string;
    graphDeleteProp: string;
    pickJsonSchemaProperties: boolean;
    relatedFindQueryMutates: boolean;
    relatedInsertQueryMutates: boolean;
    useLimitInFirst: boolean;
    modifiers: Modifiers;
    columnNameMappers: ColumnNameMappers;

    raw: RawFunction;
    ref: ReferenceFunction;
    fn: FunctionFunction;

    BelongsToOneRelation: BelongsToOneRelationType;
    HasOneRelation: HasOneRelationType;
    HasManyRelation: HasManyRelationType;
    ManyToManyRelation: ManyToManyRelationType;
    HasOneThroughRelation: HasOneThroughRelationType;

    defaultGraphOptions?: GraphOptions;

    query(this: Constructor<M>, trxOrKnex?: TransactionOrKnex): QueryBuilderType<M>;

    relatedQuery<K extends keyof M>(
      relationName: K,
      trxOrKnex?: TransactionOrKnex,
    ): ArrayRelatedQueryBuilder<M[K]>;

    relatedQuery<RM extends Model>(
      relationName: string,
      trxOrKnex?: TransactionOrKnex,
    ): QueryBuilderType<RM>;

    fromJson(json: object, opt?: ModelOptions): M;
    fromDatabaseJson(json: object): M;

    columnNameToPropertyName(columnName: string): string;
    propertyNameToColumnName(propertyName: string): string;

    createValidator(): Validator;
    createValidationError(args: CreateValidationErrorArgs): Error;
    createNotFoundError(queryContext: QueryContext, args: CreateNotFoundErrorArgs): Error;

    tableMetadata(opt?: TableMetadataOptions): TableMetadata;
    fetchTableMetadata(opt?: FetchTableMetadataOptions): Promise<TableMetadata>;

    knex(knex?: Knex): Knex;
    knexQuery(): Knex.QueryBuilder;
    startTransaction(knexOrTransaction?: TransactionOrKnex): Promise<Transaction>;

    transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
    transaction<T>(
      trxOrKnex: TransactionOrKnex,
      callback: (trx: Transaction) => Promise<T>,
    ): Promise<T>;

    bindKnex(trxOrKnex: TransactionOrKnex): this;
    bindTransaction(trxOrKnex: TransactionOrKnex): this;

    fetchGraph<const E extends RelationExpression<M>>(
      modelOrObject: PartialModelObject<M>,
      expression: E,
      options?: FetchGraphOptions,
    ): SingleQueryBuilder<WithGraphModelQueryBuilder<M, E>>;

    fetchGraph<const E extends RelationExpression<M>>(
      modelOrObject: PartialModelObject<M>[],
      expression: E,
      options?: FetchGraphOptions,
    ): WithGraphModelQueryBuilder<M, E>;

    getRelations(): Relations;
    getRelation(name: string): Relation;

    traverse(models: Model | Model[], traverser: TraverserFunction): void;
    traverse(
      filterConstructor: ModelConstructor<Model>,
      models: Model | Model[],
      traverser: TraverserFunction,
    ): void;
    traverseAsync(models: Model | Model[], traverser: TraverserFunction): Promise<void>;
    traverseAsync(
      filterConstructor: ModelConstructor<Model>,
      models: Model | Model[],
      traverser: TraverserFunction,
    ): Promise<void>;

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
    static idColumn: null | string | string[] | readonly string[];
    static jsonSchema: JSONSchema;
    static relationMappings: RelationMappings | RelationMappingsThunk;
    static modelPaths: string[];
    static jsonAttributes: string[] | readonly string[];
    static virtualAttributes: string[];
    static uidProp: string;
    static uidRefProp: string;
    static dbRefProp: string;
    static propRefRegex: RegExp;
    static graphUnrelateProp: string;
    static graphDeleteProp: string;
    static pickJsonSchemaProperties: boolean;
    static relatedFindQueryMutates: boolean;
    static relatedInsertQueryMutates: boolean;
    static useLimitInFirst: boolean;
    static modifiers: Modifiers;
    static columnNameMappers: ColumnNameMappers;

    static raw: RawFunction;
    static ref: ReferenceFunction;
    static fn: FunctionFunction;

    static BelongsToOneRelation: BelongsToOneRelationType;
    static HasOneRelation: HasOneRelationType;
    static HasManyRelation: HasManyRelationType;
    static ManyToManyRelation: ManyToManyRelationType;
    static HasOneThroughRelation: HasOneThroughRelationType;

    static defaultGraphOptions?: GraphOptions;

    static query<M extends Model>(
      this: ConstructorType<M>,
      trxOrKnex?: TransactionOrKnex,
    ): QueryBuilderType<M>;

    static relatedQuery<M extends Model, K extends keyof M>(
      this: ConstructorType<M>,
      relationName: K,
      trxOrKnex?: TransactionOrKnex,
    ): ArrayRelatedQueryBuilder<M[K]>;

    static relatedQuery<RM extends Model>(
      relationName: string,
      trxOrKnex?: TransactionOrKnex,
    ): QueryBuilderType<RM>;

    static fromJson<M extends Model>(this: ConstructorType<M>, json: object, opt?: ModelOptions): M;
    static fromDatabaseJson<M extends Model>(this: ConstructorType<M>, json: object): M;

    static columnNameToPropertyName(columnName: string): string;
    static propertyNameToColumnName(propertyName: string): string;

    static createValidator(): Validator;
    static createValidationError(args: CreateValidationErrorArgs): Error;
    static createNotFoundError(queryContext: QueryContext, args: CreateNotFoundErrorArgs): Error;

    static tableMetadata(opt?: TableMetadataOptions): TableMetadata;
    static fetchTableMetadata(opt?: FetchTableMetadataOptions): Promise<TableMetadata>;

    static knex(knex?: Knex): Knex;
    static knexQuery(): Knex.QueryBuilder;
    static startTransaction(knexOrTransaction?: TransactionOrKnex): Promise<Transaction>;

    static transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
    static transaction<T>(
      trxOrKnex: TransactionOrKnex | undefined,
      callback: (trx: Transaction) => Promise<T>,
    ): Promise<T>;

    static bindKnex<M>(this: M, trxOrKnex: TransactionOrKnex): M;
    static bindTransaction<M>(this: M, trxOrKnex: TransactionOrKnex): M;

    // E defaults to `string` so that `fetchGraph<Person>(...)` still compiles,
    // without narrowing, as TypeScript doesn't infer the remaining arguments.
    static fetchGraph<M extends Model, const E extends RelationExpression<M> = string>(
      this: ConstructorType<M>,
      modelOrObject: PartialModelObject<M>,
      expression: E,
      options?: FetchGraphOptions,
    ): SingleQueryBuilder<WithGraphModelQueryBuilder<M, E>>;

    static fetchGraph<M extends Model, const E extends RelationExpression<M> = string>(
      this: ConstructorType<M>,
      modelOrObject: PartialModelObject<M>[],
      expression: E,
      options?: FetchGraphOptions,
    ): WithGraphModelQueryBuilder<M, E>;

    static getRelations(): Relations;
    static getRelation(name: string): Relation;

    static traverse(models: Model | Model[], traverser: TraverserFunction): void;
    static traverse(
      filterConstructor: typeof Model,
      models: Model | Model[],
      traverser: TraverserFunction,
    ): void;
    static traverseAsync(models: Model | Model[], traverser: TraverserFunction): Promise<void>;
    static traverseAsync(
      filterConstructor: typeof Model,
      models: Model | Model[],
      traverser: TraverserFunction,
    ): Promise<void>;

    static beforeFind(args: StaticHookArguments<any>): any;
    static afterFind(args: StaticHookArguments<any>): any;
    static beforeInsert(args: StaticHookArguments<any>): any;
    static afterInsert(args: StaticHookArguments<any>): any;
    static beforeUpdate(args: StaticHookArguments<any>): any;
    static afterUpdate(args: StaticHookArguments<any>): any;
    static beforeDelete(args: StaticHookArguments<any>): any;
    static afterDelete(args: StaticHookArguments<any>): any;

    $modelClass: ModelClass<this>;

    $relatedQuery<K extends keyof this>(
      relationName: K,
      trxOrKnex?: TransactionOrKnex,
    ): RelatedQueryBuilder<this[K]>;

    $relatedQuery<RM extends Model>(
      relationName: string,
      trxOrKnex?: TransactionOrKnex,
    ): QueryBuilderType<RM>;

    $query(trxOrKnex?: TransactionOrKnex): SingleQueryBuilder<QueryBuilderType<this>>;

    $id(id: any): void;
    $id(): any;

    $fetchGraph<const E extends RelationExpression<this>>(
      expression: E,
      options?: FetchGraphOptions,
    ): SingleQueryBuilder<WithGraphModelQueryBuilder<this, E>>;

    $formatDatabaseJson(json: Pojo): Pojo;
    $parseDatabaseJson(json: Pojo): Pojo;

    $formatJson(json: Pojo, opt?: Pojo): Pojo;
    $parseJson(json: Pojo, opt?: ModelOptions): Pojo;

    $beforeValidate(jsonSchema: JSONSchema, json: Pojo, opt: ModelOptions): JSONSchema;
    $validate(json?: Pojo, opt?: ModelOptions): Pojo; // may throw ValidationError if validation fails
    $afterValidate(json: Pojo, opt: ModelOptions): void; // may throw ValidationError if validation fails

    $beforeInsert(queryContext: QueryContext): Promise<any> | void;
    $afterInsert(queryContext: QueryContext): Promise<any> | void;
    $afterUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<any> | void;
    $beforeUpdate(opt: ModelOptions, queryContext: QueryContext): Promise<any> | void;
    $afterFind(queryContext: QueryContext): Promise<any> | void;
    $beforeDelete(queryContext: QueryContext): Promise<any> | void;
    $afterDelete(queryContext: QueryContext): Promise<any> | void;

    $toDatabaseJson(): Pojo;
    $toJson(opt?: ToJsonOptions): ModelObject<this>;
    toJSON(opt?: ToJsonOptions): ModelObject<this>;

    $setJson(json: object, opt?: ModelOptions): this;
    $setDatabaseJson(json: object): this;

    $setRelated<RM extends Model>(
      relation: String | Relation,
      related: RM | RM[] | null | undefined,
    ): this;

    $appendRelated<RM extends Model>(
      relation: String | Relation,
      related: RM | RM[] | null | undefined,
    ): this;

    $set(obj: Pojo): this;
    $clone(opt?: CloneOptions): this;
    $traverse(filterConstructor: typeof Model, traverser: TraverserFunction): this;
    $traverse(traverser: TraverserFunction): this;
    $traverseAsync(filterConstructor: typeof Model, traverser: TraverserFunction): Promise<this>;
    $traverseAsync(traverser: TraverserFunction): Promise<this>;
    $omitFromJson(keys: string | string[] | { [key: string]: boolean }): this;
    $omitFromDatabaseJson(keys: string | string[] | { [key: string]: boolean }): this;

    $knex(): Knex;
    $transaction(): Knex;

    QueryBuilderType: QueryBuilder<this, this[]>;
  }

  /**
   * Overloading is required here until the following issues (at least) are resolved:
   *
   * - https://github.com/microsoft/TypeScript/issues/1360
   * - https://github.com/Microsoft/TypeScript/issues/5453
   *
   * @tutorial https://ditojs.github.io/objection/guide/transactions.html#creating-a-transaction
   */
  export interface transaction {
    start(knexOrModel: Knex | AnyModelConstructor): Promise<Transaction>;

    <MC1 extends AnyModelConstructor, ReturnValue>(
      modelClass1: MC1,
      callback: (boundModelClass: MC1, trx?: Transaction) => Promise<ReturnValue>,
    ): Promise<ReturnValue>;

    <MC1 extends AnyModelConstructor, MC2 extends AnyModelConstructor, ReturnValue>(
      modelClass1: MC1,
      modelClass2: MC2,
      callback: (
        boundModelClass1: MC1,
        boundModelClass2: MC2,
        trx?: Transaction,
      ) => Promise<ReturnValue>,
    ): Promise<ReturnValue>;

    <
      MC1 extends AnyModelConstructor,
      MC2 extends AnyModelConstructor,
      MC3 extends AnyModelConstructor,
      ReturnValue,
    >(
      modelClass1: MC1,
      modelClass2: MC2,
      modelClass3: MC3,
      callback: (
        boundModelClass1: MC1,
        boundModelClass2: MC2,
        boundModelClass3: MC3,
        trx?: Transaction,
      ) => Promise<ReturnValue>,
    ): Promise<ReturnValue>;

    <
      MC1 extends AnyModelConstructor,
      MC2 extends AnyModelConstructor,
      MC3 extends AnyModelConstructor,
      MC4 extends AnyModelConstructor,
      ReturnValue,
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
        trx?: Transaction,
      ) => Promise<ReturnValue>,
    ): Promise<ReturnValue>;

    <
      MC1 extends AnyModelConstructor,
      MC2 extends AnyModelConstructor,
      MC3 extends AnyModelConstructor,
      MC4 extends AnyModelConstructor,
      MC5 extends AnyModelConstructor,
      ReturnValue,
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
        trx?: Transaction,
      ) => Promise<ReturnValue>,
    ): Promise<ReturnValue>;

    <ReturnValue>(
      knex: Knex,
      callback: (trx: Transaction) => Promise<ReturnValue>,
    ): Promise<ReturnValue>;
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
    'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null' | string;

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
     * @see https://json-schema.org/draft/2019-09/release-notes
     */
    $defs?: {
      [key: string]: JSONSchemaDefinition;
    };

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
