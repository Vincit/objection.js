var Model = require('../../../../lib/model/Model');

function OwnerModel() {
  Model.apply(this, arguments);
}

module.exports = Model.extend(OwnerModel);

OwnerModel.tableName = 'OwnerModel';
