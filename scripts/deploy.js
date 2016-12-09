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

return runGitCommands()
  .then(runExternalCommand.getRunFunction('npm install'))
  .then(runExternalCommand.getRunFunction('bower install'))
  .then(runExternalCommand.getRunFunction('pm2 reload egam'))
//  .then(runExternalCommand.getRunFunction('whoami'))
  //Have to put last catch here to catch errors they are not being caught internally above
  .catch(function (error) {
    runExternalCommand.output.stderr.push({cmd:'Error Not Caught Individually',output:error});
  })
  .then(setDeploymentFinished)
  .catch(function (error) {
    runExternalCommand.output.stderr.push({cmd:'Set Deployment Status To Finished',output:error});
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
    }
    //Just to make sure we are on target branch. It always should be
    return runExternalCommand.getRunFunction('git checkout ' + target)()
        //Just to make sure target is up to date. It always should be
        .then(runExternalCommand.getRunFunction('git pull origin ' + target))
        //This does the real work. It pull source branch into the target branch we are sitting on. (pull is a fetch from remote origin and merge into current branch)
        .then(runExternalCommand.getRunFunction('git pull origin ' + source))
      //This will push the new target branch with merged source back up to remote origin (Bit Bucket)
      .then(runExternalCommand.getRunFunction('git push origin ' + target));
  }else {
    return Q.fcall(function () {return false});
  }

}

function setDeploymentFinished() {
  var collection = monk.get('OpsStash');
  return utilities.setDBkeyValue(collection,'deployStatus',{finish:new Date()});
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
    var hasErrors = runExternalCommand.output.stderr.length>0;
    var emailBody = mustache.render(template,{date:finishDate,output:runExternalCommand.output,hasErrors:hasErrors});
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
