# Install and run

```sh
git clone git@github.com:Vincit/objection.js.git objection
cd objection
npm install
npm install -g browserify
browserify objection-browser.js -o examples/websql/objection.js
cd examples/websql
npm install
```

Now you can just open the index.html in a browser.
