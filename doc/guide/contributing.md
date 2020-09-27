# Contribution guide

## Issues

You can use [github issues](https://github.com/Vincit/objection.js/issues) to request features and file bug reports. An issue is also a good place to ask questions. We are happy to help out if you have reached a dead end, but please try to solve the problem yourself first. The [gitter chat](https://gitter.im/Vincit/objection.js) is also a good place to ask for help.

When creating an issue there are couple of things you need to remember:

1. **Update to the latest version of objection if possible and see if the problem remains.**
   If updating is not an option you can still request critical bug fixes for older versions.

2. **Describe your problem.**
   Answer the following questions: Which objection version are you using? What are you doing? What code are you running? What is happening? What are you expecting to happen instead? If you provide code examples (please do!), **use the actual code you are running**. People often leave out details or use made up examples because they think they are only leaving out irrelevant stuff. If you do that, you have already made an assumption about what the problem is and it's usually something else. Also provide all possible stack traces and error messages.

3. **If possible, provide an actual reproduction**
   The fastest way to get your bug fixed or problem solved is to create a simple standalone app or a test case that demonstrates your problem. There's a file called [reproduction-template.js](https://github.com/Vincit/objection.js/blob/master/reproduction-template.js) you can use as a starting point for your reproduction.

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
git clone git@github.com:<your-account>/objection.js.git objection
```

3. **Run `npm install` at the root of the repo**

4. **Run `docker-compose up` at the root of the repo**
   - If you have local databases running, shut them down or port binding will conflict.

5. **Create test users and databases by running `node setup-test-db` at the root of the repo**

6. **Run `npm test` in objection's root to see if everything works.**

7. **Run `npm run docs:dev` and goto http://localhost:8080 to see the generated documentation site when you change the markdown files in the `doc` folder.**

You can run the tests on a subset of databases by setting the `DATABASES` env variable

```bash
# Only run tests on sqlite. No need for docker-compose.
DATABASES=sqlite3 npm test
```

Code and tests need to be written in ES2015 subset supported by node 8.0.0. The best way to make sure of this is to develop with the correct node version. [nvm](https://github.com/creationix/nvm) is a great tool for swapping between node versions.

[prettier](https://prettier.io/) is used to format the code. Remember to run `npm run prettier` before committing code.
