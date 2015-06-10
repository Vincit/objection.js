var MoronModel = require('../../../../src/MoronModel');

function OwnerModel() {
  MoronModel.apply(this, arguments);
}

module.exports = MoronModel.extend(OwnerModel);

OwnerModel.tableName = 'OwnerModel';
