import DelegateOperation from './DelegateOperation';

export default class InsertGraphAndFetchOperation extends DelegateOperation {

  get models() {
    return this.delegate.models;
  }

  get isArray() {
    return this.delegate.isArray;
  }

  onAfterInternal(builder) {
    const eagerTree = buildEagerTree(this.models, Object.create(null));
    const eager = buildEager(eagerTree);
    const modelClass = this.models[0].constructor;
    const ids = new Array(this.models.length);

    for (let i = 0, l = this.models.length; i < l; ++i) {
      ids[i] = this.models[i].$id();
    }

    return modelClass
      .query()
      .childQueryOf(builder)
      .whereIn(modelClass.getFullIdColumn(), ids)
      .eager(eager)
      .then(models => {
        return this.isArray ? models : (models[0] || null);
      });
  }
}

function buildEagerTree(models, tree) {
  if (!models) {
    return;
  }

  if (Array.isArray(models)) {
    for (let i = 0, l = models.length; i < l; ++i) {
      buildEagerTreeForModel(models[i], tree);
    }
  } else {
    buildEagerTreeForModel(models, tree);
  }

  return tree;
}

function buildEagerTreeForModel(model, tree) {
  const modelClass = model.constructor;
  const relations = modelClass.getRelations();
  const relNames = Object.keys(relations);

  for (let r = 0, lr = relNames.length; r < lr; ++r) {
    const relName = relNames[r];

    if (model.hasOwnProperty(relName)) {
      let subTree = tree[relName];

      if (!subTree) {
        subTree = Object.create(null);
        tree[relName] = subTree;
      }

      buildEagerTree(model[relName], subTree);
    }
  }
}

function buildEager(eagerTree) {
  const keys = Object.keys(eagerTree);
  let eager = '';

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    eager += key;

    const subEager = buildEager(eagerTree[key]);

    if (subEager) {
      eager += '.' + subEager;
    }

    if (i < keys.length - 1) {
      eager += ', ';
    }
  }

  if (keys.length > 1) {
    eager = '[' + eager + ']';
  }

  return eager;
}
