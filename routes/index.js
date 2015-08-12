module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var request = require('request');

  /* GET home page. */
  router.use('/login', function (req, res, next) {
    var config = app.get('config');
    var url = config.portal + '/sharing/rest/portals/self';
    var token = req.param("token");
    var username = req.param("username");

//    console.log("token");
    var qsPars = {'token': token, 'f': 'json'};
//Pass parameters via form attribute
    var requestPars = {method: 'get', url: url, qs: qsPars};

    var hrClass = require('../utilities/handleGPOresponses');
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
}
