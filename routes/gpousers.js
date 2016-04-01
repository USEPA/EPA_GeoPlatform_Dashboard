module.exports = function (app) {
  var express = require('express');
  var router = express.Router();
  var Q = require('q');

//  router.use('/list/:filterType', function(req, res) {
  router.use('/list/:filterType/:filterValue', function (req, res) {
    handleGPOitemsListRoute(req, res, false);
  });

  router.use('/list.csv/:filterType/:filterValue', function (req, res) {
    handleGPOitemsListRoute(req, res, true);
  });

  router.use('/list.csv', function (req, res) {
    var isCSV = false;

    handleGPOitemsListRoute(req, res, true);
  });

  router.use('/list', function (req, res) {
    handleGPOitemsListRoute(req, res, false);
  });

  function handleGPOitemsListRoute(req, res, isCSV) {
    var username = "";
    console.log(req.params);
    if ('session' in req && req.session.username) username = req.session.username;
//If they are not logged in (no username then
    if (!username) return res.json(utilities.getHandleError({},"LoginRequired")("Must be logged in to make this request."));
    var ownerIDs = [username];
    if ('session' in req && req.session.ownerIDs) ownerIDs = req.session.ownerIDs;
//Make sure that at least logged in user is in ownerIDs
    if (ownerIDs.indexOf(username) < 0) ownerIDs.push(username);

    var isSuperUser = false;
    if ('session' in req && req.session.user.isSuperUser === true) isSuperUser = true;

    var utilities = require(app.get('appRoot') + '/shared/utilities');
    var monk = app.get('monk');
    var config = app.get('config');

    var userscollection = monk.get('GPOusers');

    var error = null;

//This function gets input for both post and get for now
    var query = utilities.getRequestInputs(req).query;

//parse JSON query in object
    if (typeof query === "string") query = JSON.parse(query);
//If query is falsey make it empty object
    if (!query) query = {};

//Now we can filter using url route filter if supplied eg. authGroups/EPA Region 1
    var filterValue=req.params.filterValue;
    if (req.params.filterType) {
//try to convert to something other than string
      try {
        filterValue = JSON.parse(filterValue);
      }catch(ex) {}
      if (typeof filterValue=="string") {
        query[req.params.filterType] = {"$regex": filterValue};
      }else {
//if not string passed in then don't do regex search
        query[req.params.filterType] = filterValue;
      }
    }

    //This function gets input for both post and get for now
    var projection = utilities.getRequestInputs(req).projection;

//parse JSON query in object
    if (typeof projection === "string") projection = JSON.parse(projection);
//If query is falsey make it empty object
    if (!projection) projection = {};

//Only return gpo itmes where this user is the owner (or later probably group admin)
//comment this out just to test with all
//Super user is not limited by ownerIDs. If admin is finding External User then show all external users
    var findingExternalUsers = (req.session.user.isAdmin && ((req.params.filterType=="isExternal" && filterValue==true) || query.isExternal===true));

    if (! isSuperUser && ! findingExternalUsers) query.username = {"$in": ownerIDs};

    if (isCSV === true) {
      streamGPOusersCSV()
        .catch(function (err) {
          console.error("Error getting GPOusers CSV: " + err)
        })
        .done(function () {
          res.end()
        });
    } else {
      streamGPOusers()
        .catch(function (err) {
          console.error("Error streaming GPOusers: " + err)
        })
        .done(function () {
          res.end()
        });
    }

    function getGPOusersCSV() {
      var json2csv = require('json2csv');
      return Q(userscollection.find(query, projection))
        .then(function (docs) {
          return Q.nfcall(json2csv, {data: docs});
        })
        .then(function (csv) {
          var outFile = "gpoUsers";
//get rid of space and back slashes in file name because back slash will be confused as folder seperator in name
//get rid of other special characters used in search
          if (req.params.filterType) outFile += "-" + req.params.filterValue.replace(/ /g, "_").replace(/[\^\$\\]/g, "");

          outFile += ".csv";
          res.attachment(outFile);
          res.write(csv);
        });
    }

    function streamGPOusersCSV() {
      var json2csv = require('json2csv');
//deasync will make json2csv sync so we can stream in order
      var deasync = require('deasync');
      var syncJson2csv = deasync(json2csv);

      var outFile = "gpoUsers";
//get rid of space and back slashes in file name because back slash will be confused as folder seperator in name
//get rid of other special characters used in search
      if (req.params.filterType) outFile += "-" + req.params.filterValue.replace(/ /g, "_").replace(/[\^\$\\]/g, "");

      outFile += ".csv";
      res.attachment(outFile);
      var hasCSVColumnTitle = true;

      //This will make streaming output to client
      projection.stream = true;
      //First have to stream the beginning text
      var defer = Q.defer();
      userscollection.find(query, projection)
        .each(function (doc) {
          res.write(syncJson2csv({data: doc, hasCSVColumnTitle: hasCSVColumnTitle}));
          res.write("\r\n");
          if (hasCSVColumnTitle) hasCSVColumnTitle = false;
        })
        .error(function (err) {
          defer.reject("Error streaming GPO users to CSV: " + err);
        })
        .success(function () {
//end of strem will resolve deferred
          defer.resolve();
        });
      return defer.promise;
    }

    function streamGPOusers(beginning, end, isCSV) {
//This will make streaming output to client
      projection.stream = true;
//Make sure end is a string if null
      end = end || "";
//First have to stream the beginning text. Not sure why i did res.write(beginning) in a promise!
      return utilities.writeStreamPromise(res, beginning)
        .then(function () {
          var defer = Q.defer();
          var firstCharacter = "[";
          userscollection.find(query, projection)
            .each(function (doc) {
              res.write(firstCharacter);
              res.write(JSON.stringify(doc));
              if (firstCharacter == "[") firstCharacter = ",";
            })
            .error(function (err) {
              defer.reject("Error streaming GPO users: " + err);
            })
            .success(function () {
//if firstcharacter was not written then write it now (if no docs need to write leading [
              if (firstCharacter === "[") res.write(firstCharacter);
              res.write("]" + end, function () {
                defer.resolve();
              });
            });
          return defer.promise;
        })
    }

  }

  router.use('/update', function(req, res) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');
    var username = "";
    if ('session' in req && req.session.username) username=req.session.username;
//If they are not logged in (no username then
    if (! username) return res.json(utilities.getHandleError({},"LoginRequired")("Must be logged in to make this request."));

//    var db = req.db;
    var monk = app.get('monk');
    var config = app.get('config');

    var usersCollection = monk.get('GPOusers');
    var extensionsCollection = monk.get('GPOuserExtensions');

    var error=null;
//This function gets input for both post and get for now
    var updateDocs = utilities.getRequestInputs(req).updateDocs;
    try {
      updateDocs = JSON.parse(updateDocs);
    }catch (ex){
      return res.json(utilities.getHandleError({},"InvalidJSON")("Update Doc is not valid JSON."));
    }

//If they pass an array of docs don't support multiple thumbnails for now.
// Can add later when we know how front end will pass them
    if (! Array.isArray(updateDocs)) {
      updateDocs=[updateDocs];
    }

    //Set up the method to run the updates with
    var useSync=false;
    var asyncRowLimit=5;

    var UpdateGPOclass = require(app.get('appRoot') + 'shared/UpdateGPOuser');

    //This function will get the Update Class Instance needed to run .update
    var getUpdateClassInstance = function (row) {
      var updateInstance = new UpdateGPOclass(usersCollection,extensionsCollection,req.session,config);
//don't need to add anything else like thumbnail to the instance, just return the instance
      return updateInstance;
    };

//This function handles the batch update process and is reusable
    var batchUpdateGPO = require(app.get('appRoot') + '/shared/batchUpdateGPO');
    batchUpdateGPO(updateDocs,getUpdateClassInstance,"User","username",useSync,asyncRowLimit)
      .catch(function (err) {
        res.json(utilities.getHandleError({},"UpdateError")("Error running batchUpdateGPO." + err.stack));
      })
      .done(function (resObjects) {
        res.json(resObjects);
      });

//end of update endpoint
  });

  return router;
};