var DownloadGPOusers =  function(){
//set refreshOwnerIDsAdminUsers if you only want to update limited set of admin users OwnerIDs. ie. In case you want to download all modified users on admin login
//If it is kept as empty array then update all Admin's OwnerIDs
  this.refreshOwnerIDsAdminUsers = [];
//This can be run to only update a list of ownerIDs if given. null means get all ownerIDs.
  this.requestItemCount = 100;

  this.useSync=false;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
  this.AsyncRequestLimit=10;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
  this.AsyncRowLimit=25;
//When finding Admin OwnerIDs asynchronously
//set to null to run all at one time
  this.AsyncAdminRowLimit = 100;

//To only get metadata set to true, usually set to false
  this.onlyGetUsers = false;
//This will make execution must faster since we don not have to download all remote items and only need to download modified
  this.dontRemoveGPOusers= false;
//This is just for testing if we don't want all docs, usually set to null
  this.TotalRowLimit=null;
//If token is already available then set token on object. Don't need to request and download another one.
  this.token = null;
//Otherwise if no token then need to set credentials
//Can use appLogin with secret using oauth/token endpoint
  this.appID = null;
  this.appSecret = null;
  this.expiration = null;
//or can use userLogin using getToken endpoint
  this.username=null;
  this.password=null;
//Need to set the portal
  this.portal=null;
//Can optionally set OrgID if you know it otherwise have to find it for the user logged in
  this.orgID=null;
//set the mongoDB url
  this.mongoDBurl=null;

  this.request = require('request');
  this.Q = require('q');

  this.appRoot=require('app-root-path');
  this.utilities=require(this.appRoot + '/shared/utilities');
  this.hrClass = require(this.appRoot + '/shared/HandleGPOresponses');
  this.hr = new this.hrClass();

  this.mongo = require('mongodb');
  this.MonkClass = require('monk');

  this.monk = null;

  this.usersCollection= null;
  this.authgroupsCollection = null;
  this.ownerIDsCollection = null;

//Class for finding OwnerIDs of Admins
  this.UpdateAuthGroupsAndOwnerIDsClass = require(this.appRoot + '/shared/UpdateAuthGroupsAndOwnerIDs');
};

DownloadGPOusers.prototype.download = function () {
  console.log("\n START RUNNING DOWNLOAD \n");
  var self = this;
  if (! this.monk) this.monk = this.MonkClass(this.mongoDBurl);
  if (! this.usersCollection) this.usersCollection= this.monk.get('GPOusers');
  if (! this.ownerIDsCollection) this.ownerIDsCollection = this.monk.get('GPOownerIDs');
//  if (! this.authgroupsCollection) this.authgroupsCollection = this.monk.get('GPOauthGroups');
//Note I going to get the available authGroups from config file now so pass path to file. Simpler to maintain
  if (! this.authgroupsCollection) this.authgroupsCollection = this.appRoot + '/config/authGroups.js';

//hr.save is where we store the output from REST calls like token and OrgID so it can be used by handlers
  this.hr.saved.requestStart=1;
//for async download of items need to have rows counting
  this.hr.saved.remoteGPOrow=1;
//for hybrid need to have AGOL call counting
//each call gets number of rows equal to requestItemCount
  this.hr.saved.currentRequest=1;
//modifiedGPOrow is needed when processing modified items
  this.hr.saved.modifiedGPOrow=1;

//Place to store ALL the new GPO id's taken from the website with modified data
//Used to find which items have been deleted
  this.hr.saved.remoteGPOids = [];
//store only the modified/created gpo ids to know which SlashData to download
  this.hr.saved.modifiedGPOids = [];

  if (this.AsyncRequestLimit===0 || this.AsyncRequestLimit===1)  this.useSync=true;
  if (this.AsyncRowLimit===0 || this.AsyncRowLimit===1)  this.useSync=true;

//String along aysn function calls to AGOL REST API
  var getGPOdata=null;
  var getGPOitems=null;
  if (this.useSync) {
    console.log('Getting Users and Groups using Sync');
    getGPOitems=this.getGPOitemsSync;
    getGPOdata = this.getGPOdataSync;
  } else {
    if(this.AsyncRequestLimit===null){
      console.log('Getting Users using Full Async ');
      getGPOitems=this.getGPOitemsAsync;
    }else {
      console.log('Getting Users using Hybrid ');
      getGPOitems=this.getGPOitemsHybrid;
    }
    if(this.AsyncRowLimit===null){
      console.log('Getting Groups using Full Async ');
      getGPOdata=this.getGPOdataAsync;
    }else {
      console.log('Getting Groups using Hybrid ');
      getGPOdata=this.getGPOdataHybrid;
    }
  }

//Make instance of class that update Auth Groups and Find OwnerIDs
//Note: We only need one instance since class is not storing data other than avaialble auth groups that are shared by all
//Have to update the AuthGroups as Users and Groups are loaded
//Then after all Users and Groups are loaded can find Onwer IDs for Admins
  self.updateAuthGroupsAndOwnerIDs = new this.UpdateAuthGroupsAndOwnerIDsClass(this.usersCollection,this.ownerIDsCollection,this.authgroupsCollection);

//If only want meta data this is just a dummy pass through function
  if (this.onlyGetUsers) getGPOdata = function () {return true};

//Note getting metadata items and slashdata and removing dropped items unless set not to above
//Now run the promise chain using desired getGPOitems/getGPOdata (sync vs async vs hybrid)

  return self.getToken()
//For testing simultaneous log ins
//    .delay(30000)
    .then(self.getSelfInvokedFunction(self.getOrgId))
    .then(self.getSelfInvokedFunction(self.getLocalGPOids))
    .then(self.getSelfInvokedFunction(getGPOitems))
    .then(self.getSelfInvokedFunction(getGPOdata))
    .then(self.getSelfInvokedFunction(self.removeLocalGPOitems))
    .then(self.getSelfInvokedFunction(self.getOwnerIDs))
//just for testing so I don't have to keeping removing
//    .then(function () {return self.Q(self.usersCollection.remove({}));})
    .catch(function (err) {
      console.error('Error received when downloading GPO users:', err.stack);
    });
};

//Have to do this because when the function in .then is called it is called from global scope
DownloadGPOusers.prototype.getSelfInvokedFunction = function (f) {
  var self=this;
  return function (x) {
    return f.call(self,x);
  }
};


DownloadGPOusers.prototype.getToken = function () {
  console.log("Get Token");
  if (this.token) {
    this.hr.saved.token = this.token;
    return this.token;
  }

  var tokenURL=null;
  var parameters=null;
  var tokenFieldName=null;
  if (this.appID && this.appSecret) {
    tokenURL = this.portal + '/sharing/oauth2/token?';
    parameters = {
      'client_id': this.appID,
      'client_secret': this.appSecret,
      'grant_type': 'client_credentials',
      'expiration': this.expiration
    };
    tokenFieldName='access_token';
  }else {
    tokenURL = this.portal + '/sharing/rest/generateToken?';
    parameters = {
      'username' : this.username,
      'password' : this.password,
      'client' : 'referer',
      'referer': this.portal,
      'expiration': this.expiration,
      'f' : 'json'};
    tokenFieldName='token';
  }
//Pass parameters via form attribute
  var requestPars = {method:'post', url:tokenURL, form:parameters };

  var keyMap = {};
  keyMap[tokenFieldName] = 'token';
  return this.hr.callAGOL(requestPars,keyMap);
};

DownloadGPOusers.prototype.getOrgId = function () {
  if (this.orgID) {
    this.hr.saved.orgID = this.orgID;
    return this.orgID;
  }

  var url = this.portal + '/sharing/rest/portals/self';

  var parameters = {'token' : this.hr.saved.token,'f' : 'json'};
//Pass parameters via form attribute
  var requestPars = {method:'get', url:url, qs:parameters };

  return this.hr.callAGOL(requestPars,{'id':'orgID'});
};

//routines for gettting all the items metadata from AGOL (Have to do this so we know what items to delete from working local copy)
DownloadGPOusers.prototype.getGPOitemsChunk = function (requestStart,HandleGPOitemsResponse) {
  if (! requestStart) {
    requestStart=this.hr.saved.requestStart;
  }

  var url= this.portal + '/sharing/rest/community/users';

  var query = 'orgid:' + this.hr.saved.orgID;

//If not removing local gpo items that have been removed from AGOL then only need to download modified items
  if (this.dontRemoveGPOusers) {
//have to pad modified ms from 1970
    var now = (new Date()).getTime();
    query += ' AND modified:[' + this.padNumber(this.hr.saved.localMaxModifiedDate) + ' TO ' + this.padNumber(now) + ']';

  }
  var parameters = {'q':query,'token' : this.hr.saved.token,'f' : 'json','start':requestStart,'num':this.requestItemCount };

  var requestPars = {method:'get', url:url, qs:parameters };
  //  console.log(parameters);

  if (! HandleGPOitemsResponse) {
    if (this.useSync) {
  //      console.log('HandleGPOitemsResponseSync');
      HandleGPOitemsResponse = this.HandleGPOitemsResponseSync;
    } else if (this.AsyncRequestLimit === null) {
  //      console.log('HandleGPOitemsResponseAsync');
      HandleGPOitemsResponse = this.HandleGPOitemsResponseAsync;
    } else {
  //      console.log('HandleGPOitemsResponseHybrid');
      HandleGPOitemsResponse = this.HandleGPOitemsResponseAsync;
    }
  }
  return this.hr.callAGOL(requestPars).then(this.getSelfInvokedFunction(HandleGPOitemsResponse));
};

DownloadGPOusers.prototype.padNumber = function (num, size) {
  if (! size) size=19 //This is for AGOL modified date
  var s = num+"";
  while (s.length < size) s = "0" + s;
  return s;
};

DownloadGPOusers.prototype.getGPOitemsSync = function () {
  var self = this;
  var whileCondition=null;
  if (self.TotalRowLimit) {
    whileCondition=function() {return self.hr.saved.requestStart<=self.TotalRowLimit;};
  }else {
    whileCondition=function() {return self.hr.saved.requestStart>0;};
  }
  return self.hr.promiseWhile(whileCondition,  self.getSelfInvokedFunction(self.getGPOitemsChunk));
};

DownloadGPOusers.prototype.HandleGPOitemsResponseSync = function (body) {
  console.log('Sync ' + this.hr.saved.requestStart + ' to ' + (this.hr.saved.requestStart + body.results.length-1));
  this.hr.saved.requestStart = body.nextStart;

  this.storeModifiedDocs(body);

  return body;
//  return this.Q(this.gpoitemcollection.insert(body.results));
};

DownloadGPOusers.prototype.HandleGPOitemsResponseAsync = function (body) {
  if ('error' in body) {
    console.error("Error getting GPO users: " + body.error.message)
    return true;
  }
  console.log('request Start ' + (body.start ) + ' to ' + (body.start + body.results.length -1) + ' (users retrieved: ' +
    (this.hr.saved.remoteGPOrow + body.results.length-1) + ')');
//next start is not neccessarily found in order so use remoteGPOrow to konw how far along
  this.hr.saved.remoteGPOrow += body.results.length;
  this.hr.saved.currentRequest += 1;

  if (this.hr.saved.remoteGPOcount>0 && body.results.length===0) {
//This is catatrosphic error that should never happen if remote GPO items exist.
// If this happens then need to make sure hybrid loop will exit and resolve promise.
//Should probably email this to admin
    console.error("Catastrophic Error. No body results probably because AsyncRequestLimit set too high.");
    this.hr.saved.remoteGPOrow=this.hr.saved.remoteGPOcount+1;
    return false;
  }

//storeModifiedDocs returns a promise that is done when mod docs are inserted
  return this.storeModifiedDocs(body);
};

//store only the modified GPO items but keep all of the ID's for handling deleted GPO items
DownloadGPOusers.prototype.storeModifiedDocs = function (body) {
  var self = this;
//Note I am going to insert into database each time this is called but store Mod IDs so that Group Data can be downloaded later
//store all the remote usernames
  var remoteGPOids = body.results.map(function(doc) {return doc.username});
  self.hr.saved.remoteGPOids =self.hr.saved.remoteGPOids .concat(remoteGPOids)
//only the modified/created gpo items more recent than local will be upserted
//add empty array group field in here in case it doesn't get added later just
//also isAdmin field and empty array ownerIDs field that will be dealt with later with another script

//Don't have to keep all user fields I guess
  var modifiedGPOitems = body.results.map(function(doc) {
    return self.utilities.sliceObject(doc, ['username', 'fullName', 'modified', 'created'])
  });

  modifiedGPOitems = modifiedGPOitems.filter(function(doc) {
  doc.groups=[];
  doc.authGroups=[];
  doc.isAdmin=false;
  return doc.modified>self.hr.saved.localMaxModifiedDate});

//NOt get array of only the modified ID's because we will be looping over all id's later to get Slash Data but don't want to keep all GPO items in memory
  var modifiedGPOids = modifiedGPOitems.map(function(doc) {return doc.username || ''}); //Don't want undefined or null list of usernames because if username not on doc then remove( {username:{$in:[,,,,,]}} ) will remove all

  self.hr.saved.modifiedGPOids =self.hr.saved.modifiedGPOids.concat(modifiedGPOids);

  self.hr.saved.modifiedGPOcount = self.hr.saved.modifiedGPOids.length;

  console.log("Remote GPO user count " + self.hr.saved.remoteGPOids.length );
  console.log("Modified GPO user count " + self.hr.saved.modifiedGPOids.length );

//This returns a promise which is resolved when database records are inserted
  return self.saveModifiedGPOitems(modifiedGPOids,modifiedGPOitems);
};

DownloadGPOusers.prototype.saveModifiedGPOitems = function (modifiedGPOids,modifiedGPOitems) {
  var self = this;

  if (modifiedGPOitems.length > 0) {
    return self.Q(this.usersCollection.remove( {username:{$in:modifiedGPOids}} ))
      .then(function () {return self.Q(self.usersCollection.insert(modifiedGPOitems))})
  }else {
    return self.Q(true);
  }
};


DownloadGPOusers.prototype.getGPOitemsHybrid = function () {
  var self = this;
  return self.getRequestStartArray()
    .then(self.getSelfInvokedFunction(self.HandleGPOitemsResponseAsync))
    .then(self.getSelfInvokedFunction(self.getGPOitemsHybridFromStartArray));
};

DownloadGPOusers.prototype.getGPOitemsHybridFromStartArray = function () {
  var self = this;
  return self.hr.promiseWhile(function() {return self.hr.saved.remoteGPOrow<=self.hr.saved.remoteGPOcount;}, self.getSelfInvokedFunction
  (self.getGPOitemsAsyncFromStartArray));
};

DownloadGPOusers.prototype.getGPOitemsAsync = function () {
  var self = this;
//Have to first get the StartArray to use in async for each
//This means an initial AGOL call to get "total" items count in AGOL
//So subsequent calls will be Async for each
  return self.getRequestStartArray()
    .then(self.getSelfInvokedFunction(self.HandleGPOitemsResponseAsync))
    .then(self.getSelfInvokedFunction(self.getGPOitemsAsyncFromStartArray));
};

DownloadGPOusers.prototype.getGPOitemsAsyncFromStartArray = function () {
  var self = this;
  var async = require('async');

  var defer = this.Q.defer();

  var requestStartArray;
//  console.log('this.hr.saved.currentRequest ' + this.hr.saved.currentRequest)
  if (self.AsyncRequestLimit) {
//take slice form current row to async row limit
    requestStartArray= self.hr.saved.requestStartArray.slice(self.hr.saved.currentRequest-1,self.hr.saved.currentRequest-
      1+self.AsyncRequestLimit);
  }else {
    requestStartArray= self.hr.saved.requestStartArray.slice(self.hr.saved.currentRequest-1);
  }

  console.log(this.hr.saved.remoteGPOrow + ' ' + requestStartArray.length);

  if (this.hr.saved.remoteGPOcount>0 && requestStartArray.length===0) {
//This is catatrosphic error that should never happen if remote GPO items exist.\
// If this happens then need to make sure hybrid loop will exit and resolve promise.
//Should probably email this to admin
      console.error("Catastrophic Error. No start array probably because AsyncRequestLimit set too high.");
    self.hr.saved.remoteGPOrow=self.hr.saved.remoteGPOcount+1;
    defer.resolve();
  }

  async.forEachOf(requestStartArray, function (requestStart, index, done) {
//      console.log(key+this.hr.saved.modifiedGPOrow)
      self.getGPOitemsChunk(requestStart)
        .then(function () {
//                console.log(String(key+1) + 'done');
          done();})
        .catch(function(err) {
          console.error('async for each gpo user chunk Error received:', err);
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
//chain was NOT waiting before and process exit was executing and slash data not being retrieved
  return defer.promise
};

DownloadGPOusers.prototype.getRequestStartArray = function () {
  return this.getGPOitemsChunk(1,this.handleGetRequestStartArray)
};

DownloadGPOusers.prototype.handleGetRequestStartArray = function (body) {
  //find the requestStart of each call
  this.hr.saved.requestStartArray = [];
//  console.log(body);

  this.hr.saved.remoteGPOcount = body.total;
  console.log("Remote GPO user count " + this.hr.saved.remoteGPOcount);
  if (this.TotalRowLimit) this.hr.saved.remoteGPOcount =this.TotalRowLimit;
  for (var i = 1; i <= this.hr.saved.remoteGPOcount; i=i+this.requestItemCount) {
    this.hr.saved.requestStartArray.push(i);
  }

  return body;
};

//Endo of routine that get all new users

//Routine to get each user's group data

DownloadGPOusers.prototype.getSingleGPOdata = function (modifiedGPOrow) {
  var self = this;

//if async loop then have to pass the row
  if (! modifiedGPOrow) {
    modifiedGPOrow=self.hr.saved.modifiedGPOrow;
  }

  var currentGPOid = self.hr.saved.modifiedGPOids[modifiedGPOrow-1];

  var url= self.portal + '/sharing/rest/community/users/' + currentGPOid ;

  var parameters = {token: self.hr.saved.token,f: 'json'};
//Pass parameters via form attribute

  var requestPars = {method:'get', url:url, qs:parameters };

  return self.hr.callAGOL(requestPars).then(self.getSelfInvokedFunction(self.HandleGPOgroups));
};

DownloadGPOusers.prototype.HandleGPOgroups = function (body) {
  var self=this;

//The body of response is AGOL user object
  var user = body;

  self.hr.saved.modifiedGPOrow +=1;

//This class will update all the role,isAdmin,groups and authGroups
  return self.updateAuthGroupsAndOwnerIDs.updateAuthGroups(user);
};


DownloadGPOusers.prototype.getGPOdataSync = function (GPOids) {
  var self = this;
  return self.hr.promiseWhile(function() {return self.hr.saved.modifiedGPOrow<=self.hr.saved.modifiedGPOcount;}, self.getSelfInvokedFunction
  (self.getSingleGPOdata));
};

DownloadGPOusers.prototype.getGPOdataHybrid = function () {
  var self = this;
  return self.hr.promiseWhile(function() {return self.hr.saved.modifiedGPOrow<=self.hr.saved.modifiedGPOcount;}, self.getSelfInvokedFunction
  (self.getGPOdataAsync));
};

DownloadGPOusers.prototype.getGPOdataAsync = function () {
  var self = this;
  var async = require('async');

  var defer = this.Q.defer();

  var GPOids;
  if (self.AsyncRowLimit) {
//take slice form current row to async row limit
    GPOids= self.hr.saved.modifiedGPOids.slice(self.hr.saved.modifiedGPOrow-1,self.hr.saved.modifiedGPOrow-1+self.AsyncRowLimit);
  }else {
    GPOids= self.hr.saved.modifiedGPOids;
  }

  //need to get the value of modifiedGPOrow when this function is called because getSingleGPOdata changes it
  //THis is basically the modifiedGPOrow when the async loop started
  var asyncStartModifiedGPOrow = self.hr.saved.modifiedGPOrow;
  console.log("User Groups download from row " + asyncStartModifiedGPOrow + " to " + (asyncStartModifiedGPOrow + GPOids.length -1));

  async.forEachOf(GPOids, function (value, key, done) {
//      console.log(key+this.hr.saved.modifiedGPOrow)
      self.getSingleGPOdata(key+asyncStartModifiedGPOrow)
        .catch(function(err) {
          console.error('for each single gpo user groups error :', err.stack);
        })
        .done(function() {
          done();
//          console.log('for loop success')
        });
    }
    , function (err) {
      if (err) console.error('for each error :' + err.stack);
//resolve this promise
//      console.log('resolve')
      defer.resolve();
    });

//I have to return a promise here for so that chain waits until everything is done until it runs process.exit in done.
//chain was NOT waiting before and process exit was executing and data data not being retrieved
  return defer.promise
};

DownloadGPOusers.prototype.removeLocalGPOitems = function () {
  var self = this;
//if not removing local gpo items (so we can get away with not downloading all of them) just return
  if (self.dontRemoveGPOusers) return this.Q(true);

  var arrayExtended = require('array-extended');
//  find the difference of local and remote. This need to be removed
//need to get array of local GPO ids only instead of id,mod pair
  var localGPOids= self.hr.saved.localGPOids.map(function(doc) {return doc.username});
  var removeIDs = arrayExtended.difference(localGPOids, self.hr.saved.remoteGPOids);

  console.log("Locally Removed GPO users count: " + removeIDs.length );

  if (removeIDs.length > 0) {
    return self.Q(this.usersCollection.remove({id:{$in:removeIDs}}));
//  return self.Q(usersCollection.remove({id:{$in:removeIDs}}));
  }else {
    return self.Q(true);
  }
};

DownloadGPOusers.prototype.getLocalGPOids = function () {
  return this.Q(this.usersCollection.find({}, {fields:{username:1,modified:1},sort:{modified:-1}}))
    .then(this.getSelfInvokedFunction(this.handleLocalGPOidsPromise));
};

DownloadGPOusers.prototype.handleLocalGPOidsPromise = function (docs) {
//  var e = data[0];

//temporary slice for testing
  if (this.TotalRowLimit) docs = docs.slice(0,this.TotalRowLimit);

  this.hr.saved.localGPOids = docs;
  this.hr.saved.localGPOcount = docs.length;
//get the max modified date in loc
  if (docs.length>0) {
    this.hr.saved.localMaxModifiedDate = docs[0].modified;
  }else {
//if no local gpo items then need to get all. accomplished if max modified date is <  min remote mod date
//Assume 0 (equal to 1970) is early enough to get everything
    this.hr.saved.localMaxModifiedDate = 0;
  }

  console.log("max Modified Date: " + new Date(this.hr.saved.localMaxModifiedDate));

  return docs;
};

//**** Beginning of the getting OwnerIDs
//

DownloadGPOusers.prototype.getOwnerIDs = function () {
  var self = this;
  var useSyncAdmin=false;
  if (this.AsyncAdminRowLimit===0 || this.AsyncAdminRowLimit===1)  useSyncAdmin=true;

//String along aysn function calls
  var getOwnerIDsVersion=null;
  if (useSyncAdmin) {
    console.log('Find Admin OwnerIDs using Sync');
    getOwnerIDsVersion = this.getOwnerIDsSync;
  } else {
    if(this.AsyncAuditRowLimit===null){
      console.log('Find Admin OwnerIDs using Full Async ');
      getOwnerIDsVersion =this.getOwnerIDsASync;
    }else {
      console.log('Find Admin OwnerIDs using Hybrid ');
      getOwnerIDsVersion =this.getOwnerIDsHybrid;
    }
  }

//First get the admin users that we will be finding OwnerIDs for. Sometimes it isn't all of them.
  return self.getAdminUsersAuthGroups()
//Call this reference to function needs to have the "this" set to DownloadGPOdata using .call or else this=global scope in function
    .then(function (adminUsersAuthGroups) {
// this context is helpful for looping over the admin users
      var itemsContext = {};
      itemsContext.row = 1;
      itemsContext.count = adminUsersAuthGroups.length;
      itemsContext.items = adminUsersAuthGroups;
      return getOwnerIDsVersion.call(self,itemsContext);})
};

DownloadGPOusers.prototype.getAdminUsersAuthGroups = function () {
  var self =this;

  var AdminUsersAuthGroups=null;
//If refreshOwnerIDs is passed then remove just those auth Groups for these Usernames so they will be refreshed
  if (self.refreshOwnerIDsAdminUsers && self.refreshOwnerIDsAdminUsers.length>0) {
    return self.utilities.getArrayFromDB(self.usersCollection,{username:{$in:self.refreshOwnerIDsAdminUsers}},"authGroups")
      .then(function (authGroups) {
        AdminUsersAuthGroups=authGroups;
//since I authGroups should be sorted there should not be different sequences of same authgroups
// Could have looped over individual authgroup and use $all but this should work
        return self.Q(self.ownerIDsCollection.remove({authGroups:{$in:authGroups}}));
      })
      .then(function () {return AdminUsersAuthGroups;})
  }else {
//Need to get all the AdminUsers to test for OwnerIDs (could have got all authGroups instead of checking if each authGroups combo already ahs OwnerIDs)
//NOTE: remove everything from OwnerIDS so it will all be refreshed
    return self.Q(self.ownerIDsCollection.remove({}))
      .then(function () {return self.getAllDistinctAdminUsersAuthGroups()})
  }
};

DownloadGPOusers.prototype.getAllDistinctAdminUsersAuthGroups = function () {
  var self =this;
  var query = {"authGroups":{$ne:[]},"isAdmin":true};

  return self.utilities.getDistinctArrayFromDB(self.usersCollection,query,"authGroups");
};



DownloadGPOusers.prototype.getSingleOwnerIDs = function (itemsContext,userAuthGroups) {
  //if async loop then have to pass the item
  //for sync don't pass but get from current row
  if (! userAuthGroups) {
    userAuthGroups = itemsContext.items[itemsContext.row-1];
  }

  //Note: this not usd for pure async, for hybrid it only determines modifiedGPOrow at start of each aysnc foreach loop
  itemsContext.row += 1;

//  console.log("itemsContext.row  " + itemsContext.row );
//Returns a Q promise when done with process
  return this.updateAuthGroupsAndOwnerIDs.getOwnerIDsInAuthGroups(userAuthGroups);
};


DownloadGPOusers.prototype.getOwnerIDsSync = function (itemsContext) {
  var self = this;
  return self.hr.promiseWhile(function() {return itemsContext.row<=itemsContext.count;}, function () {return self.getSingleOwnerIDs(itemsContext);});
};

DownloadGPOusers.prototype.getOwnerIDsHybrid = function (itemsContext) {
  var self = this;
  console.log(itemsContext.row,itemsContext.count);
  return self.hr.promiseWhile(function() {return itemsContext.row<=itemsContext.count;}, function () {return self.getOwnerIDsAsync(itemsContext);});
};

DownloadGPOusers.prototype.getOwnerIDsAsync = function (itemsContext) {
  var self = this;
  var async = require('async');

  var defer = self.Q.defer();

  var adminUsersAuthGroups;
  if (self.AsyncAdminRowLimit) {
//take slice form current row to async row limit
    adminUsersAuthGroups = itemsContext.items.slice(itemsContext.row-1,itemsContext.row-1+self.AsyncAdminRowLimit);
  }else {
    adminUsersAuthGroups = itemsContext.items;
  }

  console.log("Admin OwnerIDs being determined from row " + itemsContext.row + " to " + (itemsContext.row + adminUsersAuthGroups.length -1));

  async.forEachOf(adminUsersAuthGroups, function (userAuthGroups, index, done) {
      self.getSingleOwnerIDs(itemsContext,userAuthGroups)
        .catch(function(err) {
          console.error('For Each Single Get Admin OwnerIDs Error :', err);
        })
        .done(function() {
          done();
//          console.log('for loop success')
        });
    }
    , function (err) {
      if (err) console.error('For Each Get Admin OwnerIDs Error :' + err.message);
//resolve this promise
//      console.log('resolve')
      defer.resolve();
    });

//I have to return a promise here for so that chain waits until everything is done until it runs process.exit in done.
//chain was NOT waiting before and process exit was executing and data data not being retrieved
  return defer.promise
};
//***End of getting OwnerIDs ***//

module.exports = DownloadGPOusers;
