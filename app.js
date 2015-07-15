var express = require('express');
var fs = require('fs')
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/gpinteldb');

var routes = require('./routes/index');
var gpoitems = require('./routes/gpoitems');

var app = express();

// Make db accessible to router
app.use(function(req, res, next) {
  req.db = db;
  next();
});

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

// All standard routes above here
// endpoint for API calls to MongoDB via Monk
//pp.post('/api', handler.POST.getPosts);

// Static route for serving out our front-end Tool
app.use(express.static(path.join(__dirname, 'public')));


//app.use('/', routes);
app.use('/gpoitems', gpoitems);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    //res.status(err.status || 500);
    next(err);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  //res.status(err.status || 500);
  next(err);
});


module.exports = app;