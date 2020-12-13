'use strict';

async function initialize(knex, modelClasses) {
  if (!modelClasses) {
    modelClasses = knex;
    knex = modelClasses[0].knex();
  }

  await Promise.all(modelClasses.map((modelClass) => modelClass.fetchTableMetadata({ knex })));
}

module.exports = {
  initialize,
};
