# Contribution guide

## Issues

You can use [github issues](https://github.com/Vincit/objection.js/issues) to request features and file bug reports. An issue is also a good place to ask questions. We are happy to help out if you have reached a dead end, but please try to solve the problem yourself first. The [gitter chat](https://gitter.im/Vincit/objection.js) is also a good place to ask for help.

When creating an issue there are couple of things you need to remember:

1. **Update to the latest version of objection if possible and see if the problem remains.**
   If updating is not an option you can still request critical bug fixes for older versions.

2. **Describe your problem.**
   Answer the following questions: Which objection version are you using? What are you doing? What code are you running? What is happening? What are you expecting to happen instead? If you provide code examples (please do!), **use the actual code you are running**. People often leave out details or use made up examples because they think they are only leaving out irrelevant stuff. If you do that, you have already made an assumption about what the problem is and it's usually something else. Also provide all possible stack traces and error messages.

3. **If possible, provide an actual reproduction**
   The fastest way to get your bug fixed or problem solved is to create a simple standalone app or a test case that demonstrates your problem. There's a file called [reproduction-template.js](https://github.com/ditojs/objection/blob/main/reproduction-template.js) you can use as a starting point for your reproduction.

Please bear in mind that objection has thousands of tests and if you run into a problem, say with `insert` method, it doesn't mean that `insert` is completely broken, but some small part of it you are using is. That's why enough context is necessary. It's not enough to say, "insert fails". You need to provide the code that fails and usually the models that are used too. And let's say this again: **don't provide made up code examples!** When you do, you only write the parts you think are relevant and usually leave out the useful information. Use the actual code that you have tested to fail.

## Pull requests

If you have found a bug or want to add a feature, pull requests are always welcome! It's better to create an issue first to open a discussion if the feature is something that should be added to objection. In case of bugfixes it's also a good idea to open an issue indicating that you are working on a fix.

For a pull request to get merged it needs to have the following things:

1. **A good description of what the PR fixes or adds. You can just add a link to the corresponding issue.**

2. **Tests that verify the fix/feature.** It's possible to create a PR without tests and ask for someone else to write them but in that case it may take a long time or forever until someone finds time to do it. _Untested code will never get merged!_

3. **For features you also need to write documentation.** See the [development setup](/guide/contributing.html#development-setup) section for instructions on how to write documentation.

## Development setup

1. **Fork objection in github**

2. **Clone objection**

```bash
git clone git@github.com:<your-account>/objection.git
```

3. **Run `npm ci` at the root of the repo**

4. **Run `npm run docs:dev` and go to `http://localhost:5173/objection/` to see the generated documentation site when you change the markdown files in the `doc` folder.**

## Running the tests

[Docker](https://www.docker.com/) is optional, but the easiest way to run the tests against all supported databases.:

```bash
npm ci
npm run db:up # Start the PostgreSQL and MySQL test databases.
npm test
npm run db:down # Stop the test databases and delete their data.
```

Docker only runs the two database servers, PostgreSQL 17 and MySQL 8.4, as defined in `docker-compose.yml`, which needs Docker Compose 2.23.1 or newer. The tests themselves run on your machine with your Node.js, and SQLite runs inside the test process. The containers create the `objection` user and the `objection_test` database on their own, so there is nothing else to set up.

`npm run db:up` returns once both databases accept connections. They listen on the ports 55432 (PostgreSQL) and 33306 (MySQL), so they don't collide with databases that you may have installed locally. The data isn't kept: `npm run db:down` removes the containers together with their data, and the next `npm run db:up` starts from scratch.

CI also runs the tests on MySQL 5.7. To do that locally, add its override file: `COMPOSE_FILE=docker-compose.yml:docker-compose.mysql57.yml npm run db:up`.

CI also runs the tests on SQL Server 2022. Its image is large and runs emulated on arm64, so `npm run db:up` doesn't start it, and `npm test` only runs its tests when they are requested:

```bash
npm run db:up -- mssql # Start SQL Server, on the port 51433.
DATABASES=mssql npm run test:fast
```

You can run the tests on a subset of databases by setting the `DATABASES` env variable. SQLite needs no setup, so this works without Docker:

```bash
DATABASES=sqlite3 npm test
DATABASES=postgres npm test
```

To use your own databases instead, set the `OBJECTION_TEST_POSTGRES_*`, `OBJECTION_TEST_MYSQL_*` and `OBJECTION_TEST_MSSQL_*` env variables. The PostgreSQL user needs to own the database or be a superuser, as the tests create schemas in it. The MySQL user needs to be able to create databases and to use the `mysql_native_password` authentication plugin. The SQL Server user needs to be able to create tables and sequences.

| Variable                                         | Default for PostgreSQL | Default for MySQL | Default for SQL Server |
| ------------------------------------------------ | ---------------------- | ----------------- | ---------------------- |
| `OBJECTION_TEST_{POSTGRES,MYSQL,MSSQL}_HOST`     | `127.0.0.1`            | `127.0.0.1`       | `127.0.0.1`            |
| `OBJECTION_TEST_{POSTGRES,MYSQL,MSSQL}_PORT`     | `55432`                | `33306`           | `51433`                |
| `OBJECTION_TEST_{POSTGRES,MYSQL,MSSQL}_USER`     | `objection`            | `objection`       | `sa`                   |
| `OBJECTION_TEST_{POSTGRES,MYSQL,MSSQL}_PASSWORD` | none                   | none              | `Objection1!`          |
| `OBJECTION_TEST_{POSTGRES,MYSQL,MSSQL}_DATABASE` | `objection_test`       | `objection_test`  | `objection_test`       |

The SQLite tests use a new database file in the system's temporary directory for each run, which is deleted afterwards. Set `OBJECTION_TEST_SQLITE_FILE` to use a file of your choice, which is kept.

The tests are run with [mocha](https://mochajs.org/). `npm test` also lints the code and checks the typings. Use `npm run test:fast` to only run the tests, stopping at the first failure.

SQL Server can't insert explicit values into auto-incrementing (identity) columns. Tests that insert rows with explicit ids create their tables with `session.createTable()` instead of `knex.schema.createTable()`, and their id columns with the `increments()` it passes to the callback.

[prettier](https://prettier.io/) is used to format the code. Remember to run `npm run prettier` before committing code.

The parsers of relation expressions and JSON field expressions in `lib/queryBuilder/parsers` are generated from the `.pegjs` grammars next to them with [Peggy](https://peggyjs.org/). After changing a grammar, run `npm run build:parsers` (Peggy 5 needs Node 20 or newer) and commit the generated files with it. CI checks that they match the grammars.
