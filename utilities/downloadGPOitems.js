var getTokenOnly=true;

var useSync=false;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
var AsyncRequestLimit=50;
//This is just for testing if we don't want all docs
var TotalRowLimit=null;

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
var requestItemCount = 100;

//hr.save is where we store the output from REST calls like token and OrgID so it can be used by handlers
hr.saved.requestStart=1;
//for async need to have rows counting
hr.saved.currentRow=1;
//for hybrid need to have AGOL call counting
//each call gets number of rows equal to requestItemCount
hr.saved.currentRequest=1;

var monk = require('monk');
var db = monk('localhost:27017/egam');

var gpoitemcollection = db.get('GPOitemsRemote');

if (getTokenOnly===true) {
  getToken()
      .catch(function(err) {
          console.error('Error received:', err);
      })
      .done(function() {console.log("\n" + hr.saved.token);process.exit();});
}else {
//clear out any existing
  gpoitemcollection.remove({});
//String along aysn function calls to AGOL REST API
  var getGPOitems=null;
  if (useSync) {
    console.log('getGPOitemsSync');
    getGPOitems=getGPOitemsSync;
  }else if(AsyncRequestLimit===null){
    console.log('getGPOitemsAsync');
    getGPOitems=getGPOitemsAsync;
  }else {
    console.log('getGPOitemsHybrid');
    getGPOitems=getGPOitemsHybrid;
  }

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

function getGPOitemsChunk(requestStart,HandleGPOitemsResponse) {
  if (! requestStart) {
    requestStart=hr.saved.requestStart;
  }

    var url= portal + '/sharing/rest/search';

    var parameters = {'q':'orgid:'+hr.saved.orgID,'token' : hr.saved.token,'f' : 'json','start':requestStart,'num':requestItemCount };
//Pass parameters via form attribute

    var requestPars = {method:'get', url:url, qs:parameters };
  if (! HandleGPOitemsResponse) {
    if (useSync) {
//      console.log('HandleGPOitemsResponseSync');
      HandleGPOitemsResponse = HandleGPOitemsResponseSync;
    } else if (AsyncRequestLimit === null) {
//      console.log('HandleGPOitemsResponseAsync');
      HandleGPOitemsResponse = HandleGPOitemsResponseAsync;
    } else {
//      console.log('HandleGPOitemsResponseHybrid');
      HandleGPOitemsResponse = HandleGPOitemsResponseAsync;
    }
  }
  return hr.callAGOL(requestPars).then(HandleGPOitemsResponse);
}

function getGPOitemsSync() {
    var whileCondition=null;
    if (TotalRowLimit) {
      whileCondition=function() {return hr.saved.requestStart<=TotalRowLimit;};
    }else {
      whileCondition=function() {return hr.saved.requestStart>0;};
    }
    return hr.promiseWhile(whileCondition, getGPOitemsChunk);
}

function HandleGPOitemsResponseSync(body) {
    console.log('Sync ' + hr.saved.requestStart + ' to ' + (hr.saved.requestStart + body.results.length-1));
    hr.saved.requestStart = body.nextStart;
    return Q(gpoitemcollection.insert(body.results));
//    return body.nextStart;
}

function HandleGPOitemsResponseAsync(body) {
//  console.log('current Row ' + hr.saved.currentRow + ' to ' + (hr.saved.currentRow + body.results.length-1));
//  console.log('current Request ' + hr.saved.currentRequest );
  console.log('request Start ' + body.start + ' to ' + (body.start + body.results.length -1) + ' (items retrieved: ' + (hr.saved.currentRow + body.results.length-1) + ')');
//next start is not neccessarily found in order so use currentRow to konw how far along
  hr.saved.currentRow += body.results.length;
  hr.saved.currentRequest += 1
  return Q(gpoitemcollection.insert(body.results));
}

function getGPOitemsHybrid() {
  return   getRequestStartArray().then(HandleGPOitemsResponseAsync).then(getGPOitemsHybridFromStartArray)
}

function getGPOitemsHybridFromStartArray() {
  return hr.promiseWhile(function() {return hr.saved.currentRow<=hr.saved.totalRows;}, getGPOitemsAsyncFromStartArray);
}

function getGPOitemsAsync() {
//Have to first get the StartArray to use in async for each
//This means an initial AGOL call to get "total" items count in AGOL
//So subsequent calls will be Async for each
  return   getRequestStartArray().then(HandleGPOitemsResponseAsync).then(getGPOitemsAsyncFromStartArray)
}

function getGPOitemsAsyncFromStartArray() {
  var async = require('async');

  var defer = Q.defer();

//  Q.when(getSingleGPOheader,function () {console.log('resolve');defer.resolve()});
//  getSingleGPOheader(1).then(function () {console.log('resolve');defer.resolve()});

  var requestStartArray;
//  console.log('hr.saved.currentRequest ' + hr.saved.currentRequest)
  if (AsyncRequestLimit) {
//take slice form current row to async row limit
    requestStartArray= hr.saved.requestStartArray.slice(hr.saved.currentRequest-1,hr.saved.currentRequest-1+AsyncRequestLimit);
  }else {
    requestStartArray= hr.saved.requestStartArray.slice(hr.saved.currentRequest-1);
  }

//  console.log(hr.saved.currentRow + ' ' + requestStartArray.length)

  async.forEachOf(requestStartArray, function (requestStart, index, done) {
//      console.log(key+hr.saved.currentGPOrow)
      getGPOitemsChunk(requestStart)
        .then(function () {
//                console.log(String(key+1) + 'done');
          done();})
        .catch(function(err) {
          console.error('async for each gpo items chunk Error received:', err);
        })
        .done(function() {
//          console.log('for loop success')
        });
    }
    , function (err) {
      if (err) console.error('async for each error :' + err.message);
//resolve this promise
//      console.log('resolve')
      defer.resolve();
    });

//I have to return a promise here for so that chain waits until everything is done until it runs process.exit in done.
//chain was NOT waiting before and process exit was executing and header data not being retrieved
  return defer.promise


}

function getRequestStartArray() {
  return getGPOitemsChunk(1,handleGetRequestStartArray)
}

function handleGetRequestStartArray(body) {
  //find the requestStart of each call
  hr.saved.requestStartArray = [];
//  console.log(body);

  hr.saved.totalRows = body.total;
  if (TotalRowLimit) hr.saved.totalRows =TotalRowLimit;
  for (var i = 1; i <= hr.saved.totalRows; i=i+requestItemCount) {
    hr.saved.requestStartArray.push(i);
  }

  return body;
}

