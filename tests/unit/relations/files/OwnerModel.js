var Model = require('../../../../lib/model/Model').default;

function OwnerModel() {
  Model.apply(this, arguments);
}

module.exports = Model.extend(OwnerModel);

OwnerModel.tableName = 'OwnerModel';
