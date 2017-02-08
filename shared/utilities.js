var utilities = {};

utilities.getRequestInputs = function(req,errors) {
  //Get value from request form or querystring
  //returns false if output is not a string (like an object or something)

  var inputs = req.body;
  if (req.method.toLowerCase() === 'get') inputs = req.query;

  return inputs;
};

utilities.getCleanRequestInputs = function(req,errors) {
  //Get value from request form or querystring
  //add to error list if input value not a string

  var inputs = utilities.getRequestInputs(req,errors);

  Object.keys(inputs).forEach(
      function(key) {
        if (typeof inputs[key] !== 'string') {
          errors.push(key + ' must be a string');
          inputs[key] = JSON.stringify(inputs[key]);
        }
      });
  return inputs;
};

//Not on a big JSON object this can be VERY sloq where it basically isn't
//pratical
utilities.removeJSONkeyDots = function(json) {
  //Get rids of dots in JSON keys. Mongo doesn't like it for one.
  var JafarClass = require('jafar');

  var jafar = new JafarClass({
    json: json,
  });

  var allKeys = jafar.listAllKeys();

  allKeys.forEach(function(key) {
    newkey = key.replace(/\./g,'');
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

utilities.getHandleError = function(resObject,code) {
  return function(error) {
    //Have to keep the same reference so can't just reassign
    if (!Array.isArray(resObject.errors)) {
      resObject.errors = [];
    }
    var message = error.message || error;
    resObject.errors.push({message: message, code: code});
    //Don't null out body anymore so we can stash stuff here that might be helpful
    //resObject.body = null;
    console.error('getHandleError  ' + (error.stack || error));
    return resObject;
  }
};

utilities.writeStreamPromise = function(stream,text,encoding) {
  var Q = require('q');
  //Writes text to stream and returns promise
  //NOTE: If text is empty then does not write
  if (text === 0) {
    text = '0';
  }
  if (text) {
    if (encoding) {
      return Q.ninvoke(stream, 'write', text,encoding);
    }
    return Q.ninvoke(stream, 'write', text);
  }
  return Q(true);
};

utilities.getGridFSobject = function(app) {
  var Q = require('q');
  var GridFSstream = require('gridfs-stream');
  var mongo = require('mongodb');

  var db = app.get('db');

  //If gfs object hasn't been created yet then get now
  //need db connection open before gfs can be created
  return Q.ninvoke(db,'open')
    .then(function() {
      var gfs = app.get('gfs');
      if (!gfs) {
        gfs = GridFSstream(db, mongo);
      }
      app.set('gfs',gfs);
      return gfs;
    });
};

utilities.sliceObject = function(obj,slice) {
  var mySlice = {};

  slice.forEach(function(key) {
    sliceSingle(obj,key,mySlice);
  });
  //This function takes an object and add key field to mySlice if it exists
  //If key is lke objField.field then creates objField in slice and runs sliceSingle on
  function sliceSingle(obj,key,mySlice) {
    var mySplit = key.split('.');
    if (mySplit.length > 1) {
      var objField = mySplit[0];
      //Now get the key of the key that was an object (could be dotted again so must join remaining)
      var objFieldKey = mySplit.slice(1).join('.');
      if (objField in obj) {
        if (!(objField in mySlice)) {
          mySlice[objField] = {};
        }
        sliceSingle(obj[objField],objFieldKey,mySlice[objField])
      }
    } else {
      //When key is just simple key without nested fields then set the value
      if (key in obj) {
        mySlice[key] = obj[key];
      }
    }
  }
  return mySlice;
};

utilities.constructFromArgsArray = function(constructor, argArray) {
  var args = [null].concat(argArray);
  var factoryFunction = constructor.bind.apply(constructor, args);
  return new factoryFunction();
};

//This function allows new classes to inherit from existing class
//pass the ParentClass or Object
//If inheriting the Parent constructor then pass a string for childConstructor
//which will be name of ChildClass/Constructor
//If Child Class will have it's own constructor then pass the Child Constructor
//function for childConstructor
//Note: An object can be passed for ParentClass which is a virtual class which
//can not be instantiated but only inherited from
utilities.inheritClass = function(parentClassOrObject,childConstructor) {
  var childClass;
  //If child constructor is passed and it is a function then use it as new child
  //class otherwise create a new function
  if (childConstructor && childConstructor.constructor == Function) {
    childClass = childConstructor;
  }else {
    //Must create a new constructor that invokes parent constructor but is not
    // set equal to parent. don't want to change parent prototyp
    //if constructor name is passed as string for childConstructor it will be
    //used for constructor name so in debugger don't get "childClass"
    //Note: get the parent from the prototype of the object because this.parent
    //could be assigned to something
    if (!childConstructor) {
      childConstructor = 'UnknownChild';
    }
    childClass = new Function('return function ' + childConstructor +
      '() {this.__parent__.constructor.apply(this, arguments);};')();
  }
  //Inherit the parent prototype
  childClass.prototype = new parentClassOrObject;
//have to set the child constructor so that it is not parent (if we inherit parent constructor that will still be in child class variable)
  childClass.prototype.constructor = childClass;
  if ( parentClassOrObject.constructor == Function ) {
    //Normal Inheritance
//this is helpful in case the child wants access to the parent methods/properties;
    childClass.prototype.__parent__ = parentClassOrObject.prototype;
  } else {
    //Pure Virtual Inheritance
    childClass.prototype.__parent__ = parentClassOrObject;
  }
  return childClass;
};

//Get array from DB from single field
utilities.getArrayFromDBnoStream = function(collection,query,field) {
  var Q = require('q');
  var proj = {fields: {}};
  proj[field] = 1;
  return Q(collection.find(query, proj))
//  Return Q(collection.find(query, {fields:{authGroups:1}}))
    .then(function(docs) {
      return docs.map(function(doc) {
        return doc[field];});
    });
};

utilities.getArrayFromDB = function(collection,query,field) {
  //This should be faster with streaming
  var Q = require('q');

  var outArray = [];
  var defer = Q.defer();
  var fields = {};
  //Have to project out only the field desired or it was REALLY slow
  fields[field] = 1;
  collection.find(query, {fields: fields,stream: true})
    .each(function(doc) {
      //Push doc.field to the array now
      outArray.push(doc[field]);
    })
    .error(function(err) {
      defer.reject('Error getting Array From DB: ' + err);
    })
    .success(function() {
      defer.resolve(outArray);
    });

  return defer.promise;
};

utilities.streamDocsFromDB = function(collection,query,projection) {
  //This should be faster with streaming
  var Q = require('q');

  var outArray = [];
  var defer = Q.defer();
  if (! projection) projection = {};
  projection.stream = true;
  collection.find(query, projection)
    .each(function(doc) {
      //Push doc.field to the array now
      outArray.push(doc);
    })
    .error(function(err) {
      defer.reject('Error getting Array of Docs From DB: ' + err);
    })
    .success(function() {
      defer.resolve(outArray);
    });

  return defer.promise;
};

utilities.getDistinctArrayFromDBaggregate = function(collection,query,field) {
  //Using Aggregate was VERY slow for 11,000 gpoitems on owner

  var Q = require('q');

  var project = {};
  project[field] = 1;

  return Q.ninvoke(collection.col,'aggregate',
    [
      {$match: query },
      {
        $group: {
          _id: '$' + field,
        },
      },
      {
        $project: project,
      }
//      ,{ "$limit":100}
    ])
    .then(function(docs) {
      return docs.map(function(doc) {
        return doc._id;});
    });
};

utilities.getDistinctArrayFromDB = function(collection,query,field) {
  //This should be faster. Aggregate was VERY slow for 11,000 gpoitems on owner
  var Q = require('q');

  //ExistsHash is hash with keys made up of collection.field values, since all
  //keys are unique it will find unique collection.field values
  //add collection.field value as a key in existsHash. doesn't matter what
  //existHash values are, just set to 1
  //to get distinct array of collection.field values just find keys in
  //existsHash
  var existsHash = {};
  var defer = Q.defer();
  var fields = {};
  //Have to project out only the field desired or it was REALLY slow
  fields[field] = 1;
  collection.find(query, {fields: fields,stream: true})
    .each(function(doc) {
      //So that we can get unique simple arrays or simple objects stringify
      //and then Parse at end
      var key = JSON.stringify(doc[field]);
      existsHash[key] = 1;
    })
    .error(function(err) {
      defer.reject('Error getting Distinct Array From DB: ' + err);
    })
    .success(function() {
      var distinctArray = Object.keys(existsHash).map(function(key) {
        return JSON.parse(key);
      });
      defer.resolve(distinctArray);
    });

  return defer.promise;
};

utilities.batchUpdateDB = function(collection,docs,idField) {
  var Q = require('q');
  var self = this;
  var async = require('async');

  var defer = Q.defer();

  async.forEachOf(docs, function(doc, index, done) {
    //      This.downloadLogs.log(key+this.hr.saved.modifiedGPOrow)
    var query = {};
    query[idField] = doc[idField];
    var update = {$set: doc};

    // Console.log("**** query, update = " + JSON.stringify(query) +  JSON.stringify(update));
    Q(collection.update(query, update))
        .then(function() {
          done();})
        .catch(function(err) {
          console.log(err.stack);
          defer.reject(err);
        })
        .done(function() {
        });
  }
    , function(err) {
      if (err) {
        console.log(err.stack);
      }

      if (err) {
        defer.reject(err);
      }
      //Resolve this promise
      defer.resolve();
    });

  return defer.promise;
};

//This are functions to use Mongo collection like a key value store.
//It saves a _key field and every other field is considered a field in value object
utilities.getDBkeyValue = function (collection,key) {
  var Q = require('Q');
  return Q(collection.findOne({'_key':key}, {}));
};

utilities.setDBkeyValue = function (collection,key,value) {
  var Q = require('Q');
  //If they try to set variable called _key it will be overwritten
  value['_key'] = key;
  return Q(collection.update({'_key':key}, {$set:value},{upsert:true}));
};

// Moved to Utilities to create a more generic function that can be used by 
// multiple tables (e.g. GPO & EDG)
utilities.genericRouteListCreation = function(app, req, res,
                                              collectionName,
                                              queryExternal,
                                              projectionExternal) {

  var user = this.getUserFromSession(req,res);

  //If they are not logged in (no user) then don't show them anything just send error
  if (!user) {
    return false;
  }

  var Q = require('q');
  var merge = require('merge');
  var utilities = require(app.get('appRoot') + '/shared/utilities');
  var monk = app.get('monk');
  var config = app.get('config');

  var itemscollection = monk.get(collectionName);

  var error = null;

  //This function gets input for both post and get for now
  var query = utilities.getRequestInputs(req).query;

  //Parse JSON querdfy in object
  if (typeof query === 'string') {
    query = JSON.parse(query);
  }
  //If query is falsey make it empty object
  if (!query) {
    query = {};
  }
  merge.recursive(query,queryExternal);

  //This function gets input for both post and get for now
  var projection = utilities.getRequestInputs(req).projection;

  //Parse JSON query in object
  if (typeof projection === 'string') {
    projection = JSON.parse(projection);
  }
  //If query is falsey make it empty object
  if (!projection) {
    projection = {};
  }
  merge.recursive(projection,projectionExternal);

  //Need to limit the number of rows to prevent crashing
  //This was fixed by streaming and not sending back SlashData so if
  //config.maxRowLimit=null don't force a limit
  if (config.maxRowLimit) {
    if (!('limit' in projection)) {
      projection.limit = config.maxRowLimit;
    }
    //Force limit to be <= MaxRowLimit (Note passing limit=0 to Mongo means
    //no limit so cap that also)
    if (projection.limit > config.maxRowLimit || projection.limit === 0) {
      projection.limit = config.maxRowLimit
    }
  }

  if (!('fields' in projection)) {
    projection.fields = {};
  }

  //Find if there are inclusion fields
  var inclusionFields = Object.keys(projection.fields)
    .filter(function(field) {return projection.fields[field] === 1});
  if (inclusionFields.length > 0) {
    Object.keys(projection.fields).forEach(function(fieldName) {
      if (projection.fields[fieldName] == 0) {
        delete projection.fields[fieldName];
      }
    });
  } else {
    projection.fields.SlashData = 0;
  }

  //Assume if you pass limit return paging information
  if ('limit' in projection) {
    streamItemsPaging()
      .then(function(beginning) {return streamItems(beginning,'}')})
      .catch(function(err) {
        console.error('Error streaming items paging: ' + err);
      })
      .done(function() {res.end()});
  } else {
    //If no limit passed then just stream array of all items
    streamItems()
      .catch(function(err) {
        console.error('Error streaming items: ' + err);
      })
      .done(function() {res.end()});
  }

  function streamItems(beginning,end) {
    //This will make streaming output to client
    projection.stream = true;
    //Make sure end is a string if null
    end = end || '';
    //First have to stream the beginning text
    return utilities.writeStreamPromise(res,beginning)
      .then(function() {
        var defer = Q.defer();
        var firstCharacter = '[';
        itemscollection.find(query, projection)
          .each(function(doc) {
            res.write(firstCharacter);
            res.write(JSON.stringify(doc));
            if (firstCharacter == '[') {
              firstCharacter = ',';
            }
          })
          .error(function(err) {
            defer.reject('Error streaming items: ' + err);
          })
          .success(function() {
            //If firstcharacter was not written then write it now
            //(if no docs need to write leading [
            if (firstCharacter === '[') {
              res.write(firstCharacter);
            }
            res.write(']' + end, function() {
              defer.resolve();
            });
          });
        return defer.promise;
      })
  }
  function getTotalRowsPromise() {
    //Save total rows in session for a query so we don't have to keep getting
    //count when paging
    if ('session' in req && (collectionName + 'List') in req.session &&
      req.session[collectionName + 'List'].query == JSON.stringify(query)) {
      console.log('Use Session Total');
      return Q(req.session[collectionName + 'List'].total);
    }
    return Q(itemscollection.count(query))
      .then(function(total) {
        if ('session' in req) {
          req.session[collectionName + 'List'] = {
            query: JSON.stringify(query),
            total: total,};
        }
        console.log('Save Session: ' +
          JSON.stringify(req.session[collectionName + 'List']));
        return total;
      });
  }

  function streamItemsPaging() {
    //Have to get the total rows either from DB or session and then get the
    //paging stuff
    return getTotalRowsPromise()
      .then(function(total) {
        var resObject = {};
        resObject.total = total;
        resObject.start = projection.skip || 1;
        resObject.num = projection.limit || total;
        resObject.nextStart = resObject.start + resObject.num;
        if (resObject.nextStart > resObject.total) {
          resObject.nextStart = -1;
        }
        return JSON.stringify(resObject).replace(/}$/,',"results":');
      });
  }
};

utilities.getUserFromSession = function(req,res) {
  var user = null;
  if ('session' in req && req.session.user) {
    user = req.session.user;
  }
  //If res passed then respond with error message
  if (!user && res) {
    res.json(utilities.getHandleError({},
      'LoginRequired')('Must be logged in to make this request.'));
  }
  return user;
};

utilities.runExternalCommand = function (cmd) {
  //pass log if you want to log the results. by default it is true
  var Q = require('Q');
  var defer = Q.defer();

  var exec = require('child_process').exec;
  exec(cmd, function(err, stdout, stderr) {
    if (err) {
      defer.reject(err);
    }

    //send back both stdout and stderr to let consumer decide what to do with them.
    //Don't consider stderr messages to mean we will reject or throw and error that will be caught necessarily
    defer.resolve({stdout:stdout,stderr:stderr});
  });

  return defer.promise;
};

utilities.isInt = function (value) {
  var x;
  if (isNaN(value)) {
    return false;
  }
  x = parseFloat(value);
  return (x | 0) === x;
};

//Helper that just stream out a file
utilities.streamFileAsResponse = function (res,filePath,contentType) {
  var fs = require('fs');
  var stat = fs.statSync(filePath);

  //if no content type try to get it from the extension
  if (! contentType) {
    // If extension is not standard then default to 'text/plain'
    contentType = utilities.getContentTypeFromExtension(filePath) || 'text/plain';
  }
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size
  });

  var readStream = fs.createReadStream(filePath);
  //We replaced all the event handlers with a simple call to readStream.pipe()
  readStream.pipe(res);
};

//Helper that just stream out a file
utilities.getContentTypeFromExtension = function (file) {
    var path = require('path');
    var contentTypes = {html:'text/html',js:'application/javascript',json:'application/json'};
    var ext = path.extname(file).replace('.','');
    return contentTypes[ext] || null;
};

utilities.getToken = function(portal,credentials) {
  var appRoot = require('app-root-path');

  var hrClass = require(appRoot + '/shared/HandleGPOresponses');
  var hr = new hrClass();

  var tokenURL = null;
  var parameters = null;
  var tokenFieldName = null;
  if (credentials.appID && credentials.appSecret) {
    tokenURL = portal + '/sharing/oauth2/token?';
    parameters = {
      client_id: credentials.appID,
      client_secret: credentials.appSecret,
      grant_type: 'client_credentials',
      expiration: credentials.expiration
    };
    tokenFieldName = 'access_token';
  } else {
    tokenURL = portal + '/sharing/rest/generateToken?';
    parameters = {
      username: credentials.username,
      password: credentials.password,
      client: 'referer',
      referer: portal,
      expiration: credentials.expiration,
      f: 'json'
    };
    tokenFieldName = 'token';
  }
  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: tokenURL, form: parameters};

  var keyMap = {};
  keyMap[tokenFieldName] = 'token';
  return hr.callAGOL(requestPars, keyMap)
    .then(function () {
      return hr.saved.token;
    });
};

module.exports = utilities;

