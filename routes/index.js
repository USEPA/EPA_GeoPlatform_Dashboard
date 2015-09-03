module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var request = require('request');

  /* GET home page. */
  router.use('/login', function (req, res, next) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');

    var config = app.get('config');
    var url = config.portal + '/sharing/rest/portals/self';

    var errors = [];
    var inputs = utilities.getCleanRequestInputs(req,errors);

    if (errors.length>0) res.json({error: {message:errors.join("\n"), code: "DirtyRequestInput"}, body: null});

    var token=inputs.token;
    var username=inputs.username;

//    console.log("token");
    var qsPars = {'token': token, 'f': 'json'};
//Pass parameters via form attribute
    var requestPars = {method: 'get', url: url, qs: qsPars};

    var hrClass = require(app.get('appRoot') + '/shared/HandleGPOresponses');
    var hr = new hrClass(config);

    function handleResponse(body) {
      if (username===hr.saved.user.username) {
//save the user to the session
        if ('session' in req) {
          req.session.username = username;
          req.session.token = token;
        }
        res.json({error: null, body: {user:hr.saved.user}});
      }else {
        res.json({error: {message:"Username does not match token", code: "UsernameTokenMismatch"}, body: null});
      }
    }

    function handleError(error) {
      res.json({error: {message: error, code: "BadToken"}, body: null});
    }

    hr.callAGOL(requestPars,"user").then(handleResponse).catch(handleError).done();
  });

  router.use('/logout', function (req, res, next) {
    if ('session' in req) {
      req.session.username = null;
      req.session.token = null;
    }
    res.json({error: null, body: {}});
  });

  return router;
};
