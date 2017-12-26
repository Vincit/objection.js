const expect = require('expect.js');
const Model = require('../../../').Model;

module.exports = session => {
  describe('aggregate methods with relations', () => {
    beforeEach(() => {
      return session.populate([
        {
          model1Prop1: 'a',
          model1Relation2: [
            { model2_prop1: 'one' },
            { model2_prop1: 'two' },
            { model2_prop1: 'three' }
          ]
        },
        {
          model1Prop1: 'b',
          model1Relation2: [{ model2_prop1: 'four' }, { model2_prop1: 'five' }]
        }
      ]);
    });

    it('count of HasManyRelation', () => {
      return session.models.Model1.query()
        .select('Model1.*')
        .count('model1Relation2.id_col as relCount')
        .joinRelation('model1Relation2')
        .groupBy('Model1.id')
        .orderBy('Model1.model1Prop1')
        .then(models => {
          expect(models[0].relCount).to.eql(3);
          expect(models[1].relCount).to.eql(2);
        });
    });
  });
};
