var knexUtils = require('../../../lib/utils/knexUtils');

module.exports = function (session) {
  describe('cross db', function () {
    if (knexUtils.isMySql(session.knex)) {
      require('./mysql')(session);
    }
  });
};