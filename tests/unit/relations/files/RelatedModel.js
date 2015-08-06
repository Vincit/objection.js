var Model = require('../../../../lib/Model');

function RelatedModel() {
  Model.apply(this, arguments);
}

module.exports = Model.extend(RelatedModel);

RelatedModel.tableName = 'RelatedModel';

