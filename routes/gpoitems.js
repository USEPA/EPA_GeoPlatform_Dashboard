module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var Q = require('q');
//To allow multipart/form-data ie. File uploads
  var fs = require('fs');

  var multer = require('multer');
  var upload = multer({ dest: app.get('appRoot') + '/tmp/'});

  router.use('/list', function(req, res) {
    var username = "";
    if ('session' in req && req.session.username) username=req.session.username;
//If they are not logged in (no username then
    if (! username) return res.json(utilities.getHandleError({},"LoginRequired")("Must be logged in to make this request."));

    var ownerIDs = [username];
    if ('session' in req && req.session.ownerIDs) ownerIDs=req.session.ownerIDs;
//Make sure that at least logged in user is in ownerIDs
    if (ownerIDs.indexOf(username) < 0) ownerIDs.push(username)

    var isSuperUser = false;
    if ('session' in req && req.session.user.isSuperUser===true) isSuperUser=true;

    var utilities = require(app.get('appRoot') + '/shared/utilities');
    var monk = app.get('monk');
    var config = app.get('config');

    var itemscollection = monk.get('GPOitems');

    var error=null;
//This function gets input for both post and get for now
    var query = utilities.getRequestInputs(req).query;

//parse JSON querdfy in object
    if (typeof query ==="string") query = JSON.parse(query);
//If query is falsey make it empty object
    if (! query) query = {};

    //This function gets input for both post and get for now
    var projection = utilities.getRequestInputs(req).projection;

//parse JSON query in object
    if (typeof projection ==="string") projection = JSON.parse(projection);
//If query is falsey make it empty object
    if (! projection) projection= {};


//Only return gpo itmes where this user is the owner (or later probably group admin)
//comment this out just to test with all
//Super user is not limited by ownerIDs
    if (! isSuperUser) query.owner = {"$in":ownerIDs};

//Let front end decided on getting only public
//      query.access = "public";
//For testing only let superUser see public for now (don't want 10,000 records)
//   if (isSuperUser) query.access = "public";

//Need to limit the number of rows to prevent crashing
//This was fixed by streaming and not sending back SlashData so if config.maxRowLimit=null don't force a limit
    if (config.maxRowLimit) {
      if (!('limit' in projection)) projection.limit = config.maxRowLimit;
//Force limit to be <= MaxRowLimit (Note passing limit=0 to Mongo means no limit so cap that also)
      if (projection.limit > config.maxRowLimit || projection.limit===0) projection.limit = config.maxRowLimit
    }
//Don't return SlashData!
    if (!('fields' in projection)) projection.fields = {};
//Find if there are inclusion fields
    inclusionFields = Object.keys(projection.fields).filter(function (field) {return projection.fields[field]===1});
    if (inclusionFields.length>0) {
      delete projection.fields.SlashData;
    }else {
      projection.fields.SlashData=0;
    }

//    res.send("username= " + username);return;

//Assume if you pass limit return paging information
    if ('limit' in projection) {
      streamGPOitemsPaging()
        .then(function (beginning) {return streamGPOitems(beginning,"}")})
        .catch(function (err) {console.error("Error streaming GPOitems paging: " + err)})
        .done(function () {res.end()});
    } else {
//If no limit passed then just stream array of all items
      streamGPOitems()
        .catch(function (err) {console.error("Error streaming GPOitems: " + err)})
        .done(function () {res.end()});
    }

    function streamGPOitems(beginning,end) {
//This will make streaming output to client
      projection.stream=true;
//Make sure end is a string if null
      end = end || "";
//First have to stream the beginning text
      return utilities.writeStreamPromise(res,beginning)
        .then(function () {
          var defer = Q.defer();
          var firstCharacter="[";
          itemscollection.find(query, projection)
            .each(function (doc) {
              res.write(firstCharacter);
              res.write(JSON.stringify(doc));
              if (firstCharacter == "[") firstCharacter = ",";
            })
            .error(function (err) {
              defer.reject("Error streaming GPO items: " + err);
            })
            .success(function () {
//if firstcharacter was not written then write it now (if no docs need to write leading [
              if (firstCharacter==="[") res.write(firstCharacter);
              res.write("]" + end, function () {
                defer.resolve();
              });
            });
            return defer.promise;
        })
    }
    function getTotalRowsPromise() {
//Save total rows in session for a query so we don't have to keep getting count when paging
      if ('session' in req && 'GPOitemsList' in req.session && req.session.GPOitemsList.query==JSON.stringify(query)) {
        console.log("Use Session Total");
        return Q(req.session.GPOitemsList.total);
      }else{
        return Q(itemscollection.count(query))
          .then(function (total) {
            if ('session' in req) req.session.GPOitemsList={query:JSON.stringify(query),total:total};
            console.log("Save Session: " + JSON.stringify(req.session.GPOitemsList));
            return total;
          });
      }
    }

    function streamGPOitemsPaging() {
//Have to get the total rows either from DB or session and then get the paging stuff
      return getTotalRowsPromise()
        .then(function (total) {
          var resObject = {};
          resObject.total = total;
          resObject.start = projection.skip || 1;
          resObject.num = projection.limit || total;
          resObject.nextStart = resObject.start + resObject.num;
          if (resObject.nextStart > resObject.total) resObject.nextStart = -1;
          return JSON.stringify(resObject).replace(/}$/,',"results":');
        });
    }


  });

  router.use('/update', upload.single('thumbnail'), function(req, res) {
    var username = "";
    if ('session' in req && req.session.username) username=req.session.username;
//If they are not logged in (no username then
    if (! username) return res.json(utilities.getHandleError({},"LoginRequired")("Must be logged in to make this request."));


    var utilities = require(app.get('appRoot') + '/shared/utilities');
//    var db = req.db;
    var monk = app.get('monk');
    var config = app.get('config');

    var itemsCollection = monk.get('GPOitems');
    var extensionsCollection = monk.get('GPOitemExtensions');
    var gfs = app.get('gfs');

    var error=null;
//This function gets input for both post and get for now
    var updateDocs = utilities.getRequestInputs(req).updateDocs;
    try {
      updateDocs = JSON.parse(updateDocs);
    }catch (ex){
      return res.json(utilities.getHandleError({},"InvalidJSON")("Update Doc is not valid JSON."));
    }

//Now get the thumbnail file from request
    var thumbnail = req.file;
//If they pass an array of docs don't support multiple thumbnails for now.
// Can add later when we know how front end will pass them
    if (Array.isArray(updateDocs)) {
      if (updateDocs>1) thumbnail = null;
    }else {
      updateDocs=[updateDocs];
    }

    //Update the thumbnail field in the metadata doc and
    if (thumbnail) updateDocs[0].thumbnail="thumbnail/" + thumbnail.originalname;

//Don't need owner or SlashData on the update doc in case it is passed by user
    updateDocs.forEach(function(doc) {
      delete doc.owner;
      delete doc.SlashData;
    });

    //Set up the method to run the updates with
    var useSync=false;
    var asyncRowLimit=5;

    var UpdateGPOclass = require(app.get('appRoot') + 'shared/UpdateGPOitem');

    //This function will get the Update Class Instance needed to run .update
    var getUpdateClassInstance = function (row) {
//id is the key used for updating and "item" is just text for display on errors, logging, etc because
      var updateInstance = new UpdateGPOclass(itemsCollection,extensionsCollection,req.session,config,gfs);
//don't need to add anything else like thumbnail to the instance, just return the instance
      updateInstance.thumbnail = thumbnail;
      return updateInstance;
    };

//This function handles the batch update process and is reusable
    var batchUpdateGPO = require(app.get('appRoot') + '/shared/batchUpdateGPO');
    batchUpdateGPO(updateDocs,getUpdateClassInstance,"Item","id",useSync,asyncRowLimit)
      .done(function (resObjects) {
        res.json(resObjects);
      });


//end of update endpoint
  });

  return router;
};