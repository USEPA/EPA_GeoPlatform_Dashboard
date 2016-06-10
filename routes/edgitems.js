module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  //To allow multipart/form-data ie. File uploads
  var fs = require('fs');

  var multer = require('multer');
  var upload = multer({ dest: app.get('appRoot') + '/tmp/'});

  router.use('/list', function(req, res) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');
    var query = {};
    var projection = {};
    // Simple call for EDG - just straight pull from Mongo
    utilities.genericRouteListCreation(app, req, res, 'EDGitems',
                                       query, projection);
  });

  return router;
};