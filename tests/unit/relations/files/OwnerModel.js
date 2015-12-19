var Model = require('../../../../').Model;

function OwnerModel() {
  Model.apply(this, arguments);
}

module.exports = Model.extend(OwnerModel);

OwnerModel.tableName = 'OwnerModel';
