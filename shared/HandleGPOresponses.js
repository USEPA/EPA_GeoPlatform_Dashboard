var HandleGPOreponse = function(config) {
  this.config = config;
  //The save properties of returen JSON objects based on key
  this.saved = {};
  //The current JSON object. The last one returned.
  this.current = null;
};

//generate function for handling Reponse Promise from Request Promise which returns [request,body]
//saveKeys [respKey1,respKey2] or just "respKey1" will save these keys under same name
//savedKeyMap={respKey1:savedKey1,respKey2:savedKey2} will save under new name
//Note: if object passed for savedKeys then it is actually savedKeyMap
HandleGPOreponse.prototype.getHandleResponsePromise = function(savedKeys, savedKeyMap, requestMethod) {
  var self = this;
  return function(data) {
    //Don't think this needs to actually return a promise
    //        return Q.fcall(handleResponse,data[0],key,outputkey);
    return self.handleResponse(data[0], savedKeys, savedKeyMap, requestMethod);
  }
};

//This get generic response handler.
HandleGPOreponse.prototype.handleResponse = function(response, savedKeys, savedKeyMap, requestMethod) {
  var error = null;

  var body = response.body;

  if (requestMethod === "head") {
    return response.headers
  }

  if (response.statusCode == 200) {
    //            console.log(body);
    try {
      this.current = JSON.parse(body);
      if (!this.current) error = 'JSON body is empty: ';

      //can also pass just string if single key to save
      if (typeof savedKeys === "string") savedKeys = [savedKeys];
      //If savedKeys is an object instead array and no keymap passed then it is a keyMap
      if (!(savedKeyMap || Array.isArray(savedKeys))) {
        savedKeyMap = savedKeys;
        savedKeys = null;
      }

      if (this.current && savedKeys) {
        savedKeys.forEach(function(key) {
          this.saved[key] = this.current[key];
          console.log(key + " : " + this.current[key]);
          if (!this.current[key]) error = 'Error getting ' + key;
        }, this);
      }
      if (this.current && savedKeyMap) {
        Object.keys(savedKeyMap).forEach(function(key) {
          this.saved[savedKeyMap[key]] = this.current[key];
          console.log(savedKeyMap[key] + " : " + this.current[key]);
          if (!this.current[key]) error = 'Error getting ' + this.current[key];
        }, this);
      }
    } catch (ex) {
      error = 'Error parsing JSON body : ' + ex;
    }
  } else {
    error = 'Status code not 200';
  }
  if (error) throw (error + ' with response body: ' + body);
  return this.current;
};


HandleGPOreponse.prototype.getAGOLcallPromise = function(requestPars) {
  var Q = require('q');
  var request = require('request');

  return Q.nfcall(request, requestPars);
};

HandleGPOreponse.prototype.callAGOL = function(requestPars, savedKeys, savedKeyMap) {
  return this.getAGOLcallPromise(requestPars).then(this.getHandleResponsePromise(savedKeys, savedKeyMap, requestPars.method));
}

HandleGPOreponse.prototype.promiseWhile = function(condition, promiseFunction) {
  var Q = require('q');
  var done = Q.defer();

  function loop() {
    // When the result of calling `condition` is no longer true, we are
    // done.
    if (!condition()) return done.resolve();
    // Use `when`, in case `promiseFunction` does not return a promise.
    // When it completes loop again otherwise, if it fails, reject the
    // done promise
    try {
      Q.when(promiseFunction(), loop, done.reject);
    }catch (ex) {
//Use try catch and reject if there is an exception otherwise crash app when Q throws err when running first loop with q.nextTick
      done.reject(ex);
    }

  }

  // Start running the loop in the next tick so that this function is
  // completely async. It would be unexpected if `promiseFunction` was called
  // synchronously the first time.

  Q.nextTick(loop);

  // The promise
  return done.promise;
};

module.exports = HandleGPOreponse;