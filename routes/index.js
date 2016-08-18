module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var request = require('request');

  router.use('/login', function(req, res, next) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');
    var config = app.get('config');

    //Use community/self to get user info including the group info portals/self
    //gets user as part of portal info but no groups
    var url = config.portal + '/sharing/rest/community/self';

    var errors = [];
    var inputs = utilities.getCleanRequestInputs(req, errors);

    if (errors.length > 0) {
      return res.json(
          utilities.getHandleError({},'DirtyRequestInput')(errors.join('\n')));
    }

    var token = inputs.token;
    var username = inputs.username;

    var qsPars = {token: token, f: 'json'};

    //Pass parameters via form attribute
    var requestPars = {method: 'get', url: url, qs: qsPars};

    var hrClass = require(app.get('appRoot') + '/shared/HandleGPOresponses');
    var hr = new hrClass(config);

    //Define this and it will be filled in handleResponse or handleError
    var resObject = {};

    //Get the logged in user. note don't pass res as second arg because don't want to error out if not logged in!
    var loggedInUser = utilities.getUserFromSession(req);

    if (loggedInUser && loggedInUser.username && username === loggedInUser.username) {
      //If they are already logged into the session don't do it all over again
      console.log('USER ALREADY IN SESSION: ' + loggedInUser.username);
      res.json({errors: [], body: {user: req.session.user}});
    } else {
      console.log('Logging In User : ' + username);
      hr.callAGOL(requestPars)
        .then(handleResponse)
        .then(getSuperUser)
        .then(getAuthGroupsAndOwnerIDs)
        .then(updateDBonLogin)
        .catch(utilities.getHandleError(resObject, 'LoginError'))
        //Now that update is done we can finally return result
        .done(function() {
          res.json(resObject)
        });
    }

    function handleResponse(body) {
      var user = hr.current;
      if (username === user.username) {
        //Save the user to the session
        if ('session' in req) {
          req.session.token = token;
          req.session.user = user;
        }
        resObject = {errors: [], body: {user: user}};
      } else {
        utilities.getHandleError(resObject,
            'UsernameTokenMismatch')('Username does not match token');
      }
      return resObject;
    }

    function getAuthGroupsAndOwnerIDs() {
      //If there was an error with resObject then don't need to do this
      if (resObject.errors.length > 0) {
        return false;
      }

      var user = req.session.user;

      var appRoot = app.get('appRoot');

      //Get the auth groups from the config file
      var authgroupsCollection = appRoot + '/config/authGroups.js';

      var monk = app.get('monk');
      var usersCollection = monk.get('GPOusers');
      var ownerIDsCollection = monk.get('GPOownerIDs');
      //Set up classes used to find OwnerIDs. Can be reused across app because
      //only saved data is list of available Auth Groups in system
      var UpdateAuthGroupsAndOwnerIDsClass = require(appRoot +
          '/shared/UpdateAuthGroupsAndOwnerIDs');
      var updateAuthGroupsAndOwnerIDs = new UpdateAuthGroupsAndOwnerIDsClass(
          usersCollection, ownerIDsCollection, authgroupsCollection);

      //First have to update any new auth groups they might have been added to
      //then get ownerIDs for each auth group
      return updateAuthGroupsAndOwnerIDs.updateAuthGroups(user)
        .then(function(updateUser) {
          user = updateUser;
          //Pass empty object user.authGroupsByownerID and it will be generated
          //also while getting OwnerIDsForEachAuthGroup
          user.authGroupsByownerID = {};
          return updateAuthGroupsAndOwnerIDs
            .getOwnerIDsForEachAuthGroup(user,user.authGroupsByownerID);
        })
        //Now that authgroups with corresponding ownerIDs is returned we can
        //save them in Session
        .then(function(ownerIDsByAuthGroup) {
          user.ownerIDsByAuthGroup = ownerIDsByAuthGroup;
          req.session.user = user;
          resObject.body.user = user;
        })
        //Now get all of the ownerIDs this user can see based on their auth
        //group membership (if they are an admin)
        //If user not an admin, then they just see their own stuff
        .then(function() {
          return updateAuthGroupsAndOwnerIDs.getOwnerIDs(user);
        })
        //Now that ownerIDs is returned we can save them in Session
        .then(function(ownerIDs) {
          //Note: Super user will see all ownerIDs
          user.ownerIDs= ownerIDs;
          return resObject;
        });


    }


    function getSuperUser() {
      //If there was an error with resObject then don't need to do this
      if (resObject.errors.length > 0) {
        return false;
      }

      var Q = require('q');
      var user = req.session.user;
      var config = app.get('config');
      if (!config.superUserGroup || !user.groups) {
        return false;
      }

      //.some() breaks and returns true when callback returns true.
      //If all are false .some() returns false.
      var isSuperUser = user.groups.some(function(group) {
        return (group.title === config.superUserGroup);
      });

      //If not super user return false. otherwise have to find all owner IDs in
      //GPOitems if user is Super User
      req.session.user.isSuperUser = isSuperUser;

      return isSuperUser;
    }

    function updateDBonLogin() {
      //If there was an error with resObject then don't need to do this
      if (resObject.errors.length > 0) {
        return false;
      }

      var Q = require('q');
      var appRoot = app.get('appRoot');
      var config = app.get('config');

      var DownloadGPOdataClass = require(appRoot + '/shared/DownloadGPOdata');
      downloadGPOdata = new DownloadGPOdataClass();

      //This is the number of items downloaded from AGOL in one request
      //(max is 100)
      downloadGPOdata.requestItemCount = 100;

      //For some reason when doing Modified Only (dontRemoveGPOitems = true)
      //if AsyncRequestLimit is large response results were mysteriously
      //dropping. I think it is because doing Modified Only takes MUCH longer
      //(order of 5000 ms) while getting all is faster (order of 500ms)
      //Note: This only occurs when there are A LOT of total rows in the
      //Modified Date Range of query. Something to do with paging slowing down
      //maybe.... But usually finding Modified Only doesn't entail retrieving a
      //lot of rows so for updating when logging in should get modified Only
      //(dontRemoveGPOitems =true). Set AsyncRequestLimit=5 just to be safe but
      //probably will never even have this many modified (500) in one day
      downloadGPOdata.AsyncRequestLimit = 5;
      downloadGPOdata.AsyncRowLimit = 25;
      downloadGPOdata.AsyncAuditRowLimit = 100;

      //Only get the metadata because getting slash data is much slower, due to
      //more data over the wire
      downloadGPOdata.onlyGetMetaData = true;
      //Don't remove the gpo items because then we would have to query ENTIRE DB
      //from AGOL to find which were removed on AGOL
      downloadGPOdata.dontRemoveGPOitems = true;

      //Set in token
      downloadGPOdata.token = req.session.token;
      downloadGPOdata.portal = config.portal;
      downloadGPOdata.mongoDBurl = config.mongoDBurl;
      downloadGPOdata.orgID = config.AGOLorgID;
      downloadGPOdata.ownerIDs = req.session.user.ownerIDs;
      console.log('downloadGPOdata.ownerIDs : ' + downloadGPOdata.ownerIDs);

      //The download process will be passed to a queue so that 2 users are not
      //updating same stuff possibly
      //After download is complete the response body of login will be sent back
      //When the download->respond promise chain is done, the queue will move on
      //to next task in queue
      var defer = Q.defer();

      //Each task will be for a single user name.
      //For Admin, multiple user names will be run thus Admin download can not
      //be done till all usernames in ownerIDs are available
      //groupedTasks is a list of all tasks that must be free for this Admin
      //until downloadGPOdata.download can be executed
      var TaskReady = {};

      var tasksQueues = app.get('tasksQueues');
      var taskBase = 'updateDBonLogin';

      //Only if list of owner IDs is available do we need to add ownerID to
      //task names
      if (Array.isArray(downloadGPOdata.ownerIDs) &&
          downloadGPOdata.ownerIDs.length > 0) {
        //Task name will be updateDBonLogin-ownerID
        downloadGPOdata.ownerIDs.forEach(function(ownerID) {
          TaskReady[taskBase + '-' + ownerID] = false;
        });

        Object.keys(TaskReady).forEach(function(task) {
          //The actual download process "updateDBonLoginPromise" with "data" as
          //argument will be called when it is next in queue
          var data = {task: task, TaskReady: TaskReady, defer: defer};
          tasksQueues.add(task, updateDBonLoginPromise, data);
        });
      } else {
        defer.resolve();
      }

      return defer.promise;
    }

    //This will be started by task queue when tasks ahead of it are done
    var updateDBonLoginPromise = function(data) {
      //Check the task as ready then determine if all are ready
      data.TaskReady[data.task] = true;
      var allReady = Object.keys(data.TaskReady).every(function(t) {
        return data.TaskReady[t] === true
      });

      if (allReady) {
        return downloadGPOdata.download()
          //After download is done, the deferred is resolved.
          //Also when updateDBonLoginPromise is done the task in queue
          .then(function() {
            console.log('data.task downloaded: ' + data.task);
            data.defer.resolve();
          });
      }
      //If all tasks are not ready to be run because they haven't been freed
      //from queue, send promise so Task=updateDBonLogin-ownerID will be held
      //until download done
      return data.defer.promise;
    };
  });

  router.use('/logout', function(req, res, next) {
    if ('session' in req) {
      console.log('Logout for username: ' + req.session.user.username);
      req.session.destroy();
    }
    res.json({errors: [], body: {}});
  });

  //Get shared/Audit.js from client http reference to Public folder
  //Not sure if this is going to work with caching etc
  router.use('/js/Audit.js', function(req, res, next) {
    var fs = require('fs');
    var filePath = app.get('appRoot') + '/shared/Audit.js';
    var stat = fs.statSync(filePath);

    res.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Content-Length': stat.size,
    });

    var readStream = fs.createReadStream(filePath);
    //We replaced all the event handlers with a simple call to readStream.pipe()
    readStream.pipe(res);
  });

  return router;
};
