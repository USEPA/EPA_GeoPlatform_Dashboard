var runExternalCommandFactory = function () {
//Factory function to get an object for running commands that saves stdout and stderr and
//.getRunFunction creates functions that can be linked together in promise chain

var appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');

var self = {};

self.output = {stdout:[],stderr:[]};
//Note: errors are always saved to stderr
// But if .catch=true then command chain will not be broken and next command will execute
// If .catch=false then command chain will break and promise chain will bubble up to next catch in chain if exists.
self.catch=false;
//set this to log output to console
self.logToConsole=true;

//This helps in promise chains so you don't have to wrap return runExternalCommand() in function
self.getRunFunction = function (cmd) {
  return function () {
    //Note if we want to break the chain, then if output.stderr.length>1 then do not execute anymore commands
    if (self.catch!==true && self.output.stderr.length>0) {
      return false;
    }else {
      //Runs an external command as if in windows command prompt
      return utilities.runExternalCommand(cmd)
        .then(function (out) {
          if (self.logToConsole!==false) console.log('Output running command = ' + cmd + ': \r\n' + out);
          self.output.stdout.push({cmd:cmd,output:out});
        })
        .catch(function (error) {
          console.error('Error running command = ' + cmd + ': \r\n' + error);
          self.output.stderr.push({cmd:cmd,output:error});
        });
    }
  };
};

return self;

};

module.exports = runExternalCommandFactory;
