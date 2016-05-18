module.exports = function() {
  var env = null;
  var appRoot = require('app-root-path') + '/';
  try {
    var requireReload = require('require-reload')(require);
    env = requireReload(appRoot + '/config/nodeEnv');
  }
  catch (e) {
    //Express is defaulting env to "development" but let default be "local"
    //    var env = null;
    if (!process.env.NODE_ENV) {
      //Console.log('Windows environmental variable NODE_ENV does not exist, default environment to local');
      env = 'local';
    } else {
      env = process.env.NODE_ENV;
    }
  }
  return env;
};

