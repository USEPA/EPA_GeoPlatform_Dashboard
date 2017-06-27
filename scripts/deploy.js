//Script to deploy to staging or production
//It will be called via scheduled task in order to execute with "highest privileges"
//Also don't want deploy route to hang while everything wait to pull,install,reload etc
//Admins will be sent and email when everything is done
var Q =  require('Q');
var appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');
var config = require(appRoot + '/config/env');
//runExternalCommand is a factory function
var runExternalCommand = require(appRoot + '/shared/runExternalCommand')();
//catch=false mean If error caught for a command then don't continue but bubble up to end
runExternalCommand.catch=false;

//So we can set finish on opsStash mongo DB when deployment done
var MonkClass = require('monk');
var monk = MonkClass(config.mongoDBurl);

//If on production don't install dev stuff. Probably should just get rid of node inspector stuff actually
var npmInstallFlag = ' --production';
if (config.env=='local' ) npmInstallFlag = '';

//Have to set the HOMEPATH env variable so that .pm2/ directory with logs, etc. will be put in app root
//Strip drive letter off path. This is what pm2 seems to want
var splitPathDriveLetter = utilities.splitPathDriveLetter(appRoot.path);
process.env['HOMEDRIVE'] = splitPathDriveLetter[0];
process.env['HOMEPATH'] = splitPathDriveLetter[1];

//Read in any arguments passed such as app and port
var parseArgs = require('minimist');
//first 2 args are node location and script location
var args = require('minimist')(process.argv.slice(2));

//have arg call --useStash which means branch found from opsStash deployStatus
//Can also pass branch

var branch = null;
var useStash = false;
//In case they pass --useStash=true handle that too but only need to pass --useStash
if (args && (args.useStash===true || args.useStash==="true")) useStash=args.useStash;

var stash = null;

Q.fcall(function () {
          if (useStash) return getDeployStatus();
        })
  .then(getBranch)
  .then(runGitCommands)
  .then(runExternalCommand.getRunFunction('npm install' + npmInstallFlag))
  .then(runExternalCommand.getRunFunction('bower install'))
  .then(runExternalCommand.getRunFunction('pm2 reload egam'))
//  .then(runExternalCommand.getRunFunction('whoami'))
  //Have to put last catch here to catch errors they are not being caught internally above
  .catch(function (error) {
    runExternalCommand.errors.push({cmd:'Error Not Caught Individually',output:error});
  })
  .then(setDeploymentFinished)
  .catch(function (error) {
    runExternalCommand.errors.push({cmd:'Set Deployment Status To Finished',output:error});
  })
  .then(sendDeploymentEmail)
  .done(function () {
    console.log('scripts/deploy.js completed');
    process.exit(0);
  });

function runGitCommands() {
  //Only staging and production will run git commands.
  if (config.env=='staging' || config.env=='production') {
    var source = 'nccdev';
    var target = 'nccstg';
    if (config.env=='production') {
      source = 'nccstg';
      target = 'nccprod';
      //if on prod and there is no branch given then assume source is same as target or nccprod
      //This used if we want to just merge or branch into prod outside of this deployment utility
      if (! branch) source=target;
    }
    //If branch being deployed set use that as source. If no branch set then just use default source
    if (branch) {
      source=branch;
    }else {
      //kind of weird I guess but setting global branch variable to source if it is empty so we can display in email later if needed
      branch=source;
    }

    return Q.fcall(function () {return true})
      //Just to make sure we are on target branch. It always should be
      .then(runExternalCommand.getRunFunction('git checkout ' + target))
      //Just to make sure target is up to date. It always should be
      .then(runExternalCommand.getRunFunction('git pull origin ' + target))
      //This does the real work. It pull source branch into the target branch we are sitting on. (pull is a fetch from remote origin and merge into current branch)
      .then(function () {
        //If we don't want to merge in source to target but are locally merging branches into target then source will be set to target and don't need to pull target twice
        if (source != target) return runExternalCommand.getRunFunction('git pull origin ' + source)()
      })
    //This will push the new target branch with merged source back up to remote origin (Bit Bucket)
      .then(function () {
        //If we don't want to merge in source to target but are locally merging branches into target then source will be set to target and don't need to push target back to origin because it didn't change
        if (source != target) return runExternalCommand.getRunFunction('git push origin ' + target)()
      });
  }else {
    return Q.fcall(function () {return false});
  }

}

function getBranch() {
//Get branch from stash if using it
  if (stash && stash.branch) branch=stash.branch;
//If the pass branch though it will override anything in stash
//In case they pass just --branch arg.branch is true which don't want to set branch to true!
  if (args && args.branch && typeof args.branch !== true ) branch=args.branch;
  return branch;
}

function getDeployStatus() {
  var collection = monk.get('OpsStash');
  return utilities.getDBkeyValue(collection,'deployStatus')
    .then(function (obj) {
      stash = obj;
      return stash;
    });
}

function setDeploymentFinished() {
  var collection = monk.get('OpsStash');
  //clear username and branch also so it is ensured not to be old user/branch
  return utilities.setDBkeyValue(collection,'deployStatus',{finish:new Date(),username:null,branch:null});
}

function sendDeploymentEmail() {
  console.log('begin');
  var fs = require('fs');
  var mustache = require('mustache');
  var sendEmail = require(appRoot + '/shared/sendEmail');
  
  return Q.ninvoke(fs, 'readFile', appRoot + '/scripts/deployEmail.mst', 'utf8')
  .then(function (template){
    mustache.parse(template);
    var finishDate = new Date();
    //Get the stashed user name that deployed this
    var username = null;
    if (stash) username = stash.username;
    var emailBody = mustache.render(template,{date:finishDate,username:username,branch:branch ? branch : 'None',output:runExternalCommand.output,errors:runExternalCommand.errors});
    //CreateEmailObject
  
    var fromAddress = config.email.defaultFrom;//FromAddress in config file
    var toAddress = config.email.admins;
    var emailSubject = 'GP Dashboard App Deployed at ' + finishDate;//EmailsSubject
    var html = emailBody;

    console.log('Email Sent:');
    console.log(emailBody);

    return sendEmail.send(fromAddress,toAddress, emailSubject, emailBody, html)
  });
}
