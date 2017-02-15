//going to have to run this from different process 
module.exports = function(app) {
  var Q = require('Q');
  var express = require('express');
  var router = express.Router();

  var appRoot = app.get('appRoot');
  var utilities = require(appRoot + '/shared/utilities');
  var config = require(appRoot + '/config/env');

  var csvLib = require('csv');
  var runExternalCommand = require(appRoot + '/shared/runExternalCommand')();

  router.use('/list', function(req, res) {
    var deployInProgress = false;
    var deployStatus;
   var hasError = false;

    var errors = [];
    var inputs = utilities.getCleanRequestInputs(req, errors);
    if (errors.length > 0) {
      return res.json({errors: [errors.join('\n')]});
    }

    try {
      inputs.offset = parseInt(inputs.offset);
    }catch(ex){}
    try {
      inputs.limit= parseInt(inputs.limit);
    }catch(ex){}

    var loggedInUser = app.get('loggedInUser') || {};
    var from = 1;
    if (inputs.offset) from = inputs.offset+1;
    var to;
    if (inputs.limit) to = from + inputs.limit-1;

    return Q.fcall(function () {return true})
      .then(runExternalCommand.getRunFunction('git fetch --prune')())
      .then(runExternalCommand.getRunFunction('git for-each-ref --sort=-committerdate --format="%(refname:short)\t%(committerdate:short)" refs/remotes'))
      .then(function (out) {
        return Q.ninvoke(csvLib, 'parse', runExternalCommand.output[0].message.stdout, {columns: ['name','lastCommitDate'], delimiter: '\t',from:from,to:to})
      })
    .then(function (output) {
      return res.json({body:output});
    })
      .catch(function (error) {
        return res.json({errors: [error.stack || error.message || error]});
      });


  });


  return router;
};