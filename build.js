var babel = require('babel-core');
var glob = require('glob');
var fsExtra = require('fs-extra');
var path = require('path');
var fs = require('fs');

var SRC_DIR = './src';
var DST_DIR = './lib';
var CP_ONLY = [SRC_DIR + '/model/inheritModel/inheritModelEs6.js'];
var BABEL_OPT = {
  presets: [],
  sourceMaps: 'inline',
  plugins: [
    "transform-decorators-legacy",
    "transform-class-properties",

    "transform-es2015-template-literals",
    "transform-es2015-literals",
    "transform-es2015-function-name",
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
    "transform-es2015-block-scoping",
    "transform-es2015-typeof-symbol",
    "transform-es2015-modules-commonjs",
    "transform-runtime"
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