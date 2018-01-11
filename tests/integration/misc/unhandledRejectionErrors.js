const Promise = require('bluebird');
const expect = require('expect.js');

module.exports = session => {
  // Tests that various queries that start multiple queries behind the scenes
  // don't cause unhandled rejection errors if one of the queries fail.
  describe('unhandler rejection errors', () => {
    const Model1 = session.models.Model1;

    let unhandledErrors = [];

    const unhandledRejectionHandler = err => {
      unhandledErrors.push(err);
    };

    before(() => {
      session.addUnhandledRejectionHandler(unhandledRejectionHandler);
    });

    after(() => {
      session.removeUnhandledRejectionHandler(unhandledRejectionHandler);
    });

    beforeEach(() => {
      unhandledErrors = [];
    });

    beforeEach(() => {
      return session.populate([
        {
          model1Prop1: '1',

          model1Relation1: {
            model1Prop1: '3'
          },

          model1Relation2: [
            {
              model2Prop1: '1'
            }
          ]
        },
        {
          model1Prop1: '2',

          model1Relation1: {
            model1Prop1: '4'
          },

          model1Relation2: [
            {
              model2Prop1: '2'
            }
          ]
        }
      ]);
    });

    it('range', done => {
      Model1.query()
        .table('doesnt_exist')
        .range(1, 2)
        .then(() => done(new Error('should not get here')))
        .catch(err => {
          expect(unhandledErrors).to.be.empty();
          done();
        })
        .catch(done);
    });
  });
};
