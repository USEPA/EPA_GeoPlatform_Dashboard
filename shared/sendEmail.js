var sendEmail = {};

var appRoot=require('app-root-path');
var config = require(appRoot + '/config/env');

var nodemailer = require('nodemailer');
var smtpPool = require('nodemailer-smtp-pool');
//The nodemailer instance will be saved in cached module
var transportOptions = {
};

transportOptions.maxConnections=config.email.smtp.maxConnections || 20;
transportOptions.maxMessages=config.email.smtp.maxMessages || Infinity;

if (config.email.smtp.user) transportOptions.user=config.email.smtp.user;
if (config.email.smtp.password) transportOptions.password=config.email.smtp.password;

if (config.email.smtp.service) {
  transportOptions.service=config.email.smtp.service;
}else if (config.email.smtp.host) {
  transportOptions.host = config.email.smtp.host;
  transportOptions.port = config.email.smtp.port || 25;
}else {
  config.email.disabled=true;
}

if (config.email.disabled!==true) sendEmail.transporter = nodemailer.createTransport(smtpPool(transportOptions));

sendEmail.send = function (from,to,subject,body) {
  var Q=require('q');
  return Q.fcall(function () {
    var defer = Q.defer();

    if (to && config.email.disabled!==true) {

      sendEmail.transporter.sendMail({
        from: from,
        to: to,
        subject: subject,
        text: body
      },function (error) {
        if (error) {
          defer.reject('Error sending email: ' + error.stack);
        }else{
          defer.resolve();
        }
      });
    }else{
      defer.resolve();
    }
    return defer.promise;
  });
};

module.exports = sendEmail;
