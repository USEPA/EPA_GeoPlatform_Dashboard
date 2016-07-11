module.exports = function(app) {
  var express = require('express');
  var router = express.Router();

  router.use('/list', function(req, res) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');
    var query = {};
    var projection = {};

    //Get the stored/logged in user. If not logged in this error message sent to user
    var user = utilities.getUserFromSession(req,res);

    //If user not created then don't go on. getUserFromSession(res) already sent login error message to user
    if (!user) {
      return false;
    }

    //Only return checklist where this user can see the owner's items (by authgroup if admin)
    //Super user is not limited by ownerIDs though
    if (!user.isSuperUser) {
      if (user.isAdmin) {
        query['submission.authGroup'] = {$in: user.authGroups};
      } else {
        query['submission.owner'] = {$in: user.ownerIDs};
      }
    }

    // Reusable function gets the docs from mongo
    utilities.genericRouteListCreation(app, req, res, 'GPOchecklists',
      query, projection);
  });

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
    var gfs = app.get('gfs');

    var itemsCollection = monk.get('GPOitems');
    var checklistsCollection = monk.get('GPOchecklists');

    //This function gets input for both post and get for now
    var updateDocs = utilities.getRequestInputs(req).updateDocs;
    try {
      updateDocs = JSON.parse(updateDocs);
    }catch (ex) {
      return res.json(utilities.getHandleError({},
        'InvalidJSON')('Update Docs is not valid JSON.'));
    }

    if (Array.isArray(updateDocs)) {
    } else {
      updateDocs = [updateDocs];
    }

    //Set up the method to run the updates with
    var useSync = false;
    var asyncRowLimit = 5;

    var UpdateGPOclass = require(app.get('appRoot') + 'shared/UpdateGPOchecklist');

    //This function will get the Update Class Instance needed to run .update
    var getUpdateClassInstance = function(row) {
      //Id is the key used for updating and "item" is just text for display on
      //errors, logging, etc because
      return new UpdateGPOclass(checklistsCollection,itemsCollection,req.session, config);
    };

    //This function handles the batch update process and is reusable
    var batchUpdateGPO = require(app.get('appRoot') + '/shared/batchUpdateGPO');
    batchUpdateGPO(updateDocs,getUpdateClassInstance,'Checklist','_id',
      useSync,asyncRowLimit)
      .done(function(resObjects) {
        res.json(resObjects);
      });


    //End of update endpoint
  });



  return router;
};