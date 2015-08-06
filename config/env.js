//method for shallow merging
//if want deep merging maybe use npm install merge
    var extend = require('util')._extend;

    var env = process.env.NODE_ENV;
//Use local by default
    if (! env) env = 'local';
    var config = {};
    if ('./env/' + env + '.js')

//If local environment then start with full development config and merge in local config (local config overrides)
    var localconfig=null;
    if (env==='local') {
        try {localconfig = require('./env/' + env + '.js');}
        catch(e) {localconfig=null;console.log('Configuration File: ' + env + '.js does not exist')};
//set env to development now to use that as a base for local before local overrides
        env = 'development';
    }

//If dev environment then start with full production config and merge in dev config (dev config overrides)
//Not local get local over riding dev over riding prod
    var devconfig=null;
    if (env==='development') {
        try {devconfig = require('./env/' + env + '.js');}
        catch(e) {devconfig=null;console.log('Configuration File: ' + env + '.js does not exist')};
    //set env to production now to use that as a base for local before local overrides
        env = 'production';
    }

//If config doesn't exist then log an error doesn't exist
    try {config = require('./env/' + env + '.js');}
    catch(e) {console.log('Configuration File: ' + env + '.js does not exist')};

// now merge in devconfig if it exists
    if (devconfig) {
        extend(config,  devconfig);
    }
// now merge in localconfig if it exists
    if (localconfig) {
        extend(config,  localconfig);
    }

    module.exports = config;
