# Ternary relationships

Assume we have the following Models:

1. user `(id, first_name, last_name)`
1. group `(id, name)`
1. permission `(id, label)`
1. user_group_permission `(user_id, group_id, permission_id, extra_attribute)`

Here's how you could create your models:

```js
// User.js
const { Model } = require("objection");

class User extends Model {
  static get tableName() { return "user"; }
  static get relationMappings() {
    return {
      groups: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./Group"),
        join: {
          from: "user.id",
          through: {
            from: "user_group_permission.user_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.group_id"
          },
          to: "group.id"
        }
      },
      permissions: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./Permission"),
        join: {
          from: "user.id",
          through: {
            from: "user_group_permission.user_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.permission_id"
          },
          to: "permission.id"
        }
      }
    };
  }
}

module.exports = User;
```

```js
// Group.js
const { Model } = require("objection");

class Group extends Model {
  static get tableName() { return "group"; }
  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./User"),
        join: {
          from: "group.id",
          through: {
            from: "user_group_permission.group_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.user_id"
          },
          to: "user.id"
        }
      },
      permissions: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./Permission"),
        join: {
          from: "group.id",
          through: {
            from: "user_group_permission.group_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.permission_id"
          },
          to: "permission.id"
        }
      }
    };
  }
}

module.exports = Group;
```

```js
// Permission.js
const { Model } = require("objection");

class Permission extends Model {
  static get tableName() { return "permission"; }
  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./User"),
        join: {
          from: "permission.id",
          through: {
            from: "user_group_permission.permission_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.user_id"
          },
          to: "user.id"
        }
      },
      groups: {
        relation: Model.ManyToManyRelation,
        modelClass: require("./Group"),
        join: {
          from: "permission.id",
          through: {
            from: "user_group_permission.permission_id",
            extra: ["extra_attribute"],
            to: "user_group_permission.group_id"
          },
          to: "group.id"
        }
      }
    };
  }
}

module.exports = Permission;
```

```js
// UserGroupPermission.js
const { Model } = require("objection");

class UserGroupPermission extends Model {
  static get tableName() { return "user_group_permission"; }
  static get idColumn() { return ["user_id", "group_id", "permission_id"]; }
  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: require("./User"),
        join: {
          from: "user_group_permission.user_id",
          extra: ["extra_attribute"],
          to: "user.id"
        }
      },
      group: {
        relation: Model.BelongsToOneRelation,
        modelClass: require("./Group"),
        join: {
          from: "user_group_permission.group_id",
          extra: ["extra_attribute"],
          to: "group.id"
        }
      },
      permission: {
        relation: Model.BelongsToOneRelation,
        modelClass: require("./Permission"),
        join: {
          from: "user_group_permission.permission_id",
          extra: ["extra_attribute"],
          to: "permission.id"
        }
      }
    };
  }
}

module.exports = UserGroupPermission;
```

Here's how you can query your models:

- `.*JoinRelation()`

```js
UserGroupPermission
  .query()
  .select(
    "first_name",
    "last_name",
    "label",
    "extra_attribute"
  )
  .joinRelation("[user, permission]")
  .where("group_id", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
/*
{
  first_name: ... ,
  last_name: ... ,
  label: ... ,
  extra_attribute: ...
}
*/
```

- `.eager()`

```js
UserGroupPermission
  .query()
  .eager("[user, permission]")
  .where("group_id", "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
/*
{
  user: {
    first_name: ... ,
    last_name: ...
  },
  group: {
    name: ...
  },
  permission: {
    label: ...
  },
  extra_attribute: ...
}
*/
```

Read more about ternary relationships on [this issue](https://github.com/Vincit/objection.js/issues/179).
