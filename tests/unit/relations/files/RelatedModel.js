var MoronModel = require('../../../../src/MoronModel');

function RelatedModel() {
  MoronModel.apply(this, arguments);
}

module.exports = MoronModel.extend(RelatedModel);

RelatedModel.tableName = 'RelatedModel';

