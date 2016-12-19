//going to have to run this from different process 
module.exports = function(app) {
  var express = require('express');
  var router = express.Router();

  var appRoot = app.get('appRoot');
  var utilities = require(appRoot + '/shared/utilities');
  var config = require(appRoot + '/config/env');

  router.use('/*', function(req, res, next) {
    //Get the logged in user. note don't pass res as second arg because don't want to error out if not logged in!
    var loggedInUser = utilities.getUserFromSession(req);

    //If the user is not in the list of opsUsers hardcoded into config file then don't let them see this page
    if (!config.opsUsers || config.opsUsers.indexOf(loggedInUser.username) < 0 ) {
      res.status(403).send('Forbidden');
    } else {
      //If they make it past authorization then they can go on to next step
      next();
    }

  });



  return router;
};