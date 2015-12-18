var Model = require('../../../../lib/model/Model').default;

function RelatedModel() {
  Model.apply(this, arguments);
}

module.exports = Model.extend(RelatedModel);

RelatedModel.tableName = 'RelatedModel';

