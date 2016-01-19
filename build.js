var babel = require('babel-core');
var glob = require('glob');
var fsExtra = require('fs-extra');
var path = require('path');
var fs = require('fs');

var SRC_DIR = './src';
var DST_DIR = './lib';
var CP_ONLY = [SRC_DIR + '/model/inheritModel/inheritModelEs6.js'];
var BABEL_OPT = {
  presets: ['es2015', 'stage-0'],
  plugins: ['transform-runtime', 'babel-plugin-transform-decorators-legacy']
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