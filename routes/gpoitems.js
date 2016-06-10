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

    var username = '';
    if ('session' in req && req.session.username) {
      username = req.session.username;
    }

    var ownerIDs = [username];
    if ('session' in req && req.session.ownerIDs) {
      ownerIDs = req.session.ownerIDs;
    }
    //Make sure that at least logged in user is in ownerIDs
    if (ownerIDs.indexOf(username) < 0) {
      ownerIDs.push(username)
    }

    var isSuperUser = false;
    if ('session' in req && req.session.user.isSuperUser === true) {
      isSuperUser = true;
    }

    //Only return gpo itmes where this user is the owner
    //(or later probably group admin)
    //comment this out just to test with all
    //Super user is not limited by ownerIDs
    if (!isSuperUser) {
      query.owner = {$in: ownerIDs};
    }

    //Let front end decided on getting only public
    //query.access = "public";
    //For testing only let superUser see public for now
    //(don't want 10,000 records)
    //if (isSuperUser) query.access = "public";

    //Don't return SlashData!
    projection = {
      fields: {
        SlashData: 0
      }
    };
    utilities.genericRouteListCreation(app, req, res, 'GPOitems', query, projection)


  });

  router.use('/update', upload.single('thumbnail'), function(req, res) {
    var username = '';
    if ('session' in req && req.session.username) {
      username = req.session.username;
    }
    //If they are not logged in (no username then
    if (!username) {
      return res.json(utilities.getHandleError({},
        'LoginRequired')('Must be logged in to make this request.'));
    }



    var error = null;
    //This function gets input for both post and get for now
    var updateDocs = utilities.getRequestInputs(req).updateDocs;
    try {
      updateDocs = JSON.parse(updateDocs);
    }catch (ex) {
      return res.json(utilities.getHandleError({},
        'InvalidJSON')('Update Doc is not valid JSON.'));
    }

    //Now get the thumbnail file from request
    var thumbnail = req.file;
    //If they pass an array of docs don't support multiple thumbnails for now.
    // Can add later when we know how front end will pass them
    if (Array.isArray(updateDocs)) {
      if (updateDocs > 1) {
        thumbnail = null;
      }
    } else {
      updateDocs = [updateDocs];
    }

    //Update the thumbnail field in the metadata doc and
    if (thumbnail) {
      updateDocs[0].thumbnail = 'thumbnail/' + thumbnail.originalname;
    }

    //Don't need owner or SlashData on the update doc in case it is passed
    //by user
    updateDocs.forEach(function(doc) {
      delete doc.owner;
      delete doc.SlashData;
    });

    //Set up the method to run the updates with
    var useSync = false;
    var asyncRowLimit = 5;

    var UpdateGPOclass = require(app.get('appRoot') + 'shared/UpdateGPOitem');

    //This function will get the Update Class Instance needed to run .update
    var getUpdateClassInstance = function(row) {
      //Id is the key used for updating and "item" is just text for display on
      //errors, logging, etc because
      var updateInstance = new UpdateGPOclass(itemsCollection,
        extensionsCollection, req.session, config,gfs);
      //Don't need to add anything else like thumbnail to the instance, just
      //return the instance
      updateInstance.thumbnail = thumbnail;
      return updateInstance;
    };

    //This function handles the batch update process and is reusable
    var batchUpdateGPO = require(app.get('appRoot') + '/shared/batchUpdateGPO');
    batchUpdateGPO(updateDocs,getUpdateClassInstance,'Item','id',
                   useSync,asyncRowLimit)
      .done(function(resObjects) {
        res.json(resObjects);
      });


    //End of update endpoint
  });

  router.use('/availableTags/:category', function(req, res) {
    var availableTags = require(app.get('appRoot') + 'config/gpoItemsTags');
    var category = req.params.category;

    res.json(availableTags[category]);
  });
  router.use('/availableTags', function(req, res) {
    var availableTags = require(app.get('appRoot') + 'config/gpoItemsTags');
    res.json(availableTags);
  });
  router.use('/authGroups', function(req, res) {
    var ids = require(app.get('appRoot') + 'config/authGroups');
    res.json(ids);
  });


  return router;
};