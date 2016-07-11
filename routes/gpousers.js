module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var Q = require('q');

  router.use('/list/:filterType/:filterValue', function(req, res) {
    handleGPOitemsListRoute(req, res, false);
  });

  router.use('/list.csv/:filterType/:filterValue', function(req, res) {
    handleGPOitemsListRoute(req, res, true);
  });

  router.use('/list.csv', function(req, res) {
    var isCSV = false;
    handleGPOitemsListRoute(req, res, true);
  });

  router.use('/list', function(req, res) {
    handleGPOitemsListRoute(req, res, false);
  });

  function handleGPOitemsListRoute(req, res, isCSV) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');

    //Get the stored/logged in user. If not logged in this error message sent to user
    var user = utilities.getUserFromSession(req,res);

    //If user not created then don't go on. getUserFromSession(res) already sent login error message to user
    if (!user) {
      return false;
    }

    var monk = app.get('monk');
    var config = app.get('config');

    var userscollection = monk.get('GPOusers');

    var error = null;

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

    //This function gets input for both post and get for now
    var projection = utilities.getRequestInputs(req).projection;

    //Parse JSON query in object
    if (typeof projection === 'string') {
      projection = JSON.parse(projection);
    }
    //If query is falsey make it empty object
    if (!projection) {
      projection = {};
    }

    //Only return gpo itmes where this user is the owner
    //(or later probably group admin)
    //comment this out just to test with all
    //Super user is not limited by ownerIDs. If admin is finding External
    //User then show all external users
    var findingExternalUsers = (req.session.user.isAdmin &&
      ((req.params.filterType == 'isExternal' && filterValue == true) ||
      query.isExternal === true));

    if (!user.isSuperUser && !findingExternalUsers) {
      query.username = {$in: user.ownerIDs};
    }

    if (isCSV === true) {
      streamGPOusersCSV()
        .catch(function(err) {
          console.error('Error getting GPOusers CSV: ' + err)
        })
        .done(function() {
          res.end()
        });
    } else {
      streamGPOusers()
        .catch(function(err) {
          console.error('Error streaming GPOusers: ' + err)
        })
        .done(function() {
          res.end()
        });
    }

    function getGPOusersCSV() {
      var json2csv = require('json2csv');
      return Q(userscollection.find(query, projection))
        .then(function(docs) {
          return Q.nfcall(json2csv, {data: docs});
        })
        .then(function(csv) {
          var outFile = 'gpoUsers';
          //Get rid of space and back slashes in file name because back slash
          //will be confused as folder separator in name
          //get rid of other special characters used in search
          if (req.params.filterType) {
            outFile += '-' + req.params.filterValue
                .replace(/ /g, '_')
                .replace(/[\^\$\\]/g, '');
          }

          outFile += '.csv';
          res.attachment(outFile);
          res.write(csv);
        });
    }

    function streamGPOusersCSV() {
      var json2csv = require('json2csv');
      //Deasync will make json2csv sync so we can stream in order
      var deasync = require('deasync');
      var syncJson2csv = deasync(json2csv);
      //Need to get the extension field names for header in case the extension field doesn't exist in doc
      var GPOuserExtensions = require(app.get('appRoot') + '/config/updateFields/GPOuserExtensions.js');

      var outFile = 'gpoUsers';
      //Get rid of space and back slashes in file name because back slash will
      //be confused as folder separator in name
      //get rid of other special characters used in search
      if (req.params.filterType) {
        outFile += '-' + req.params.filterValue
            .replace(/ /g, '_')
            .replace(/[\^\$\\]/g, '');
      }

      outFile += '.csv';
      res.attachment(outFile);
      var hasCSVColumnTitle = true;

      //This will make streaming output to client
      projection.stream = true;
      //First have to stream the beginning text
      var defer = Q.defer();
      userscollection.find(query, projection)
        .each(function(doc) {

          //Add empty extension fields if they don't exist for firt doc to get the full header
          if (hasCSVColumnTitle) GPOuserExtensions.fields.forEach(function(field) {
            if (!(field in doc)) doc[field] = undefined
          });

          res.write(syncJson2csv({data: cleanupUserDocForOutputCSV(doc), hasCSVColumnTitle: hasCSVColumnTitle}));
          res.write('\r\n');

          if (hasCSVColumnTitle) {
            hasCSVColumnTitle = false;
          }
        })
        .error(function(err) {
          defer.reject('Error streaming GPO users to CSV: ' + err);
        })
        .success(function() {
          //End of stream will resolve deferred
          defer.resolve();
        });
      return defer.promise;
    }

    function cleanupUserDocForOutputCSV(inputDoc) {
      var cleanDoc = inputDoc;
      //Remove fields that we don't want to write out to CSV output file
      delete cleanDoc._id;
      delete cleanDoc.isAdmin;
      delete cleanDoc.folders;

      //Convert lists to string to clean up []'s in the output CSV
      cleanDoc.groups = inputDoc.groups.toString();
      cleanDoc.authGroups = inputDoc.authGroups.toString();

      //Convert unix timestamps to dates
      var modDateRaw = new Date(inputDoc.modified);
      var createDateRaw = new Date(inputDoc.created);

      //Create date in format YYYY-MM-DD
      cleanDoc.modified = modDateRaw.toISOString().substring(0,10);
      cleanDoc.created = createDateRaw.toISOString().substring(0,10);

      return cleanDoc;
    }

    function streamGPOusers(beginning, end, isCSV) {
      //This will make streaming output to client
      projection.stream = true;
      //Make sure end is a string if null
      end = end || '';
      //First have to stream the beginning text. Not sure why i did res.write(beginning) in a promise!
      return utilities.writeStreamPromise(res, beginning)
        .then(function() {
          var defer = Q.defer();
          var firstCharacter = '[';
          userscollection.find(query, projection)
            .each(function(doc) {
              res.write(firstCharacter);
              res.write(JSON.stringify(doc));
              if (firstCharacter == '[') {
                firstCharacter = ',';
              }
            })
            .error(function(err) {
              defer.reject('Error streaming GPO users: ' + err);
            })
            .success(function() {
              //If firstcharacter was not written then write it now
              //(if no docs need to write leading [
              if (firstCharacter === '[') {
                res.write(firstCharacter);
              }
              res.write(']' + end, function() {
                defer.resolve();
              });
            });
          return defer.promise;
        })
    }

  }

  router.use('/update', function(req, res) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');

    //Get the stored/logged in user. If not logged in this error message sent to user
    var user = utilities.getUserFromSession(req,res);

    //If user not created then don't go on. getUserFromSession(res) already sent login error message to user
    if (!user) {
      return false;
    }

    var monk = app.get('monk');
    var config = app.get('config');

    var usersCollection = monk.get('GPOusers');
    var extensionsCollection = monk.get('GPOuserExtensions');

    var error = null;
    //This function gets input for both POST and GET for now
    var updateDocs = utilities.getRequestInputs(req).updateDocs;
    try {
      updateDocs = JSON.parse(updateDocs);
    }catch (ex) {
      return res.json(utilities.getHandleError({},'InvalidJSON')('Update Doc is not valid JSON.'));
    }

    //If they pass an array of docs don't support multiple thumbnails for now.
    //Can add later when we know how front end will pass them
    if (!Array.isArray(updateDocs)) {
      updateDocs = [updateDocs];
    }

    //Set up the method to run the updates with
    var useSync = false;
    var asyncRowLimit = 5;

    var UpdateGPOclass = require(app.get('appRoot') + 'shared/UpdateGPOuser');

    //This function will get the Update Class Instance needed to run .update
    var getUpdateClassInstance = function(row) {
      var updateInstance = new UpdateGPOclass(usersCollection,extensionsCollection,req.session,config);
      //Don't need to add anything else like thumbnail to the instance, just return the instance
      return updateInstance;
    };

    //This function handles the batch update process and is reusable
    var batchUpdateGPO = require(app.get('appRoot') + '/shared/batchUpdateGPO');
    batchUpdateGPO(updateDocs,getUpdateClassInstance,'User','username',useSync,asyncRowLimit)
      .catch(function(err) {
        res.json(utilities.getHandleError({},'UpdateError')('Error running batchUpdateGPO.' + err.stack));
      })
      .done(function(resObjects) {
        res.json(resObjects);
      });

    //End of update endpoint
  });

  return router;
};