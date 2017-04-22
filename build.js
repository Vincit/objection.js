var babel = require('babel-core');
var glob = require('glob');
var fsExtra = require('fs-extra');
var path = require('path');
var fs = require('fs');

var SRC_DIR = './src';
var DST_DIR = './lib';
var CP_ONLY = [];
var BABEL_OPT = {
  presets: [],
  sourceMaps: 'inline',
  plugins: [
    "transform-decorators-legacy",
    "transform-class-properties",

    "transform-es2015-template-literals",
    "transform-es2015-literals",
    "transform-es2015-arrow-functions",
    "transform-es2015-block-scoped-functions",
    ["transform-es2015-classes", {
      loose: true
    }],
    "transform-es2015-shorthand-properties",
    "transform-es2015-duplicate-keys",
    "transform-es2015-computed-properties",
    "transform-es2015-sticky-regex",
    "transform-es2015-unicode-regex",
    "check-es2015-constants",
    "transform-es2015-spread",
    "transform-es2015-parameters",
    "transform-es2015-destructuring",
    "transform-es2015-block-scoping"
  ]
};

// Clean the lib fir so that removed files don't linger.
fsExtra.removeSync(DST_DIR);

var src = glob.sync(SRC_DIR + '/**/*.js');

for (var i = 0; i < src.length; ++i) {
  var dst = DST_DIR + src[i].substring(SRC_DIR.length);
  var code;

  if (CP_ONLY.indexOf(src[i]) !== -1) {
    code = fs.readFileSync(src[i]);
  } else {
    code = babel.transformFileSync(src[i], BABEL_OPT).code;
  }

  fsExtra.ensureDirSync(path.dirname(dst));
  fs.writeFileSync(dst, code);
}

try {
  var child_process = require('child_process');
  var process = require('process');
} catch (e) {
  // node is < v5, don't bother with TypeScript.
}

// sanity-check the TypeScript definitions, if possible:
if (process && process.version >= 'v5') {
  var tsc = path.join(__dirname, "node_modules", ".bin", "tsc")
  if (fs.existsSync(tsc)) {
    child_process.execSync(tsc, { cwd: __dirname, stdio: [0, 1, 2] });
  } else {
    console.log("The typescript compiler is missing. Run `npm install`.")
  }
}
