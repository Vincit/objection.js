# Custom query builder (extending the query builder)

You can extend the [QueryBuilder](/api/query-builder/) returned by [query()](/api/model/static-methods.html#static-query), [relatedQuery()](/api/model/static-methods.html#static-relatedquery), [\$relatedQuery()](/api/model/instance-methods.html#relatedquery) and [\$query()](/api/model/instance-methods.html#query) methods (and all other methods that create a [QueryBuilder](/api/query-builder/)) by setting the model class's static [QueryBuilder](/api/model/static-methods.html#static-querybuilder) property.

```js
// MyQueryBuilder.js
const { QueryBuilder } = require('objection');

class MyQueryBuilder extends QueryBuilder {
  myCustomMethod(something) {
    doSomething(something);
    return this;
  }
}

// Person.js
const { MyQueryBuilder } = require('./MyQueryBuilder');

class Person extends Model {
  static get QueryBuilder() {
    return MyQueryBuilder;
  }
}
```

Now you can do this:

```js
await Person.query().where('id', 1).myCustomMethod(1).where('foo', 'bar');
```

If you want to set the custom query builder for all model classes you can just set the [QueryBuilder](/api/model/static-methods.html#static-querybuilder) property of the [Model](/api/model/) base class. A cleaner option would be to create your own Model subclass, set its [QueryBuilder](/api/query-builder/) property and inherit all your models from the custom Model class.

```js
// BaseModel.js
const { MyQueryBuilder } = require('./MyQueryBuilder');

class BaseModel extends Model {
  static get QueryBuilder() {
    return MyQueryBuilder;
  }
}

// Person.js
const { BaseModel } = require('./BaseModel');

// Person now uses MyQueryBuilder
class Person extends BaseModel {}
```

Whenever a [QueryBuilder](/api/query-builder/) instance is created it is done by calling the static [query()](/api/model/static-methods.html#static-query) method. If you don't need to add methods, but simply modify the query, you can override the [query()](/api/model/static-methods.html#static-query).

```js
class BaseModel extends Model {
  static query(...args) {
    const query = super.query(...args);

    // Somehow modify the query.
    return query.runAfter((result) => {
      console.log(this.name, 'got result', result);
      return result;
    });
  }
}
```

::: tip
TIP: Consider using [modifiers](/recipes/modifiers.html#usage-in-a-query) instead of extending the query builder. You can often achieve the same flexibility with both.
:::

# Extending the query builder in typescript

With typescript, you need to add some extra type properties for the custom query builder. These are necessary until typescript fully supports our use case. The good news is that you only need to define them once for the shared `BaseModel`. If you don't already have one, it's time to create it.

```ts
import { Model, Page } from 'objection';

class MyQueryBuilder<M extends Model, R = M[]> extends QueryBuilder<M, R> {
  // These are necessary. You can just copy-paste them and change the
  // name of the query builder class.
  ArrayQueryBuilderType!: MyQueryBuilder<M, M[]>;
  SingleQueryBuilderType!: MyQueryBuilder<M, M>;
  MaybeSingleQueryBuilderType!: MyQueryBuilder<M, M | undefined>;
  NumberQueryBuilderType!: MyQueryBuilder<M, number>;
  PageQueryBuilderType!: MyQueryBuilder<M, Page<M>>;

  myCustomMethod(something: number): this {
    doSomething(something);
    return this;
  }
}

class BaseModel extends Model {
  // Both of these are needed.
  QueryBuilderType!: MyQueryBuilder<this>;
  static QueryBuilder = MyQueryBuilder;
}
```

Now all models you inherit from `BaseModel` use `MyQueryBuilder` as a query builder.

```js
class Person extends BaseModel {
  static tableName = 'persons';
}

await Person.query().where('id', 1).myCustomMethod(1).where('foo', 'bar');
```

::: tip
TIP: Consider using [modifiers](/recipes/modifiers.html#usage-in-a-query) instead of extending the query builder. You can often achieve the same flexibility with both.
:::
