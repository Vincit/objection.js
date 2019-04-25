# Polymorphic associations

Let's assume we have tables `Comment`, `Issue` and `PullRequest`. Both `Issue` and `PullRequest` can have a list of comments. `Comment` has a column `commentableId` to hold the foreign key and `commentableType` to hold the related model type.

```js
class Comment extends Model {
  static get tableName() {
    return 'comments';
  }
}

class Issue extends Model {
  static get tableName() {
    return 'issues';
  }

  static get relationMappings() {
    return {
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,

        filter(builder) {
          builder.where('commentableType', 'Issue');
        },

        beforeInsert(model) {
          model.commentableType = 'Issue';
        },

        join: {
          from: 'issues.id',
          to: 'comments.commentableId'
        }
      }
    };
  }
}

class PullRequest extends Model {
  static get tableName() {
    return 'pullrequests';
  }

  static get relationMappings() {
    return {
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,

        filter(builder) {
          builder.where('commentableType', 'PullRequest');
        },

        beforeInsert(model) {
          model.commentableType = 'PullRequest';
        },

        join: {
          from: 'pullrequests.id',
          to: 'comments.commentableId'
        }
      }
    };
  }
}
```

The `where('commentableType', 'Type')` filter adds a `WHERE "commentableType" = 'Type'` clause to the relation fetch query. The `beforeInsert` hook takes care of setting the type on insert.

This kind of associations don't have referential integrity and should be avoided if possible. Instead, consider using the _exclusive arc table_ pattern discussed [here](https://github.com/Vincit/objection.js/issues/19#issuecomment-291621442).
