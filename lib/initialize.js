'use strict';

async function initialize(knex, modelClasses) {
  if (!modelClasses) {
    modelClasses = knex;
    knex = modelClasses[0].knex();
  }

  for (const modelClass of modelClasses) {
    await modelClass.fetchTableMetadata({
      knex
    });
  }
}

module.exports = {
  initialize
};
