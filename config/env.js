var config = {};
  var merge = require('merge');

  var appRoot = require('app-root-path') + '/';
  var env = require(appRoot + '/shared/getNodeEnv')();

  //If env is not local, staging, or production - then make it local
  if (["local", "staging", "production"].indexOf(env)<0) env = null;
  //Use local by default
  if (!env) env = "local";

  //If local environment then start with full staging config and merge in local config (local config overrides)
  var localconfig = null;
  if (env === 'local') {
    try {
      localconfig = require('./env/' + env);
    }
    catch (e) {
      localconfig = null;
      console.log('Configuration File: ' + env + '.js does not exist:' + e);
    }
    //set env to staging now to use that as a base for local before local overrides
    env = 'staging';
  }

  //If dev environment then start with full production config and merge in dev config (dev config overrides)
  //Not local get local over riding dev over riding prod
  var stgconfig = null;
  if (env === 'staging') {
    try {
      stgconfig = require('./env/' + env);
    }
    catch (e) {
      stgconfig = null;
      console.log('Configuration File: ' + env + '.js does not exist');
    }
    //set env to production now to use that as a base for local before local overrides
    env = 'production';
  }

  //If config doesn't exist then log an error doesn't exist
  try {
    config = require('./env/' + env);
  }
  catch (e) {
    console.log('Configuration File: ' + env + '.js does not exist');
  }

  //now merge in stgconfig if it exists
  if (stgconfig) {
    merge.recursive(config, stgconfig);
  }
  //now merge in localconfig if it exists
  if (localconfig) {
    merge.recursive(config, localconfig);
  }

module.exports = config;
