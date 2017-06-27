var config = {};
var merge = require('merge');

var appRoot = require('app-root-path') + '/';
var env = require(appRoot + '/shared/getNodeEnv')();

//If env is not local, staging, or production - then make it local
if (['local', 'staging', 'production'].indexOf(env) < 0) {
  env = null;
}
//Use local by default
if (!env) {
  env = 'local';
}

//Get the config for the env (local, staging, production)
//config (local config overrides)
var envconfig = null;
try {
  envconfig = require('./env/' + env);
}
catch (e) {
  envconfig = null;
  console.error('Configuration File: ' + env + '.js does not exist:' + e);
}

//Get the default config
try {
  config = require('./env/default');
}
catch (e) {
  console.error('Configuration File: default.js does not exist');
}

//Now merge in env config with default config
if (envconfig) {
  merge.recursive(config, envconfig);
}

//save the environment on the config object also in case caller needs to reference it
config.env = env;

module.exports = config;
