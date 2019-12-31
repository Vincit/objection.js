# Plugins

## TypeScript Example

```ts
export function Mixin(options = {}) {
  return function<T extends typeof Model>(Base: T) {
    return class extends Base {
      mixinMethod() {}
    };
  };
}

// Usage

class Person extends Model {}

const MixinPerson = Mixin(Person);

// Or as a decorator:

@Mixin
class Person extends Model {}
```

## TypeScript Example with Custom QueryBuilder

```ts
class CustomQueryBuilder<M extends Model, R = M[]> extends QueryBuilder<M, R> {
  ArrayQueryBuilderType!: CustomQueryBuilder<M, M[]>;
  SingleQueryBuilderType!: CustomQueryBuilder<M, M>;
  NumberQueryBuilderType!: CustomQueryBuilder<M, number>;
  PageQueryBuilderType!: CustomQueryBuilder<M, Page<M>>;

  someCustomMethod(): this {
    return this;
  }
}

export function CustomQueryBuilderMixin(options = {}) {
  return function<T extends typeof Model>(Base: T) {
    return class extends Base {
      static QueryBuilder = QueryBuilder;
      QueryBuilderType: CustomQueryBuilder<this, this[]>;

      mixinMethod() {}
    };
  };
}

// Usage

class Person extends Model {}

const MixinPerson = CustomQueryBuilderMixin(Person);

// Or as a decorator:

@CustomQueryBuilderMixin
class Person extends Model {}

async () => {
  const z = await MixinPerson.query()
    .whereIn('id', [1, 2])
    .someCustomMethod()
    .where('foo', 1)
    .someCustomMethod();

  z[0].mixinMethod();
};
```
