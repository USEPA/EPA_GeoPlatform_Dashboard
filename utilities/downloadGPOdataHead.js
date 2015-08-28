var getHeadOnly=true;
var useSync=false;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
var AsyncRowLimit=100;
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

//hr.save is where we store the output from REST calls like token and OrgID so it can be used by handlers
hr.saved.currentGPOrow=1;

var monk = require('monk');
var db = monk('localhost:27017/egam');

var headerscollection = db.get('headersAsync');
var itemscollection = db.get('GPOitems');

headerscollection.remove({});

hr.saved.totalRows = 0;

//getSingleGPOheaderTest();
//getSingleGPOheaderTest(1).then(function () {console.log('resolve');});
//return;

if (AsyncRowLimit===0 || AsyncRowLimit===1)  useSync=true;

//String along aysn function calls to AGOL REST API
var getGPOheaders=null;
if (useSync) {
  console.log('getGPOheadersSync');
  getGPOheaders=getGPOheadersSync;
}else if(AsyncRowLimit===null){
  console.log('getGPOheadersAsync');
  getGPOheaders=getGPOheadersAsync;
}else {
  console.log('getGPOheadersHybrid');
  getGPOheaders=getGPOheadersHybrid;
}

//Now run the promise chain using desired getGPOheaders (sync vs async vs hybrid)
getToken()
  .then(getOrgId)
  .then(getGPOids)
  .then(getGPOheaders)
  .catch(function (err) {
    console.error('Error received:', err);
  })
  .done(function () {
    process.exit();
  });
//Simply finish the script using process.exit()

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

function getSingleGPOheader(currentGPOrow) {
//    var token = getHandleResponsePromise('token')(data);

//if async loop then have to pass the row
  if (! currentGPOrow) {
    currentGPOrow=hr.saved.currentGPOrow;
  }

  var currentGPO = hr.saved.GPOids[currentGPOrow-1];

    var url= portal + '/sharing/rest/content/items/' + currentGPO.id + '/data' ;

    var parameters = {token: hr.saved.token};
//Pass parameters via form attribute

    var requestPars = {method:'head', url:url, qs:parameters };

    return hr.callAGOL(requestPars).then(getHandleGPOdataHeader(currentGPO));
//  return hr.callAGOL(requestPars).then(HandleGPOdataHeader);

}

function getSingleGPOheaderTest(currentGPOrow) {
//    var token = getHandleResponsePromise('token')(data);

//if async loop then have to pass the row
  if (! currentGPOrow) {
  }

  currentGPOrow=1;

  var url= 'http://localhost:3000/gpoitems/list' ;

  var parameters = {};
//Pass parameters via form attribute

  var requestPars = {method:'head', url:url, qs:parameters };

//  return Q.nfcall(function() {return true});
//  return true;

  var currentGPO={}
    return hr.callAGOL(requestPars).then(getHandleGPOdataHeader(currentGPO));
//  return hr.callAGOL(requestPars).then(HandleGPOdataHeader);

}

function getGPOheadersSync(GPOids) {
    return hr.promiseWhile(function() {return hr.saved.currentGPOrow<=hr.saved.totalRows;}, getSingleGPOheader);
}

function getGPOheadersHybrid() {
  return hr.promiseWhile(function() {return hr.saved.currentGPOrow<=hr.saved.totalRows;}, getGPOheadersAsync);
}

function getGPOheadersAsync() {
  var async = require('async');

  var defer = Q.defer();

//  Q.when(getSingleGPOheader,function () {console.log('resolve');defer.resolve()});
//  getSingleGPOheader(1).then(function () {console.log('resolve');defer.resolve()});

  var GPOids;
  if (AsyncRowLimit) {
//take slice form current row to async row limit
    GPOids= hr.saved.GPOids.slice(hr.saved.currentGPOrow-1,hr.saved.currentGPOrow-1+AsyncRowLimit);
  }else {
    GPOids= hr.saved.GPOids;
  }

  //need to get the value of currentGPOrow when this function is called because getSingleGPOheader changes it
  //THis is basically the currentGPOrow when the async loop started
  var asyncStartCurrentGPOrow = hr.saved.currentGPOrow;

  console.log(hr.saved.currentGPOrow + ' ' + GPOids.length)

  async.forEachOf(GPOids, function (value, key, done) {
//      console.log(key+hr.saved.currentGPOrow)
      getSingleGPOheader(key+asyncStartCurrentGPOrow)
        .then(function () {
//                console.log(String(key+1) + 'done');
                done();})
        .catch(function(err) {
          console.error('single gpo header Error received:', err);
        })
        .done(function() {
//          console.log('for loop success')
        });
    }
    , function (err) {
      if (err) console.error('for each error :' + err.message);
//resolve this promise
//      console.log('resolve')
      defer.resolve();
    });

//I have to return a promise here for so that chain waits until everything is done until it runs process.exit in done.
//chain was NOT waiting before and process exit was executing and header data not being retrieved
  return defer.promise
}

function getHandleGPOdataHeader(data) {
  return  function HandleGPOdataHeader(head) {

//function HandleGPOdataHeader(head) {
      console.log('head' + hr.saved.currentGPOrow + ' ' + head);
      head.gpoID = data.id;
      head.gpoURL = data.url;

      hr.saved.currentGPOrow += 1;
//in monk this is a promise and convert to Q promise
      return Q(headerscollection.insert(head));
//      return true;
//    return Q.nfcall(function() {return true});
}

}

function getGPOids() {
  return getGPOidsPromise().then(handleGPOidsPromise)
}

function getGPOidsPromise() {
  var Q = require('q');

  return Q.ninvoke(itemscollection ,"find", {}, {fields:{_id:0,id:1,url:1}});
}

function handleGPOidsPromise(docs) {
//  var e = data[0];

//temporary slice for testing
  if (TotalRowLimit) docs = docs.slice(0,TotalRowLimit);

  hr.saved.GPOids = docs;
  hr.saved.totalRows = docs.length;
  return docs;
}

