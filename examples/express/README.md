# Install and run

```sh
git clone git@github.com:Vincit/moron.js.git moron
cd moron/examples/express
npm install
# We use knex for migrations in this example.
npm install knex -g
knex migrate:latest
npm start
```

`example-requests.sh` file contains a bunch of `curl` commands for you to start playing with the REST API:

```sh
cat example-requests.sh
```
