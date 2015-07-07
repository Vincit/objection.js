# Install and run

```sh
git clone git@github.com:Vincit/moron.js.git moron
cd moron
npm install
npm install -g browserify
browserify moron-browser.js -o examples/websql/moron.js
cd examples/websql
npm install
```

Now you can just open the index.html in a browser.
