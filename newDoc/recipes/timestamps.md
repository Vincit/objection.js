# Timestamps

You can implement the [$beforeInsert](/api/model/instance-methods.html#beforeinsert) and [$beforeUpdate](/api/model/instance-methods.html#beforeupdate) methods to set the timestamps. If you want to do this for all your models, you can simply create common base class that implements these methods.

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
