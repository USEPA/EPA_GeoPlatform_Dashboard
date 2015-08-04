    var env = process.env.NODE_ENV;
//Use local by default
    if (! env) env = 'local';
    var config = {};
    if ('./env/' + env + '.js')
//If config doesn't exist then log an error doesn't exist
    try {config = require('./env/' + env + '.js');}
    catch(e) {console.log('Configuration File: ' + env + '.js does not exist')};

    module.exports = config;
