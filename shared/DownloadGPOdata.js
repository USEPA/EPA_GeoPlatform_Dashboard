var DownloadGPOdata =  function() {
  //This can be run to only update a list of ownerIDs if given. null means get
  //all ownerIDs.
  this.ownerIDs = null;
  //  This.ownerIDs = ["aaron.evans_EPA"];

  //ESRI only allows total = 10,000 in search, we need to get pages of 10,000
  //(or whatever is set here if it changes)
  this.requestQueryRowLimit = 10000;
//Note: requestQueryRowLimit set to null since ESRI limit was increased to more than 10,000  11/24/2015
//Now ESRI decided to go back to the 10,000 item limit in the search on 9/15/2016. loco.
//  this.requestQueryRowLimit = null;

  this.requestItemCount = 100;

  this.useSync = false;

  //The AsyncRequestLimit is the number of async requests to ESRI search that are called at once asynchronously
  //Each search is made up of this.requestItemCount number of rows
  //set to null to run all at one time
  //set to 0 or 1 to run synchronously
  //If you set too many async requests to be run at one time it can cause crashing.

  //How many aysnc requests can be run at one time. too many and things crash
  //set to null to run all at one time (can crash for large data sets)
  //setting to 0 or 1 is the same as useSync=true
  this.AsyncRequestLimit = 50;

  //The <Type>RowLimit is the number of async rows that are called at once asynchronously for different <Type> of download
  //set to null to run all at one time
  //set to 0 or 1 to run synchronously
  //If you set too many async requests to be run at one time it can cause crashing.

  //this.AsyncRowLimit is for downloading slash data
  this.AsyncRowLimit = 25;

  //For doing Audit
  this.AsyncAuditRowLimit = 100;

  //For getting Owner Folders
  this.AsyncOwnerFolderRowLimit = 25;


  //To only get metadata set to true, usually set to false
  this.onlyGetMetaData = false;
  //This will make execution must faster since we don not have to download all
  //remote items and only need to download modified
  this.dontRemoveGPOitems = false;
  //The 2 REST calls need to get owner Folder ID and name takes some time.
  //Might not want to do this on log in?
  this.dontGetOwnerFolders = false;
  //To only save json and text and not binaries set to true, usually set to
  //false
  this.dontSaveBinary = false;
  //This is just for testing if we don't want all docs, usually set to null
  this.TotalRowLimit = null;
  //For testing download of specific slash data, usually set to null
  this.HardCodeSlashDataTestIDs = null;
  //If token is already available then set token on object. Don't need to
  //request and download another one.
  this.token = null;
  //Otherwise if no token then need to set credentials
  //Can use appLogin with secret using oauth/token endpoint
  this.appID = null;
  this.appSecret = null;
  this.expiration = null;
  //Or can use userLogin using getToken endpoint
  this.username = null;
  this.password = null;
  //Need to set the portal
  this.portal = null;
  //Can optionally set OrgID if you know it otherwise have to find it for
  //the user logged in
  this.orgID = null;
  //Set the mongoDB url
  this.mongoDBurl = null;

  this.request = require('request');
  this.Q = require('q');

  this.appRoot = require('app-root-path');
  this.utilities = require(this.appRoot + '/shared/utilities');
  this.hrClass = require(this.appRoot + '/shared/HandleGPOresponses');
  this.hr = new this.hrClass();

  this.mongo = require('mongodb');
  this.MonkClass = require('monk');

  this.monk = null;
  this.db = null;

  this.itemsCollection = null;
  this.historycollection = null;
  this.extensionsCollection = null;

  this.url = require('url');

  this.GridFSstream = require('gridfs-stream');
  //Need to create gfs instance after db is connected
  this.gfs = null;

  this.AuditClass = require(this.appRoot + '/shared/Audit');

  //Save logs and errors that accumulate for emailng out or saving to a
  //file possibly
  this.ScriptLogsClass = require(this.appRoot + '/shared/ScriptLogs');
  this.downloadLogs = new this.ScriptLogsClass();
  //Save the mapping of folder id to folder name
  this.folderNames = {};
};

//Using this will return promise if there is exception in downloadInner
DownloadGPOdata.prototype.download = function() {
  return this.Q.fcall(this.getSelfInvokedFunction(this.downloadInner));
};

DownloadGPOdata.prototype.downloadInner = function() {
  //Clear out array from any previous downloads
  this.downloadLogs.clear();

  this.downloadLogs.log('START RUNNING DOWNLOAD \n');

  var self = this;
  if (!this.monk) {
    this.monk = this.MonkClass(this.mongoDBurl);
  }
  if (!this.itemsCollection) {
    this.itemsCollection = this.monk.get('GPOitems');
  }
  if (!this.historycollection) {
    this.historycollection = this.monk.get('GPOhistory');
  }
  if (!this.extensionsCollection) {
    this.extensionsCollection = this.monk.get('GPOitemExtensions');
  }

  if (!this.db) {
    var mongoURL = this.url.parse(this.mongoDBurl);
    this.db = new this.mongo.Db(mongoURL.pathname.replace('/',''),
      new this.mongo.Server(mongoURL.hostname,mongoURL.port));
  }

  //Hr.saveD is where we store the output from REST calls like token and OrgID
  //so it can be used by handlers

  //When getting items with sync this keep track of what requestStart we are on
  this.hr.saved.requestStart = 1;
  //For async download of items need to keep count of row we are on
  this.hr.saved.remoteGPOrow = 1;
  //For hybrid need to keep count of the AGOL request we are on
  //Each AGOL request retrieves a number of rows equal to requestItemCount
  this.hr.saved.currentRequest = 1;


  //Place to store ALL the new GPO id's taken from the website with modified
  //data
  //Used to find which items have been deleted
  this.hr.saved.remoteGPOids = [];
  //Store only the modified/created gpo ids to know which SlashData to download
  this.hr.saved.modifiedGPOids = [];
  //This will store the modified item owner which is needed to get Folder Name
  //from Folder ID
  this.hr.saved.modifiedItemOwners = {};

//This was for testing/debugging the duplicate issue. remove soon
//  this.hr.saved.duplicateGPOids = [];
//  this.hr.saved.duplicateRequestStart = {};
//END This was for testing/debugging the duplicate issue. remove soon

  //ModifiedSlashDataGPOrow is needed when processing modified items to get slash data
  this.hr.saved.modifiedSlashDataGPOrow = 1;
  //This is where the item information for modified slash data to download is stored
  this.hr.saved.modifiedSlashDataGPOitems = [];

  if (this.AsyncRequestLimit === 0 || this.AsyncRequestLimit === 1)  {
    this.useSync = true;
  }
  if (this.AsyncRowLimit === 0 || this.AsyncRowLimit === 1) {
    this.useSync = true;
  }

  //Determine the functions we will need (sync,async,hybrid) for getting
  //items and data
  var getGPOitems = null;
  var getGPOdata = null;

  if (this.useSync) {
    this.downloadLogs.log('Getting All Data using Sync');
    getGPOitems = this.getGPOitemsSync;
    getGPOdata = this.getGPOdataSync;
  } else {
    if (this.AsyncRequestLimit === null) {
      this.downloadLogs.log('Getting Meta Data using Full Async ');
      getGPOitems = this.getGPOitemsAsync;
    }else {
      this.downloadLogs.log('Getting Meta Data using Hybrid ');
      getGPOitems = this.getGPOitemsHybrid;
    }
    if (this.AsyncRowLimit === null) {
      this.downloadLogs.log('Getting Slash Data using Full Async ');
      getGPOdata = this.getGPOdataAsync;
    }else {
      this.downloadLogs.log('Getting Slash Data using Hybrid ');
      getGPOdata = this.getGPOdataHybrid;
    }
  }
  //Since there is a 10,000 limit on GPO item search need to page over
  //getGPOitems so save the type we are paging over
  this.hr.saved.getGPOitems = getGPOitems;

  //If only want meta data this is just a dummy pass through function
  if (this.onlyGetMetaData) {
    getGPOdata = function() {return true};
  }

  //Note getting metadata items and slashdata and removing dropped items
  //unless set not to above
  //Now run the promise chain using desired getGPOitems/getGPOdata
  //(sync vs async vs hybrid)

  return self.connectDB()
//For testing simultaneous log ins
//    .delay(30000)
    .then(self.getSelfInvokedFunction(self.getToken))
    .then(self.getSelfInvokedFunction(self.getOrgId))
    .then(self.getSelfInvokedFunction(self.createIndices))
    .then(self.getSelfInvokedFunction(self.getLocalMaxModifiedDates))
    .then(self.getSelfInvokedFunction(self.getGPOitemsPaging))
    .then(self.getSelfInvokedFunction(self.getSlashDataMaxModifiedDateItems))
    .then(self.getSelfInvokedFunction(getGPOdata))
//    .then(self.getSelfInvokedFunction(self.getSingleGridFS))
    .then(self.getSelfInvokedFunction(self.getAllOwnerFolders))
    .then(self.getSelfInvokedFunction(self.removeLocalGPOitems))
    .catch(function(err) {
      self.downloadLogs.error(
        'Error running DownloadGPOdata.download():\n', err);
    })
    .then(function() {
//This was for testing/debugging the duplicate issue. remove soon
//      console.log("this.hr.saved.modifiedGPOids.length " + self.hr.saved.modifiedGPOids.length);
//      console.log("this.hr.saved.duplicateGPOids " + self.hr.saved.duplicateGPOids);
//      console.log("this.hr.saved.duplicateRequestStart " + self.hr.saved.duplicateRequestStart);

//      var duplicates = {};
//      self.hr.saved.modifiedGPOids.forEach(
//        function (id) {
//          if (self.hr.saved.duplicateGPOids.indexOf(id) > -1) {
//            if (!(id in duplicates)) {
//              duplicates[id] = 0
//            }
//            duplicates[id] += 1;
//          }
//        }
//      );
//      console.log("duplicates " + JSON.stringify(duplicates));
//      Object.keys(duplicates).forEach(
//        function (id) {
//          console.log("duplicate id = " + id + " requestStarts = " + self.hr.saved.duplicateRequestStart[id]);
//        }
//      );
//END This was for testing/debugging the duplicate issue. remove soon

      var defer = new self.Q.defer();
      self.db.on('close', function() {
        defer.resolve();
      });
      self.db.close();
      return defer.promise;
    });
};

//Have to do this because when the function in .then is called it is called
//from global scope
DownloadGPOdata.prototype.getSelfInvokedFunction = function(f) {
  var self = this;
  return function(x) {
    return f.call(self,x);
  }
};

DownloadGPOdata.prototype.createIndices = function() {
  var self = this;
  //If doing full download create indices. if just doing for individual owners at login for example don't need to keep doing this
  if (self.ownerIDs !==null) return false;

  return self.Q.all([
    self.Q(self.itemsCollection.index({id: 1})),
    self.Q(self.itemsCollection.index({modified: -1})),
    self.Q(self.itemsCollection.index({modified: 1})),
    self.Q(self.itemsCollection.index({modified: 1,id: 1})),
    self.Q(self.itemsCollection.index({access: 1})),
    self.Q(self.itemsCollection.index({owner: 1})),
    self.Q(self.itemsCollection.index({owner: -1})),
    self.Q(self.historycollection.index({id: -1})),
    self.Q(self.historycollection.index({date: 1})),
    self.Q(self.historycollection.index({date: -1})),
    self.Q(self.extensionsCollection.index({id: -1}))
  ])
};


DownloadGPOdata.prototype.connectDB = function() {
  this.gfs = this.GridFSstream(this.db, this.mongo);

  return this.Q.ninvoke(this.db,'open');
};

DownloadGPOdata.prototype.getToken = function() {
  this.downloadLogs.log('Get Token');
  if (this.token) {
    this.hr.saved.token = this.token;
    return this.token;
  }

  var tokenURL = null;
  var parameters = null;
  var tokenFieldName = null;
  if (this.appID && this.appSecret) {
    tokenURL = this.portal + '/sharing/oauth2/token?';
    parameters = {
      client_id: this.appID,
      client_secret: this.appSecret,
      grant_type: 'client_credentials',
      expiration: this.expiration,
    };
    tokenFieldName = 'access_token';
  }else {
    tokenURL = this.portal + '/sharing/rest/generateToken?';
    parameters = {
      username: this.username,
      password: this.password,
      client: 'referer',
      referer: this.portal,
      expiration: this.expiration,
      f: 'json',};
    tokenFieldName = 'token';
  }
  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: tokenURL, form: parameters };

  var keyMap = {};
  keyMap[tokenFieldName] = 'token';
  return this.hr.callAGOL(requestPars,keyMap);
};

DownloadGPOdata.prototype.getOrgId = function() {
  if (this.orgID) {
    this.hr.saved.orgID = this.orgID;
    return this.orgID;
  }

  var url = this.portal + '/sharing/rest/portals/self';

  var parameters = {token: this.hr.saved.token,f: 'json'};
  //Pass parameters via form attribute
  var requestPars = {method: 'get', url: url, qs: parameters };

  return this.hr.callAGOL(requestPars,{id: 'orgID'});
};

//Routines for gettting all the items metadata from AGOL (Have to do this so
//we know what items to delete from working local copy)
DownloadGPOdata.prototype.getGPOitemsChunk = function(requestStart, HandleGPOitemsResponse) {
  var self = this;
  if (!requestStart) {
    requestStart = this.hr.saved.requestStart;
  }

  var url = this.portal + '/sharing/rest/search';

  var query = 'orgid:' + this.hr.saved.orgID;
  var now = (new Date()).getTime();
  if (Array.isArray(this.ownerIDs) && this.ownerIDs.length > 0) {
    var ownerQueries = this.ownerIDs.map(function(ownerID) {
//will be much faster if we use the max modified date for each owner instead of using the single min max modified date of all owners
      var maxModDateQuery =  self.getModifiedQueryPart(self.hr.saved.localMaxModifiedDates[ownerID],now);
      return '(owner:' + ownerID + ' AND ' + maxModDateQuery + ')';
    });

    //    This.downloadLogs.log("ownerQueries length = " + ownerQueries.length);

    var ownerQueryString = '(' + ownerQueries.join(' OR ') + ')';
    //If query length is too long URL will be too large and return error
    //Therefore will have to download all owners at this point so only change
    //query to ownerQuery if within length limit

//    if (ownerQueryString.length < 5000) {
      //Don't need orgid if we have owner IDs
//Actually don't need to limit the query now becasue we are passing it via POST
    query = ownerQueryString;
//    }

    //Just to test how long the query can be
    // this.downloadLogs.log("Full ownerQueryString length " + ownerQueryString.length);
    //    var ownerQueryString = "";
    //    var queryStringLimit = 5000;
    //    var ownerQueryStringCount = 0;
    //    ownerQueries.some(function (owner) {
    //      if (ownerQueryString.length<queryStringLimit) {
    //        ownerQueryStringCount += 1;
    //        if (ownerQueryString) ownerQueryString += " OR ";
    //        ownerQueryString += owner;
    //      }
    //      return ownerQueryString.length>=queryStringLimit;
    //    });
    //    query=ownerQueryString;
    //    this.downloadLogs.log("ownerQueryString = " + ownerQueryStringCount + ownerQueryString);

  } else {
//If getting all owners then just pull from remoteMaxModifiedDate which is the min of the owner max modified (gets lots of stuff can be tweaked later)
//If remoteMaxModifiedDate wasn't set then just get all. We need to get them all when figuring out which local items to remove
    if (this.hr.saved.remoteMaxModifiedDate) {
      query += ' AND ' + self.getModifiedQueryPart(self.hr.saved.remoteMaxModifiedDate, now);
    }
  }

  var parameters = {
    q: query,
    token: this.hr.saved.token,
    f: 'json',
    start: requestStart,
    num: this.requestItemCount
  };
  //Due to paging of 10,000 item pages in query need to sort by modified date
  //now (also add id in case modified is same. I was losing items)
  //  if (this.requestQueryRowLimit ) parameters.sortField='modified,id';
  parameters.sortField = 'modified,id';

  //Testing single ID
  //  var parameters = {'q':'id:e58dcd33a6d4474caf9d0dd7ea75778e','token' : hr.saved.token,'f' : 'json','start':requestStart,'num':requestItemCount };

//  var requestPars = {method: 'get', url: url, qs: parameters };
// Try to post instead of get so that don't have query string limit
  var requestPars = {method: 'post', url: url, form: parameters };

//  this.downloadLogs.log(JSON.stringify("URL Parameters: " + JSON.stringify(parameters)));

  if (!HandleGPOitemsResponse) {
    if (this.useSync) {
      //      This.downloadLogs.log('HandleGPOitemsResponseSync');
      HandleGPOitemsResponse = this.HandleGPOitemsResponseSync;
    } else if (this.AsyncRequestLimit === null) {
      //      This.downloadLogs.log('handleGPOitemsResponseAsync');
      HandleGPOitemsResponse = this.handleGPOitemsResponseAsync;
    } else {
      //      This.downloadLogs.log('HandleGPOitemsResponseHybrid');
      HandleGPOitemsResponse = this.handleGPOitemsResponseAsync;
    }
  }
  return this.hr.callAGOL(requestPars)
    .then(this.getSelfInvokedFunction(HandleGPOitemsResponse));
};

DownloadGPOdata.prototype.getModifiedQueryPart = function(start,end) {
  //get query to search by modified datetime range
  var query = 'modified:[' +
    this.padNumber(start) +
    ' TO ' + this.padNumber(end) + ']';
  //Also don't get the start datetime,
  //the REST API doesn't allow > only >=
  query += ' AND NOT modified:' +
    this.padNumber(start);
  return query;
};

DownloadGPOdata.prototype.padNumber = function(num, size) {
  //This is for AGOL modified date
  if (!size) {
    size = 19;
  }
  var s = num + '';
  while (s.length < size) {
    s = '0' + s;
  }
  return s;
};


DownloadGPOdata.prototype.getGPOitemsPaging = function() {
  var self = this;
  //Need to initialize the remoteMaxModifiedDate
  this.hr.saved.remoteMaxModifiedDate = 0;
  //If we are not removing Local then we can use the localMaxModifiedDate for
  //initialization. Don't need to get everything.
  //Note this is actually just the MINIMUM of each owners max modified date.
  // This is necessary because owners might be downloading independently and need
  //to make sure we get all when downloading for all owners later.
  if (this.dontRemoveGPOitems) {
    this.hr.saved.remoteMaxModifiedDate = this.hr.saved.localMinMaxModifiedDate;
  }

  //If requestQueryRowLimit not set then revert to getting items without paging
  //by modified date
  if (!self.requestQueryRowLimit) {
    return self.getSelfInvokedFunction(self.hr.saved.getGPOitems)();
  }

  //THis needs to be initialized to allow while loop to continue the first time
  self.hr.saved.remoteGPOcount = self.requestQueryRowLimit;

  var whileCondition = null;
  if (self.TotalRowLimit) {
    whileCondition = function() {
      return self.hr.saved.remoteGPOids.length < self.TotalRowLimit;
    };
  }else {
    whileCondition = function() {
      //If remote is less than requestQueryRowLimit (eg. 10,000) then can
      //stop while loop
      //console.log("**** self.hr.saved.remoteGPOcount ****" + self.hr.saved.remoteGPOcount);
    return self.hr.saved.remoteGPOcount === self.requestQueryRowLimit;};
  }

  var getGPOitemsPagingChunk = function() {
    //Self.hr.saved.getGPOitems() does not have scope of self so need to invoke
    //from self
    return self.getSelfInvokedFunction(self.hr.saved.getGPOitems)()
      .then(self.getSelfInvokedFunction(self.HandleGPOitemsPaging));
  };

  return self.hr.promiseWhile(whileCondition,  getGPOitemsPagingChunk);
};

DownloadGPOdata.prototype.HandleGPOitemsPaging = function(body) {
  //Need to clear out the counts to start the next 10,000 row page request
  //sequence
  this.hr.saved.requestStart = 1;
  this.hr.saved.remoteGPOrow = 1;
  this.hr.saved.currentRequest = 1;
  return this.Q(true);
};


DownloadGPOdata.prototype.getGPOitemsSync = function() {
  var self = this;
  var whileCondition = null;
  if (self.TotalRowLimit) {
    whileCondition = function() {
      return self.hr.saved.requestStart <= self.TotalRowLimit;
    };
  }else {
    //IN order to get sync to page need to use rows since requestStart
    //won't be -1 if using 10,000 ESIR limit that was subsequently raised
    if (self.requestQueryRowLimit) {
      whileCondition = function() {return self.hr.saved.requestStart > 0 &&
        self.hr.saved.requestStart <= self.hr.saved.remoteGPOcount ;};
    } else {
      whileCondition = function() {return self.hr.saved.requestStart > 0;};
    }
  }
  return self.hr.promiseWhile(whileCondition,
    self.getSelfInvokedFunction(self.getGPOitemsChunk));
};

DownloadGPOdata.prototype.HandleGPOitemsResponseSync = function(body) {
  this.downloadLogs.log('Sync ' + this.hr.saved.requestStart + ' to ' +
    (this.hr.saved.requestStart + body.results.length - 1));
  this.hr.saved.requestStart = body.nextStart;

  this.hr.saved.remoteGPOrow += body.results.length;

  //If first request then need to set the remoteGPOcount due to ESRI limit thing
  //(note limit has increased more than 10,000) 11/24/2015
  //  console.log("*** body.start ***" + body.start);
  if (body.start === 1) {
    //    Console.log("*** body.total ***" + body.total);
    if (this.requestQueryRowLimit && body.total >= this.requestQueryRowLimit) {
      //Don't let remote count go over the ESRI limit (In the case that ESRI
      //raises limit like they did before it will continue in
      this.hr.saved.remoteGPOcount = this.requestQueryRowLimit;
    }else {
      this.hr.saved.remoteGPOcount = body.total;
    }
  }

  //Also find the max modified date for the entire requestQueryRowLimit=10,000
  //row "page" used to page to next 10,000 rows

  this.downloadLogs.log("body.start + this.requestItemCount - 1 " + body.start + this.requestItemCount - 1);
  this.downloadLogs.log("this.hr.saved.remoteGPOcount " + this.hr.saved.remoteGPOcount);

  if (body.start + this.requestItemCount - 1 === this.hr.saved.remoteGPOcount) {
    this.hr.saved.remoteMaxModifiedDate = body.results[body.results.length - 1].modified;
  }

  return this.storeModifiedDocs(body);
};

DownloadGPOdata.prototype.handleGPOitemsResponseAsync = function(body) {
  if ('error' in body) {
    this.downloadLogs.error('Error getting GPO items: ' + body.error.message);
    return true;
  }
  this.downloadLogs.log('request Start ' + (body.start) + ' to ' +
    (body.start + body.results.length - 1) + ' (items retrieved: ' +
    (this.hr.saved.remoteGPOrow + body.results.length - 1) + ')');
  //Next start is not neccessarily found in order so use remoteGPOrow to
  //konw how far along
  this.hr.saved.remoteGPOrow += body.results.length;
  this.hr.saved.currentRequest += 1;

  if (this.hr.saved.remoteGPOcount > 0 && body.results.length === 0) {
    //This is catatrosphic error that should never happen if remote GPO items
    // exist.
    // If this happens then need to make sure hybrid loop will exit and resolve
    // promise.
    //Should probably email this to admin
    this.downloadLogs.error(
      'Catastrophic Error. No body results probably because AsyncRequestLimit set too high.');
    this.hr.saved.remoteGPOrow = this.hr.saved.remoteGPOcount + 1;
    return false;
  }

  //Also find the max modified date for the entire requestQueryRowLimit=10,000
  // row "page" used to page to next 10,000 rows
  if (body.start + this.requestItemCount - 1 === this.hr.saved.remoteGPOcount) {
    this.hr.saved.remoteMaxModifiedDate = body.results[body.results.length - 1].modified;
  }

  //StoreModifiedDocs returns a promise that is done when mod docs are inserted
  return this.storeModifiedDocs(body);
};

//Store only the modified GPO items but keep all of the ID's for handling
//deleted GPO items
DownloadGPOdata.prototype.storeModifiedDocs = function(body) {
  var self = this;
  //Note I am going to insert into database each time this is called but store
  // Mod IDs so that Slash Data can be downloaded later
  //store all the remote id's so we know which items to remove locally later on
  var remoteGPOids = body.results.map(function(doc) {return doc.id});
  self.hr.saved.remoteGPOids = self.hr.saved.remoteGPOids.concat(remoteGPOids);

  //Ned to update all access fields because when they change doc is not modified
  //(ESRI bug)
  var remoteGPOaccessFields = body.results.map(function(doc) {
    return {id: doc.id,access: doc.access};
  });

  //Only the modified/created gpo items more recent than local will be upserted
  //add empty SlashData field in here in case it doesn't get added later just
  //  var modifiedGPOitems = body.results.filter(function(doc){doc.SlashData=null;return doc.modified>self.hr.saved.localMaxModifiedDate});
  //Now each owner has their OWN max modified date because each owner can
  //download their stuff independently
  //Therefore the max modified date for entire set of owners could be larger
  // than an individual owner's max modified date and individual owner would not
  // be updated properly
  var modifiedGPOitems = body.results.filter(function(doc) {
    doc.SlashData = null;
    //If no max modified date then initialize to zero
    var maxModDate = self.hr.saved.localMaxModifiedDates[doc.owner] || 0;
    //    Self.downloadLogs.log('owner max mod date: ' + doc.owner + ' ' + new Date(maxModDate) + ' ' + doc.id);
    return doc.modified > maxModDate;
  });

  //NOt get array of only the modified ID's because we will be looping over all
  // id's later to get Slash Data but don't want to keep all GPO items in memory
  var modifiedGPOids = modifiedGPOitems.map(function(doc) {return doc.id});

  self.hr.saved.modifiedGPOids = self.hr.saved.modifiedGPOids
    .concat(modifiedGPOids);

//END This was for testing/debugging the duplicate issue. remove soon
//  modifiedGPOids.forEach(function(id) {
//    if (id in self.hr.saved.duplicateRequestStart) {
//      self.downloadLogs.log("self.hr.saved.duplicateRequestStart id= " + id);
//      self.downloadLogs.log("self.hr.saved.duplicateRequestStart[id] " + self.hr.saved.duplicateRequestStart[id]);
//      self.downloadLogs.log("typeof self.hr.saved.duplicateRequestStart[id] " + typeof(self.hr.saved.duplicateRequestStart[id]));
//      self.hr.saved.duplicateRequestStart[id].push(self.hr.saved.requestStart);
//    } else {
//      self.hr.saved.duplicateRequestStart[id] = [self.hr.saved.requestStart];
//    }
//  });
//END This was for testing/debugging the duplicate issue. remove soon

  //Save the owner of each item for geting the folder names later.
  //can't just map from item id to folder
  //Save the thumbnail names for downloading later
  modifiedGPOitems.forEach(function(item) {
    self.hr.saved.modifiedItemOwners[item.id] = item.owner;
  });

  //Begin hardcoded test of specific slash data downloads
  if (self.HardCodeSlashDataTestIDs) {
    modifiedGPOitems = [];
    modifiedGPOids = self.HardCodeSlashDataTestIDs;
    self.hr.saved.modifiedGPOids = modifiedGPOids;
  }
  //End ardcoded test of specific slash data downloads

  self.hr.saved.modifiedGPOcount = self.hr.saved.modifiedGPOids.length;


  this.downloadLogs.log('Remote GPO item count ' +
    self.hr.saved.remoteGPOids.length);
  this.downloadLogs.log('Modified GPO item count ' +
    self.hr.saved.modifiedGPOids.length);


  //This returns a promise which is resolved when database records are inserted
  return self.saveModifiedGPOitems(modifiedGPOids,modifiedGPOitems)
    .then(function() {
      self.updateAccessFields(remoteGPOaccessFields);
    });
};

DownloadGPOdata.prototype.updateAccessFields = function(docs) {
  return this.utilities.batchUpdateDB(this.itemsCollection,docs,'id');
};


DownloadGPOdata.prototype.saveModifiedGPOitems = function(modifiedGPOids,
                                                          modifiedGPOitems) {
  var self = this;
  var backupDate = new Date();

  //The date is already embedded in ObjectID and id is embedded in doc so all
  //we need to do is insert row in history
  //But I am just saving data this way so we can get date out of db eaiser
  //than transforming objectID to get timestamp for each query
  //ObjectID can still be used for filtering/aggregating because it is
  //automatically indexed
  var historyGPOitems = modifiedGPOitems.map(function(doc) {
    return {id: doc.id,date: backupDate,doc: doc};
  });

  //  This.downloadLogs.log("insert historyGPOitems count" + historyGPOitems.length);
  //  this.downloadLogs.log("insert modifiedGPOitems count "  + modifiedGPOitems.length);

  //  Console.log("!!!!!!! modifiedGPOids.length !!!!!!!!!" + modifiedGPOids.length);

  if (modifiedGPOitems.length > 0) {
    return self.Q(self.itemsCollection.remove({id: {$in: modifiedGPOids}}))
//This was for testing/debugging the duplicate issue. remove soon
//    return self.Q(self.itemsCollection.find( {id:{$in:modifiedGPOids}} ))
//      .then(function (docs) {if (docs.length>0) {self.hr.saved.duplicateGPOids=self.hr.saved.duplicateGPOids.concat(docs.map(function (doc) {return doc.id;}));console.log("!!!!!!! $in:modifiedGPOids !!!!!!!!!  " + docs.length + " " + JSON.stringify(docs))}})
//END This was for testing/debugging the duplicate issue. remove soon
      .then(function(value) {return self.Q(self.itemsCollection.insert(modifiedGPOitems))})
      //This was for testing/debugging the duplicate issue. remove soon
      //      .then(function(value) {if (value>0) {console.log("remove return value > modifiedGPOids = " + modifiedGPOids)};return self.Q(self.itemsCollection.insert(modifiedGPOitems))})
      //END This was for testing/debugging the duplicate issue. remove soon
      .then(function() {return self.Q(self.historycollection.insert(historyGPOitems))})
      .then(function() {return self.getGPOaudit(modifiedGPOitems);});
//      .then(function () {return self.getLocalGPOids()})
//      .then(function () {console.log("!!!!!!! start, this.hr.saved.localGPOcount !!!!!!!!! " + bodyStart + ' ' + self.hr.saved.localGPOcount)});
  }else {
    return self.Q(true);
  }
};


DownloadGPOdata.prototype.getGPOitemsHybrid = function() {
  var self = this;
  return self.getRequestStartArray()
    .then(self.getSelfInvokedFunction(self.handleGPOitemsResponseAsync))
    .then(self.getSelfInvokedFunction(self.getGPOitemsHybridFromStartArray));
};

DownloadGPOdata.prototype.getGPOitemsHybridFromStartArray = function() {
  var self = this;
  return self.hr.promiseWhile(function() {
    return self.hr.saved.remoteGPOrow <= self.hr.saved.remoteGPOcount;
  }, self.getSelfInvokedFunction(self.getGPOitemsAsyncFromStartArray));
};

DownloadGPOdata.prototype.getGPOitemsAsync = function() {
  var self = this;
  //Have to first get the StartArray to use in async for each
  //This means an initial AGOL call to get "total" items count in AGOL
  //So subsequent calls will be Async for each
  return self.getRequestStartArray()
    .then(self.getSelfInvokedFunction(self.handleGPOitemsResponseAsync))
    .then(self.getSelfInvokedFunction(self.getGPOitemsAsyncFromStartArray));
};

DownloadGPOdata.prototype.getGPOitemsAsyncFromStartArray = function() {
  var self = this;
  var async = require('async');

  var defer = this.Q.defer();

  //  This.Qwhen(getSingleGPOdata,function () {self.downloadLogs.log('resolve');defer.resolve()});
  //  getSingleGPOdata(1).then(function () {self.downloadLogs.log('resolve');defer.resolve()});

  var requestStartArray;
  //  Self.downloadLogs.log('this.hr.saved.currentRequest ' + this.hr.saved.currentRequest)
  if (self.AsyncRequestLimit) {
    //Take slice form current row to async row limit
    requestStartArray = self.hr.saved.requestStartArray
      .slice(self.hr.saved.currentRequest - 1,
        self.hr.saved.currentRequest - 1 + self.AsyncRequestLimit);
  }else {
    requestStartArray = self.hr.saved.requestStartArray
      .slice(self.hr.saved.currentRequest - 1);
  }

  self.downloadLogs.log('remoteGPOrow = ' + this.hr.saved.remoteGPOrow + ' requestStartArray.length = ' + requestStartArray.length);

  if (this.hr.saved.remoteGPOcount > 0 && requestStartArray.length === 0) {
    //This is catatrosphic error that should never happen if remote GPO items
    //exist. If this happens then need to make sure hybrid loop will exit and
    //resolve promise.
    //Should probably email this to admin
    self.downloadLogs.error('Catastrophic Error. No start array probably because AsyncRequestLimit set too high. ' + this.hr.saved.remoteGPOrow + ' ' + requestStartArray.length);
    self.hr.saved.remoteGPOrow = self.hr.saved.remoteGPOcount + 1;
    defer.resolve();
  }

  async.forEachOf(requestStartArray, function(requestStart, index, done) {
    self.getGPOitemsChunk(requestStart)
        .then(function() {
          //                Self.downloadLogs.log(String(key+1) + 'done');
        done();})
        .catch(function(err) {
          self.downloadLogs.error('Error in async.forEachOf while calling getGPOitemsChunk() in DownloadGPOdata.getGPOitemsAsyncFromStartArray:', err);
        })
        .done(function() {
          //          Self.downloadLogs.log('for loop success')
        });
  }
    , function(err) {
      if (err) self.downloadLogs.error('Error with async.forEachOf while looping over GPO item chunks in DownloadGPOdata.getGPOitemsAsyncFromStartArray:', err);
      //Resolve this promise
      //      self.downloadLogs.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything is
  //done until it runs process.exit in done.
  //chain was NOT waiting before and process exit was executing and slash data
  //not being retrieved
  return defer.promise
};

DownloadGPOdata.prototype.getRequestStartArray = function() {
  return this.getGPOitemsChunk(1,this.handleGetRequestStartArray)
};

DownloadGPOdata.prototype.handleGetRequestStartArray = function(body) {
  //Find the requestStart of each call
  this.hr.saved.requestStartArray = [];
  //  This.downloadLogs.log(body);

  if (this.requestQueryRowLimit && body.total >= this.requestQueryRowLimit) {
    //Don't let remote count go over the ESRI limit (In the case that ESRI
    //raises limit like they did before it will continue in
    this.hr.saved.remoteGPOcount = this.requestQueryRowLimit;
  }else {
    this.hr.saved.remoteGPOcount = body.total;
  }

  this.downloadLogs.log('Remote GPO count ' + this.hr.saved.remoteGPOcount);
  if (this.TotalRowLimit) {
    this.hr.saved.remoteGPOcount = this.TotalRowLimit;
  }
  for (var i = 1; i <= this.hr.saved.remoteGPOcount; i = i + this.requestItemCount) {
    this.hr.saved.requestStartArray.push(i);
  }

  return body;
};

//Endo of routine that get all new meta data

//Routine to get the slash data

DownloadGPOdata.prototype.getSingleGPOdata = function(modifiedGPOrow) {
  var self = this;
  var defer = self.Q.defer();

  //If async loop then have to pass the row
  if (!modifiedGPOrow) {
    modifiedGPOrow = self.hr.saved.modifiedSlashDataGPOrow;
  }

  //get the modified items pertaining to the slash data downloading
  var currentGPOitem = self.hr.saved.modifiedSlashDataGPOitems[modifiedGPOrow - 1];
  var currentGPOid = currentGPOitem.id;
  var currentThumbnail = currentGPOitem.thumbnail;

  var urlSlash = self.portal + '/sharing/rest/content/items/' +
    currentGPOid + '/data';
  var urlThumb = self.portal + '/sharing/rest/content/items/' +
    currentGPOid + '/info/' + currentThumbnail;

  var parameters = {token: self.hr.saved.token};
  //Pass parameters via form attribute

  var requestParsSlash = {method: 'get', url: urlSlash, qs: parameters };
  var requestParsThumb = {method: 'get', url: urlThumb, qs: parameters };

  //First get the latest history ID needed to update history slashData
  var historyID = null;
  self.getLatestHistoryID(currentGPOid)
    .then(function(id) {
      historyID = id;
      if (!historyID) {
        //Need to increment the row so that loop based on row count does
        //not get stuck
        self.hr.saved.modifiedSlashDataGPOrow += 1;
        throw 'History ID not found';
      }
    })
    .then(function() {
      //Note: passing initial SlashData object so we can attach modified here (and other stuff in future if needed)
      return self.getSingleGPOdataPart(requestParsSlash,
        self.getHandleGPOslashData,currentGPOitem,historyID);
    })
    .then(function(slashData) {
      if (currentThumbnail) {
        return self.getSingleGPOdataPart(requestParsThumb,
          self.getHandleGPOthumbnail, currentGPOitem, historyID, slashData);
      }
    })
    .catch(function(error) {
      //      Defer.reject("Error getting single GPO data: " + error.stack)})
    defer.reject(error)})
    .done(function() {
      defer.resolve();});

  return defer.promise;
};

DownloadGPOdata.prototype.getSingleGPOdataPart = function(requestPars,
                                                          handler,currentGPOitem,
                                                          historyID,slashData) {
  var self = this;
  var defer = self.Q.defer();

  //First get the latest history ID needed to update history slashData
  //Note: Have to use the on('response') event so that we can get a streaming
  //response variable for saving to gridFS
  var requestHandler = handler.call(self, defer, currentGPOitem,
                                    historyID, slashData);

  self.request(requestPars)
    .on('response',
    requestHandler)
    .on('error', function(err) {
      defer.reject('Error getting single GPO data part for ' +
        currentGPOitem.id + ' : ' + err);
    });

  return defer.promise;
};

DownloadGPOdata.prototype.getLatestHistoryID = function(GPOid) {
  //Find the Latest History ID (where date is max) for GPOid
  //Note can just order by ObjectID _id because it is sorted by timestamp
  var self = this;
  return self.Q(self.historycollection.findOne({id: GPOid},
      {sort: {_id: -1},fields: {_id: 1}}))
    .then(function(doc) {
      if (!doc) {
        return null;
      }
      //      Self.downloadLogs.log(doc._id);
      //      self.downloadLogs.log(self.historycollection.id(doc._id));
      return doc._id;
      //      Return self.historycollection.id(doc._id)
    });
};

DownloadGPOdata.prototype.getHandleGPOslashData = function(defer,
                                                           currentGPOitem,
                                                           historyID,SlashData) {
  var self = this;
  //Must have access to the defer created for calling request function that
  //produced response so it can be resolved
  return function HandleGPOslashdata(response) {
    var currentGPOid = currentGPOitem.id;
    //NOte the response sent to here is the readable stream form of response
    //not the object that contains the body

    //If response is text then just save to mongo normall on GPOitems
    //Otherwise save to Grid FS collection on mongo
    var contentType = response.headers['content-type'] || '';
    //No longer need to save "json" field which was actually js literal object anyway.
    // "text" is actually just JSON anyway and won't be altered by MONGO so it doesn't match ESRI
    //Pass slash data now so that you can put other fields on it from calling function if needed
    //Already passing slash data for thumbnail anyway
    if (! SlashData) {SlashData={}}
    SlashData.text = null;
    SlashData.binaryID = null;
    SlashData.type = contentType;
    SlashData.modified = currentGPOitem.modified;

    if (contentType.match('^text/')) {
      //If not binary then just read in chunks of data
      var body = '';

      response.on('data', function(chunk) {
        body += chunk;
      });

      response.on('end', function() {
        //Check if json then create an object, otherwise just save the text

        //No longer save as an object. Just save all as text because it was not
        //transforming consistently
        //ie. JSON.stringify(JSON.parse(body)) !== body
        //        try {
        //          var json = JSON.parse(body);
        //          if (json && typeof json === "object")  SlashData.json = json;
        //        }catch (e) {
        //          SlashData.text = body;
        //        }
        SlashData.text = body;

        //Now update the DB. must pass defere so it can be resolved when done
        //updating
        self.updateModifiedGPOdata(defer,currentGPOid,historyID,SlashData);

      });

    } else {
      //This function take response which implements readable stream and writes
      //to Grid FS. Also saves Slash Data (binaryID) to GPO items.
      if (self.dontSaveBinary) {
        defer.resolve(SlashData);
      }else {
        //Try to get filename from response header
        try {
          var contentDisposition = require('content-disposition');
          var disposition = contentDisposition
            .parse(response.headers['content-disposition']);
          var filename = disposition.parameters.filename;
        }catch (ex) {
          filename = currentGPOid + '.txt';
        }

        self.saveStreamToGridFS(response, currentGPOid,
            historyID, SlashData,filename)
          .catch(function(err) {
          defer.reject('Error updating binary Slash Data to Grid FS : ' + err);
          })
          .done(function() {
          defer.resolve(SlashData);
        });
      }
    }

    //Note: this not usd for pure async, for hybrid it only determines
    //modifiedSlashDataGPOrow at start of each aysnc foreach loop
    self.hr.saved.modifiedSlashDataGPOrow += 1;

    return true;
  };
};

DownloadGPOdata.prototype.getHandleGPOthumbnail = function(defer,
                                                           currentGPOitem,
                                                           historyID,
                                                           slashData) {
  var self = this;
  //Must have access to the defer created for calling request function that
  //produced response so it can be resolved
  return function HandleGPOthumbnail(response) {
    var currentGPOid = currentGPOitem.id;
    //NOte the response sent to here is the readable stream form of response
    //not the object that contains the body

    //BY passing GPOitem we can get field values
    var filename = currentGPOitem.thumbnail;

    self.saveStreamToGridFS(response, currentGPOid, historyID,
        slashData, filename, 'thumbnail').catch(function(err) {
      defer.reject('Error updating Thumbnail to Grid FS : ' + err);
    }).done(function() {
      defer.resolve(slashData);
    });

    return true;
  };
};

DownloadGPOdata.prototype.saveStreamToGridFS = function(readableStream,id,
                                                        historyID,SlashData,
                                                        filename,binaryType) {
  var self = this;
  //This function returns a promise so we can know when it is done with
  //everything
  var gridDefer = self.Q.defer();

  //If they don't pass filename then set it equal to id
  if (!filename) filename = id;

  //By default save binaryID of slashData as "binaryID" but binaryID of say
  //thumbnail should be like thumbnailID
  if (!binaryType) binaryType = 'binary';

  //If gfs object hasn't been created yet then get now
  if (!self.gfs) self.gfs = GridFSstream(self.db, self.mongo);

  //Use gpo item id as name of file in grid fs
  var writestream = self.gfs.createWriteStream(
    {filename: filename,
      metadata: {id: id,type: binaryType}}
  );
  //When done writing need to resolve the promise
  writestream.on('close', function(file) {
    self.downloadLogs.log('File with id = ' + id + ' and file = ' +
      file.filename + ' written to GridFS');
    //Add the actual file id to SlashData
    SlashData[binaryType + 'ID'] = file._id;
    //Now update the DB. must pass defer so it can be resolved when done
    //updating
    self.updateModifiedGPOdataBinaryID(gridDefer,id,historyID,SlashData);

  });
  //Handle error due to writing
  writestream.on('error', function(err) {
    gridDefer.reject('Error writing stream to GridFS : ' + err);
  });
  //Now actually pipe response into gfs writestream
  readableStream.pipe(writestream);

  return gridDefer.promise;
};

//Seperate this from the Object->Text->GridFS flow of attempts for
//content-type LIKE text/ items
DownloadGPOdata.prototype.updateModifiedGPOdataBinaryID = function(gridDefer,
                                                                   id,
                                                                   historyID,
                                                                   SlashData) {
  //Note this.Q.all takes multiple promises and is done when all are done
  //It accepts a defer from calling function that it can reject or resolve
  //when done
  this.Q.all([
    this.Q(this.itemsCollection.update({id: id},
      {$set: {SlashData: SlashData}})),
    this.Q(this.historycollection.update({_id: historyID},
      {$set: {'doc.SlashData': SlashData}}))
  ])
    .catch(function(err) {
      //Don't reject the deferred because it will break the chain need to try
      //update with json as text instead of object
      //defer.reject("Error updating slash data for " + id + " : " + err);})
      gridDefer.reject('Error updating Slash Data Binary ID for ' + id +
        ' : ' + err);
    })
    .done(function() {
      gridDefer.resolve()
    });
};


DownloadGPOdata.prototype.updateModifiedGPOdataObjectLiteral = function(defer,
                                                                        id,
                                                                        historyID,
                                                                        SlashData) {
  var self = this;
  //Note this.Q.all takes multiple promises and is done when all are done
  self.Q.all([
    self.Q(self.itemsCollection.update({id: id},
      {$set: {SlashData: SlashData}})),
    self.Q(self.historycollection.update({_id: historyID},
      {$set: {'doc.SlashData': SlashData}}))
  ])
    .catch(function(err) {
      //Don't reject the deferred because it will break the chain need to try
      //update with json as text instead of object
      // defer.reject("Error updating slash data for " + id + " : " + err);})
      self.downloadLogs.log('Trying to save as Text, Error updating slash data as Object for ' + id + ' : ' + err);
      //If there is an error try to resolve it saving data as text instad
      //of JSON object
      //If error saving as text or binary
      return self.UpdateModifieGPOdataAsText(id,historyID,SlashData)
        .catch(function(err) {
          defer.reject(
            'Error forcing updating slash data forced to Grid FS : ' + err);
        });
    })
    .done(function() {
      // Self.downloadLogs.log('Done updating Modified Slash Data for ' + id);
      defer.resolve(SlashData)
    });
};

DownloadGPOdata.prototype.updateModifiedGPOdata = function(defer, id,
                                                           historyID,
                                                           SlashData) {
  //THis no longer save object literal as first choice anymore. Saves text as
  //first choice
  var self = this;

  return self.UpdateModifieGPOdataAsText(id,historyID,SlashData)
    .catch(function(err) {
      defer.reject('Error updating slash data forced to Grid FS : ' + err);
    })
    .done(function() {
      //Self.downloadLogs.log('Done updating Modified Slash Data for ' + id);
      defer.resolve(SlashData)
    });
};

//This is called after update crahsed probably because of dot in field name
DownloadGPOdata.prototype.UpdateModifieGPOdataAsText = function(id, historyID,
                                                                SlashData) {
  var self = this;
  //This has to return a promise so calling function will wait til everything
  //in here is done
  var textDefer = self.Q.defer();

  //Don't need to do this anymore aren't using .json which was actually json
  //literal object
  //  SlashData.text=JSON.stringify(SlashData.json);
  //  SlashData.json = null;
  self.Q.all([
    self.Q(this.itemsCollection.update({id: id},
      {$set: {SlashData: SlashData}})),
    self.Q(this.historycollection.update({_id: historyID},
      {$set: {'doc.SlashData': SlashData}}))
  ])
    .catch(function(err) {
      self.downloadLogs.log('Trying to save as Grid FS, Error updating slash data forced AS Text for ' + id + ' : ' + err);
      //Try to save a grid FS (should normally work for all size/type of data)
      var textStream = self.utilities.streamify(SlashData.text);
      SlashData.text = null;
      return self.saveStreamToGridFS(textStream, id, historyID,
        SlashData, id + '.txt').catch(function(err) {
          textDefer.reject(
            'Error forcing updating slash data forced to Grid FS : ' + err);
        });
    })
    .done(function() {
      // Self.downloadLogs.log('Done updating Modified Slash Data for ' + id);
      textDefer.resolve()
    });
  return textDefer.promise;
};

DownloadGPOdata.prototype.getGPOdataSync = function() {
  var self = this;
  return self.hr.promiseWhile(function() {
    return self.hr.saved.modifiedSlashDataGPOrow <= self.hr.saved.modifiedSlashDataGPOitems.length;
  }, self.getSelfInvokedFunction(self.getSingleGPOdata));
};

DownloadGPOdata.prototype.getGPOdataHybrid = function() {
  var self = this;
  return self.hr.promiseWhile(function() {
    return self.hr.saved.modifiedSlashDataGPOrow <= self.hr.saved.modifiedSlashDataGPOitems.length;
  }, self.getSelfInvokedFunction(self.getGPOdataAsync));
};

DownloadGPOdata.prototype.getGPOdataAsync = function() {
  var self = this;
  var async = require('async');

  var defer = this.Q.defer();

  //  Q.when(getSingleGPOdata,function () {self.downloadLogs.log('resolve');defer.resolve()});
  //  getSingleGPOdata(1).then(function () {self.downloadLogs.log('resolve');defer.resolve()});

  var GPOitems;
  if (self.AsyncRowLimit) {
    //Take slice form current row to async row limit
    GPOitems = self.hr.saved.modifiedSlashDataGPOitems
      .slice(self.hr.saved.modifiedSlashDataGPOrow - 1,
        self.hr.saved.modifiedSlashDataGPOrow - 1 + self.AsyncRowLimit);
  }else {
    GPOitems = self.hr.saved.modifiedSlashDataGPOitems;
  }

  //Need to get the value of modifiedSlashDataGPOrow when this function is called
  //because getSingleGPOdata changes it
  //THis is basically the modifiedSlashDataGPOrow when the async loop started
  var asyncStartModifiedGPOrow = self.hr.saved.modifiedSlashDataGPOrow;
  self.downloadLogs.log('Slash Data download from row ' +
    asyncStartModifiedGPOrow + ' to ' +
    (asyncStartModifiedGPOrow + GPOitems.length - 1));

  async.forEachOf(GPOitems, function(value, key, done) {
    //      Self.downloadLogs.log(key+this.hr.saved.modifiedSlashDataGPOrow)
    self.getSingleGPOdata(key + asyncStartModifiedGPOrow)
        .catch(function(err) {
          self.downloadLogs.error('Error in async.forEachOf while calling getSingleGPOdata in DownloadGPOdata.getGPOdataAsync:',err);
        })
        .done(function() {
          done();
          //          Self.downloadLogs.log('for loop success')
        });
  }
    , function(err) {
      if (err) self.downloadLogs.error('Error in async.forEachOf while looping over GPO data items in DownloadGPOdata.getGPOdataAsync:',err);
      //Resolve this promise
      //      self.downloadLogs.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything
  //is done until it runs process.exit in done.
  //chain was NOT waiting before and process exit was executing and data data
  //not being retrieved
  return defer.promise
};

DownloadGPOdata.prototype.removeLocalGPOitems = function() {
  var self = this;
  //Get the localGPOids from DB (Mongo) before we find use remoteGPOids to
  //remove IDs removed from remote (GPO)
  //Note the option to skip removing local GPO items because it speeds things
  //up. Usually use it on login.
  if (self.dontRemoveGPOitems) {
    return self.Q(true);
  }else {
    return self.getLocalGPOids()
      .then(self.getSelfInvokedFunction(self.removeLocalGPOitemsFromLocalGPOids));
  }
};

DownloadGPOdata.prototype.removeLocalGPOitemsFromLocalGPOids = function() {
  var self = this;
  //If not removing local gpo items (so we can get away with not downloading
  //all of them) just return

  var arrayExtended = require('array-extended');
  //  Find the difference of local and remote.
  // NOTE: arrayExtended.difference only keeps localGPOids that are not in
  //remoteGPOids, doesn't keep remoteGPOids that are not in localGPOids
  //(those don't exist locally so don't want to delete anyway)
  //need to get array of local GPO ids only instead of id,mod pair
  var removeIDs = arrayExtended
    .difference(self.hr.saved.localGPOids, self.hr.saved.remoteGPOids);

  self.downloadLogs.log('remoteGPOids GPO items count: ' +
    self.hr.saved.remoteGPOids.length);
  self.downloadLogs.log('localGPOids GPO items count: ' +
    self.hr.saved.localGPOids.length);
  self.downloadLogs.log('Locally Removed GPO items count: ' +
    removeIDs.length);

  if (removeIDs.length > 0) {
    //Put the removed ID's in history collection with null doc to represent
    //it was deleted on this data
    var backupDate = new Date();
    var historyRemoveGPOitems = removeIDs.map(function(id) {
      return {id: id,date: backupDate,doc: null}
    });

    return self.Q(this.itemsCollection.remove({id: {$in: removeIDs}}))
      .then(function() {
        return self.Q(self.historycollection.insert(historyRemoveGPOitems));
      });
//  Return self.Q(itemsCollection.remove({id:{$in:removeIDs}}));
  }else {
    return self.Q(true);
  }
};

DownloadGPOdata.prototype.getLocalMaxModifiedDates = function() {
  //If no local gpo items then need to get all. accomplished if max
  //modified date is <  min remote mod date
  //Assume 0 (equal to 1970) is early enough to get everything

  //Need to make a way to get MaxModifiedDate for each owner
  //Create a hash keyed to owner to get MaxModifiedDate
  var self = this;

  var query = {};
  if (Array.isArray(self.ownerIDs) && self.ownerIDs.length > 0) {
    query = {owner: {$in: self.ownerIDs}};
  }

  self.hr.saved.localMaxModifiedDates = {};
  self.hr.saved.localMinMaxModifiedDate = null;

  return self.Q.ninvoke(self.itemsCollection.col,'aggregate',
    [
      {$match: query },
      {$group: {
        _id: '$owner',
        modified:  { $max: '$modified' }
      }}
    ]).then(function(docs) {
      docs.forEach(function(doc) {
        self.hr.saved.localMaxModifiedDates[doc._id] = doc.modified;
        //If localMinMaxModifiedDate hasn't been initialized then set to first max mod date
        if (self.hr.saved.localMinMaxModifiedDate===null || doc.modified < self.hr.saved.localMinMaxModifiedDate) {
          //doc.modified shouldn't be falsey but if it is use 0
          self.hr.saved.localMinMaxModifiedDate = doc.modified || 0;
        }
      });
      //If localMinMaxModifiedDate is still null then make it 0
      if (! self.hr.saved.localMinMaxModifiedDate) {
        self.hr.saved.localMinMaxModifiedDate = 0;
      }
      self.downloadLogs.log('Min Last Modified Date: ' +
        new Date(self.hr.saved.localMinMaxModifiedDate));
      return self.hr.saved.localMaxModifiedDates;
    });
};

DownloadGPOdata.prototype.getSlashDataMaxModifiedDateItems = function() {
  //If no local gpo items then need to get all. accomplished if max
  //modified date is <  min remote mod date
  //Assume 0 (equal to 1970) is early enough to get everything
  var self = this;

  //Don't even have to do this if not getting slash data
  if (self.onlyGetMetaData) {return true};

  return self.getSlashDataMaxModifiedDate()
    .then(function(maxModifiedDate) {
      //need to get the thumbnail and modified
      return self.itemsCollection.find({modified: {$gt: maxModifiedDate}}, {fields:{id: 1, thumbnail: 1, modified: 1},sort:[['modified','asc'],['id','asc']]});
    })
    .then(function(docs) {
      //save the docs item info where modified greater than slash data max modified
      if (docs.length>0) console.log("last slash mod " + docs[docs.length-1].id);
      self.hr.saved.modifiedSlashDataGPOitems = docs;
      return docs;
    });

};

DownloadGPOdata.prototype.getSlashDataMaxModifiedDate = function() {
  //Find the max slash data modified date (which corresponds to item modified date when slash data last downloaded)

  //Don't need to get max for each owner because slash is not run at login
  var self = this;

  var query = {};

  self.hr.saved.localSlashDataMaxModifiedDate = 0;

  return self.Q.ninvoke(self.itemsCollection.col,'aggregate',
    [
      {$match: query },
      {$group: {
        _id: 1,
        modified:  { $max: '$SlashData.modified' }
      }}
    ]).then(function(docs) {
    docs.forEach(function(doc) {
      self.hr.saved.localSlashDataMaxModifiedDate = doc.modified || 0;
    });
    self.downloadLogs.log('Slash Data Max Last Modified Date: ' +
      new Date(self.hr.saved.localSlashDataMaxModifiedDate));
    return self.hr.saved.localSlashDataMaxModifiedDate;
  });
};

DownloadGPOdata.prototype.getLocalGPOids = function() {
  var self = this;
  //  Return self.Q(this.itemsCollection.find({}, {fields:{id:1,modified:1},sort:{modified:-1}}));

  var query = {};
  //Only check to remove items for ownersIDs that were provided.
  // (if not provided then check to remove all owner IDs)
  if (Array.isArray(self.ownerIDs) && self.ownerIDs.length > 0) {
    query = {owner: {$in: self.ownerIDs}};
  }

  return self.utilities.getArrayFromDB(self.itemsCollection, query, 'id')
    .then(this.getSelfInvokedFunction(this.handleLocalGPOidsPromise));
};

DownloadGPOdata.prototype.handleLocalGPOidsPromise = function(docs) {
  //Temporary slice for testing
  if (this.TotalRowLimit) {
    this.hr.saved.localGPOids = docs.slice(0,this.TotalRowLimit);
  }else {
    this.hr.saved.localGPOids = docs;
  }

  this.hr.saved.localGPOcount = this.hr.saved.localGPOids.length;

  return docs;
};

//**** Beginning of the auditing
//

DownloadGPOdata.prototype.getGPOaudit = function(modifiedGPOitems) {
  var useSyncAudit = false;
  if (this.AsyncAuditRowLimit === 0 || this.AsyncAuditRowLimit === 1) {
    useSyncAudit = true;
  }

  //Need this new object itemsContext since can't use this.hr.saved to save
  //row, count and item info
  //because multiple getGPOaudit running called by async getmetadata calls
  var itemsContext = {};
  itemsContext.row = 1;
  itemsContext.count = modifiedGPOitems.length;
  itemsContext.items = modifiedGPOitems;

  //String along aysn function calls to AGOL REST API
  var getGPOauditVersion = null;
  if (useSyncAudit) {
    this.downloadLogs.log('Perform Audit  using Sync');
    getGPOauditVersion = this.getGPOauditSync;
  } else {
    if (this.AsyncAuditRowLimit === null) {
      this.downloadLogs.log('Perform Audit using Full Async ');
      getGPOauditVersion = this.getGPOauditAsync;
    }else {
      this.downloadLogs.log('Perform Audit using Hybrid ');
      getGPOauditVersion = this.getGPOauditHybrid;
    }
  }

  //Call this reference to function needs to have the "this" set to
  //DownloadGPOdata using .call or else this=global scope in function
  return getGPOauditVersion.call(this,itemsContext);
};

DownloadGPOdata.prototype.getSingleGPOaudit = function(itemsContext,
                                                       auditGPOitem) {
  var self = this;
  //Have to have an audit class for each audit because they are going on
  //concurrently when async
  var audit = new this.AuditClass();

  //If async loop then have to pass the item
  //for sync don't pass but get from current row
  if (!auditGPOitem) {
    auditGPOitem = itemsContext.items[itemsContext.row - 1];
  }

  //Note: this not usd for pure async, for hybrid it only determines
  //item row at start of each aysnc foreach loop
  itemsContext.row += 1;

  audit.validate(auditGPOitem);

  return self.Q(this.itemsCollection.update({id: auditGPOitem.id},
    {$set: {AuditData: auditGPOitem.AuditData}}))
//This is convenient place to put this
//copy over the extensions that were wiped out but saved in another collection
    .then(function() {return self.getGPOitemExtensions (auditGPOitem.id);})
//    .then(function () {delete audit;return true})
    .then(function() {
      //Sometimes might not want to get owner folders since the 2 REST calls
      //take some time. Maybe want to just get Folder IDs in future
      //Don't so this here any more. folder are retrieved at the end
      if (self.dontGetOwnerFolders || 1==1) return;
//These were cases where item was deleted but still in search
//      if (self.dontGetOwnerFolders || auditGPOitem.id=="f0e3bb78eac74a12881ac3771d1b65f2" || auditGPOitem.id=="8b10a6ba02ca4f3ba616d757a223ca8e") return;
      return self.getLatestHistoryID(auditGPOitem.id)
      .then(function(historyID) {
          if (!historyID) {
            throw 'History ID not found for GPO ID = ' + auditGPOitem.id;
          }
          return historyID;
        })
        .then(function(historyID) {
          return self.getOwnerFolder(auditGPOitem.id, historyID);
        })
    })
    .catch(function(err) {
      self.downloadLogs.error(
        'Error updating Audit Data, Extensions Data, or Folder Data for ' +
        auditGPOitem.id + ' : ',err);
    })
};


DownloadGPOdata.prototype.getGPOauditSync = function(itemsContext) {
  var self = this;
  return self.hr.promiseWhile(function() {
    return itemsContext.row <= itemsContext.count;
  }, function() {
    return self.getSingleGPOaudit(itemsContext);
  });
};

DownloadGPOdata.prototype.getGPOauditHybrid = function(itemsContext) {
  var self = this;
  return self.hr.promiseWhile(function() {
    return itemsContext.row <= itemsContext.count;
  }, function() {
    return self.getGPOauditAsync(itemsContext);
  });
};

DownloadGPOdata.prototype.getGPOauditAsync = function(itemsContext) {
  var self = this;
  //ItemsContext is like this.hr.saved but just for this particular chunk of
  //modified metadata
  //this.hr.saved can not be used because it would be referenced by multiple
  //getAudit calls by async getMetaData
  var async = require('async');

  var defer = self.Q.defer();

  var GPOitems;
  if (self.AsyncAuditRowLimit) {
    //Take slice form current row to async row limit
    GPOitems = itemsContext.items
      .slice(itemsContext.row - 1,
        itemsContext.row - 1 + self.AsyncAuditRowLimit);
  }else {
    GPOitems = itemsContext.items;
  }

//  self.downloadLogs.log('Audit Data download from row ' + itemsContext.row + ' to ' + (itemsContext.row + GPOitems.length - 1));

  async.forEachOf(GPOitems, function(gpoItem, index, done) {
      self.getSingleGPOaudit(itemsContext,gpoItem)
        .catch(function(err) {
          self.downloadLogs.error('For Each Single GPO Audit Error :',err);
        })
        .done(function() {
          done();
          //          Self.downloadLogs.log('for loop success')
        });
    }
    , function(err) {
      if (err) self.downloadLogs.error('For Each GPO Audit Error :',err);
      //Resolve this promise
      //      self.downloadLogs.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything is
  //done until it runs process.exit in done.
  //chain was NOT waiting before and process exit was executing and data data
  //not being retrieved
  return defer.promise
};
//***End of audit stuff ***//


//This will get the stuff saved in GPOuserExtensions collection and add
//to GPOusers
DownloadGPOdata.prototype.getGPOitemExtensions = function(id) {
  var self = this;

  return self.Q(self.extensionsCollection.findOne({id: id}, {fields: {_id: 0,id: 0}}))
    .then(function(doc) {
      if (!doc) return null;
      return self.Q(self.itemsCollection.update({id: id},{$set: doc}));
    });
};

//Beginning of getting owner Folder after getting everything else
DownloadGPOdata.prototype.getAllOwnerFolders= function() {
  //Sometimes might not want to get owner folders since the 2 REST calls
  //take some time. Maybe want to just get Folder IDs in future
  if (this.dontGetOwnerFolders ) return;
//      if (self.dontGetOwnerFolders || auditGPOitem.id=="f0e3bb78eac74a12881ac3771d1b65f2" || auditGPOitem.id=="8b10a6ba02ca4f3ba616d757a223ca8e") return;

  var useSync = false;
  if (this.AsyncOwnerFolderRowLimit === 0 || this.AsyncOwnerFolderRowLimit === 1) {
    useSync = true;
  }

  //Looping over ALL of the ids that were downloaded
  var modifiedGPOids = this.hr.saved.modifiedGPOids;

  //Need this new object itemsContext since can't use this.hr.saved to save row, count and id info
  //because multiple getOwnerFolders running called by async getmetadata calls
  var itemsContext = {};
  itemsContext.row = 1;
  itemsContext.count = modifiedGPOids.length;
  itemsContext.ids = modifiedGPOids;

  //String along aysn function calls to AGOL REST API
  var getOwnerFoldersVersion = null;
  if (useSync) {
    this.downloadLogs.log('Perform getOwnerFolders using Sync');
    getOwnerFoldersVersion = this.getOwnerFoldersSync;
  } else {
    if (this.AsyncOwnerFolderRowLimit === null) {
      this.downloadLogs.log('Perform getOwnerFolders using Full Async ');
      getOwnerFoldersVersion = this.getOwnerFoldersAsync;
    }else {
      this.downloadLogs.log('Perform getOwnerFolders using Hybrid ');
      getOwnerFoldersVersion = this.getOwnerFoldersHybrid;
    }
  }

  //Call this reference to function needs to have the "this" set to
  //DownloadGPOdata using .call or else this=global scope in function
  return getOwnerFoldersVersion.call(this,itemsContext);
};

DownloadGPOdata.prototype.getSingleOwnerFolder = function(itemsContext,id) {
  var self = this;

  //If async loop then have to pass the item
  //for sync don't pass but get from current row
  if (!id) {
    id = itemsContext.ids[itemsContext.row - 1];
  }

  //Note: this not usd for pure async, for hybrid it only determines
  //item row at start of each aysnc foreach loop
  itemsContext.row += 1;

//These were cases where item was deleted but still in search
  return self.getLatestHistoryID(id)
    .then(function(historyID) {
      if (!historyID) {
        throw 'History ID not found for GPO ID = ' + id;
      }
      return historyID;
    })
    .then(function(historyID) {
      return self.getOwnerFolder(id, historyID);
    })
    .catch(function(err) {
      self.downloadLogs.error(
        'Error updating Owner Folder for ' + id + ' : ',err);
    });
};


DownloadGPOdata.prototype.getOwnerFoldersSync = function(itemsContext) {
  var self = this;
  return self.hr.promiseWhile(function() {
    return itemsContext.row <= itemsContext.count;
  }, function() {
    return self.getSingleOwnerFolder(itemsContext);
  });
};

DownloadGPOdata.prototype.getOwnerFoldersHybrid = function(itemsContext) {
  var self = this;
  return self.hr.promiseWhile(function() {
    return itemsContext.row <= itemsContext.count;
  }, function() {
    return self.getOwnerFoldersAsync(itemsContext);
  });
};

DownloadGPOdata.prototype.getOwnerFoldersAsync = function(itemsContext) {
  var self = this;
  //ItemsContext is like this.hr.saved but just for this particular chunk of
  //modified metadata
  //this.hr.saved can not be used because it would be referenced by multiple
  //getAudit calls by async getMetaData
  var async = require('async');

  var defer = self.Q.defer();

  var GPOids;
  if (self.AsyncOwnerFolderRowLimit) {
    //Take slice form current row to async row limit
    GPOids = itemsContext.ids
      .slice(itemsContext.row - 1,
        itemsContext.row - 1 + self.AsyncOwnerFolderRowLimit);
  }else {
    GPOids = itemsContext.items;
  }

//  self.downloadLogs.log('Audit Data download from row ' + itemsContext.row + ' to ' + (itemsContext.row + GPOitems.length - 1));
  self.downloadLogs.log('Owner Folder download from row ' + itemsContext.row + ' to ' + (itemsContext.row + GPOids.length - 1));

  async.forEachOf(GPOids, function(gpoID, index, done) {
      self.getSingleOwnerFolder(itemsContext,gpoID)
        .catch(function(err) {
          self.downloadLogs.error('For Each Single Owner Folder Error :', err);
        })
        .done(function() {
          done();
          //          Self.downloadLogs.log('for loop success')
        });
    }
    , function(err) {
      if (err) self.downloadLogs.error('For Each Owner Folder Error :', err);
      //Resolve this promise
      //      self.downloadLogs.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything is
  //done until it runs process.exit in done.
  //chain was NOT waiting before and process exit was executing and data data
  //not being retrieved
  return defer.promise
};

DownloadGPOdata.prototype.getOwnerFolder = function(id,historyID) {
  var self = this;

  return self.Q.all([
      self.getOwnerFolderID(id),
      self.getOwnerFolderNames(self.hr.saved.modifiedItemOwners[id]),
    ])
    .spread(function(folderID,folderNames) {
      var ownerFolder = {id: folderID,title: folderNames[folderID]};
      return self.Q.all([
        self.Q(self.itemsCollection.update({id: id},
          {$set: {ownerFolder: ownerFolder}})),
        self.Q(self.historycollection.update({_id: historyID},
          {$set: {'doc.ownerFolder': ownerFolder}})),
      ]);
    });
};

DownloadGPOdata.prototype.getOwnerFolderID = function(id) {
  //  Return "";
  var self = this;
  var itemURL = this.portal + '/sharing/rest/content/items/' + id;

  var qs = {token: self.hr.saved.token, f: 'json'};

  //Pass parameters via form attribute
  var requestPars = {method: 'get', url: itemURL, qs: qs};

  return this.hr.callAGOL(requestPars)
    .then(function (body) {
      //remove this bad item from mongo. The ESRI search has bug returning old items that no longer exist
      if (body.error && body.error.code == 400) {
        self.downloadLogs.error('Removing item with id = ' + id + ' from local Mongo. This item no longer exists but ESRI has a bug which still returns it via their search.');
        return self.Q(self.itemsCollection.remove({id: id})).then(function () {
          return body;
        });
      } else {
        return body;
      }
    })
    .then(function (body) {
      //      Var body = JSON.parse(bodyJSON);
      if (body.error) {
        self.downloadLogs.error(body.error);
        throw(new Error('Error getting owner Folder ID: ' +
          JSON.stringify(body.error)));
      }
      //      Console.log(body.ownerFolder);
      return body.ownerFolder;
    })
    .catch(function (err) {
      self.downloadLogs.error('Error while getting getting Owner Folder ID for id = ' + id + ':', err);
    });
};

//Note have to get the folder name via another endpoint if we don't have
//the id->name map
DownloadGPOdata.prototype.getOwnerFolderNames = function(owner) {
  //  Return {};
  var self = this;
  //Don't have to hit API to get folder names for this owner if it was
  //already done before
  if (self.folderNames[owner]) return self.folderNames[owner];

  var itemURL = this.portal + '/sharing/rest/content/users/' + owner ;

  //Note use num=1 so we only get 1 item. num=0 doesn't work. could use
  //start=100000000000 but probably not necessary
  var qs = {token: self.hr.saved.token,f: 'json',num: 1};

  //Pass parameters via form attribute
  var requestPars = {method: 'get', url: itemURL, qs: qs };

  return this.hr.callAGOL(requestPars)
    .then(function(body) {
      //      Var body = JSON.parse(bodyJSON);
      if (body.error) {
        console.error(body.error);
        throw(new Error('Error getting owner Folder Names : ' +
          JSON.stringify(body.error)));
      }
      //Loop through folders for this owner and add to map
      self.folderNames[owner] = {};
      body.folders.forEach(function(folder) {
        self.folderNames[owner][folder.id] = folder.title;
      });
      //      Console.log('folder names ' );
      //      console.log( self.folderNames[owner]);
      return self.folderNames[owner];
    })
    .catch(function (err) {console.error("Onwer Folder Names get error " + err)});

};

//***End of owner folder stuff ***//

module.exports = DownloadGPOdata;
