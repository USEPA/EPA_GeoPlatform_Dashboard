module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var Q = require('q');
  //To allow multipart/form-data ie. File uploads
  var fs = require('fs');
  var monk = app.get('monk');
  var config = app.get('config');
  var utilities = require(app.get('appRoot') + '/shared/utilities');

  var multer = require('multer');
  var upload = multer({ dest: app.get('appRoot') + '/tmp/'});


  router.use('/list.csv', function(req, res) {
    licenseExportAudit(req, res);
  });

  //Function to export EDG audit failures to CSV
  function licenseExportAudit(req, res, isCSV) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');

    var monk = app.get('monk');
    var config = app.get('config');

    var GPOuserEntitlements = monk.get('GPOuserEntitlements');
    var userscollection = monk.get('GPOusers');

    streamLicenseCSV()
      .catch(function(err) {
        console.error('Error getting License CSV: ' + err)
      })
      .done(function() {
        res.end()
      });

    function streamLicenseCSV() {
      var json2csv = require('json2csv');
      //Deasync will make json2csv sync so we can stream in order
      var deasync = require('deasync');
      var merge = require('merge');

      var syncJson2csv = deasync(json2csv);
      var outArray = [];
      var outFile = 'userEntitlements';

      outFile += '.csv';
      res.attachment(outFile);

      var defer = Q.defer();
      GPOuserEntitlements.find({}, {stream: true})
        .each(function(doc) {
          //Push doc.field to the array now
          userscollection.findOne({username: doc.username}).then(function(user) {
            doc.authGroups = user.authGroups;
            outArray.push(doc);
          });
        })
        .error(function(err) {
          defer.reject('Error getting Array From DB: ' + err);
        })
        .success(function() {
          //Write to CSV
          res.write(syncJson2csv({data: outArray, hasCSVColumnTitle: true}));
          defer.resolve(outArray);
        });
      return defer.promise;
    }
  }


  router.use('/list', function(req, res) {
    var query = {};
    var projection = {};

    // Simple call for EDG - just straight pull from Mongo
    utilities.genericRouteListCreation(app, req, res, 'GPOuserEntitlements',
      query, projection);
  });

  router.use('/listcurrent', function(req, res) {
    var query = {};
    var projection = {};

    var GPOuserEntitlements = monk.get('GPOuserEntitlements');
    // Simple call for EDG - just straight pull from Mongo
    utilities.getMax(GPOuserEntitlements, 'date')
      .then(function(max) {
        utilities.genericRouteListCreation(app, req, res, 'GPOuserEntitlements',
          {date:max}, projection);
      })
  });


  return router;
};