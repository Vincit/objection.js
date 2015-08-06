var Model = require('../../../../lib/Model');

function OwnerModel() {
  Model.apply(this, arguments);
}

module.exports = Model.extend(OwnerModel);

OwnerModel.tableName = 'OwnerModel';
