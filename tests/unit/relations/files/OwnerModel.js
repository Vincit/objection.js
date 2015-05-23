var MoronModel = require('../../../../lib/MoronModel');

function OwnerModel() {
  MoronModel.apply(this, arguments);
}

module.exports = MoronModel.makeSubclass(OwnerModel);

OwnerModel.tableName = 'OwnerModel';
