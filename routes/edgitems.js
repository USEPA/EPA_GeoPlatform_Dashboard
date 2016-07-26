module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var Q = require('q');
  //To allow multipart/form-data ie. File uploads
  var fs = require('fs');

  var multer = require('multer');
  var upload = multer({ dest: app.get('appRoot') + '/tmp/'});


  router.use('/list.csv', function(req, res) {
    edgExportAudit(req, res);
  });

  //Function to export EDG audit failures to CSV
  function edgExportAudit(req, res) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');

    //Get the stored/logged in user. If not logged in this error message sent
    //to user
    var user = utilities.getUserFromSession(req,res);

    //If user not created then don't go on. getUserFromSession(res) already sent
    //login error message to user
    if (!user) {
      return false;
    }
    var monk = app.get('monk');
    var config = app.get('config');

    var edgCollection = monk.get('EDGitems');

    streamEDGauditCSV()
      .catch(function(err) {
        console.error('Error getting EDG audit CSV: ' + err)
      })
      .done(function() {
        res.end()
      });

    function streamEDGauditCSV() {
      var json2csv = require('json2csv');
      //Deasync will make json2csv sync so we can stream in order
      var deasync = require('deasync');
      var syncJson2csv = deasync(json2csv);

      var outFile = 'edgAudit';

      outFile += '.csv';
      res.attachment(outFile);

      //First have to stream the beginning text
      var defer = Q.defer();

      //Pre-monk 2.1 way of performing aggregate. If we ever upgrade, can just
      //do collection.aggregate
      Q.ninvoke(edgCollection.col,'aggregate',
        [
          {
            //AuditStatus contains an array of error objects. Flatten each
            //error to its own row
            $unwind: '$auditStatus.errors'
          },
          {
            $project: {
              //Use only these fields
              identifier: 1,
              title: 1,
              publisher: 1,
              contactPoint: 1,
              field: '$auditStatus.errors.field',
              reason: '$auditStatus.errors.reason',
            }
          }
        ])
        .then(function(docs) {
          //Write to CSV
          res.write(syncJson2csv({data: docs, hasCSVColumnTitle: true}));
          defer.resolve();
        });
      return defer.promise;
    }
  }


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