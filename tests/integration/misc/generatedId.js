const expect = require('expect.js');
const { Model } = require('../../../');

module.exports = session => {
  describe('generated id', () => {
    let TestModel;

    before(() => {
      return session.knex.schema
        .dropTableIfExists('generated_id_test')
        .createTable('generated_id_test', table => {
          table.string('idCol', 32).primary();
          table.string('value');
        });
    });

    after(() => {
      return session.knex.schema.dropTableIfExists('generated_id_test');
    });

    before(() => {
      TestModel = class TestModel extends Model {
        static get tableName() {
          return 'generated_id_test';
        }

        static get idColumn() {
          return 'idCol';
        }

        $beforeInsert() {
          this.idCol = 'someRandomId';
        }
      };

      TestModel.knex(session.knex);
    });

    it('should return the generated id when inserted', () => {
      return TestModel.query()
        .insert({ value: 'hello' })
        .then(ret => {
          expect(ret.idCol).to.equal('someRandomId');
          return session.knex(TestModel.getTableName());
        })
        .then(rows => {
          expect(rows[0]).to.eql({ value: 'hello', idCol: 'someRandomId' });
        });
    });
  });
};
