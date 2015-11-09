var sendEmail = {};

var appRoot=require('app-root-path');
var config = require(appRoot + '/config/env');

var nodemailer = require('nodemailer');
//The nodemailer instance will be saved in cached module
sendEmail.transporter = nodemailer.createTransport({
  service: config.email.smtp.service,
  auth: {
    user: config.email.smtp.user,
    pass: config.email.smtp.password
  }
});


sendEmail.send = function (from,to,subject,body) {
  var Q=require('q');
  return Q.fcall(function () {
    var defer = Q.defer();

    if (config.email && config.email.admins && config.email.disabled!==true) {

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
