var ScriptLogs =  function() {
  this.logs = [];
  this.errors = [];
  this.from = null;
  this.to = null;
  this.subject = null;
};


ScriptLogs.prototype.log = function(log) {
  if (!log) {
    return;
  }
  this.logs.push(log);
  console.log(log);
};

ScriptLogs.prototype.error = function(error) {
  if (!error) {
    return;
  }
  this.errors.push(error);
  console.error(error);
};

ScriptLogs.prototype.clear = function(log) {
  //Just clear the array don't assign a new empty array
  this.logs.length = 0;
  this.errors.length = 0;
};

ScriptLogs.prototype.emailSingle = function(head,logs) {
  var Q = require('q');
  //Sends a single email with all the logs concatenated
  var appRoot = require('app-root-path') + '/';
  var sendEmail = require(appRoot + '/shared/sendEmail');
  if (logs.length > 0) {
    body = ' produced running script on ' + new Date() +
      ':\n\n' + logs.join('\r\n');
    return sendEmail.send(this.from,this.to,head + this.subject,head + body)
      .catch(function(error) {console.error(error);})
  }
  return Q(true);
};

ScriptLogs.prototype.email = function() {
  var self = this;
  return self.emailSingle('Logs',self.logs)
    .then(function() {return self.emailSingle('Errors',self.errors);});
};

ScriptLogs.prototype.emailExit = function() {
  //Send the email and then exit. just a convenience
  return this.email().then(function() {
    process.exit();});
};

module.exports = ScriptLogs;
