//going to have to run this from different process 
module.exports = function(app) {
  var express = require('express');
  var router = express.Router();

  var appRoot = app.get('appRoot');
  var utilities = require(appRoot + '/shared/utilities');
  var config = require(appRoot + '/config/env');

  var monk = app.get('monk');

  router.use('/start', function(req, res) {
    var deployInProgress = false;
    var deployStatus;
    var hasError = false;

    var errors = [];
    var inputs = utilities.getCleanRequestInputs(req, errors);

    if (errors.length > 0) {
      return res.json({errors: [errors.join('\n')]});
    }

    var branch = inputs.branch;
    var loggedInUser = app.get('loggedInUser') || {};

    getDeployStatus()
      .then(function (status) {
        deployStatus = status || {};
        //If there IS a start date in app's deploy status object but no finish date it means deployment in progress
        if (deployStatus.start && ! deployStatus.finish) {
          deployInProgress=true;
        }else {
          //Now set up deployStatus to denote there is deployment in progress

          return setDeployStatus({
            username:loggedInUser.username,
            start:new Date(),
            finish:null,
            branch:branch
          });
        }
      })
      .then(function () {
        //if deploy already in progress pass that status back
        if (deployInProgress) {
          return {status:'inProgress',output:deployStatus};
        }
        //run external command. really just a sched task now
        var runExternalCommand = require(appRoot + '/shared/runExternalCommand')();
//catch=false mean If error caught for a command then don't continue but bubble up to end
        runExternalCommand.catch=false;
//Tried to run this directly after starting gpdashboard-ops with nssm but processes get dropped from pm2 (even though still running)
//    return runExternalCommand.getRunFunction('node scripts\\deploy.js')()
        return runExternalCommand.getRunFunction('schtasks.exe /Run /TN egam-deploy')()
          //      .then(runExternalCommand.getRunFunction('whoami'))
          //Have to put last catch here to catch errors they are not being caught internally above
          .catch(function (error) {
            console.error("Error Not Caught Individually: " + error);
            runExternalCommand.errors.push({cmd:'Error Not Caught Individually',output:error});
          })
          .then(function () {
            hasError = (runExternalCommand.errors.length>0);
            return {status:'started',output:runExternalCommand.output,errors:runExternalCommand.errors}
          });
      })
      .then(function (output) {
        return res.json({body:output});
      })
      .catch(function (error) {
        hasError = true;
        return res.json({errors: [error.stack || error.message || error]});
      })
      .done(function () {
        //If any command had an error individually or error caught on end
        if (hasError) {
          return setDeployStatus({finish:new Date()});
        }
      });
  });

  router.use('/finish', function(req, res) {
    //This just adds finish date to deploy status object stored in the app.
    //Now if somebody calls to start deployment it will be able to start
    return setDeployStatus({finish:new Date()})
      .then(function () {
        return res.json({body:{status:'finished'}});
      })
      .catch(function (error) {
        return res.json({errors:[error.stack || error.message || error]});
      })
  });


  //just helps get this stuff easier
  function getDeployStatus() {
    var collection = monk.get('OpsStash');
    return utilities.getDBkeyValue(collection,'deployStatus');
  }
  function setDeployStatus(deployStatus) {
    var collection = monk.get('OpsStash');
    return utilities.setDBkeyValue(collection,'deployStatus',deployStatus);
  }


  return router;
};