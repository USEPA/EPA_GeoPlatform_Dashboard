var DownloadGPOusers = function() {
  //Set refreshOwnerIDsAdminUsers if you only want to update limited set of
  //admin users OwnerIDs. ie. In case you want to download all modified users on
  //admin login
  //If it is kept as empty array then update all Admin's OwnerIDs
  this.refreshOwnerIDsAdminUsers = [];
  //This can be run to only update a list of ownerIDs if given. null means get
  //all ownerIDs.
  this.requestItemCount = 100;

  this.useSync = false;
  //How many aysnc requests can be run at one time. too many and things crash
  //set to null to run all at one time (can crash for large data sets)
  //setting to 0 or 1 is the same as useSync=true
  this.AsyncRequestLimit = 10;
  //How many aysnc requests can be run at one time. too many and things crash
  //set to null to run all at one time (can crash for large data sets)
  //setting to 0 or 1 is the same as useSync=true
  this.AsyncRowLimit = 25;
  //When finding Admin OwnerIDs asynchronously
  //set to null to run all at one time
  this.AsyncAdminRowLimit = 100;

  //This to account for the bug in which users added to groups does not change
  //users modified date. Setting to false will clear out users DB and redownload
  //ALL user info
  this.updateOnlyModifiedUsers = false;
  //To only get users and not groups set to true, usually set to false
  this.onlyGetUsers = false;
  //This will make execution must faster since we don not have to download all
  //remote items and only need to download modified
  this.dontRemoveGPOusers = false;
  //This is just for testing if we don't want all docs, usually set to null
  this.TotalRowLimit = null;
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
  //Can optionally set OrgID if you know it otherwise have to find it for the
  //user logged in
  this.orgID = null;
  //Set the mongoDB url
  this.mongoDBurl = null;
  this.listingID = null;

  this.request = require('request');
  this.Q = require('q');

  this.appRoot = require('app-root-path');
  this.utilities = require(this.appRoot + '/shared/utilities');
  this.hrClass = require(this.appRoot + '/shared/HandleGPOresponses');
  this.hr = new this.hrClass();

  this.mongo = require('mongodb');
  this.MonkClass = require('monk');

  this.monk = null;

  this.usersCollection = null;
  this.authgroupsCollection = null;
  this.ownerIDsCollection = null;
  this.extensionsCollection = null;

  //Save logs and errors that accumulate for emailng out or saving to a file
  //possibly
  this.ScriptLogsClass = require(this.appRoot + '/shared/ScriptLogs');
  this.downloadLogs = new this.ScriptLogsClass();

  //Class for finding OwnerIDs of Admins
  this.UpdateAuthGroupsAndOwnerIDsClass = require(this.appRoot +
    '/shared/UpdateAuthGroupsAndOwnerIDs');
};

//Using this will return promise if there is exception in downloadInner
DownloadGPOusers.prototype.download = function() {
  return this.Q.fcall(this.getSelfInvokedFunction(this.downloadInner));
};

DownloadGPOusers.prototype.downloadInner = function() {
  this.downloadLogs.log('START RUNNING DOWNLOAD\r\n');
  var self = this;
  if (!this.monk) {
    this.monk = this.MonkClass(this.mongoDBurl);
  }
  if (!this.usersCollection) {
    this.usersCollection = this.monk.get('GPOusers');
  }
  if (!this.ownerIDsCollection) {
    this.ownerIDsCollection = this.monk.get('GPOownerIDs');
  }
  if (!this.extensionsCollection) {
    this.extensionsCollection = this.monk.get('GPOuserExtensions');
  }


  //If (! this.authgroupsCollection) this.authgroupsCollection = this.monk.get('GPOauthGroups');
  //Note I going to get the available authGroups from config file now so pass
  //path to file. Simpler to maintain
  if (!this.authgroupsCollection) {
    this.authgroupsCollection = this.appRoot + '/config/authGroups.js';
  }

  //Hr.save is where we store the output from REST calls like token and OrgID so
  //it can be used by handlers
  this.hr.saved.requestStart = 1;
  //For async download of items need to have rows counting
  this.hr.saved.remoteGPOrow = 1;
  //For hybrid need to have AGOL call counting
  //each call gets number of rows equal to requestItemCount
  this.hr.saved.currentRequest = 1;
  //ModifiedGPOrow is needed when processing modified items
  this.hr.saved.modifiedGPOrow = 1;

  //Place to store ALL the new GPO id's taken from the website with modified
  //data. Used to find which items have been deleted
  this.hr.saved.remoteGPOids = [];
  //Store only the modified/created gpo ids to know which SlashData to download
  this.hr.saved.modifiedGPOids = [];

  if (this.AsyncRequestLimit === 0 || this.AsyncRequestLimit === 1)  {
    this.useSync = true;
  }
  if (this.AsyncRowLimit === 0 || this.AsyncRowLimit === 1)  {
    this.useSync = true;
  }

  //String along aysn function calls to AGOL REST API
  var getGPOgroups = null;
  var getGPOusers = null;
  if (this.useSync) {
    this.downloadLogs.log('Getting Users and Groups using Sync');
    getGPOusers = this.getGPOusersSync;
    getGPOgroups = this.getGPOgroupsSync;
  } else {
    if (this.AsyncRequestLimit === null) {
      this.downloadLogs.log('Getting Users using Full Async ');
      getGPOusers = this.getGPOusersAsync;
    } else {
      this.downloadLogs.log('Getting Users using Hybrid ');
      getGPOusers = this.getGPOusersHybrid;
    }
    if (this.AsyncRowLimit === null) {
      this.downloadLogs.log('Getting Groups using Full Async ');
      getGPOgroups = this.getGPOgroupsAsync;
    } else {
      this.downloadLogs.log('Getting Groups using Hybrid ');
      getGPOgroups = this.getGPOgroupsHybrid;
    }
  }

  //Make instance of class that update Auth Groups and Find OwnerIDs
  //Note: We only need one instance since class is not storing data other than
  //avaialble auth groups that are shared by all
  //Have to update the AuthGroups as Users and Groups are loaded
  //Then after all Users and Groups are loaded can find Onwer IDs for Admins
  self.updateAuthGroupsAndOwnerIDs = new this.UpdateAuthGroupsAndOwnerIDsClass(
    this.usersCollection, this.ownerIDsCollection, this.authgroupsCollection);

  //If only want meta data this is just a dummy pass through function
  if (this.onlyGetUsers) getGPOgroups = function() {
    return true
  };

  //Clear out array from any previous downloads
  self.downloadLogs.clear();

  //Note getting user info and group info and removing dropped users unless set
  //not to above. Now run the promise chain using desired
  //getGPOusers/getGPOgroups (sync vs async vs hybrid)

  return self.getToken()
    //For testing simultaneous log ins
    //.delay(30000)
    .then(self.getSelfInvokedFunction(self.getOrgId))
    .then(self.getSelfInvokedFunction(self.createIndices))
    .then(self.getSelfInvokedFunction(self.removeAllUserInfo))
    .then(self.getSelfInvokedFunction(self.getLocalGPOids))
    .then(self.getSelfInvokedFunction(getGPOusers))
    .then(self.getSelfInvokedFunction(getGPOgroups))
    .then(self.getSelfInvokedFunction(self.getListingId))
    .then(self.getSelfInvokedFunction(self.getGPOentitlements))
    .then(self.getSelfInvokedFunction(self.removeLocalGPOitems))
    .then(self.getSelfInvokedFunction(self.getOwnerIDs))
    .catch(function(err) {
      var errMsg = err.stack || err;
      self.downloadLogs.error('Error running DownloadGPOusers.download():\n' +
        errMsg);
    });
};

//Have to do this because when the function in .then is called it is called from
//global scope
DownloadGPOusers.prototype.getSelfInvokedFunction = function(f) {
  var self = this;
  return function(x) {
    return f.call(self, x);
  }
};

DownloadGPOusers.prototype.createIndices = function() {
  var self = this;
  return self.Q.all([
    self.Q(self.usersCollection.index({username: 1})),
    self.Q(self.usersCollection.index({username: 1}))
  ])
};

//Have to do this because when the function in .then is called it is called from
//global scope
DownloadGPOusers.prototype.removeAllUserInfo = function() {
  var self = this;
  if (self.updateOnlyModifiedUsers) {
    return self.Q(true);
  }
  return self.Q(self.usersCollection.remove({}))
    .then(function() {
      return self.Q.all([
        self.Q(self.usersCollection.index({username: 1})),
        self.Q(self.extensionsCollection.index({username: 1}))
      ])
    });
};

DownloadGPOusers.prototype.getToken = function() {
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
  } else {
    tokenURL = this.portal + '/sharing/rest/generateToken?';
    parameters = {
      username: this.username,
      password: this.password,
      client: 'referer',
      referer: this.portal,
      expiration: this.expiration,
      f: 'json',
    };
    tokenFieldName = 'token';
  }
  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: tokenURL, form: parameters};

  var keyMap = {};
  keyMap[tokenFieldName] = 'token';
  return this.hr.callAGOL(requestPars, keyMap);
};

DownloadGPOusers.prototype.getOrgId = function() {
  if (this.orgID) {
    this.hr.saved.orgID = this.orgID;
    return this.orgID;
  }

  var url = this.portal + '/sharing/rest/portals/self';

  var parameters = {token: this.hr.saved.token, f: 'json'};
  //Pass parameters via form attribute
  var requestPars = {method: 'get', url: url, qs: parameters};

  return this.hr.callAGOL(requestPars, {id: 'orgID'});
};

//Get listing ID for use in looking up user license information
DownloadGPOusers.prototype.getListingId = function() {
  var self = this;
  if (this.listingID) {
    this.hr.saved.listingID = this.listingID;
    return this.listingID;
  }

  var url = this.portal + '/sharing/rest/content/listings';

  var parameters = {
    token: this.hr.saved.token,
    f: 'json',
    q: 'title:"ArcGIS Pro"'};
  //Pass parameters via form attribute
  var requestPars = {method: 'get', url: url, qs: parameters};

  return this.Q.nfcall(this.request, requestPars)
  .then(function(response) {
    if (response[0].statusCode == 200) {
      var listings = JSON.parse(response[0].body)['listings'];
      self.hr.saved.listingId = listings[0]['itemId'];
    }
  });
};

//Routines for gettting all the items metadata from AGOL (Have to do this so we
//know what items to delete from working local copy)
DownloadGPOusers.prototype.getGPOusersChunk = function(requestStart,
                                                       HandleGPOusersResponse) {
  if (!requestStart) {
    requestStart = this.hr.saved.requestStart;
  }

  var url = this.portal + '/sharing/rest/community/users';

  var query = 'orgid:' + this.hr.saved.orgID;

  //If not removing local gpo items that have been removed from AGOL then only
  //need to download modified items
  if (this.dontRemoveGPOusers) {
    //Have to pad modified ms from 1970
    var now = (new Date()).getTime();
    query += ' AND modified:[' +
      this.padNumber(this.hr.saved.localMaxModifiedDate) +
      ' TO ' + this.padNumber(now) + ']';

  }
  var parameters = {
    q: query,
    token: this.hr.saved.token,
    f: 'json',
    start: requestStart,
    num: this.requestItemCount,
  };
  //Need to sort this now because otherwise ESRI is not making sure there are
  //not duplicates
  parameters.sortField = 'username';

  var requestPars = {method: 'get', url: url, qs: parameters};
  //  This.downloadLogs.log(parameters);

  if (!HandleGPOusersResponse) {
    if (this.useSync) {
      //      This.downloadLogs.log('HandleGPOusersResponseSync');
      HandleGPOusersResponse = this.HandleGPOusersResponseSync;
    } else if (this.AsyncRequestLimit === null) {
      //      This.downloadLogs.log('HandleGPOusersResponseAsync');
      HandleGPOusersResponse = this.HandleGPOusersResponseAsync;
    } else {
      //      This.downloadLogs.log('HandleGPOusersResponseAsync');
      HandleGPOusersResponse = this.HandleGPOusersResponseAsync;
    }
  }
  return this.hr.callAGOL(requestPars)
    .then(this.getSelfInvokedFunction(HandleGPOusersResponse));
};

DownloadGPOusers.prototype.padNumber = function(num, size) {
  //This is for AGOL modified date
  if (!size) {
    size = 19
  }
  var s = num + '';
  while (s.length < size) {
    s = '0' + s;
  }
  return s;
};

DownloadGPOusers.prototype.getGPOusersSync = function() {
  var self = this;
  var whileCondition = null;
  if (self.TotalRowLimit) {
    whileCondition = function() {
      return self.hr.saved.requestStart <= self.TotalRowLimit;
    };
  } else {
    whileCondition = function() {
      return self.hr.saved.requestStart > 0;
    };
  }
  return self.hr.promiseWhile(whileCondition,
    self.getSelfInvokedFunction(self.getGPOusersChunk));
};

DownloadGPOusers.prototype.HandleGPOusersResponseSync = function(body) {
  this.downloadLogs.log('Sync ' + this.hr.saved.requestStart + ' to ' +
    (this.hr.saved.requestStart + body.results.length - 1));
  this.hr.saved.requestStart = body.nextStart;

  this.storeModifiedDocs(body);

  return body;
  //Return this.Q(this.gpoitemcollection.insert(body.results));
};

DownloadGPOusers.prototype.HandleGPOusersResponseAsync = function(body) {
  if ('error' in body) {
    this.downloadLogs.error('Error getting GPO users: ' + body.error.message);
    return true;
  }
  this.downloadLogs.log('request Start ' + (body.start) + ' to ' +
    (body.start + body.results.length - 1) + ' (users retrieved: ' +
    (this.hr.saved.remoteGPOrow + body.results.length - 1) + ')');
  //Next start is not neccessarily found in order so use remoteGPOrow to know
  //how far along
  this.hr.saved.remoteGPOrow += body.results.length;
  this.hr.saved.currentRequest += 1;

  if (this.hr.saved.remoteGPOcount > 0 && body.results.length === 0) {
    //This is catatrosphic error that should never happen if remote GPO items
    //exist. If this happens then need to make sure hybrid loop will exit and
    //resolve promise. Should probably email this to admin
    this.downloadLogs.error('Catastrophic Error. ' +
      'No body results probably because AsyncRequestLimit set too high.');
    this.hr.saved.remoteGPOrow = this.hr.saved.remoteGPOcount + 1;
    return false;
  }

  //StoreModifiedDocs returns a promise that is done when mod docs are inserted
  return this.storeModifiedDocs(body);
};

//Store only the modified GPO items but keep all of the ID's for handling
//deleted GPO items
DownloadGPOusers.prototype.storeModifiedDocs = function(body) {
  var self = this;
  //Note I am going to insert into database each time this is called but store
  //Mod IDs so that Group Data can be downloaded later
  //store all the remote usernames
  var remoteGPOids = body.results.map(function(doc) {
    return doc.username
  });
  self.hr.saved.remoteGPOids = self.hr.saved.remoteGPOids.concat(remoteGPOids);
  //Only the modified/created gpo items more recent than local will be upserted
  //add empty array group field in here in case it doesn't get added later just
  //also isAdmin,isExternal fields and empty array ownerIDs field that will be
  //dealt with later with another script

  //Don't have to keep all user fields I guess
  var modifiedGPOitems = body.results.map(function(doc) {
    return self.utilities.sliceObject(doc, [
      'username',
      'fullName',
      'email',
      'modified',
      'created'])
  });

  modifiedGPOitems = modifiedGPOitems.filter(function(doc) {
    doc.groups = [];
    doc.authGroups = [];
    doc.isAdmin = false;
    doc.isExternal = false;
    return doc.modified > self.hr.saved.localMaxModifiedDate
  });

  //NOt get array of only the modified ID's because we will be looping over all
  //id's later to get group Data but don't want to keep all GPO users in memory
  var modifiedGPOids = modifiedGPOitems.map(function(doc) {
    return doc.username || ''
  });
  //Don't want undefined or null list of usernames because if username not on
  //doc then remove( {username:{$in:[,,,,,]}} ) will remove all
  self.hr.saved.modifiedGPOids = self.hr.saved.modifiedGPOids
    .concat(modifiedGPOids);

  self.hr.saved.modifiedGPOcount = self.hr.saved.modifiedGPOids.length;

  this.downloadLogs.log('Remote GPO user count ' +
    self.hr.saved.remoteGPOids.length);
  this.downloadLogs.log('Modified GPO user count ' +
    self.hr.saved.modifiedGPOids.length);

  //This returns a promise which is resolved when database records are inserted
  return self.saveModifiedGPOitems(modifiedGPOids, modifiedGPOitems);
};

DownloadGPOusers.prototype.saveModifiedGPOitems = function(modifiedGPOids,
                                                           modifiedGPOitems) {
  var self = this;

  if (modifiedGPOitems.length > 0) {
    //    Var defer = self.Q.defer();
    //    self.usersCollection.remove( {username:{$in:modifiedGPOids}}, function (error,removed) {
    //        console.log("****** REMOVED ******** " + removed);
    //        self.Q(self.usersCollection.insert(modifiedGPOitems))
    //          .then(function () {defer.resolve()});
    //      }
    //    );
    //    return defer.promise;
    return self.Q(self.usersCollection.remove({
      username: {$in: modifiedGPOids}
    }))
      .then(function() {
        return self.Q(self.usersCollection.insert(modifiedGPOitems))
      });
    //Return self.Q(self.usersCollection.insert(modifiedGPOitems));
  }
  return self.Q(true);
};


DownloadGPOusers.prototype.getGPOusersHybrid = function() {
  var self = this;
  return self.getRequestStartArray()
    .then(self.getSelfInvokedFunction(self.HandleGPOusersResponseAsync))
    .then(self.getSelfInvokedFunction(self.getGPOusersHybridFromStartArray));
};

DownloadGPOusers.prototype.getGPOusersHybridFromStartArray = function() {
  var self = this;
  return self.hr.promiseWhile(function() {
    return self.hr.saved.remoteGPOrow <= self.hr.saved.remoteGPOcount;
  }, self.getSelfInvokedFunction
  (self.getGPOusersAsyncFromStartArray));
};

DownloadGPOusers.prototype.getGPOusersAsync = function() {
  var self = this;
  //Have to first get the StartArray to use in async for each
  //This means an initial AGOL call to get "total" items count in AGOL
  //So subsequent calls will be Async for each
  return self.getRequestStartArray()
    .then(self.getSelfInvokedFunction(self.HandleGPOusersResponseAsync))
    .then(self.getSelfInvokedFunction(self.getGPOusersAsyncFromStartArray));
};

DownloadGPOusers.prototype.getGPOusersAsyncFromStartArray = function() {
  var self = this;
  var async = require('async');

  var defer = this.Q.defer();

  var requestStartArray;
  //This.downloadLogs.log('this.hr.saved.currentRequest ' + this.hr.saved.currentRequest)
  if (self.AsyncRequestLimit) {
    //Take slice form current row to async row limit
    requestStartArray = self.hr.saved.requestStartArray
      .slice(self.hr.saved.currentRequest - 1, self.hr.saved.currentRequest -
        1 + self.AsyncRequestLimit);
  } else {
    requestStartArray = self.hr.saved.requestStartArray
      .slice(self.hr.saved.currentRequest - 1);
  }

  this.downloadLogs.log(this.hr.saved.remoteGPOrow + ' ' +
    requestStartArray.length);

  if (this.hr.saved.remoteGPOcount > 0 && requestStartArray.length === 0) {
    //This is catatrosphic error that should never happen if remote GPO items
    //exist. If this happens then need to make sure hybrid loop will exit and
    //resolve promise. Should probably email this to admin
    this.downloadLogs.error('Catastrophic Error. ' +
      'No start array probably because AsyncRequestLimit set too high.');
    self.hr.saved.remoteGPOrow = self.hr.saved.remoteGPOcount + 1;
    defer.resolve();
  }

  async.forEachOf(requestStartArray, function(requestStart, index, done) {
    //      This.downloadLogs.log(key+this.hr.saved.modifiedGPOrow)
    self.getGPOusersChunk(requestStart)
        .then(function() {
          //                This.downloadLogs.log(String(key+1) + 'done');
          done();
        })
        .catch(function(err) {
          self.downloadLogs.error('Error in async.forEachOf' +
            'while calling getGPOusersChunk() in ' +
            'DownloadGPOusers.getGPOusersAsyncFromStartArray:' + err.stack);
        })
        .done(function() {
          //This.downloadLogs.log('for loop success')
        });
  }
    , function(err) {
      if (err) {
        self.downloadLogs.error('Error with async.forEachOf' +
          'while looping over GPO user chunks in ' +
          'DownloadGPOusers.getGPOitemsAsyncFromStartArray:' + err.stack);
      }
      //Resolve this promise
      //self.downloadLogs.log('resolve')
      defer.resolve();
    });


  //I have to return a promise here for so that chain waits until everything is
  //done until it runs process.exit in done. chain was NOT waiting before and
  //process exit was executing and slash data not being retrieved
  return defer.promise
};

DownloadGPOusers.prototype.getRequestStartArray = function() {
  return this.getGPOusersChunk(1, this.handleGetRequestStartArray)
};

DownloadGPOusers.prototype.handleGetRequestStartArray = function(body) {
  //Find the requestStart of each call
  this.hr.saved.requestStartArray = [];
  //  This.downloadLogs.log(body);

  this.hr.saved.remoteGPOcount = body.total;
  this.downloadLogs.log('Remote GPO user count ' +
    this.hr.saved.remoteGPOcount);
  if (this.TotalRowLimit) {
    this.hr.saved.remoteGPOcount = this.TotalRowLimit;
  }
  for (var i = 1; i <= this.hr.saved.remoteGPOcount; i = i + this.requestItemCount) {
    this.hr.saved.requestStartArray.push(i);
  }

  return body;
};

//Endo of routine that get all new users

//Routine to get each user's group data

DownloadGPOusers.prototype.getSingleGPOgroup = function(modifiedGPOrow) {
  var self = this;

  //If async loop then have to pass the row
  if (!modifiedGPOrow) {
    modifiedGPOrow = self.hr.saved.modifiedGPOrow;
  }

  var currentGPOusername = self.hr.saved.modifiedGPOids[modifiedGPOrow - 1];

  var url = self.portal + '/sharing/rest/community/users/' + currentGPOusername;

  var parameters = {token: self.hr.saved.token, f: 'json'};
  //Pass parameters via form attribute

  var requestPars = {method: 'get', url: url, qs: parameters};

  return self.hr.callAGOL(requestPars)
    .then(self.getSelfInvokedFunction(self.HandleGPOgroups))
//Get the ownerFolder stuff
    .then(function() {return self.getOwnerFolders(currentGPOusername);})
//Copy over the extensions that were wiped out but saved in another collection
    .then(function() {return self.getGPOuserExtensions (currentGPOusername);});

};

DownloadGPOusers.prototype.HandleGPOgroups = function(body) {
  var self = this;

  //The body of response is AGOL user object
  var user = body;

  self.hr.saved.modifiedGPOrow += 1;

  //This class will update all the role,isAdmin,groups and authGroups
  return self.updateAuthGroupsAndOwnerIDs.updateAuthGroups(user);
};


//Note have to get the folder name via another endpoint if we don't have the
//id->name map
DownloadGPOusers.prototype.getOwnerFolders = function(username) {
  var self = this;

  var itemURL = self.portal + '/sharing/rest/content/users/' + username ;

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
      //Loop through folders for this username and get rid of username on
      //folder object
      body.folders.forEach(function(folder) {
        delete folder.username;
      });
      //Console.log('folder names ' );
      //console.log(body.folders);
      return self.Q(self.usersCollection.update({username: username},
        {$set: {folders: body.folders}}));
    })

};

//This will get the stuff saved in GPOuserExtensions collection and add to
//GPOusers
DownloadGPOusers.prototype.getGPOuserExtensions = function(username) {
  var self = this;

  return self.Q(this.extensionsCollection.findOne({username: username},
      {fields: {_id: 0,username: 0}}))
    .then(function(doc) {
//If there is doc but it doesn't have anything in it then don't try to update either
      if (!doc || (typeof doc !== "object") || Object.keys(doc).length==0) {
        return null;
      }
      return self.Q(self.usersCollection.update({username: username},
        {$set: doc}));
    });
};

DownloadGPOusers.prototype.getGPOgroupsSync = function(GPOids) {
  var self = this;
  return self.hr.promiseWhile(function() {
    return self.hr.saved.modifiedGPOrow <= self.hr.saved.modifiedGPOcount;
  }, self.getSelfInvokedFunction
  (self.getSingleGPOgroup));
};

DownloadGPOusers.prototype.getGPOgroupsHybrid = function() {
  var self = this;
  return self.hr.promiseWhile(function() {
    return self.hr.saved.modifiedGPOrow <= self.hr.saved.modifiedGPOcount;
  }, self.getSelfInvokedFunction
  (self.getGPOgroupsAsync));
};

DownloadGPOusers.prototype.getGPOgroupsAsync = function() {
  var self = this;
  var async = require('async');

  var defer = this.Q.defer();

  var GPOids;
  if (self.AsyncRowLimit) {
    //Take slice form current row to async row limit
    GPOids = self.hr.saved.modifiedGPOids
      .slice(self.hr.saved.modifiedGPOrow - 1,
        self.hr.saved.modifiedGPOrow - 1 + self.AsyncRowLimit);
  } else {
    GPOids = self.hr.saved.modifiedGPOids;
  }

  //Need to get the value of modifiedGPOrow when this function is called because
  //getSingleGPOgroup changes it
  //THis is basically the modifiedGPOrow when the async loop started
  var asyncStartModifiedGPOrow = self.hr.saved.modifiedGPOrow;
  this.downloadLogs.log('User Groups download from row ' +
    asyncStartModifiedGPOrow + ' to ' +
    (asyncStartModifiedGPOrow + GPOids.length - 1));

  async.forEachOf(GPOids, function(value, key, done) {
    //      Self.downloadLogs.log(key+this.hr.saved.modifiedGPOrow)
    self.getSingleGPOgroup(key + asyncStartModifiedGPOrow)
        .catch(function(err) {
          self.downloadLogs.error('Error in async.forEachOf while calling getSingleGPOgroup() in ' +
            'DownloadGPOusers.getGPOgroupsAsync for username = ' + value + ' :' + err.stack);
        })
        .done(function() {
          done();
          //Self.downloadLogs.log('for loop success')
        });
  }
    , function(err) {
      if (err) {
        self.downloadLogs.error('Error with async.forEachOf' +
          'while looping over GPO users to find groups in' +
          'DownloadGPOusers.getGPOgroupsAsync:' + err.stack);
      }
      //Resolve this promise
      //self.downloadLogs.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything is
  //done until it runs process.exit in done. chain was NOT waiting before and
  //process exit was executing and data data not being retrieved
  return defer.promise
};



//Function for downloading licensing information from AGOL
DownloadGPOusers.prototype.getGPOentitlements = function() {
  var self = this;
  var arrayExtended = require('array-extended');
  var entitlementCollection = self.monk.get('GPOuserEntitlements');
  var userscollection = self.monk.get('GPOusers');
  //Need to get the listing ID for ArcGIS Pro. In the future may have more.
  var url = this.portal + '/sharing/rest/content/listings/' +
    this.hr.saved.listingId + '/userEntitlements';

  var parameters = {
    token: this.hr.saved.token,
    f: 'json'
  };

  var requestPars = {method: 'get', url: url, qs: parameters};
  var entitlements = [];
  //Get entitlements
  return this.Q.nfcall(this.request, requestPars)
    .then(function(response) {
      if (response[0].statusCode == 200) {
        var ctr = 0;
        //Flag for detecting changes
        var diff = false;
        //Set up defer to wait to insert until all entitlements have been
        //processed.
        var defer = self.Q.defer();
        var userEntitlements = JSON.parse(response[0].body)['userEntitlements'];
        //Loop through the entitlements, one user at a time.
        userEntitlements.forEach(function(item) {
          //Create a new field for download date
          item['date'] = Date.now();
          //Push doc.field to the array now
          //Find this user in the user collection
          return userscollection.findOne({username: item['username']})
            .then(function(user) {
              ctr++;
              //Get this user's authgroup to store in entitlements collection.
              item['authGroups'] = user.authGroups;
              //Check to see if the downloaded entitlements for this user are
              //different than the current one in the user's collection.
              if (arrayExtended.difference(item['entitlements'],
                  user['entitlements']).length > 0) {
                //If different, update the user collection and set the diff flag
                diff = true;
                return userscollection.update({username: item['username']},
                  {$set: {entitlements: item['entitlements']}});
              }
            })
            .then(function() {
              //After processed all entitlements, insert into collection
              if (ctr == userEntitlements.length) {
                return self.Q.fcall(function() {
                  if (diff) {
                    return entitlementCollection.insert(userEntitlements);
                  }
                })
                //Unless no difference, then don't insert
                .then(function() {
                  return defer.resolve(userEntitlements);
                });
              }

            });

        });
        return defer.promise;
      }
    })
};

DownloadGPOusers.prototype.removeLocalGPOitems = function() {
  var self = this;
  //If not removing local gpo items (so we can get away with not downloading all
  //of them) just return
  if (self.dontRemoveGPOusers) {
    return this.Q(true);
  }

  var arrayExtended = require('array-extended');
  //  Find the difference of local and remote. This need to be removed
  //need to get array of local GPO ids only instead of id,mod pair
  var localGPOids = self.hr.saved.localGPOids.map(function(doc) {
    return doc.username
  });
  var removeIDs = arrayExtended.difference(localGPOids,
    self.hr.saved.remoteGPOids);

  this.downloadLogs.log('Locally Removed GPO users count: ' + removeIDs.length);

  if (removeIDs.length > 0) {
    return self.Q(this.usersCollection.remove({id: {$in: removeIDs}}));
    //Return self.Q(usersCollection.remove({id:{$in:removeIDs}}));
  }
  return self.Q(true);
};

DownloadGPOusers.prototype.getLocalGPOids = function() {
  return this.Q(this.usersCollection.find({},
      {fields: {username: 1, modified: 1}, sort: {modified: -1}}))
    .then(this.getSelfInvokedFunction(this.handleLocalGPOidsPromise));
};

DownloadGPOusers.prototype.handleLocalGPOidsPromise = function(docs) {
  //  Var e = data[0];

  //Temporary slice for testing
  if (this.TotalRowLimit) {
    docs = docs.slice(0, this.TotalRowLimit);
  }

  this.hr.saved.localGPOids = docs;
  this.hr.saved.localGPOcount = docs.length;
  //Get the max modified date in loc
  if (docs.length > 0) {
    this.hr.saved.localMaxModifiedDate = docs[0].modified;
  } else {
    //If no local gpo items then need to get all. accomplished if max modified
    //date is <  min remote mod date. Assume 0 (equal to 1970) is early enough
    //to get everything
    this.hr.saved.localMaxModifiedDate = 0;
  }

  this.downloadLogs.log('max Modified Date: ' +
    new Date(this.hr.saved.localMaxModifiedDate));

  return docs;
};

//**** Beginning of the getting OwnerIDs
//

DownloadGPOusers.prototype.getOwnerIDs = function() {
  var self = this;
  var useSyncAdmin = false;
  if (this.AsyncAdminRowLimit === 0 || this.AsyncAdminRowLimit === 1)  {
    useSyncAdmin = true;
  }

  //String along aysn function calls
  var getOwnerIDsVersion = null;
  if (useSyncAdmin) {
    this.downloadLogs.log('Find Admin OwnerIDs using Sync');
    getOwnerIDsVersion = this.getOwnerIDsSync;
  } else {
    if (this.AsyncAuditRowLimit === null) {
      this.downloadLogs.log('Find Admin OwnerIDs using Full Async ');
      getOwnerIDsVersion = this.getOwnerIDsASync;
    } else {
      this.downloadLogs.log('Find Admin OwnerIDs using Hybrid ');
      getOwnerIDsVersion = this.getOwnerIDsHybrid;
    }
  }

  //First get the admin users that we will be finding OwnerIDs for.
  //Sometimes it isn't all of them.
  return self.getAdminUsersAuthGroups()
    .then(function(adminUsersAuthGroups) {
      // This context is helpful for looping over the admin users
      var itemsContext = {};
      itemsContext.row = 1;
      itemsContext.count = adminUsersAuthGroups.length;
      itemsContext.items = adminUsersAuthGroups;
      return getOwnerIDsVersion.call(self, itemsContext);
    })
};

DownloadGPOusers.prototype.getAdminUsersAuthGroups = function() {
  var self = this;

  var AdminUsersAuthGroups = null;
  //If refreshOwnerIDs is passed then remove just those auth Groups for these
  //Usernames so they will be refreshed
  if (self.refreshOwnerIDsAdminUsers &&
    self.refreshOwnerIDsAdminUsers.length > 0) {
    return self.utilities.getArrayFromDB(self.usersCollection,
        {username: {$in: self.refreshOwnerIDsAdminUsers}}, 'authGroups')
      .then(function(authGroups) {
        AdminUsersAuthGroups = authGroups;
        //Since I authGroups should be sorted there should not be different
        //sequences of same authgroups. Could have looped over individual
        //authgroup and use $all but this should work
        return self.Q(self.ownerIDsCollection.remove({
          authGroups: {$in: authGroups}
        }));
      })
      .then(function() {
        return AdminUsersAuthGroups;
      })
  }
  //Need to get all the AdminUsers to test for OwnerIDs (could have got all
  //authGroups instead of checking if each authGroups combo already as OwnerIDs)
  //NOTE: remove everything from OwnerIDS so it will all be refreshed
  return self.Q(self.ownerIDsCollection.remove({}))
    .then(function() {
      return self.getAllDistinctAdminUsersAuthGroups()
    })
};

DownloadGPOusers.prototype.getAllDistinctAdminUsersAuthGroups = function() {
  var self = this;
  var query = {authGroups: {$ne: []}, isAdmin: true};

  //All all distinct authgroup combinations on user
  //Also make sure we include at least all individual authGroups as length 1
  //array so later can filter by single authGroup if necessary
  return self.utilities.getDistinctArrayFromDB(self.usersCollection,
                                               query,'authGroups')
    .then(function(authGroups) {
      return self.updateAuthGroupsAndOwnerIDs.getAvailableAuthGroups()
        .then(function(availAuthGroups) {
          availAuthGroups.forEach(function(avail) {
            //Only add the single authGroup if it isn't already present
            if (authGroups.every(function(authGroup) {
              //If already present is true then return false and don't push
              return !(authGroup.length === 1 && authGroup[0] == avail);
            })) {
              authGroups.push([avail]);
            }
          });
          return authGroups;
        });
    });
};


DownloadGPOusers.prototype.getSingleOwnerIDs = function(itemsContext,
                                                        userAuthGroups) {
  //If async loop then have to pass the item
  //for sync don't pass but get from current row
  if (!userAuthGroups) {
    userAuthGroups = itemsContext.items[itemsContext.row - 1];
  }

  //Note: this not usd for pure async, for hybrid it only determines
  //modifiedGPOrow at start of each aysnc foreach loop
  itemsContext.row += 1;

  //  This.downloadLogs.log("itemsContext.row  " + itemsContext.row );
  //Returns a Q promise when done with process
  return this.updateAuthGroupsAndOwnerIDs
    .getOwnerIDsInAuthGroups(userAuthGroups);
};


DownloadGPOusers.prototype.getOwnerIDsSync = function(itemsContext) {
  var self = this;
  return self.hr.promiseWhile(function() {
    return itemsContext.row <= itemsContext.count;
  }, function() {
    return self.getSingleOwnerIDs(itemsContext);
  });
};

DownloadGPOusers.prototype.getOwnerIDsHybrid = function(itemsContext) {
  var self = this;
  this.downloadLogs.log(itemsContext.row, itemsContext.count);
  return self.hr.promiseWhile(function() {
    return itemsContext.row <= itemsContext.count;
  }, function() {
    return self.getOwnerIDsAsync(itemsContext);
  });
};

DownloadGPOusers.prototype.getOwnerIDsAsync = function(itemsContext) {
  var self = this;
  var async = require('async');

  var defer = self.Q.defer();

  var adminUsersAuthGroups;
  if (self.AsyncAdminRowLimit) {
    //Take slice form current row to async row limit
    adminUsersAuthGroups = itemsContext.items
      .slice(itemsContext.row - 1,
        itemsContext.row - 1 + self.AsyncAdminRowLimit);
  } else {
    adminUsersAuthGroups = itemsContext.items;
  }

  this.downloadLogs.log('Admin OwnerIDs being determined from row ' +
    itemsContext.row + ' to ' +
    (itemsContext.row + adminUsersAuthGroups.length - 1));

  async.forEachOf(adminUsersAuthGroups, function(userAuthGroups, index, done) {
      self.getSingleOwnerIDs(itemsContext, userAuthGroups)
        .catch(function(err) {
          self.downloadLogs.error('Error in async.forEachOf ' +
            'while calling getSingleOwnerIDs() in ' +
            'DownloadGPOusers.getOwnerIDsAsync:' + err.stack);

        })
        .done(function() {
          done();
          //Self.downloadLogs.log('for loop success')
        });
    }
    , function(err) {
      if (err) {
        self.downloadLogs.error('Error with async.forEachOf ' +
          'while looping over GPO admins to find OwnerIDs in ' +
          'DownloadGPOusers.getOwnerIDsAsync:' + err.stack);
      }
      //Resolve this promise
      //      self.downloadLogs.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything is
  //done until it runs process.exit in done. chain was NOT waiting before and
  //process exit was executing and data data not being retrieved
  return defer.promise
};
//***End of getting OwnerIDs ***//

module.exports = DownloadGPOusers;
