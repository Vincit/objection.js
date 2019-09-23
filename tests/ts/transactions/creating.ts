import { transaction } from '../../../';
import { Person } from '../fixtures/person';

(async () => {
  try {
    const returnValue = await transaction(Person.knex(), async trx => {
      // Here you can use the transaction.

      // Whatever you return from the transaction callback gets returned
      // from the `transaction` function.
      return 'the return value of the transaction';
    });
    // Here the transaction has been committed.
  } catch (err) {
    // Here the transaction has been rolled back.
  }
})();

(async () => {
  let trx;

  try {
    trx = await transaction.start(Person.knex());
    // Here you can use the transaction.

    // If you created the transaction using `transaction.start`, you need
    // commit or rollback the transaction manually.
    await trx.commit();
  } catch (err) {
    trx ? await trx.rollback() : null;
  }
})();
