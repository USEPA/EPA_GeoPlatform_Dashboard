var Q = require('Q');
var appRoot = require('app-root-path');
var config = require(appRoot + '/config/env');

var utilities = require(appRoot + '/shared/utilities');

var hrClass = require(appRoot + '/shared/HandleGPOresponses');
var hr = new hrClass();

var token = null;

utilities.getToken(config.portal,config.AGOLadminCredentials)
  .then(function (t) {token=t;})
  .then(function () {return getUsersWithDisabledESRIaccess()})
  .then(bulkUpdateEnableESRIaccess)
  .done(function () {
      console.log('done');
      process.exit(0);
    });

function getUsersWithDisabledESRIaccess() {
  var monk = require('monk')(config.mongoDBurl);
  var userscollection = monk.get('GPOusers');
  
  var query = {email:{$regex:".*epa.gov$"},userType:{$ne:"both"}};

  return utilities.getArrayFromDB(userscollection,query,'username');
}

function bulkUpdateEnableESRIaccess(usernames) {
//Loop over usernames and do the update
  var count=0;
  return hr.promiseWhile(function() {
    return count < usernames.length;
//    return count < 1;
  }, function () {
    return singleUpdateEnableESRIaccess(usernames[count],count)
      .then (function () {
        count += 1;
      });
  });
}

function singleUpdateEnableESRIaccess(username,count) {
  console.log('username: ' + username + ' ' + count);

  var url = config.portal + '/sharing/rest/community/users/' + username + '/update';

  var formData = {usertype: 'both'};

  //Console.log(url);
  var qs = {token: token,f: 'json'};

  var requestPars = {method: 'post', url: url, formData: formData, qs: qs };

  return hr.callAGOL(requestPars)
    .then(function(body) {
      if (body.error) {
        throw Error('Error updating ' + username + ': ' + JSON.stringify(body.error));
      }
    });

  }
