module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  //To allow multipart/form-data ie. File uploads
  var fs = require('fs');

  var multer = require('multer');
  var upload = multer({ dest: app.get('appRoot') + '/tmp/'});

  var utilities = require(app.get('appRoot') + '/shared/utilities');

  router.use('/list', function(req, res) {

    var query = {};
    var projection = {};

    //Get the stored/logged in user. If not logged in this error message sent to user
    var user = utilities.getUserFromSession(req,res);

    //If user not created then don't go on. getUserFromSession(res) already sent login error message to user
    if (!user) {
      return false;
    }

    var showAll = utilities.getRequestInputs(req).showAll;
    if (showAll==="true") showAll=true;

    //Only return gpo items where this user can see the owner's items
    //Super user is not limited by ownerIDs though
    if (!user.isSuperUser && !(user.isAdmin && showAll===true)) {
      query.owner = {$in: user.ownerIDs};
    }

//using this just to test that app reloaded in pm2
//    query.owner = {$in: ['dumdum']};

    //Let front end decided on getting only public
    //query.access = "public";
    //For testing only let superUser see public for now
    //(don't want 10,000 records)
    //if (user.isSuperUser) query.access = "public";

    //Don't return SlashData!
    projection = {
      fields: {
        SlashData: 0
      }
    };
    
    utilities.genericRouteListCreation(app, req, res, 'GPOitems',
                                       query, projection);


  });

  router.use('/update', upload.single('thumbnail'), function(req, res) {
    //Get the stored/logged in user. If not logged in this error message sent to user
    var user = utilities.getUserFromSession(req,res);

    //If user not created then don't go on. getUserFromSession(res) already sent login error message to user
    if (!user) {
      return false;
    }

    var monk = app.get('monk');
    var config = app.get('config');
    var gfs = app.get('gfs');

    var itemsCollection = monk.get('GPOitems');
    var extensionsCollection = monk.get('GPOitemExtensions');

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
      if (updateDocs.length > 1) {
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