var getTokenOnly=false;

var request = require('request');
var Q = require('q');

var portal = 'https://epa.maps.arcgis.com';

var fs = require('fs');

console.log('process.env.NODE_ENV ' + process.env.NODE_ENV);
//echo %NODE_ENV%

var env = require('../config/env');
//var credentials = JSON.parse(fs.readFileSync('AGOLcredentials.json', 'utf8'));

try {
    var username = env.AGOLadminCredentials.username;
    var password = env.AGOLadminCredentials.password;
}
catch (e) {
    console.log("AGOL admin username and password not defined in config file");
    process.exit();
}

//process.exit()

//This where we store the output from REST calls like token and OrgID so it can be used by handlers
var output = {};

var itemCount = 100;

output.nextStart=1;

var monk = require('monk');
var db = monk('localhost:27017/egam');

var gpoitemcollection = db.get('GPOitems');
//clear out any existing
gpoitemcollection.remove({});

if (getTokenOnly===true) {
    getToken()
        .catch(function(err) {
            console.error('Error received:', err);
        })
        .done(function() {console.log(output.token);process.exit();});
}else {
//String along aysn function calls to AGOL REST API
getToken()
    .then(getOrgId)
    .then(getGPOitems)
    .catch(function(err) {
        console.error('Error received:', err);
    })
    .done(function() {process.exit();});
}

//Simply finish the script using process.exit()

function getTokenPromise() {
    var tokenURL = portal + '/sharing/rest/generateToken?';

    var parameters = {'username' : username,
        'password' : password,
        'client' : 'referer',
        'referer': portal,
        'expiration': 60,
        'f' : 'json'};
//Pass parameters via form attribute
    var requestPars = {method:'post', url:tokenURL, form:parameters };

    return Q.nfcall(request, requestPars);
}

function getToken() {
    return getTokenPromise().then(getHandleResponse('token'));
}

function getOrgIdPromise(token) {
//    var token = getHandleResponsePromise('token')(data);

    var url = portal + '/sharing/rest/portals/self';

    console.log("token " + token);

    var parameters = {'token' : token,'f' : 'json'};
//Pass parameters via form attribute
    var requestPars = {method:'get', url:url, qs:parameters };

    return Q.nfcall(request, requestPars);
}
function getOrgId(token) {
    return getOrgIdPromise(token).then(getHandleResponsePromise('id','orgID'));
}

function getGPOitemsPromise(orgID) {
//    var token = getHandleResponsePromise('token')(data);

    var url= portal + '/sharing/rest/search';

    var parameters = {'q':'orgid:'+output.orgID,'token' : output.token,'f' : 'json','start':output.nextStart,'num':itemCount};
//Pass parameters via form attribute

    var requestPars = {method:'get', url:url, qs:parameters };
    return Q.nfcall(request, requestPars);
}

function getGPOitems() {
    return promiseWhile(function() {return output.nextStart>0}, getGPOitemsChunk);
}

function getGPOitemsChunk() {
    return getGPOitemsPromise().then(HandleGPOitemsResponse);
}

function HandleGPOitemsResponse(data) {
    var body = handleResponse(data[0],data[1]);
    console.log(output.nextStart + ' to ' + (output.nextStart + body.results.length-1));
    gpoitemcollection.insert(body.results);
    output.nextStart = body.nextStart;
    return body.nextStart;
}

function promiseWhile(condition, promiseFunction) {
    var done = Q.defer();

    function loop() {
        // When the result of calling `condition` is no longer true, we are
        // done.
        if (!condition()) return done.resolve();
        // Use `when`, in case `promiseFunction` does not return a promise.
        // When it completes loop again otherwise, if it fails, reject the
        // done promise
        Q.when(promiseFunction(), loop, done.reject);
    }

    // Start running the loop in the next tick so that this function is
    // completely async. It would be unexpected if `promiseFunction` was called
    // synchronously the first time.
    Q.nextTick(loop);

    // The promise
    return done.promise;
}

//This get generic response handler
function getHandleResponsePromise(key,outputkey) {
    return function(data) {
        return Q.fcall(handleResponse,data[0],data[1],key,outputkey);
    }
}
function getHandleResponse(key,outputkey) {
    return function(data) {
        return handleResponse(data[0],data[1],key,outputkey);
    }
}

function handleResponse(response,body,key,outputkey) {
    var value=null;
    var error=null;

//outputkey will be the name stored in output
    if (! outputkey) outputkey=key;

    if (response.statusCode == 200) {
//            console.log(body);
        try {
            value = JSON.parse(body);
            if (key) {
                value = JSON.parse(body)[key];
                output[outputkey]=value;
                console.log(outputkey + "=" + value);
            }
            if (!value) error=body;
        } catch (ex) {
            error = ex;
        }
    }else {
        error = 'Status code not 200';
    }
    if (error) throw('Error getting ' + key + ': ' + error);
    return value;
}
