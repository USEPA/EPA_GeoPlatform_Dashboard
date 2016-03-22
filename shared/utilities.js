var utilities = {};

utilities.getRequestInputs = function(req,errors) {
//get value from request form or querystring
//returns false if output is not a string (like an object or something)

  var inputs=req.body;
  if (req.method.toLowerCase()==="get") inputs=req.query;

  return inputs;
};

utilities.getCleanRequestInputs = function(req,errors) {
//get value from request form or querystring
//add to error list if input value not a string

  var inputs=utilities.getRequestInputs(req,errors);

  Object.keys(inputs).forEach(
      function (key) {
        if (typeof inputs[key] !== "string") {
          errors.push(key + " must be a string");
          inputs[key] = JSON.stringify(inputs[key]);
        }
      });
  return inputs;
};

//Not on a big JSON object this can be VERY sloq where it basically isn't pratical
utilities.removeJSONkeyDots = function(json) {
//get rids of dots in JSON keys. Mongo doesn't like it for one.
  var JafarClass = require('jafar');

  var jafar = new JafarClass({
    json: json
  } );

  var allKeys = jafar.listAllKeys();

  allKeys.forEach(function (key) {
    newkey=key.replace(/\./g,"");
    jafar.replaceKey(key, newkey, true, true);
  });

  return jafar.json;
};

utilities.streamify = function(text) {
//Converts a string to a stream
  var stream = require('stream');
  var s = new stream.Readable();
  s.push(text);
  s.push(null);
  return s;
};

utilities.getHandleError = function (resObject,code) {
  return function(error) {
//Pass an empty object else it will keep old fields in here
//Have to keep the same reference so can't just reassign
    resObject.error = {message: error.message, code: code};
    resObject.body = null;
    console.log("getHandleError  " + error.stack);
  }
};

utilities.writeStreamPromise = function (stream,text,encoding) {
  var Q = require('q');
//writes text to stream and returns promise
//NOTE: If text is empty then does not write
  if (text===0) text="0";
  if (text) {
    if (encoding) {
      return Q.ninvoke(stream, "write", text,encoding);
    }else{
      return Q.ninvoke(stream, "write", text);
    }
  }else {
    return Q(true);
  }
};

utilities.getGridFSobject = function (app) {
  var Q = require('q');
  var GridFSstream = require('gridfs-stream');
  var mongo = require('mongodb');

  var db = app.get('db');

  //if gfs object hasn't been created yet then get now
  //need db connection open before gfs can be created
  return Q.ninvoke(db,"open")
    .then(function () {
      var gfs = app.get('gfs');
      if (! gfs) gfs = GridFSstream(db, mongo);
      app.set('gfs',gfs);
      return gfs;
    });
};

utilities.sliceObject = function (obj,slice) {
  var mySlice = {};

  slice.forEach(function (key) {
    if (key in obj) mySlice[key] = obj[key];
  });

  return mySlice;
};

//Get array from DB from single field

utilities.getArrayFromDBnoStream = function (collection,query,field) {
  console.log('remove getArrayFromDB');
  var Q = require('q');
  var proj = {fields:{}};
  proj[field] = 1;
  return Q(collection.find(query, proj))
//  return Q(collection.find(query, {fields:{authGroups:1}}))
    .then(function (docs) {
      console.log('then getArrayFromDB');
      return docs.map(function (doc) {
        return doc[field];});
    });
};

utilities.getArrayFromDB = function (collection,query,field) {
//This should be faster with streaming
  var Q = require('q');

  var outArray = [];
  var defer = Q.defer();
  var fields = {};
//Have to project out only the field desired or it was REALLY slow
  fields[field] = 1;
  collection.find(query, {fields:fields,stream:true})
    .each(function (doc) {
//push doc.field to the array now
      outArray.push(doc[field]);
    })
    .error(function (err) {
      defer.reject("Error getting Array From DB: " + err);
    })
    .success(function () {
      defer.resolve(outArray);
    });

  return defer.promise;
};

utilities.getDistinctArrayFromDBaggregate = function (collection,query,field) {
//Using Aggregate was VERY slow for 11,000 gpoitems on owner

  var Q = require('q');

  var project = {};
  project[field] = 1;

  return Q.ninvoke(collection.col,"aggregate",
    [
      {"$match": query },
      {
        "$group" : {
          "_id" : "$" + field
        }
      },
      {
        "$project" : project
      }
//      ,{ "$limit":100}
    ])
    .then(function (docs) {
      return docs.map(function (doc) {
        return doc._id;});
    });
};

utilities.getDistinctArrayFromDB = function (collection,query,field) {
//This should be faster. Aggregate was VERY slow for 11,000 gpoitems on owner
  var Q = require('q');

//existsHash is hash with keys made up of collection.field values, since all keys are unique it will find unique collection.field values
//add collection.field value as a key in existsHash. doesn't matter what existHash values are, just set to 1
//to get distinct array of collection.field values just find keys in existsHash
  var existsHash = {};
  var defer = Q.defer();
  var fields = {};
//Have to project out only the field desired or it was REALLY slow
  fields[field] = 1;
  collection.find(query, {fields:fields,stream:true})
    .each(function (doc) {
//So that we can get unique simple arrays or simple objects stringify and then Parse at end
      var key = JSON.stringify(doc[field]);
      existsHash[key]=1;
    })
    .error(function (err) {
      defer.reject("Error getting Distinct Array From DB: " + err);
    })
    .success(function () {
      var distinctArray = Object.keys(existsHash).map(function (key) {
        return JSON.parse(key);
      });
      defer.resolve(distinctArray);
    });

  return defer.promise;
};

utilities.batchUpdateDB = function (collection,docs,idField) {
  var Q = require('q');
  var self = this;
  var async = require('async');

  var defer = Q.defer();

  async.forEachOf(docs, function (doc, index, done) {
//      this.downloadLogs.log(key+this.hr.saved.modifiedGPOrow)
      var query = {};
      query[idField]= doc[idField];
      var update = {$set: doc};

      if (doc[idField]==="de53261c0084406d9a6014430dc07a72") {
        console.log("********************FOUND de53261c0084406d9a6014430dc07a72 ********");
        console.log("**** query, update = " + JSON.stringify(query) +  JSON.stringify(update));
      }

//      console.log("**** query, update = " + JSON.stringify(query) +  JSON.stringify(update));
      Q(collection.update(query, update))
        .then(function () {
          if (doc[idField]==="de53261c0084406d9a6014430dc07a72") {
            console.log("********************DONE de53261c0084406d9a6014430dc07a72 ********");
          }
          done();})
        .catch(function(err) {
          console.log(err.stack);
          defer.reject(err);
        })
        .done(function() {
        });
    }
    , function (err) {
      if (err) console.log(err.stack);

      if (err) defer.reject(err);
//resolve this promise
      defer.resolve();
    });

  return defer.promise;
};

module.exports = utilities;

