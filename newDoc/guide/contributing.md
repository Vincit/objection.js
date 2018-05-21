# Contribution guide

## Issues

You can use [github issues](https://github.com/Vincit/objection.js/issues) to request features and file bug reports. An issue is also a good place to ask questions. We are happy to help out if you have reached a dead end, but please try to solve the problem yourself first. The [gitter chat](https://gitter.im/Vincit/objection.js) is also a good place to ask for help.

When creating an issue there are couple of things you need to remember:

1. **Update to the latest version of objection if possible and see if the problem remains.** If updating is not an option you can still request critical bug fixes for older versions.

2. **Describe your problem.** What is happening and what you expect to happen.

3. **Provide enough information about the problem for others to reproduce it.** The fastest way to get your bug fixed or problem solved is to create a simple standalone app or a test case that demonstrates your problem. There's a file called [reproduction-template.js](https://github.com/Vincit/objection.js/blob/master/reproduction-template.js) you can use as a starting point for your reproduction. If that's too much work then at least provide the code that fails with enough context and any possible stack traces. Please bear in mind that objection has hundreds of tests and if you run into a problem, say with `insert` function, it doesn't mean that `insert` is completely broken, but some small part of it you are using is. That's why enough context is necessary. It's not enough to say, "insert fails". You need to provide the code that fails and usually the models that are used too. And don't write made up code! When you do, you only write the parts you think are relevant and usually leave out the useful information. Use the actual code that you have tested to fail.

## Pull requests

If you have found a bug or want to add a feature, pull requests are always welcome! It's better to create an issue first to open a discussion if the feature is something that should be added to objection. In case of bugfixes it's also a good idea to open an issue indicating that you are working on a fix.

For a pull request to get merged it needs to have the following things:

1. **A good description of what the PR fixes or adds. You can just add a link to the corresponding issue.**

2. **Tests that verify the fix/feature.** It's possible to create a PR without tests and ask for someone else to write them but in that case it may take a long time or forever until someone finds time to do it. *Untested code will never get merged!*

3. **For features you also need to write documentation. See the [development setup](#development-setup) section for instructions on how to write documentation.**

## Development setup

1. Fork objection in github

2. Clone objection

3. Install MySQL and PostgreSQL or alternatively run `docker-compose up` in the repo root

4. Create test users and databases

5. Run `npm test` in objection's root to see if everything works.

6. Run `npm run docs:dev` and goto http://localhost:8080 to see the generated documentation site when you change the markdown files in the `doc` folder.

cloning:

```shell
git clone git@github.com:<your-account>/objection.js.git objection
```

creating users and databases for the tests:

```shell
psql -U postgres -c "CREATE USER objection SUPERUSER"
psql -U postgres -c "CREATE DATABASE objection_test"
mysql -u root -e "CREATE USER objection"
mysql -u root -e "GRANT ALL PRIVILEGES ON *.* TO objection"
mysql -u root -e "CREATE DATABASE objection_test"
```

You can run the tests on a subset of databases by setting the `DATABASES` env variable

```shell
# Only run tests on sqlite. No need for postgres and mysql setup.
DATABASES=sqlite3 npm test
```

Code and tests need to be written in ES2015 subset supported by node 6.0.0. The best way to make sure of this is to develop with the correct node version. [nvm](https://github.com/creationix/nvm) is a great tool for swapping between node versions. `prettier` is used to format the code. Remember to run `npm run prettier` before committing code.
