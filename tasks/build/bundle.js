'use strict';

var pathUtil = require('path');
var jetpack = require('fs-jetpack');
var rollup = require('rollup');
var Q = require('q');
var browserify = require('browserify');
var intoStream = require('into-stream');

var nodeBuiltInModules = ['assert', 'buffer', 'child_process', 'cluster',
  'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events',
  'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'timers',
  'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'];

var electronBuiltInModules = ['electron'];

var npmModulesUsedInApp = function () {
  var appManifest = require('../../app/package.json');
  return Object.keys(appManifest.dependencies);
};

var generateExternalModulesList = function () {
  return [].concat(nodeBuiltInModules, electronBuiltInModules, npmModulesUsedInApp());
};

module.exports = function (src, dest, opts) {
  var deferred = Q.defer();

  rollup.rollup({
    entry: src,
    external: generateExternalModulesList(),
  }).then(function (bundle) {
    var jsFile = pathUtil.basename(dest);
    var result = bundle.generate({
      format: 'cjs',
      sourceMap: true,
      sourceMapFile: jsFile,
    });

    if (opts && opts.browserify) {
      // Browserify the code
      var b = browserify(intoStream(result.code), { basedir: opts.basedir });
      b.exclude('electron');
      if (opts.excludeNodeModules) {
        nodeBuiltInModules.forEach(function (module) { b.exclude(module); });
      }
      var deferred2 = Q.defer();
      b.bundle(function (err, bundledCode) {
        if (err) deferred2.reject(err)
        else {
          jetpack.writeAsync(dest, bundledCode)
            .then(function () { deferred2.resolve() })
            .catch(function (err) { deferred2.reject(err) })
        }
      });
      return deferred2.promise;
    } else {
      // Wrap code in self invoking function so the variables don't
      // pollute the global namespace.
      var isolatedCode = '(function () {' + result.code + '\n}());';
      return Q.all([
          jetpack.writeAsync(dest, isolatedCode + '\n//# sourceMappingURL=' + jsFile + '.map'),
          jetpack.writeAsync(dest + '.map', result.map.toString()),
        ]);
    }
  }).then(function () {
    deferred.resolve();
  }).catch(function (err) {
    deferred.reject(err);
  });

  return deferred.promise;
};
