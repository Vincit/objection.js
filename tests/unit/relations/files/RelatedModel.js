var MoronModel = require('../../../../src/MoronModel');

function RelatedModel() {
  MoronModel.apply(this, arguments);
}

module.exports = MoronModel.makeSubclass(RelatedModel);

RelatedModel.tableName = 'RelatedModel';

