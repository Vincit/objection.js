const { Model } = require("objection");

class Person extends Model {
  static get tableName() {
    return "person";
  }
}

module.exports = { Person };
