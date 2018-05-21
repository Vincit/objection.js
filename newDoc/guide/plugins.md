# Plugins

A curated list of plugins and modules for objection. Only plugins that follow [the best practices](#plugin-development-best-practices) are accepted on this list. Other modules like plugins for other frameworks and things that cannot be implemented following the best practices are an exception to this rule. If you are a developer of or otherwise know of a good plugin/module for objection, please create a pull request or an issue to get it added to this list.

## 3rd party plugins

  * [objection-dynamic-finder](https://github.com/snlamm/objection-dynamic-finder) - dynamic finders for your models
  * [objection-db-errors](https://github.com/Vincit/objection-db-errors) - better database errors for your queries
  * [objection-guid](https://github.com/seegno/objection-guid) - automatic guid for your models
  * [objection-password](https://github.com/scoutforpets/objection-password) - automatic password hashing for your models
  * [objection-soft-delete](https://github.com/griffinpp/objection-soft-delete) - Soft delete functionality with minimal configuration
  * [objection-unique](https://github.com/seegno/objection-unique) - Unique validation for your models
  * [objection-visibility](https://github.com/oscaroox/objection-visibility) - whitelist/blacklist your model properties

## Other 3rd party modules

 * [objection-filter](https://github.com/tandg-digital/objection-filter) - API filtering on data and related models
 * [objection-graphql](https://github.com/vincit/objection-graphql) - Automatically generates rich graphql schema for objection models

## Plugin development best practices

When possible, objection.js plugins should be implemented as [class mixins](http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/). A mixin is simply a function that takes a class as an argument and returns a subclass. Plugins should not modify [objection.Model](/api/model.html), [objection.QueryBuilder](/api/query-builder.html) or any other global variables directly. See the [example plugin](https://github.com/Vincit/objection.js/tree/master/examples/plugin) for more info. There is also [another example](https://github.com/Vincit/objection.js/tree/master/examples/plugin-with-options) that should be followed if your plugin takes options or configuration parameters.

Mixin is just a function that takes a class and returns an extended subclass.

```js
function SomeMixin(Model) {
  // The returned class should have no name. That way
  // the superclass's name gets inherited.
  return class extends Model {
    // Your modifications.
  };
}
```

Mixins can be then applied like this:

```js
class Person extends SomeMixin(Model) {

}
```

This __doesn't__ work since mixins never modify the input:

```js
// This does absolutely nothing.
SomeMixin(Model);
class Person extends Model {

}
```

Multiple mixins:

```js
class Person extends SomeMixin(SomeOtherMixin(Model)) {

}
```

There are a couple of helpers in objection main module for applying multiple mixins.

```js
const { mixin, Model } = require('objection');

class Person extends mixin(Model, [
  SomeMixin,
  SomeOtherMixin,
  EvenMoreMixins,
  LolSoManyMixins,
  ImAMixinWithOptions({foo: 'bar'})
]) {

}
```

```js
const { compose, Model } = require('objection');

const mixins = compose(
  SomeMixin,
  SomeOtherMixin,
  EvenMoreMixins,
  LolSoManyMixins,
  ImAMixinWithOptions({foo: 'bar'})
);

class Person extends mixins(Model) {

}
```

Mixins can also be used as decorators:

```js
@SomeMixin
@MixinWithOptions({foo: 'bar'})
class Person extends Model {

}
```
