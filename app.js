var express = require('express');
var fs = require('fs');
var path = require('path');
var merge = require('merge');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);

var mongo = require('mongodb');
var MonkClass = require('monk');

var routes = require('./routes/index');
var gpoitems = require('./routes/gpoitems');
var gpousers = require('./routes/gpousers');
var edgitems = require('./routes/edgitems');
var gpochecklists = require('./routes/gpochecklists');
var redirectRoute = require('./routes/redirect');

var app = express();

console.log('GP Dashboard app.js started on:  ' + new Date());

//Get the app root
var appRoot = require('app-root-path') + '/';
app.set('appRoot',appRoot);

//Find the env from local unchecked in file. If it doesn't exist then use
//Windows env variable NODE_ENV
var env = require(appRoot + '/shared/getNodeEnv')();
app.set('env', env);

//Console.log('app.get(env) = ' + app.get('env') + ' NODE_ENV = ' + process.env.NODE_ENV);

//Get the configuration for this current environment from config file specific
//to current environment
//Note, if for some reason appRoot is wrong try the hardcoded path
var config = require(appRoot + '/config/env');
app.set('config',config);

var monk = MonkClass(config.mongoDBurl);
app.set('monk',monk);
//Db is database connection needed for grid fs
var url = require('url');
var mongoURL = url.parse(config.mongoDBurl);
var db = new mongo.Db(mongoURL.pathname.replace('/',''),
  new mongo.Server(mongoURL.hostname,mongoURL.port));
app.set('db',db);
//Grid FS set up in this function because db needs to be connected first
//Note this is a promise to return gfs but it also sets app('gfs')
//which should be ready by time somebody wants to use gfs
var utilities = require(appRoot + '/shared/utilities');
utilities.getGridFSobject(app);

//When somebody logins we wil need to have DB update of modified items run in a
//queue so they aren't updating same stuff on accident
var TasksQueues = require(appRoot + '/shared/TasksQueues');
app.set('tasksQueues',new TasksQueues(500));

// Gpintel, no engine needed - view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

// Uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(__dirname + '/logs/access.log', {
  flags: 'a',
});

// Setup the logger
app.use(logger('combined', {
  stream: accessLogStream,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false,
}));
app.use(cookieParser());


//The session is stored in Mongo
//tag mongo store onto the session options using env specific store options
//note I merge the config.mongoStoreOption because mongoStore constructor
//alters it
var mongoStoreInstance = new mongoStore(merge(true,config.mongoStoreOption));
//Create copy of config sessionOptions so that is is not altered
var sessionOptions = merge(true,config.sessionOptions);
sessionOptions.store = mongoStoreInstance;
//Allow persistent session data (eg: username of logged in user)
app.use(session(sessionOptions));

//Now setup the email transporter
var sendEmail = require(appRoot + '/shared/sendEmail');
sendEmail.send(config.email.defaultFrom, config.email.admins,
  'GP Dashboard Express Server Started','GP Dashboard Express' +
  ' server was started on ' + new Date() +
  '. This could possibly be due to automatic restart after server crash' +
  ' due to uncaught exceptions. Check logs/errors.log for uncaught exceptions.')
  .catch(function(error) {console.error(error)});

// Static route for serving out our front-end Tool
app.use(express.static(path.join(__dirname, 'public')));

//In order to get through firewall need rewrite from port 80 to port 3000 via
//reverse proxy
//Therefore need a base directory for the app
app.use('/gpdashboard', routes(app));
app.use('/gpdashboard/gpoitems', gpoitems(app));
app.use('/gpdashboard/gpousers', gpousers(app));
app.use('/gpdashboard/edgitems', edgitems(app));
app.use('/gpdashboard/gpochecklists', gpochecklists(app));
//Since everything is in gpdashboard now. need localhost:3000/ to redirect to
//gpdashboard/
app.use('/', redirectRoute());

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.error('404 req.url: ' + req.url);

  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handlers

// Development error handler
// will print stacktrace

if (app.get('env') !== 'production') {
  app.use(function(err, req, res, next) {
    console.log(err.status);
    res.status(err.status || 500);

    console.log(err.stack);

    res.json(
      {error: {
        message: err.message,
        code: 'ApplicationError',
        stack: err.stack,
      },body: null,}
    );
  });
}

// Production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json(
        {error: {
          message: err.message,
          code: 'ApplicationError',
        },body: null,}
    );
});


module.exports = app;
