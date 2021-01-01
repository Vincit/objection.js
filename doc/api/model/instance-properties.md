# Instance Properties

All instance properties start with the character `$` to prevent them from colliding with the database column names.

## $modelClass

```js
const modelClass = person.$modelClass;
```

Returns the class of the model instance. The return value is equal to `this.constructor`. This is mainly useful with typescript where the type is `ModelClass<this>` which is more useful than the `Function` type of `this.constructor`.

##### Examples

```js
const person = Person.fromJson({ id: 1 });
console.log(person.$modelClass === Person); // prints true
```