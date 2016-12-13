var runExternalCommandFactory = function () {
//Factory function to get an object for running commands that saves stdout and stderr and
//.getRunFunction creates functions that can be linked together in promise chain

var appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');

var self = {};

self.output = [];
self.errors = [];

//Note: stderr doesn't mean the command failed. It is diagnostic info sometimes. .exec also captures errors explicity.
// But if .catch=true then command chain will not be broken and next command will execute
// If .catch=false then command chain will break and promise chain will bubble up to next catch in chain if exists.
self.catch=false;
//set this to log output to console
self.logToConsole=true;

//This helps in promise chains so you don't have to wrap return runExternalCommand() in function
self.getRunFunction = function (cmd) {
  return function () {
    //Note if we want to break the chain, then if self.errors.length>1 then do not execute anymore commands
    if (self.catch!==true && self.errors.length>0) {
      return false;
    }else {
      //Runs an external command as if in windows command prompt
      return utilities.runExternalCommand(cmd)
        .then(function (out) {
          var outCombined = 'stdout : ' + out.stdout + '\r\n stderr: ' + out.stderr;
          if (self.logToConsole!==false) console.log('Output running command = ' + cmd + ': \r\n' + outCombined);
          self.output.push({cmd:cmd,message:out});
        })
        .catch(function (error) {
          console.error('Error running command = ' + cmd + ': \r\n' + error);
          self.errors.push({cmd:cmd,message:error.message});
        });
    }
  };
};

return self;

};

module.exports = runExternalCommandFactory;
