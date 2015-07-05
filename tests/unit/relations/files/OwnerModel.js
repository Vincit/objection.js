var Model = require('../../../../src/Model');

function OwnerModel() {
  Model.apply(this, arguments);
}

module.exports = Model.extend(OwnerModel);

OwnerModel.tableName = 'OwnerModel';
