# Install and run

```sh
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/jsonb
npm install
# We use knex for migrations in this example.
npm install knex -g
createdb -E utf8 objection-jsonb-example
knex migrate:latest
npm start
```
