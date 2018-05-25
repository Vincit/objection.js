# Custom query builder

You can extend the [QueryBuilder](/api/query-builder.html) returned by [query()](/api/model.html#static-query), [$relatedQuery()](/api/model.html#relatedquery) and [$query()](/api/model.html#query) methods (and all other methods that create a [QueryBuilder](/api/query-builder.html)) by setting the model class's static [QueryBuilder](/api/model.html#static-querybuilder) property.

```js
// MyQueryBuilder.js
const { QueryBuilder } = require('objection');

class MyQueryBuilder extends QueryBuilder {
  // Some custom method.
  upsert(model) {
    if (model.id) {
      return this.update(model).where('id', model.id);
    } else {
      return this.insert(model);
    }
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
await Person.query().upsert(person);
```

If you want to set the custom query builder for all model classes you can just set the [QueryBuilder](/api/model.html#static-querybuilder) property of the [Model](/api/model.html) base class. A cleaner option would be to create your own Model subclass, set its [QueryBuilder](/api/query-builder.html) property and inherit all your models from the custom Model class.


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

Whenever a [QueryBuilder](/api/query-builder.html) instance is created it is done by calling the static [query()](/api/model.html#static-query) method. If you don't need to add methods, but simply modify the query, you can override the [query()](/api/model.html#static-query).

```js
class BaseModel extends Model {
  static query(...args) {
    const query = super.query(...args);

    // Somehow modify the query.
    return query.runAfter(result => {
      console.log(this.name, 'got result', result);
      return result;
    });
  }
}
```
