var getTokenOnly=false;

var request = require('request');
var Q = require('q');

console.log('process.env.NODE_ENV ' + process.env.NODE_ENV);

var appRoot=require('app-root-path');
var config = require(appRoot + '/config/env');
//var config = require('../config/env');

try {
    var username = config.AGOLadminCredentials.username;
    var password = config.AGOLadminCredentials.password;
    var portal = config.portal;
}
catch (e) {
    console.log("AGOL admin username and password or portal not defined in config file");
    process.exit();
}

var hrClass = require('./handleGPOresponses');
var hr = new hrClass(config);
console.log(hr);

//process.exit()

//var itemStart = 1;
var itemCount = 100;

//hr.save is where we store the output from REST calls like token and OrgID so it can be used by handlers
hr.saved.nextStart=1;

var monk = require('monk');
var db = monk('localhost:27017/egam');

var gpoitemcollection = db.get('GPOitems');

if (getTokenOnly===true) {
  getToken()
      .catch(function(err) {
          console.error('Error received:', err);
      })
      .done(function() {console.log(hr.saved.token);process.exit();});
}else {
//clear out any existing
  gpoitemcollection.remove({});
//String along aysn function calls to AGOL REST API
  getToken()
      .then(getOrgId)
      .then(getGPOitems)
      .catch(function(err) {
          console.error('Error received:', err);
      })
      .done(function() {process.exit();});
//Simply finish the script using process.exit()
}


function getToken() {
    var tokenURL = portal + '/sharing/rest/generateToken?';

    var parameters = {'username' : username,
        'password' : password,
        'client' : 'referer',
        'referer': portal,
        'expiration': 60,
        'f' : 'json'};
//Pass parameters via form attribute
    var requestPars = {method:'post', url:tokenURL, form:parameters };

    return hr.callAGOL(requestPars,'token');
}

function getOrgId() {
    var url = portal + '/sharing/rest/portals/self';

    var parameters = {'token' : hr.saved.token,'f' : 'json'};
//Pass parameters via form attribute
    var requestPars = {method:'get', url:url, qs:parameters };

    return hr.callAGOL(requestPars,{'id':'orgID'});
}

function getGPOitemsChunk() {
//    var token = getHandleResponsePromise('token')(data);

    var url= portal + '/sharing/rest/search';

    var parameters = {'q':'orgid:'+hr.saved.orgID,'token' : hr.saved.token,'f' : 'json','start':hr.saved.nextStart,'num':itemCount};
//Pass parameters via form attribute

    var requestPars = {method:'get', url:url, qs:parameters };
    return hr.callAGOL(requestPars).then(HandleGPOitemsResponse);
}

function getGPOitems() {
    return hr.promiseWhile(function() {return hr.saved.nextStart>0;}, getGPOitemsChunk);
}

function HandleGPOitemsResponse(body) {
    console.log(hr.saved.nextStart + ' to ' + (hr.saved.nextStart + body.results.length-1));
    gpoitemcollection.insert(body.results);
    hr.saved.nextStart = body.nextStart;
    return body.nextStart;
}


