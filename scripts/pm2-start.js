//Script to deploy to staging or production
var parseArgs = require('minimist');

var appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');

//first 2 args are node location and script location
//console.log(process.argv);
var args = require('minimist')(process.argv.slice(2));

var serverPath = appRoot + '\\bin\\www';
var logPath = appRoot + '\\logs\\app.log';
var errorPath = appRoot + '\\logs\\error.log';

//default number of cluster node instances to 2
var instances = 2;

//For now if -i passed is not an integer then fall back to default
if (utilities.isInt(args.i)) {
  instances = args.i;
}

console.log("Number of nodes/instances in cluster: " + instances);
//Note: When pm2 kill is called before any processes are running, it will return standard error ([PM2][Warn] No process found) which trigger exception from runExternalCommand
//Therefore if pass catch=true option, exception will be caught in runExternalCommand so that next item in chain pm2 start is triggered
//There is really no harm in trying to start if kill has an error at this point. In future could explicity catch error out here and notifiy somehow
//The catch true at the end is necessary in case there is an error with pm2 start

var runExternalCommand = require(appRoot + '/shared/runExternalCommand')();
//catch=true mean If error caught for a command then continue to the next. pm2 kill gives warnings if pm2 not started yet that produces stderr.
runExternalCommand.catch=true;

runExternalCommand.getRunFunction('pm2 kill')()
  .then(runExternalCommand.getRunFunction('pm2 start ' + serverPath + ' -i ' + instances + ' --name="egam"' + ' -l ' + logPath  + ' -e ' + errorPath ));

