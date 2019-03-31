'use strict';

const { Model } = require('objection');

class Person extends Model {
  // Table name is the only required property.
  static get tableName() {
    return 'persons';
  }
}

module.exports = {
  Person
};
