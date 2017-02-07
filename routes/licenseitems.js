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



  router.use('/listauthgroups.csv/:filterType/:filterValue', function(req, res) {
    licenseAuthGroupExportAudit(req, res, true);
  });

  router.use('/listauthgroups.csv', function(req, res) {
    licenseAuthGroupExportAudit(req, res, true);
  });

  router.use('/list.csv/:filterType/:filterValue', function(req, res) {
    licenseExportAudit(req, res, true);
  });

  router.use('/list.csv', function(req, res) {
    licenseExportAudit(req, res, true);
  });

  //Function to export EDG audit failures to CSV
  function licenseAuthGroupExportAudit(req, res, isCSV) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');

    //This function gets input for both POST and GET for now
    var query = utilities.getRequestInputs(req).query;

    //Parse JSON query in object
    if (typeof query === 'string') {
      query = JSON.parse(query);
    }
    //If query is falsey make it empty object
    if (!query) {
      query = {};
    }

    //Now we can filter using url route filter if supplied eg. authGroups/EPA Region 1
    var filterValue = req.params.filterValue;
    if (req.params.filterType) {
      //Try to convert to something other than string
      try {
        filterValue = JSON.parse(filterValue);
      }catch (ex) {}
      if (typeof filterValue == 'string') {
        query[req.params.filterType] = {$regex: filterValue};
      }else {
        //If not string passed in, then don't do regex search
        query[req.params.filterType] = filterValue;
      }
    }

    var monk = app.get('monk');
    var config = app.get('config');

    var GPOuserEntitlements = monk.get('GPOuserEntitlements');

    streamAuthGroupLicenseCSV()
      .catch(function(err) {
        console.error('Error getting AuthGroup License CSV: ' + err)
      })
      .done(function() {
        res.end()
      });

    function streamAuthGroupLicenseCSV() {
      var json2csv = require('json2csv');
      //Deasync will make json2csv sync so we can stream in order
      var deasync = require('deasync');
      var merge = require('merge');

      var syncJson2csv = deasync(json2csv);
      var outArray = [];
      var outFile = 'authGroupLicenseCount';

      outFile += '.csv';
      res.attachment(outFile);

      var defer = Q.defer();
      GPOuserEntitlements.find(query, {stream: true})
        .each(function(doc) {
          //Push doc.field to the array now
          outArray.push(doc);
        })
        .error(function(err) {
          defer.reject('Error getting Array From DB: ' + err);
        })
        .success(function() {
          //Write to CSV
          var authGroupsOutArray = [];
          outArray.forEach(function(user) {
            if (!user.authGroups || user.authGroups[0] == null) {
              user.authGroups = ['N/A'];
            }
            var existingGroup = authGroupsOutArray.filter(function(e) {
              return e.authGroup === user.authGroups[0];
            })[0];
            if (existingGroup) {
              existingGroup.count += 1;
            } else {
              authGroupsOutArray.push({
                authGroup: user.authGroups[0],
                count: 1
              });
            }
          });
          res.write(syncJson2csv({data: authGroupsOutArray, hasCSVColumnTitle: true}));
          defer.resolve(outArray);
        });
      return defer.promise;
    }
  }

  //Function to export EDG audit failures to CSV
  function licenseExportAudit(req, res, isCSV) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');

    //This function gets input for both POST and GET for now
    var query = utilities.getRequestInputs(req).query;

    //Parse JSON query in object
    if (typeof query === 'string') {
      query = JSON.parse(query);
    }
    //If query is falsey make it empty object
    if (!query) {
      query = {};
    }

    //Now we can filter using url route filter if supplied eg. authGroups/EPA Region 1
    var filterValue = req.params.filterValue;
    if (req.params.filterType) {
      //Try to convert to something other than string
      try {
        filterValue = JSON.parse(filterValue);
      }catch (ex) {}
      if (typeof filterValue == 'string') {
        query[req.params.filterType] = {$regex: filterValue};
      }else {
        //If not string passed in, then don't do regex search
        query[req.params.filterType] = filterValue;
      }
    }

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
      GPOuserEntitlements.find(query, {stream: true})
        .each(function(doc) {
          //Push doc.field to the array now
            outArray.push(doc);
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