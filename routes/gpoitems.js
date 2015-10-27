module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var Q = require('q');
  //To allow multipart/form-data ie. File uploads
  var fs = require('fs');

  var multer = require('multer');
  var upload = multer({
    dest: app.get('appRoot') + '/tmp/'
  });

  router.use('/list', function(req, res) {
    var username = "";
    if ('session' in req && req.session.username) username = req.session.username;
    //If they are not logged in (no username then
    if (!username) return res.json({
      error: {
        message: "Must be logged in to make this request.",
        code: "LoginRequired"
      },
      body: null
    });

    var ownerIDs = [username];
    if ('session' in req && req.session.ownerIDs) ownerIDs = req.session.ownerIDs;

    var isSuperUser = false;
    if ('session' in req && req.session.isSuperUser === true) isSuperUser = true;

    var utilities = require(app.get('appRoot') + '/shared/utilities');
    var monk = app.get('monk');
    var config = app.get('config');

    var itemscollection = monk.get('GPOitems');

    var error = null;
    //This function gets input for both post and get for now
    var query = utilities.getRequestInputs(req).query;

    //parse JSON querdfy in object
    if (typeof query === "string") query = JSON.parse(query);
    //If query is falsey make it empty object
    if (!query) query = {};

    //This function gets input for both post and get for now
    var projection = utilities.getRequestInputs(req).projection;

    //parse JSON query in object
    if (typeof projection === "string") projection = JSON.parse(projection);
    //If query is falsey make it empty object
    if (!projection) projection = {};


    //Only return gpo itmes where this user is the owner (or later probably group admin)
    //comment this out just to test with all
    //Super user is not limited by ownerIDs
    if (!isSuperUser) query.owner = {
      "$in": ownerIDs
    };


    //Let front end decided on getting only public
    //      query.access = "public";
    //For testing only let superUser see public for now (don't want 10,000 records)
    //if (isSuperUser) query.access = "public";

    //Need to limit the number of rows to prevent crashing
    //This was fixed by streaming and not sending back SlashData so if config.maxRowLimit=null don't force a limit
    if (config.maxRowLimit) {
      if (!('limit' in projection)) projection.limit = config.maxRowLimit;
      //Force limit to be <= MaxRowLimit (Note passing limit=0 to Mongo means no limit so cap that also)
      if (projection.limit > config.maxRowLimit || projection.limit === 0) projection.limit = config.maxRowLimit
    }
    //Don't return SlashData!
    if (!('fields' in projection)) projection.fields = {};
    projection.fields.SlashData = 0;

    //    res.send("username= " + username);return;
    console.log("query " + JSON.stringify(query));

    //Assume if you pass limit return paging information
    if ('limit' in projection) {
      streamGPOitemsPaging()
        .then(function(beginning) {
          return streamGPOitems(beginning, "}")
        })
        .catch(function(err) {
          console.error("Error streaming GPOitems paging: " + err)
        })
        .done(function() {
          res.end()
        });
    } else {
      //If no limit passed then just stream array of all items
      streamGPOitems()
        .catch(function(err) {
          console.error("Error streaming GPOitems: " + err)
        })
        .done(function() {
          res.end()
        });
    }

    function streamGPOitems(beginning, end) {
      //This will make streaming output to client
      projection.stream = true;
      //Make sure end is a string if null
      end = end || "";
      //First have to stream the beginning text
      return utilities.writeStreamPromise(res, beginning)
        .then(function() {
          var defer = Q.defer();
          var firstCharacter = "[";
          itemscollection.find(query, projection)
            .each(function(doc) {
              res.write(firstCharacter);
              res.write(JSON.stringify(doc));
              if (firstCharacter == "[") firstCharacter = ",";
            })
            .error(function(err) {
              defer.reject("Error streaming GPO items: " + err);
            })
            .success(function() {
              //if firstcharacter was not written then write it now (if no docs need to write leading [
              if (firstCharacter === "[") res.write(firstCharacter);
              res.write("]" + end, function() {
                defer.resolve();
              });
            });
          return defer.promise;
        })
    }

    function getTotalRowsPromise() {
      //Save total rows in session for a query so we don't have to keep getting count when paging
      if ('session' in req && 'GPOitemsList' in req.session && req.session.GPOitemsList.query == JSON.stringify(query)) {
        console.log("Use Session Total");
        return Q(req.session.GPOitemsList.total);
      } else {
        return Q(itemscollection.count(query))
          .then(function(total) {
            if ('session' in req) req.session.GPOitemsList = {
              query: JSON.stringify(query),
              total: total
            };
            console.log("Save Session: " + JSON.stringify(req.session.GPOitemsList));
            return total;
          });
      }
    }

    function streamGPOitemsPaging() {
      //Have to get the total rows either from DB or session and then get the paging stuff
      return getTotalRowsPromise()
        .then(function(total) {
          var resObject = {};
          resObject.total = total;
          resObject.start = projection.skip || 1;
          resObject.num = projection.limit || total;
          resObject.nextStart = resObject.start + resObject.num;
          if (resObject.nextStart > resObject.total) resObject.nextStart = -1;
          return JSON.stringify(resObject).replace(/}$/, ',"results":');
        });
    }


  });

  router.use('/update', upload.single('thumbnail'), function(req, res) {
    var username = "";
    if ('session' in req && req.session.username) username = req.session.username;
    //If they are not logged in (no username then
    if (!username) return res.json({
      error: {
        message: "Must be logged in to make this request.",
        code: "LoginRequired"
      },
      body: null
    });

    var utilities = require(app.get('appRoot') + '/shared/utilities');
    //    var db = req.db;
    var monk = app.get('monk');
    var config = app.get('config');

    var hrClass = require(app.get('appRoot') + '/shared/HandleGPOresponses');
    var hr = new hrClass(config);

    var itemscollection = monk.get('GPOitems');
    var gfs = app.get('gfs');

    var error = null;
    //This function gets input for both post and get for now
    var updateDocs = utilities.getRequestInputs(req).updateDocs;
    try {
      updateDocs = JSON.parse(updateDocs);
    } catch (ex) {
      return res.json({
        error: {
          message: "Update Doc is not valid JSON",
          code: "InvalidJSON"
        },
        body: null
      })
    }

    //Now get the thumbnail file from request
    var thumbnail = req.file;
    //If they pass an array of docs don't support multiple thumbnails for now.
    // Can add later when we know how front end will pass them
    if (Array.isArray(updateDocs)) {
      if (updateDocs > 1) thumbnail = null;
    } else {
      updateDocs = [updateDocs];
    }

    //Update the thumbnail field in the metadata doc and
    if (thumbnail) updateDocs[0].thumbnail = "thumbnail/" + thumbnail.originalname;

    //Don't need owner or SlashData on the update doc in case it is passed by user
    updateDocs.forEach(function(doc) {
      delete doc.owner;
      delete doc.SlashData;
    });

    //This is global result object that will be passed back to user
    var resObjects = {
      errors: []
    };
    //Class that will do all the updating for each document
    var UpdateGPOitemClass = require(app.get('appRoot') + '/shared/UpdateGPOitem');
    var updateGPOitem = null;
    //To keep count when looping over promises
    var updateGPOitemRow = 1;
    var updateGPOitemCount = updateDocs.length;
    //Set up the method to run the updates with
    var useSync = false;
    var AsyncRowLimit = 5;
    //function we will use to update set with this variable
    var updateGPOitemsFunction = null;

    if (useSync) {
      console.log('Updating using Sync');
      updateGPOitemsFunction = updateGPOitemsSync;
    } else {
      if (AsyncRowLimit === null) {
        console.log('Updating using Full Async ');
        updateGPOitemsFunction = updateGPOitemsAsync;
      } else {
        console.log('Updating using Hybrid ');
        updateGPOitemsFunction = updateGPOitemsHybrid;
      }
    }

    //Now update gpo items using method (sync, async, hybrid) chosen
    updateGPOitemsFunction()
      .catch(function(err) {
        console.error('Error received running updateGPOitemsFunction :' + err.stack);
        resObjects.errors.push(err.message);
      })
      .done(function() {
        res.json(resObjects);
      });

    function updateSingleGPOitem(updateDoc, async) {
      //If in async mode need to create new updateGPOitem instance each time so each will have it's own data
      if (!updateGPOitem || async === true) updateGPOitem = new UpdateGPOitemClass(itemscollection, req.session, config, gfs);
      //Pass thumbnail file upload object if exists
      if (thumbnail) updateGPOitem.thumbnail = thumbnail;

      if (!updateDoc) updateDoc = updateDocs[updateGPOitemRow - 1];

      updateGPOitemRow += 1;

      return updateGPOitem.update(updateDoc)
        .then(function() {
          //update the resObjects and update the count
          if (updateGPOitem.resObject.error) resObjects.errors.push(updateGPOitem.resObject.error);
        })
        .catch(function(err) {
          resObjects.errors.push("Error updating " + updateDoc.id + " : " + err.message);
          console.error("Error updating Single GPO item " + updateDoc.id + " : " + err.stack)
        })
    }

    function updateGPOitemsSync() {
      return hr.promiseWhile(function() {
        return updateGPOitemRow <= updateGPOitemCount;
      }, updateSingleGPOitem);
    }

    function updateGPOitemsHybrid() {
      return hr.promiseWhile(function() {
        return updateGPOitemRow <= updateGPOitemCount;
      }, updateGPOitemsAsync);
    }

    function updateGPOitemsAsync() {
      var Q = require('q');
      var defer = Q.defer();

      var async = require('async');
      var updateDocsAsync;
      if (AsyncRowLimit) {
        //take slice form current row to async row limit
        updateDocsAsync = updateDocs.slice(updateGPOitemRow - 1, updateGPOitemRow - 1 + AsyncRowLimit);
      } else {
        updateDocsAsync = updateDocs;
      }

      console.log("Updating from row " + updateGPOitemRow + " to " + (updateGPOitemRow + updateDocsAsync.length - 1));

      async.forEachOf(updateDocsAsync, function(value, key, done) {
        updateSingleGPOitem(value, true)
          .catch(function(err) {
            resObjects.errors.push("Error updating " + value.id + " : " + err.message);
            console.error('Async For Each Single Update GPO item Error :', err.stack);
          })
          .done(function() {
            done();
            //          console.log('for loop success')
          });
      }, function(err) {
        if (err) console.error('Async For Each Update GPO items Error :' + err.stack);
        //resolve this promise
        //      console.log('resolve')
        defer.resolve();
      });

      //I have to return a promise here for so that chain waits until everything is done until it runs process.exit in done.
      //chain was NOT waiting before and process exit was executing and data data not being retrieved
      return defer.promise
    }


    //end of update endpoint
  });

  return router;
};