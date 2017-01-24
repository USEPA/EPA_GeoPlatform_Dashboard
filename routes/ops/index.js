//going to have to run this from different process 
module.exports = function(app) {
  var express = require('express');
  var router = express.Router();

  var appRoot = app.get('appRoot');
  var utilities = require(appRoot + '/shared/utilities');
  var config = require(appRoot + '/config/env');

  router.use('/$', function(req, res) {
    //Get the logged in user. note don't pass res as second arg because don't want to error out if not logged in!
    var loggedInUser = utilities.getUserFromSession(req);

//    res.send('<html><body>Dashboard Ops <a href="deploy">deploy</a></body></html>');

    //read in the file to use for ops/index.html from routes/ops/index.html
    //By not publicly exposing index.html it will only be returned to ops users who have access
    utilities.streamFileAsResponse(res,appRoot + '/routes/ops/index.html');

  });

  router.use('/op.js$', function(req, res) {
    return utilities.streamFileAsResponse(res,appRoot + '/routes/ops/ops.js');
  });
  router.use('/libs/jquery.js$', function(req, res) {
    return utilities.streamFileAsResponse(res,appRoot + '/public/gpdashboard/bower_components/jquery/dist/jquery.js');
  });
  router.use('/libs/mustache.js$', function(req, res) {
    return utilities.streamFileAsResponse(res,appRoot + '/public/gpdashboard/bower_components/mustache/mustache.js');
  });


  return router;
};