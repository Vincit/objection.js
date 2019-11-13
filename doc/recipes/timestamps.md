# Timestamps

You can implement the [$beforeInsert](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#beforeinsert) and [$beforeUpdate](https://github.com/Vincit/objection.js/tree/v1/doc/api/model/instance-methods.md#beforeupdate) methods to set the timestamps. If you want to do this for all your models, you can simply create common base class that implements these methods.

```js
class Person extends Model {
  $beforeInsert() {
    this.created_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}
```
