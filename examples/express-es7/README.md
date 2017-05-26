# Install and run

```sh
git clone git@github.com:Vincit/objection.js.git objection
cd objection/examples/express-es7
npm install
# This runs the Babel transpiler, knex migrations and executes the app.
npm start
```

Note that starting from 0.8.0 objection uses native ES2015 classes and no longer supports
legacy ES5 classes. This also means Babel generated ES5 code. For this reason we need to
omit the `babel-plugin-transform-es2015-classes` plugin. There is no way to omit plugins
from presets. That's why the package.json explicitly lists all plugins in Babel `es2015`
preset __except__ `babel-plugin-transform-es2015-classes`.


`example-requests.sh` file contains a bunch of `curl` commands for you to start playing with the REST API:

```sh
cat example-requests.sh
```
