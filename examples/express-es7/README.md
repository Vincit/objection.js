# Install and run

```sh
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/express-es7
npm install
# Run knex migrations
npm run db:migrate
# This runs the Babel transpiler and executes the app.
npm start
```

`example-requests.sh` file contains a bunch of `curl` commands for you to start playing with the REST API:

```sh
cat example-requests.sh
```
