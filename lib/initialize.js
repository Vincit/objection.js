'use strict';

async function initialize(knex, modelClasses) {
  if (!modelClasses) {
    modelClasses = knex;
    knex = modelClasses[0].knex();
  }

  const promises = modelClasses.reduce((acc, modelClass) => {
    acc.push(modelClass.fetchTableMetadata({ knex }));
    return acc;
  }, []);
  await Promise.all(promises);
}

module.exports = {
  initialize
};
