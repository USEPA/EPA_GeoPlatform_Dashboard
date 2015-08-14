//Aaron Evans Jr. adsfsad
var express = require('express');
var fs = require('fs')
var path = require('path');
var merge = require('merge');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);

var mongo = require('mongodb');
var monk = require('monk');

var routes = require('./routes/index');
var gpoitems = require('./routes/gpoitems');

var app = express();

//get the enviromental variables from config file and save for later
var config = require('./config/env');
app.set('config',config);

//Get the app root if it is not in config file
var appRoot=config.appRoot;
if (! appRoot) appRoot = require('app-root-path') + '/';
app.set('appRoot',appRoot);

var db = monk(config.mongoDBurl);
app.set('monk',db);

// gpintel, no engine needed - view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(__dirname + '/logs/access.log', {
  flags: 'a'
});

// setup the logger
app.use(logger('combined', {
  stream: accessLogStream
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());


//The session is stored in Mongo
//tag mongo store onto the session options using env specific store options
//note I merge the config.mongoStoreOption because mongoStore constructor alters it
console.log(config);
var mongoStoreInstance = new mongoStore(merge(true,config.mongoStoreOption));
//create copy of config sessionOptions so that is is not altered
var sessionOptions = merge(true,config.sessionOptions);
sessionOptions.store = mongoStoreInstance;
//Allow persistent session data (eg: username of logged in user)
app.use(session(sessionOptions));

console.log(config);

// All standard routes above here
// endpoint for API calls to MongoDB via Monk
//pp.post('/api', handler.POST.getPosts);

// Static route for serving out our front-end Tool
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes(app));
app.use('/gpoitems', gpoitems(app));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
console.log('test');

// development error handler
// will print stacktrace
console.log('app.get(env) = ' + app.get('env'));

if (app.get('env') !== 'production') {
  app.use(function(err, req, res, next) {
    console.log(err.status);
    res.status(err.status || 500);

    console.log(err);

    res.json(
      {error: {
      message: err.message,
      code: "ApplicationError",
      stack: err.stack
      },body:null}
    );
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json(
        {error: {
          message: err.message,
          code: "ApplicationError"
        },body:null}
    );
});


module.exports = app;
