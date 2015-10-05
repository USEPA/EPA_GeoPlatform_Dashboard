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
    if (! username) return res.json({error: {message: "Must be logged in to make this request.", code: "LoginRequired"}, body: null});

    var utilities = require(app.get('appRoot') + '/shared/utilities');
//    var db = req.db;
    var db = app.get('monk');
    var config = app.get('config');

    var collection = db.get('GPOitems');

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
//      query.owner = username;
//Need to limit the number of rows to prevent crashing
//This was fixed by streaming and not sending back SlashData so if config.maxRowLimit=null don't force a limit
    if (config.maxRowLimit) {
      if (!('limit' in projection)) projection.limit = config.maxRowLimit;
//Force limit to be <= MaxRowLimit (Note passing limit=0 to Mongo means no limit so cap that also)
      if (projection.limit > config.maxRowLimit || projection.limit===0) projection.limit = config.maxRowLimit
    }
//Don't return SlashData!
    if (!('fields' in projection)) projection.fields = {};
    projection.fields.SlashData=0;
//Let front end decided on getting only public
      //query.access = "public";
    query.owner = "Yarnell.David_EPA";

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
          collection.find(query, projection)
            .each(function (doc) {
              res.write(firstCharacter);
              res.write(JSON.stringify(doc));
              if (firstCharacter == "[") firstCharacter = ",";
            })
            .error(function (err) {
              defer.reject("Error streaming GPO items: " + err);
            })
            .success(function () {
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
        return Q(collection.count(query))
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
    if (! username) return res.json({error: {message: "Must be logged in to make this request.", code: "LoginRequired"}, body: null});

    var utilities = require(app.get('appRoot') + '/shared/utilities');
//    var db = req.db;
    var monk = app.get('monk');
    var config = app.get('config');

    var hrClass = require(app.get('appRoot') + '/shared/HandleGPOresponses');
    var hr = new hrClass(config);

    var itemscollection = monk.get('GPOitems');

    var error=null;
//This function gets input for both post and get for now
    var updateDoc = utilities.getRequestInputs(req).updateDoc;
    try {
      updateDoc = JSON.parse(updateDoc);
    }catch (ex){
      return res.json({error: {message: "Update Doc is not valid JSON", code: "InvalidJSON"}, body: null})
    }

//Don't need owner or SlashData on the update doc in case it is passed by user
    delete updateDoc.owner;
    delete updateDoc.SlashData;
//Owner of item that will be updated
    var updateOwner=null;
//SlashData object that will be updated
    var updateSlashData=null;

//Now get the thumbnail file from request
    var thumbnail = req.file;
//This is global result object that will be passed back to user
    var resObject = {};

    getOwnerID()
    .then(function (ownerID) {
        updateOwner=ownerID;
        if (updateOwner) {
//Update Local and Remote GPO item in DB including thumbnail
          return Q.all([updateRemoteGPOitem(),updateLocalGPOitem()])
            .then(function () {if (thumbnail.path) return Q.ninvoke(fs,"unlink",thumbnail.path)})
        }else {
          resObject={error: {message: "You do not have Access to Update this GPO item", code: "InvalidAccess"}, body: null};
        }})
    .catch(utilities.getHandleError(resObject,"UpdateError"))
    .done(function () {
//Now that update is done we can finally return result
        res.json(resObject)
    });

    function getOwnerID() {
      return Q(itemscollection.findOne({id:updateDoc.id},{fields:{owner:1,SlashData:1}}))
        .then(function (doc) {
//Make sure SlashData is at least an empty object for updating later
          updateSlashData = doc.SlashData || {};
//If owner ID of this object is accessible by user then update otherwise return error
          if (req.session.ownerIDs.indexOf(doc.owner)>=0) {
            return doc.owner;
          }else {
            return null;
          }
        });
    }

    function updateRemoteGPOitem() {
      var fs = require('fs');
      var merge = require('merge');
      var formData = merge.recursive(true,updateDoc);

//get read stream from uploaded thumb file and add to form data with name
      if (thumbnail) formData.thumbnail={value:fs.createReadStream(thumbnail.path),
                                        options: {filename: updateDoc.thumbnail,
                                                  contentType: thumbnail.mimetype}};

      var url= config.portal + '/sharing/rest/content/users/' + updateOwner + '/items/' + updateDoc.id + '/update';
//      console.log(url);
      var qs = {token: req.session.token,f:'json'};
//      console.log(req.session.token);

//Pass parameters via form attribute

      var requestPars = {method:'post', url:url, formData:formData, qs:qs };

      return hr.callAGOL(requestPars)
          .then(handleUpdateResponse)
    }

    function handleUpdateResponse(body) {
      resObject = {error: null, body: {}};
    }

    function updateLocalGPOitem() {
//Update the thumbnail field in the metadata doc and
      if (thumbnail) updateDoc.thumbnail="thumbnail/" + thumbnail.originalname;
      return Q.all([
        Q(itemscollection.update({id:updateDoc.id},{$set:updateDoc})),
        saveThumbnailToGridFS()
      ]);

    }

    function saveThumbnailToGridFS() {
      if (! thumbnail) return false;
      var defer = Q.defer();
      var gfs = app.get('gfs');

//use gpo item id as name of file in grid fs
      var writestream = gfs.createWriteStream(
        {
          filename: thumbnail.originalname,
          metadata: {id: updateDoc.id, type: "thumbnail"}
        }
      );
//when done writing need to resolve the promise
      writestream.on('close', function (file) {
        console.log('Thumb File with id = ' + updateDoc.id + ' and file = ' + thumbnail.originalname + ' written to GridFS');

//now update thumbnailID in DB
        updateSlashData.thumbnailID = file._id;

        Q(itemscollection.update({id: updateDoc.id}, {$set: {SlashData: updateSlashData}}))
            .catch(function(err) {
              defer.reject("Error updating Thumbnail Binary ID for " + updateDoc.id + " : " + err);
            })
            .done(function () {
              defer.resolve();
            });
      });
      //handle error due to writing
      writestream.on('error', function (err) {
        defer.reject('Error writing thumbnail stream to GridFS : ' + err);
      });
//Now actually pipe response into gfs writestream
      fs.createReadStream(thumbnail.path).pipe(writestream);

      return defer.promise;
    }
  });

  return router;
};