module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var request = require('request');

  /* GET home page. */
  router.use('/login', function (req, res, next) {
    var utilities = require(app.get('appRoot') + '/shared/utilities');

    var config = app.get('config');
    var url = config.portal + '/sharing/rest/portals/self';

    var errors = [];
    var inputs = utilities.getCleanRequestInputs(req, errors);

    if (errors.length > 0) res.json({error: {message: errors.join("\n"), code: "DirtyRequestInput"}, body: null});

    var token = inputs.token;
    var username = inputs.username;

//    console.log("token");
    var qsPars = {'token': token, 'f': 'json'};
//Pass parameters via form attribute
    var requestPars = {method: 'get', url: url, qs: qsPars};

    var hrClass = require(app.get('appRoot') + '/shared/HandleGPOresponses');
    var hr = new hrClass(config);

//define this and it will be filled in handleResponse or handleError
    var resObject = {};

    console.log("LOGIN session.username: " + req.session.username)

    if ('session' in req && req.session.username && username === req.session.username) {
//If they are already logged into the session don't do it all over again
      console.log("USER ALREADY IN SESSION");
      res.json({error: null, body: {user: hr.saved.user}});
    } else {
      hr.callAGOL(requestPars, "user")
        .then(handleResponse)
        .then(getOwnerIDs)
        .then(updateDBonLogin)
        .catch(utilities.getHandleError(resObject,"LoginError"))
//Now that update is done we can finally return result
        .done(function () {res.json(resObject)});
    }

    function handleResponse(body) {
      if (username === hr.saved.user.username) {
//save the user to the session
        if ('session' in req) {
          req.session.username = username;
          req.session.token = token;
          req.session.user = hr.saved.user;
        }
        resObject = {error: null, body: {user: hr.saved.user}};
      } else {
        resObject = {error: {message: "Username does not match token", code: "UsernameTokenMismatch"}, body: null};
      }
    }

    function getOwnerIDs() {
//these are owner IDs that this user can see. Usually just equal to username unless they are Admin.
      var user = req.session.user;
      req.session.ownerIDs = [req.session.username];
//This was just to test admins who can view multiple owners running updateDBonLogin
//      if (req.session.ownerIDs[0]==="aaron.evans_EPA" ) req.session.ownerIDs=["aaron.evans_EPA","aevans26_EPA"];

//Later this will be more complex when it has to query DB for authoritative groups, etc if Admin
      return req.session.ownerIDs;
    }

    function updateDBonLogin() {
      var Q = require('q');
      var appRoot = app.get('appRoot');
      var config = app.get('config');

      var DownloadGPOdataClass = require(appRoot + '/shared/DownloadGPOdata')
      downloadGPOdata = new DownloadGPOdataClass();

//This is the number of items downloaded from AGOL in one request (max is 100)
      downloadGPOdata.requestItemCount = 100;
//For some reason when doing Modified Only (dontRemoveGPOitems = true) if AsyncRequestLimit is large response results were mysteriously dropping
//I think it is because doing Modified Only takes MUCH longer (order of 5000 ms) while getting all is faster (order of 500ms)
//Note: This only occurs when there are A LOT of total rows in the Modified Date Range of query. Something to do with paging slowing down maybe....
//But usually finding Modified Only doesn't entail retrieving a lot of rows so for updating when logging in should get modifided Only (dontRemoveGPOitems =true)
//Set AsyncRequestLimit=5 just to be safe but probably will never even have this many modified (500) in one day
      downloadGPOdata.AsyncRequestLimit = 5;
      downloadGPOdata.AsyncRowLimit = 25;
      downloadGPOdata.AsyncAuditRowLimit = 100;

//Only get the meta data because getting slash data would be WAY TOO Slow....
      downloadGPOdata.onlyGetMetaData = true;
//Don't remove the gpo items because then we would have to query ENTIRE DB from AGOL to find which were removed on AGOL
      downloadGPOdata.dontRemoveGPOitems = true;
//set in token
      downloadGPOdata.token = req.session.token;
      downloadGPOdata.portal = config.portal;
      downloadGPOdata.mongoDBurl = config.mongoDBurl;
      downloadGPOdata.orgID = config.AGOLorgID;

      downloadGPOdata.ownerIDs = req.session.ownerIDs;
      console.log("downloadGPOdata.ownerIDs : " + downloadGPOdata.ownerIDs );

//The download process will be passed to a queue so that 2 users are not updating same stuff possibly
//After download is complete the response body of login will be sent back
//When the download->respond promise chain is done the queue will move on to next task in queue
      var defer = Q.defer();

//Each task will be for a single user name.
// For Admin multiple user names will be run thus Admin download can not be done till all username in ownerIDs is available
//groupedTasks is a list of all tasks that must be free for this Admin untile downloadGPOdata.download can be exectuted
      var TaskReady = {};

      tasksQueues = app.get('tasksQueues');
      var taskBase = 'updateDBonLogin';
//Only if list of owner IDs is available do we need to add ownerID to task names
      if (Array.isArray(downloadGPOdata.ownerIDs) && downloadGPOdata.ownerIDs.length > 0) {
//task name will be updateDBonLogin-ownerID
        downloadGPOdata.ownerIDs.forEach(function (ownerID) {
          TaskReady[taskBase + '-' + ownerID] = false;
//          TaskReady[taskBase] = false;
        });

        Object.keys(TaskReady).forEach(function (task) {
          //The actual download process "updateDBonLoginPromise" with "task" as argument will be called when it is next in queue
          var data = {task:task,TaskReady:TaskReady,defer:defer};
          console.log("adding data.task: " + data.task + " TaskReady: " + Object.keys(data.TaskReady));
          tasksQueues.add(task, updateDBonLoginPromise, data);
        });
      }

      return defer.promise;
    }

    //This will be started by task queue when tasks ahead of it are done
    var updateDBonLoginPromise = function (data) {
//Check the task as ready then determine if all are ready
      data.TaskReady[data.task] = true;
      var allReady = Object.keys(data.TaskReady).every(function (t) {
        return data.TaskReady[t] === true
      });
      console.log("data.task: " + data.task);
      console.log("data.TaskReady: " + Object.keys(data.TaskReady));
      console.log("all ready: " + allReady);
      if (allReady) {
        return downloadGPOdata.download()
          //After download is done, the deferred is resolved.
          // Also when updateDBonLoginPromise is done the task in queue
          .then(function () {
            console.log("data.task downloaded: " + data.task);
            data.defer.resolve();
          });
      } else {
//If all tasks are not ready to be run because they haven't been freed from queue, send promise so Task=updateDBonLogin-ownerID will be held until download done
        return data.defer.promise;
      }
    };
  });

  router.use('/logout', function (req, res, next) {
    if ('session' in req) {
      console.log("logout: " + req.session.username)
      req.session.destroy();
//      req.session.username = null;
//      req.session.token = null;
//      req.session.user = null;
//      console.log("logout after: " + req.session.username)
    }
    res.json({error: null, body: {}});
  });

  return router;
};
