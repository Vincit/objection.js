class DbMetadata {
  constructor(columnInfo) {
    this.columns = Object.keys(columnInfo);
  }

  static fetch({ modelClass, parentBuilder = null, knex = null } = {}) {
    return modelClass
      .query(knex)
      .childQueryOf(parentBuilder)
      .columnInfo()
      .then(columnInfo => new DbMetadata(columnInfo));
  }
}

module.exports = DbMetadata;
