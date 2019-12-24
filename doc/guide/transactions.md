# Transactions

Transactions are atomic and isolated units of work in relational databases. If you are not familiar with transactions, I suggest you read up on them. [The wikipedia article](https://en.wikipedia.org/wiki/Database_transaction) is a good place to start.

## Creating a transaction

In objection, a transaction can be started by calling the [Model.transaction](/api/model/static-methods.html#static-transaction) function:

```js
try {
  const returnValue = await Person.transaction(async trx => {
    // Here you can use the transaction.

    // Whatever you return from the transaction callback gets returned
    // from the `transaction` function.
    return 'the return value of the transaction';
  });
  // Here the transaction has been committed.
} catch (err) {
  // Here the transaction has been rolled back.
}
```

The first argument is a callback that gets called with the transaction object as an argument once the transaction has been successfully started. The transaction object is actually just a [knex transaction object](http://knexjs.org/#Transactions) and you can start the transaction just as well using [knex.transaction](http://knexjs.org/#Transactions) function.

The transaction is committed if the promise returned from the callback is resolved successfully. If the returned Promise is rejected or an error is thrown inside the callback the transaction is rolled back.

The above example works if you have installed a knex instance globally using the `Model.knex()` method. If you haven't, you can pass the knex instance as the first argument to the `transaction` method

```js
const returnValue = await Person.transaction(knex, async trx => { ... })
```

Or just simply use `knex.transaction`

```js
const returnValue = await knex.transaction(async trx => { ... })
```

::: tip
Note: Even if you start a transaction using `Person.transaction` it doesn't mean that the transaction is just for `Persons`. It's just a normal knex transaction, no matter what model you use to start it. You can even use the `Model` base class if you want.
:::

An alternative way to start a transaction is to use the [Model.startTransaction()](/api/model/static-methods.html#static-starttransaction) method:

```js
const { transaction } = require('objection');

const trx = await Person.startTransaction();

try {
  // If you created the transaction using `Model.startTransaction`, you need
  // commit or rollback the transaction manually.
  await trx.commit();
} catch (err) {
  await trx.rollback();
  throw err;
}
```

There's also a third way to use transactions, which is described in detail [later](#binding-models-to-a-transaction).

## Using a transaction

After you have created a transaction, you need to tell objection which queries should be executed inside that transaction. There are two ways to do that:

1. [By passing the transaction object to each query](/guide/transactions.html#passing-around-a-transaction-object)
2. [By binding models to the transaction](/guide/transactions.html#binding-models-to-a-transaction)

### Passing around a transaction object

The most straightforward way to use a transaction is to explicitly give it to each query you start. [query](/api/model/static-methods.html#static-query), [\$query](/api/model/instance-methods.html#query) and [\$relatedQuery](/api/model/instance-methods.html#relatedquery) accept a transaction as their last argument.

```js
try {
  const scrappy = await Person.transaction(async trx => {
    const jennifer = await Person.query(trx).insert({
      firstName: 'Jennifer',
      lastName: 'Lawrence'
    });

    const scrappy = await jennifer
      .$relatedQuery('pets', trx)
      .insert({ name: 'Scrappy' });

    return scrappy;
  });

  console.log('Great success! Both Jennifer and Scrappy were inserted');
} catch (err) {
  console.log(
    'Something went wrong. Neither Jennifer nor Scrappy were inserted'
  );
}
```

Note that you can pass either a normal knex instance or a transaction to [query](/api/model/static-methods.html#static-query), [\$relatedQuery](/api/model/instance-methods.html#relatedquery) etc. allowing you to build helper functions and services that can be used with or without a transaction. When a transaction is not wanted, just pass in the normal knex instance (or nothing at all if you have installed the knex object globally using [Model.knex(knex)](/api/model/static-methods.html#static-knex)):

```js
// `db` can be either a transaction or a knex instance or even
// `null` or `undefined` if you have globally set the knex
// instance using `Model.knex(knex)`.
async function insertPersonAndPet(person, pet, db) {
  const person = await Person.query(db).insert(person);

  return person.$relatedQuery('pets', db).insert(pet);
}

// All following four ways to call insertPersonAndPet work:

// 1.
const trx = await Person.startTransaction();
await insertPersonAndPet(person, pet, trx);
await trx.commit();

// 2.
await Person.transaction(async trx => {
  await insertPersonAndPet(person, pet, trx);
});

// 3.
await insertPersonAndPet(person, pet, Person.knex());

// 4.
await insertPersonAndPet(person, pet);
```

### Binding models to a transaction

The second way to use transactions avoids passing around a transaction object by "binding" model classes to a transaction. You pass all models you want to bind as arguments to the [objection.transaction](/api/objection/#transaction) method and as the last argument you provide a callback that receives **copies** of the models that have been bound to a newly started transaction. All queries started through the bound copies take part in the transaction and you don't need to pass around a transaction object. Note that the models passed to the callback are actual copies of the models passed as arguments to [objection.transaction](/api/objection/#transaction) and starting a query through any other object will **not** be executed inside a transaction.

```js
const { transaction } = require('objection');

try {
  const scrappy = await transaction(Person, Animal, async (Person, Animal) => {
    // Person and Animal inside this function are bound to a newly
    // created transaction. The Person and Animal outside this function
    // are not! Even if you do `require('./models/Person')` inside this
    // function and start a query using the required `Person` it will
    // NOT take part in the transaction. Only the actual objects passed
    // to this function are bound to the transaction.

    await Person.query().insert({
      firstName: 'Jennifer',
      lastName: 'Lawrence'
    });

    return Animal.query().insert({ name: 'Scrappy' });
  });
} catch (err) {
  console.log(
    'Something went wrong. Neither Jennifer nor Scrappy were inserted'
  );
}
```

You only need to give the [objection.transaction](/api/objection/#transaction) function the model classes you use explicitly. All the related model classes are implicitly bound to the same transaction:

```js
const { transaction } = require('objection');

try {
  const scrappy = await transaction(Person, async Person => {
    const jennifer = await Person.query().insert({
      firstName: 'Jennifer',
      lastName: 'Lawrence'
    });

    // This creates a query using the `Animal` model class but we
    // don't need to give `Animal` as one of the arguments for the
    // transaction function because `jennifer` is an instance of
    // the `Person` that is bound to a transaction.
    return jennifer.$relatedQuery('pets').insert({ name: 'Scrappy' });
  });
} catch (err) {
  console.log(
    'Something went wrong. Neither Jennifer nor Scrappy were inserted'
  );
}
```

The only way you can mess up with the transactions is if you _explicitly_ start a query using a model class that is not bound to the transaction:

```js
const { transaction } = require('objection');
const Person = require('./models/Person');
const Animal = require('./models/Animal');

await transaction(Person, async BoundPerson => {
  // This will be executed inside the transaction.
  const jennifer = await BoundPerson.query().insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence'
  });

  // OH NO! This query is executed outside the transaction
  // since the `Animal` class is not bound to the transaction.
  await Animal.query().insert({ name: 'Scrappy' });

  // OH NO! This query is executed outside the transaction
  // since the `Person` class is not bound to the transaction.
  // BoundPerson !== Person.
  await Person.query().insert({ firstName: 'Bradley' });
});
```

The transaction object is always passed as the last argument to the callback:

```js
const { transaction } = require('objection');

await transaction(Person, async (Person, trx) => {
  // `trx` is the knex transaction object.
  // It can be passed to `transacting`, `query` etc.
  // methods, or used as a knex query builder.

  const jennifer = await trx('persons').insert({
    firstName: 'Jennifer',
    lastName: 'Lawrence'
  });

  const scrappy = await Animal.query(trx).insert({
    name: 'Scrappy'
  });

  const fluffy = await Animal.query()
    .transacting(trx)
    .insert({
      name: 'Fluffy'
    });

  return {
    jennifer,
    scrappy,
    fluffy
  };
});
```

Originally we advertised this way of doing transactions as a remedy to the transaction passing plague but it has turned out to be pretty error-prone. This approach is handy for single inline functions that do a handful of operations, but becomes tricky when you have to call services and helper methods that also perform database queries. To get the helpers and service functions to participate in the transaction you need to pass around the bound copies of the model classes. If you `require` the same models in the helpers and start queries through them, they will **not** be executed in the transaction since the required models are not the bound copies, but the original models from which the copies were taken.

## Setting the isolation level

You can use `raw` to set the isolation level (among other things):

```js
try {
  const scrappy = await Person.transaction(async trx => {
    await trx.raw('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    const jennifer = await Person.query(trx).insert({
      firstName: 'Jennifer',
      lastName: 'Lawrence'
    });

    const scrappy = await jennifer
      .$relatedQuery('pets', trx)
      .insert({ name: 'Scrappy' });

    return scrappy;
  });

  console.log('Great success! Both Jennifer and Scrappy were inserted');
} catch (err) {
  console.log(
    'Something went wrong. Neither Jennifer nor Scrappy were inserted'
  );
}
```
