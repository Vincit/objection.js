const knexUtils = require('../../../lib/utils/knexUtils');

module.exports = session => {
  describe('cross db', () => {
    if (knexUtils.isMySql(session.knex)) {
      require('./mysql')(session);
    }
  });
};
