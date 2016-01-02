var Model = require('../../../../').Model;

function JoinModel() {
  Model.apply(this, arguments);
}

module.exports = Model.extend(JoinModel);

JoinModel.tableName = 'JoinModel';
