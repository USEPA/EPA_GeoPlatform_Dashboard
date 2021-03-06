//For tracking when script started
var startTime = new Date();

var getTokenOnly = false;

var useSync = false;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
var AsyncRequestLimit = 50;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
var AsyncRowLimit = 25;

var AsyncAuditRowLimit = 100;
//Var AsyncAuditRowLimit = null;

//******FOR TESTING ONLY
//For testing to only get metadata set to true, usually set to false
var onlyGetMetaData = true;
//This will make execution must faster since we don not have to download all
//remote items and only need to download modified
var dontRemoveGPOitems = true;
//For testing saving json and text only set to true, usually set to false
var dontSaveBinary = false;
//For testing download of specific slash data, usually set to null
var HardCodeSlashDataTestIDs = null;
if (HardCodeSlashDataTestIDs) {
  HardCodeSlashDataTestIDs.push('091f277d34aa4e4996d142b2585bd12c');
  HardCodeSlashDataTestIDs.push('2868c888528f4735b17721f0cf416b9a');
  HardCodeSlashDataTestIDs.push('2e1e236db6c34503854229c664318299');
  HardCodeSlashDataTestIDs.push('e4e09182312f4569886165e530708406');
}
//This is just for testing if we don't want all docs, usually set to null
var TotalRowLimit = null;
//Harcode in token
var token = 'tkmrXzs65d8WmS7Glfw5veSRjwxyb7tG9H-PV4XgnRlfdq3L5ofxFzlmH0pC-47VLRt-XHYqsTy2KE8oVegDAHBSkYmkDbP5yv0jo1K_Imz6v9KowfFONlvxf2R7nHhEOYfRkB4eU4Lfa19JVXWKfg..'
token = null;
//*******END FOR TESTING only

var request = require('request');
var Q = require('q');

console.log('Running with NODE_ENV = ' + process.env.NODE_ENV);

var appRoot = require('app-root-path');
var config = require(appRoot + '/config/env');
//Var config = require('../config/env');

try {
  var username = config.AGOLadminCredentials.username;
  var password = config.AGOLadminCredentials.password;
  var portal = config.portal;
}
catch (e) {
  console.log(
    'AGOL admin username and password or portal not defined in config file');
  process.exit();
}

var utilities = require(appRoot + '/shared/utilities');
var hrClass = require(appRoot + '/shared/handleGPOresponses');
var hr = new hrClass(config);
//Console.log(hr);


//Var itemStart = 1;

//Hr.save is where we store the output from REST calls like token and OrgID
//so it can be used by handlers

var mongo = require('mongodb');
var MonkClass = require('monk');
var monk = MonkClass(config.mongoDBurl);

var itemscollection = monk.get('GPOitems');
var historycollection = monk.get('GPOhistory');

var url = require('url');
var mongoURL = url.parse(config.mongoDBurl);
var db = new mongo.Db(mongoURL.pathname.replace('/',''),
  new mongo.Server(mongoURL.hostname,mongoURL.port));

var GridFSstream = require('gridfs-stream');
//Need to create gfs instance after db is connected
var gfs = null;

var requestItemCount = 100;
//Hr.save is where we store the output from REST calls like token and OrgID
//so it can be used by handlers
hr.saved.requestStart = 1;
//For async need to have rows counting
hr.saved.newGPOrow = 1;
//For hybrid need to have AGOL call counting
//each call gets number of rows equal to requestItemCount
hr.saved.currentRequest = 1;

hr.saved.modifiedGPOrow = 1;

//Place to store ALL the new GPO id's taken from the website with modified data
//Used to find which items have been deleted
hr.saved.remoteGPOids = [];
//Store only the modified/created gpo ids to know which SlashData to download
hr.saved.modifiedGPOids = [];

hr.saved.historyGPOitems = [];

//Audit stuff
var AuditClass = require(appRoot + '/shared/Audit');

//GetSingleGPOTest();
//getSingleGPOTest(1).then(function () {console.log('resolve');});
//return;

if (AsyncRequestLimit === 0 || AsyncRequestLimit === 1) {
  useSync = true;
}
if (AsyncRowLimit === 0 || AsyncRowLimit === 1) {
  useSync = true;
}

//String along aysn function calls to AGOL REST API
var getGPOdata = null;
var getGPOitems = null;
if (useSync) {
  console.log('Getting All Data using Sync');
  getGPOitems = getGPOitemsSync;
  getGPOdata = getGPOdataSync;
} else {
  if (AsyncRequestLimit === null) {
    console.log('Getting Meta Data using Full Async ');
    getGPOitems = getGPOitemsAsync;
  }else {
    console.log('Getting Meta Data using Hybrid ');
    getGPOitems = getGPOitemsHybrid;
  }
  if (AsyncRowLimit === null) {
    console.log('Getting Slash Data using Full Async ');
    getGPOdata = getGPOdataAsync;
  }else {
    console.log('Getting Slash Data using Hybrid ');
    getGPOdata = getGPOdataHybrid;
  }
}


//If only want meta data this is just a dummy pass through function
if (onlyGetMetaData) {
  getGPOdata = function() {return true}
};

if (getTokenOnly === true) {
  getToken()
    .catch(function(err) {
      console.error('Error received:', err);
    })
    .done(function() {
      console.log('\n' + hr.saved.token);
      process.exit();
    });
}else {
  //Note getting metadata items and slashdata and removing dropped items
  //unless set not to above
  //Now run the promise chain using desired getGPOitems/getGPOdata
  //(sync vs async vs hybrid)
  connectDB()
    .then(getToken)
    .then(getOrgId)
    .then(getLocalGPOids)
    .then(getGPOitems)
    .then(getGPOdata)
//  .then(getSingleGridFS)
    .then(removeLocalGPOitems)
    .catch(function(err) {
      console.error('Error received:', err);
    })
    .done(function() {
      //    Console.log(hr.saved.localGPOids);
      //    console.log(hr.saved.localGPOcount);
      var endTime = new Date();
      console.log('Start Time: ' + startTime);
      console.log('End Time: ' + endTime);
      db.on('close', function() {
        process.exit()
      });
      db.close();
    });
  //Simply finish the script using process.exit() after db is closed
}

function connectDB() {
  var gfs = GridFSstream(db, mongo);

  return Q.ninvoke(db,'open');
}

//Function setDBonClose() {
//close db to signal exit
//}


function getToken() {
  if (token) {
    hr.saved.token = token;
    return token;
  }

  var tokenURL = portal + '/sharing/rest/generateToken?';

  var parameters = {username: username,
      password: password,
      client: 'referer',
      referer: portal,
      expiration: 60,
      f: 'json',};
  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: tokenURL, form: parameters };

  return hr.callAGOL(requestPars,'token');
}

function getOrgId() {
  var url = portal + '/sharing/rest/portals/self';

  var parameters = {token: hr.saved.token,f: 'json'};
  //Pass parameters via form attribute
  var requestPars = {method: 'get', url: url, qs: parameters };

  if (config.AGOLorgID) {
    hr.saved.orgID = config.AGOLorgID;
    return config.AGOLorgID;
  }
  return hr.callAGOL(requestPars,{id: 'orgID'});
}

//Routines for gettting all the items metadata from AGOL
//(Have to do this so we know what items to delete from working local copy)
function getGPOitemsChunk(requestStart,HandleGPOitemsResponse) {
  if (!requestStart) {
    requestStart = hr.saved.requestStart;
  }

  var url = portal + '/sharing/rest/search';

  var parameters;
  //If not removing local gpo items that have been removed from AGOL then only
  //need to download modified items
  if (dontRemoveGPOitems) {
    //Have to pad modified ms from 1970
    var now = (new Date()).getTime();
    var query = 'modified:[' + padNumber(hr.saved.localMaxModifiedDate) +
      ' TO ' + padNumber(now) + '] AND orgid:' + hr.saved.orgID;
    console.log(query);
    console.log(1442435671000 - hr.saved.localMaxModifiedDate);
    console.log(1442435671000 - now);
    console.log(requestStart);
    console.log(requestItemCount);
    parameters = {
      q: query,
      token: hr.saved.token,
      f: 'json',
      start: requestStart
      ,num: requestItemCount,
    };
  }else {
    parameters = {
      q: 'orgid:' + hr.saved.orgID,
      token: hr.saved.token,
      f: 'json',
      start: requestStart,
      num: requestItemCount,
    };
  }

  //Testing single ID
  //  var parameters = {'q':'id:e58dcd33a6d4474caf9d0dd7ea75778e','token' : hr.saved.token,'f' : 'json','start':requestStart,'num':requestItemCount };

  //Pass parameters via form attribute

  //  url = "https://epa.maps.arcgis.com/sharing/rest/search?start=1&num=100&f=json&q=modified:[0000001442434881000 TO 0000001442436425667] AND orgid:cJ9YHowT8TU7DUyn&token=" + hr.saved.token

  //  url = "https://epa.maps.arcgis.com/sharing/rest/search?start=1&num=100&f=json&q=modified:[0000001442434881000%20TO%200000001442436425667]%20AND%20orgid:cJ9YHowT8TU7DUyn&token=E4RU0tZofURyP8C45u2L8aguhUkO43PMAfs5_DkAlsOeuf5nB9eJwxfdMFKFTzxvcx3W-wV2sxt-IavYekPe0xn02w_nzwL2qBHKM9JLX_buz6eBDgx1i9TF09NSRa1lfof_A3HGgO4MoPfm7sJ1ebeArSA.."

  //  url = "https://epa.maps.arcgis.com/sharing/rest/search?start=1&num=100&f=json&q=orgid:cJ9YHowT8TU7DUyn&token=" + hr.saved.token

  var requestPars = {method: 'get', url: url, qs: parameters };
  //  Console.log(parameters);
  //  var requestPars = {method:'get', url:url};

  if (!HandleGPOitemsResponse) {
    if (useSync) {
      //      Console.log('HandleGPOitemsResponseSync');
      HandleGPOitemsResponse = HandleGPOitemsResponseSync;
    } else if (AsyncRequestLimit === null) {
      //      Console.log('HandleGPOitemsResponseAsync');
      HandleGPOitemsResponse = HandleGPOitemsResponseAsync;
    } else {
      //      Console.log('HandleGPOitemsResponseHybrid');
      HandleGPOitemsResponse = HandleGPOitemsResponseAsync;
    }
  }
  return hr.callAGOL(requestPars).then(HandleGPOitemsResponse);
}

function padNumber(num, size) {
  //This is for AGOL modified date
  if (!size) {
    size = 19
  }
  var s = num + '';
  while (s.length < size) {
    s = '0' + s;
  }
  return s;
}

function getGPOitemsSync() {
  var whileCondition = null;
  if (TotalRowLimit) {
    whileCondition = function() {
      return hr.saved.requestStart <= TotalRowLimit;
    };
  }else {
    whileCondition = function() {return hr.saved.requestStart > 0;};
  }
  return hr.promiseWhile(whileCondition, getGPOitemsChunk);
}

function HandleGPOitemsResponseSync(body) {
  console.log('Sync ' + hr.saved.requestStart + ' to ' +
    (hr.saved.requestStart + body.results.length - 1));
  hr.saved.requestStart = body.nextStart;

  storeModifiedDocs(body);

  return body;
  //  Return Q(gpoitemcollection.insert(body.results));
}

function HandleGPOitemsResponseAsync(body) {
  if ('error' in body) {
    console.error('Error getting GPO items: ' + body.error.message);
    return true;
  }
  //Console.log('current Row ' + hr.saved.newGPOrow + ' to ' + (hr.saved.newGPOrow + body.results.length-1));
  //console.log('current Request ' + hr.saved.currentRequest );
  console.log('request Start ' + (body.start) + ' to ' +
    (body.start + body.results.length - 1) + ' (items retrieved: ' +
    (hr.saved.newGPOrow + body.results.length - 1) + ')');
  //Next start is not neccessarily found in order so use newGPOrow to
  //konw how far along
  hr.saved.newGPOrow += body.results.length;
  hr.saved.currentRequest += 1;

  //StoreModifiedDocs returns a promise that is done when mod docs are inserted
  return storeModifiedDocs(body);
}

//Store only the modified GPO items but keep all of the ID's for handling
//deleted GPO items
function storeModifiedDocs(body) {
  //Note I am going to insert into database each time this is called but store
  //Mod IDs so that Slash Data can be downloaded later
  //store all the remote id's
  var remoteGPOids = body.results.map(function(doc) {return doc.id});
  hr.saved.remoteGPOids = hr.saved.remoteGPOids .concat(remoteGPOids);
  //Only the modified/created gpo items more recent than local will be upserted
  //add empty SlashData field in here in case it doesn't get added later just
  var modifiedGPOitems = body.results.filter(function(doc) {
    doc.SlashData = null;
    return doc.modified > hr.saved.localMaxModifiedDate;
  });
  //NOt get array of only the modified ID's because we will be looping over
  //all id's later to get Slash Data but don't want to keep all GPO items
  //in memory
  var modifiedGPOids = modifiedGPOitems.map(function(doc) {return doc.id});

  hr.saved.modifiedGPOids = hr.saved.modifiedGPOids.concat(modifiedGPOids);

  //Begin hardcoded test of specific slash data downloads
  if (HardCodeSlashDataTestIDs) {
    modifiedGPOitems = [];
    modifiedGPOids = HardCodeSlashDataTestIDs;
    hr.saved.modifiedGPOids = modifiedGPOids;
  }
  //End ardcoded test of specific slash data downloads

  hr.saved.modifiedGPOcount = hr.saved.modifiedGPOids.length;


  console.log('Remote GPO item count ' + hr.saved.remoteGPOids.length);
  console.log('Modified GPO item count ' + hr.saved.modifiedGPOids.length);


  //This returns a promise which is resolved when database records are inserted
  return saveModifiedGPOitems(modifiedGPOids,modifiedGPOitems);
}

function saveModifiedGPOitems(modifiedGPOids,modifiedGPOitems) {
  var backupDate = new Date();

  //The date is already embedded in ObjectID and id is embedded in doc so all
  //we need to do is insert row in history
  //But I am just saving data this way so we can get date out of db easier than
  //transforming objectID to get timestamp for each query
  //ObjectID can still be used for filtering/aggregating because it is
  //automatically indexed
  var historyGPOitems = modifiedGPOitems.map(function(doc) {
    return {
      id: doc.id,
      date: backupDate,
      doc: doc,
    }
  });

  //  Console.log("insert historyGPOitems count" + historyGPOitems.length);
  //  console.log("insert modifiedGPOitems count "  + modifiedGPOitems.length);

  if (modifiedGPOitems.length > 0) {
    return Q(itemscollection.remove({id: {$in: modifiedGPOids}}))
      .then(function() {return Q(itemscollection.insert(modifiedGPOitems))})
      .then(function() {return Q(historycollection.insert(historyGPOitems))})
      .then(function() {return getGPOaudit(modifiedGPOitems);});
  }
  return Q(true);
}


function getGPOitemsHybrid() {
  return getRequestStartArray()
    .then(HandleGPOitemsResponseAsync)
    .then(getGPOitemsHybridFromStartArray)
}

function getGPOitemsHybridFromStartArray() {
  return hr.promiseWhile(function() {
    return hr.saved.newGPOrow <= hr.saved.remoteGPOcount;
  }, getGPOitemsAsyncFromStartArray);
}

function getGPOitemsAsync() {
  //Have to first get the StartArray to use in async for each
  //This means an initial AGOL call to get "total" items count in AGOL
  //So subsequent calls will be Async for each
  return getRequestStartArray()
    .then(HandleGPOitemsResponseAsync)
    .then(getGPOitemsAsyncFromStartArray);
}

function getGPOitemsAsyncFromStartArray() {
  var async = require('async');

  var defer = Q.defer();

  //Q.when(getSingleGPOdata,function () {console.log('resolve');defer.resolve()});
  //getSingleGPOdata(1).then(function () {console.log('resolve');defer.resolve()});

  var requestStartArray;
  //Console.log('hr.saved.currentRequest ' + hr.saved.currentRequest)
  if (AsyncRequestLimit) {
    //Take slice form current row to async row limit
    requestStartArray = hr.saved.requestStartArray
      .slice(hr.saved.currentRequest - 1,
        hr.saved.currentRequest - 1 + AsyncRequestLimit);
  }else {
    requestStartArray = hr.saved.requestStartArray
      .slice(hr.saved.currentRequest - 1);
  }

  //Console.log(hr.saved.newGPOrow + ' ' + requestStartArray.length)

  async.forEachOf(requestStartArray, function(requestStart, index, done) {
    //Console.log(key+hr.saved.modifiedGPOrow)
    getGPOitemsChunk(requestStart)
        .then(function() {
          //Console.log(String(key+1) + 'done');
        done();})
        .catch(function(err) {
          console.error('async for each gpo items chunk Error received:', err);
        })
        .done(function() {
          //          Console.log('for loop success')
        });
  }
    , function(err) {
      if (err) {
        console.error('async for each error :' + err.message);
      }
      //Resolve this promise
      //      console.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything
  //is done until it runs process.exit in done. chain was NOT waiting before
  //and process exit was executing and slash data not being retrieved
  return defer.promise


}

function getRequestStartArray() {
  return getGPOitemsChunk(1,handleGetRequestStartArray)
}

function handleGetRequestStartArray(body) {
  //Find the requestStart of each call
  hr.saved.requestStartArray = [];
  //  Console.log(body);

  hr.saved.remoteGPOcount = body.total;
  console.log('Remote GPO count ' + hr.saved.remoteGPOcount);
  if (TotalRowLimit) {
    hr.saved.remoteGPOcount = TotalRowLimit;
  }
  for (var i = 1; i <= hr.saved.remoteGPOcount; i = i + requestItemCount) {
    hr.saved.requestStartArray.push(i);
  }

  return body;
}

//Endo of routine that get all new meta data

//Routine to get the slash data

function getSingleGPOdata(modifiedGPOrow) {
  var defer = Q.defer();

  //If async loop then have to pass the row
  if (!modifiedGPOrow) {
    modifiedGPOrow = hr.saved.modifiedGPOrow;
  }

  var currentGPOid = hr.saved.modifiedGPOids[modifiedGPOrow - 1];

  var url = portal + '/sharing/rest/content/items/' + currentGPOid + '/data' ;

  var parameters = {token: hr.saved.token};
  //Pass parameters via form attribute

  var requestPars = {method: 'get', url: url, qs: parameters };

  //Note: Have to use the on('response') event so that we can get a streaming
  //response variable for saving to gridFS
  request(requestPars)
    .on('response', getHandleGPOdata(defer,modifiedGPOrow))
    .on('error',function(err) {
      defer.reject('Error downloading Slash Data for ' +
        currentGPOid + ' : ' + err);
    });

  //Return Q.nfcall(request, requestPars).then(getHandleGPOdata(modifiedGPOrow));

  return defer.promise;
}


function getHandleGPOdata(defer,modifiedGPOrow) {
  //Must have access to the defer created for calling request function that
  //produced response so it can be resolved
  return function HandleGPOdata(response) {
    //NOte the response sent to here is the readable stream form of response
    //not the object that contains the body
    var currentGPOid = hr.saved.modifiedGPOids[modifiedGPOrow - 1];

    //If response is text then just save to mongo normall on GPOitems
    //Otherwise save to Grid FS collection on mongo
    var contentType = response.headers['content-type'] || '';
    var SlashData = {text: null,json: null,binaryID: null,type: contentType};

    if (contentType.match('^text/')) {
      //If not binary then just read in chunks of data
      var body = '';

      response.on('data', function(chunk) {
        body += chunk;
      });

      response.on('end', function() {
        //Check if json then create an object, otherwise just save the text
        try {
          var json = JSON.parse(body);
          if (json && typeof json === 'object') {
            SlashData.json = json;
          }
        }catch (e) {
          SlashData.text = body;
        }
        //Now update the DB. must pass defere so it can be resolved when
        //done updating
        updateModifiedGPOdata(defer,currentGPOid,SlashData);

      });

    } else {
      //This function take response which implements readable stream and writes
      //to Grid FS. Also saves Slash Data (binaryID) to GPO items.
      if (dontSaveBinary) {
        defer.resolve();
      }else {
        //Try to get filename from response header
        try {
          var contentDisposition = require('content-disposition');
          var disposition = contentDisposition.parse(
            response.headers['content-disposition']);
          var filename = disposition.parameters.filename;
        }catch (ex) {
          filename = currentGPOid + '.txt';
        }

        saveStreamToGridFS(response, currentGPOid, SlashData,filename)
          .catch(function(err) {
            defer.reject('Error updating binary Slash Data to Grid FS : ' + err);
          }).done(function() {
            defer.resolve();
          });
      }
    }

    //Note: this not usd for pure async, for hybrid it only determines
    //modifiedGPOrow at start of each aysnc foreach loop
    hr.saved.modifiedGPOrow += 1;

    return true;
  };
}

function saveStreamToGridFS(readableStream,id,SlashData,filename) {
  //This function returns a promise so we can know when it is done
  //with everything
  var gridDefer = Q.defer();

  //If they don't pass filename then set it equal to id
  if (!filename) {
    filename = id;
  }

  //If gfs object hasn't been created yet then get now
  if (!gfs) {
    gfs = GridFSstream(db, mongo);
  }

  //Use gpo item id as name of file in grid fs
  writestream = gfs.createWriteStream(
    {filename: filename,
     metadata: {id: id},}
  );
  //When done writing need to resolve the promise
  writestream.on('close', function(file) {
      console.log('File with id = ' + id + ' and file = ' + file.filename +
        ' written to GridFS');
      //Add the actual file id to SlashData
      SlashData.binaryID = file._id;
      //Now update the DB. must pass defere so it can be resolved when
      //done updating
      updateModifiedGPOdataBinaryID(gridDefer,id,SlashData);

    });
  //Handle error due to writing
  writestream.on('error', function(err) {
      gridDefer.reject('Error writing stream to GridFS : ' + err);
    });
  //Now actually pipe response into gfs writestream
  readableStream.pipe(writestream);

  return gridDefer.promise;
}

//Seperate this from the Object->Text->GridFS flow of attempts for
//content-type LIKE text/ items
function updateModifiedGPOdataBinaryID(gridDefer,id,data) {
  //Note Q.all takes multiple promises and is done when all are done
  //It accepts a defer from calling function that it can reject or resolve
  //when done
  Q.all([
    Q(itemscollection.update({id: id},{$set: {SlashData: data}})),
    Q(historycollection.update({id: id},{$set: {'doc.SlashData': data}})),
  ])
    .catch(function(err) {
      //Don't reject the deferred because it will break the chain need to try
      //update with json as text instead of object
      //defer.reject("Error updating slash data for " + id + " : " + err);})
      gridDefer.reject('Error updating Slash Data Binary ID for ' +
        id + ' : ' + err);
    })
    .done(function() {
      gridDefer.resolve()
    });
}


function updateModifiedGPOdata(defer,id,data) {
  //Note Q.all takes multiple promises and is done when all are done
  Q.all([
    Q(itemscollection.update({id: id},{$set: {SlashData: data}})),
    Q(historycollection.update({id: id},{$set: {'doc.SlashData': data}})),
  ])
    .catch(function(err) {
      //Don't reject the deferred because it will break the chain need to
      //try update with json as text instead of object
      //defer.reject("Error updating slash data for " + id + " : " + err);})
      console.log(
        'Trying to save as Text, Error updating slash data as Object for ' +
        id + ' : ' + err);
      //If there is an error try to resolve it saving data as text instead of
      //JSON object
      //If error saving as text or binary
      return UpdateModifieGPOdataAsText(defer,id,data).catch(function(err) {
        defer.reject('Error forcing updating slash data forced to Grid FS : ' +
          err);
      });
    })
    .done(function() {
      //      Console.log('Done updating Modified Slash Data for ' + id);
      defer.resolve()
    });
}

//This is called after update crahsed probably because of dot in field name
function UpdateModifieGPOdataAsText(defer,id,data) {
  //This has to return a promise so calling function will wait til everything
  //in here is done
  var textDefer = Q.defer();
  data.text = JSON.stringify(data.json);
  data.json = null;
  Q.all([
    Q(itemscollection.update({id: id},{$set: {SlashData: data}})),
    Q(historycollection.update({id: id},{$set: {'doc.SlashData': data}})),
  ])
    .catch(function(err) {
      console.log('Trying to save as Grid FS, Error updating slash data forced AS Text for ' + id + ' : ' + err);
      //Try to save a grid FS (should normally work for all size/type of data)
      var textStream = utilities.streamify(data.text);
      data.text = null;
      return saveStreamToGridFS(textStream, id, data, id + '.txt')
        .catch(function(err) {
          textDefer.reject(
            'Error forcing updating slash data forced to Grid FS : ' + err);
        });
    })
    .done(function() {
      //      Console.log('Done updating Modified Slash Data for ' + id);
      textDefer.resolve()
    });
  return textDefer.promise;
}

function getGPOdataSync(GPOids) {
  return hr.promiseWhile(function() {
    return hr.saved.modifiedGPOrow <= hr.saved.modifiedGPOcount;
  }, getSingleGPOdata);
}

function getGPOdataHybrid() {
  return hr.promiseWhile(function() {
    return hr.saved.modifiedGPOrow <= hr.saved.modifiedGPOcount;
  }, getGPOdataAsync);
}

function getGPOdataAsync() {
  var async = require('async');

  var defer = Q.defer();

  //Q.when(getSingleGPOdata,function () {console.log('resolve');defer.resolve()});
  //getSingleGPOdata(1).then(function () {console.log('resolve');defer.resolve()});

  var GPOids;
  if (AsyncRowLimit) {
    //Take slice form current row to async row limit
    GPOids = hr.saved.modifiedGPOids
      .slice(hr.saved.modifiedGPOrow - 1,
        hr.saved.modifiedGPOrow - 1 + AsyncRowLimit);
  }else {
    GPOids = hr.saved.modifiedGPOids;
  }

  //Need to get the value of modifiedGPOrow when this function is called
  //because getSingleGPOdata changes it
  //THis is basically the modifiedGPOrow when the async loop started
  var asyncStartModifiedGPOrow = hr.saved.modifiedGPOrow;
  console.log('Slash Data download from row ' + asyncStartModifiedGPOrow +
    ' to ' + (asyncStartModifiedGPOrow + GPOids.length - 1));

  async.forEachOf(GPOids, function(value, key, done) {
    //      Console.log(key+hr.saved.modifiedGPOrow)
    getSingleGPOdata(key + asyncStartModifiedGPOrow)
        .catch(function(err) {
          console.error('for each single gpo data error :', err);
        })
        .done(function() {
          done();
          //          Console.log('for loop success')
        });
  }
    , function(err) {
      if (err) {
        console.error('for each error :' + err.message);
      }
      //Resolve this promise
      //      console.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until
  //everything is done until it runs process.exit in done. chain was NOT waiting
  //before and process exit was executing and data data not being retrieved
  return defer.promise
}




function removeLocalGPOitems() {
  //If not removing local gpo items (so we can get away with not downloading
  //all of them) just return
  if (dontRemoveGPOitems) {
    return Q(true);
  }

  arrayExtended = require('array-extended');
  //  Find the difference of local and remote. This need to be removed
  //need to get array of local GPO ids only instead of id,mod pair
  var localGPOids = hr.saved.localGPOids.map(function(doc) {return doc.id});
  var removeIDs = arrayExtended.difference(localGPOids, hr.saved.remoteGPOids);

  console.log('Locally Removed GPO items count: ' + removeIDs.length);

  if (removeIDs.length > 0) {
    //Put the removed ID's in history collection with null doc to represent
    //it was deleted on this data
    var backupDate = new Date();
    var historyRemoveGPOitems = removeIDs.map(function(id) {
      return {
        id: id,
        date: backupDate,
        doc: null,
      }
    });

    return Q(itemscollection.remove({id: {$in: removeIDs}})).then(function() {
      return Q(historycollection.insert(historyRemoveGPOitems))
    });
//  Return Q(itemscollection.remove({id:{$in:removeIDs}}));
  }
  return Q(true);
}

function getLocalGPOids() {
  return getLocalGPOidsPromise().then(handleLocalGPOidsPromise);
}

function getLocalGPOidsPromise() {
  var Q = require('q');

  //Return Q.ninvoke(itemscollection ,"find", {}, {fields:{id:1,modified:1},sort:{modified:-1}});
  return Q(itemscollection.find({}, {
    fields: {
      id: 1,
      modified: 1,
    }
    ,sort: {
      modified: -1,
    },
  }));
}

function handleLocalGPOidsPromise(docs) {
  //  Var e = data[0];

  //Temporary slice for testing
  if (TotalRowLimit) {
    docs = docs.slice(0,TotalRowLimit);
  }

  hr.saved.localGPOids = docs;
  hr.saved.localGPOcount = docs.length;
  //Get the max modified date in loc
  if (docs.length > 0) {
    hr.saved.localMaxModifiedDate = docs[0].modified;
  }else {
    //If no local gpo items then need to get all. accomplished if max
    //modified date is <  min remote mod date
    //Assume 0 (equal to 1970) is early enough to get everything
    hr.saved.localMaxModifiedDate = 0;
  }
  return docs;
}

//**** Beginning of the auditing
//

function getGPOaudit(modifiedGPOitems) {
  var useSyncAudit = false;
  if (AsyncAuditRowLimit === 0 || AsyncAuditRowLimit === 1)  {
    useSyncAudit = true;
  }

  //Need this new object itemsContext since can't use hr.saved to save row,
  //count and item info because multiple getGPOaudit running called by
  //async getmetadata calls
  var itemsContext = {};
  itemsContext.row = 1;
  itemsContext.count = modifiedGPOitems.length;
  itemsContext.items = modifiedGPOitems;

  //String along aysn function calls to AGOL REST API
  var getGPOauditVersion = null;
  if (useSyncAudit) {
    console.log('Perform Audit  using Sync');
    getGPOauditVersion = getGPOauditSync;
  } else {
    if (AsyncAuditRowLimit === null) {
      console.log('Perform Audit using Full Async ');
      getGPOauditVersion = getGPOauditAsync;
    }else {
      console.log('Perform Audit using Hybrid ');
      getGPOauditVersion = getGPOauditHybrid;
    }
  }

  return getGPOauditVersion(itemsContext);
}

function getSingleGPOaudit(itemsContext,auditGPOitem) {
  //Have to have an audit class for each audit because they are going on
  //concurrently when async
  var audit = new AuditClass();

  //If async loop then have to pass the item
  //for sync don't pass but get from current row
  if (!auditGPOitem) {
    auditGPOitem = itemsContext.items[itemsContext.row - 1];
  }

  //Note: this not usd for pure async, for hybrid it only determines
  //modifiedGPOrow at start of each aysnc foreach loop
  itemsContext.row += 1;

  audit.validate(auditGPOitem);

  return Q(itemscollection.update({id: auditGPOitem.id},
                                  {$set: {AuditData: audit.results}}))
    .then(function() {
      delete audit;
      return true;
    })
    .catch(function(err) {
      console.error('Error updating Audit Data for ' + id + ' : ' + err);
    })
}


function getGPOauditSync(itemsContext) {
  return hr.promiseWhile(function() {
    return itemsContext.row <= itemsContext.count;
  }, function() {
    return getSingleGPOaudit(itemsContext);
  });
}

function getGPOauditHybrid(itemsContext) {
  return hr.promiseWhile(function() {
    return itemsContext.row <= itemsContext.count;
  }, function() {
    return getGPOauditAsync(itemsContext);
  });
}

function getGPOauditAsync(itemsContext) {
  //ItemsContext is like hr.saved but just for this particular chunk of
  //modified metadata
  //hr.saved can not be used because it would be referenced by multiple
  //getAudit calls by async getMetaData
  var async = require('async');

  var defer = Q.defer();

  var GPOitems;
  if (AsyncAuditRowLimit) {
    //Take slice form current row to async row limit
    GPOitems = itemsContext.items
      .slice(itemsContext.row - 1,
        itemsContext.row - 1 + AsyncAuditRowLimit);
  }else {
    GPOitems = itemsContext.items;
  }

  console.log('Audit Data download from row ' + itemsContext.row + ' to ' +
    (itemsContext.row + GPOitems.length - 1));

  async.forEachOf(GPOitems, function(gpoItem, index, done) {
      getSingleGPOaudit(itemsContext,gpoItem)
        .catch(function(err) {
          console.error('For Each Single GPO Audit Error :', err);
        })
        .done(function() {
          done();
          //          Console.log('for loop success')
        });
    }
    , function(err) {
      if (err) console.error('For Each GPO Audit Error :' + err.message);
      //Resolve this promise
      //      console.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything
  //is done until it runs process.exit in done. chain was NOT waiting before
  //and process exit was executing and data data not being retrieved
  return defer.promise
}
//***End of audit stuff ***//
