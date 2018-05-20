# Transactions

Transactions are atomic and isolated units of work in relational databases. If you are not familiar with transactions, I suggest you read up on them. [The wikipedia article](https://en.wikipedia.org/wiki/Database_transaction) is a good place to start.

## Creating a transaction

In objection, a transaction can be started by calling the [objection.transaction](/api/objection.html#transaction) function:

```js
const { transaction } = require('objection');

try {
  const returnValue = await transaction(Person.knex(), async (trx) => {
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

You need to pass a knex instance as the first argument. If you don't have a knex instance otherwise available you can always access it through any [Model](/api/model.html) using [Model.knex()](/api/model.html#static-knex) provided that you have installed the knex instance globally using [Model.knex(knex)](/api/model.html#static-knex) at some point.

The second argument is a callback that gets called with the transaction object as an argument once the transaction has been successfully started. The transaction object is actually just a [knex transaction object](http://knexjs.org/#Transactions) and you can start the transaction just as well using [knex.transaction](http://knexjs.org/#Transactions) function.

The transaction is committed if the promise returned from the callback is resolved successfully. If the returned Promise is rejected or an error is thrown inside the callback the transaction is rolled back.

An alternative way to start a transaction is to use the [objection.transaction.start](/api/objection.html#transaction-start) method:

```js
const { transaction } = require('objection');

let trx;
try {
  trx = await transaction.start(Person.knex());
  // Here you can use the transaction.

  // If you created the transaction using `transaction.start`, you need
  // commit or rollback the transaction manually.
  await trx.commit();
} catch (err) {
  await trx.rollback();
}
```

## Using a transaction

After you have created a transaction, you need to tell objection which queries should be executed inside that transaction. There are two ways to do that:

1. [By passing the transaction object to each query](#passing-around-a-transaction-object)
2. [By binding models to the transaction](#binding-models-to-a-transaction)

### Passing around a transaction object

The most straight forwared way to use a transaction is to explicitly give it to each query you start. [query](/api/model.html#static-query), [$query](/api/model.html#query) and [$relatedQuery](/api/model.html#relatedquery) accept a transaction as their last argument.

```js
const { transaction } = require('objection');
// You can access `knex` instance anywhere you want.
// One way is to get it through any model.
const knex = Person.knex();

try {
  const scrappy = await transaction(knex, async (trx) => {
    const jennifer = await Person
      .query(trx)
      .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

    const scrappy = await jennifer
      .$relatedQuery('pets', trx)
      .insert({name: 'Scrappy'});

    return scrappy;
  });

  console.log('Great success! Both Jennifer and Scrappy were inserted');
} catch (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
}
```

Note that you can pass either a normal knex instance or a transaction to [query](/api/model.html#static-query), [$relatedQuery](/api/model.html#relatedquery) etc. allowing you to build helper functions and services that can be used with or without a transaction. When a transaction is not wanted, just pass in the normal knex instance (or nothing at all if you have installed the knex object globally using [Model.knex(knex)](/api/model.html#static-knex)):

```js
// `db` can be either a transaction or a knex instance or even
// `null` or `undefined` if you have globally set the knex
// instance using `Model.knex(knex)`.
async function insertPersonAndPet(person, pet, db) {
  const person = await Person
    .query(db)
    .insert(person);

  return person
    .$relatedQuery('pets', db)
    .insert(pet);
}

// All following four ways to call insertPersonAndPet work:

// 1.
const trx = await transaction.start(Person.knex());
await insertPersonAndPet(person, pet, trx);
await trx.commit();

// 2.
await transaction(Person.knex(), async (trx) => {
  await insertPersonAndPet(person, pet, trx);
});

// 3.
await insertPersonAndPet(person, pet, Person.knex());

// 4.
await insertPersonAndPet(person, pet);
```

### Binding models to a transaction

The second way to use transactions avoids passing around a transaction object by "binding" model classes to a transaction. You pass all models you want to bind as arguments to the [objection.transaction](/api/objection.html#transaction) method and as the last argument you provide a callback that receives __copies__ of the models that have been bound to a newly started transaction. All queries started through the bound copies take part in the transaction and you don't need to pass around a transaction object. Note that the models passed to the callback are actual copies of the models passed as arguments to [objection.transaction](/api/objection.html#transaction) and starting a query through any other object will __not__ be executed inside a transaction.

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

    await Person
      .query()
      .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

    return Animal
      .query()
      .insert({name: 'Scrappy'});
  });
} catch (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
}
```

You only need to give the [objection.transaction](/api/objection.html#transaction) function the model classes you use explicitly. All the related model classes are implicitly bound to the same transaction:

```js
const { transaction } = require('objection');

try {
  const scrappy = await transaction(Person, async (Person) => {
    const jennifer = await Person
      .query()
      .insert({firstName: 'Jennifer', lastName: 'Lawrence'})

    // This creates a query using the `Animal` model class but we
    // don't need to give `Animal` as one of the arguments to the
    // transaction function because `jennifer` is an instance of
    // the `Person` that is bound to a transaction.
    return jennifer
      .$relatedQuery('pets')
      .insert({name: 'Scrappy'});
  });
} catch (err) {
  console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
}
```

The only way you can mess up with the transactions is if you _explicitly_ start a query using a model class that is not bound to the transaction:

```js
const { transaction } = require('objection');
const Person = require('./models/Person');
const Animal = require('./models/Animal');

await transaction(Person, async (BoundPerson) => {
  // This will be executed inside the transaction.
  const jennifer = await BoundPerson
    .query()
    .insert({firstName: 'Jennifer', lastName: 'Lawrence'});

  // OH NO! This query is executed outside the transaction
  // since the `Animal` class is not bound to the transaction.
  await Animal
    .query()
    .insert({name: 'Scrappy'});

  // OH NO! This query is executed outside the transaction
  // since the `Person` class is not bound to the transaction.
  // BoundPerson !== Person.
  await Person
    .query()
    .insert({firstName: 'Bradley'});
});
```

The transaction object is always passed as the last argument to the callback:

```js
const { transaction } = require('objection');

await transaction(Person, async (Person, trx) => {
  // `trx` is the knex transaction object.
  // It can be passed to `transacting`, `query` etc.
  // methods, or used as a knex query builder.

  const jennifer = await trx('persons').insert({firstName: 'Jennifer', lastName: 'Lawrence'});
  const scrappy = await Animal.query(trx).insert({name: 'Scrappy'});
  const fluffy = await Animal.query().transacting(trx).insert({name: 'Fluffy'});

  return {
    jennifer,
    scrappy,
    fluffy
  };
});
```

Originally we advertised this way of doing transactions as a remedy to the transaction passing plague but it has turned out to be pretty error-prone. This approach is handy for single inline functions that do a handful of operations, but becomes tricky when you have to call services and helper methods that also perform database queries. To get the helpers and service functions to participate in the transaction you need to pass around the bound copies of the model classes. If you `require` the same models in the helpers and start queries through them, they will __not__ be executed in the transaction since the required models are not the bound copies, but the original models from which the copies were taken.
