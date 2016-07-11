var appRoot = appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');
//Have to pass the name of this new class as string if inheriting parent
//constructor
//var UpdateGPOitem = utilities.inheritClass(UpdateGPOgenericClass,"UpdateGPOitem");

var UpdateGPOgenericClass = require(appRoot + '/shared/UpdateGPOgeneric');
//Call parent constructor and then use child constructor stuff too
utilities.inheritClass(UpdateGPOgenericClass,UpdateGPOitem);

//Name this function so that class name will come up in debugger, etc.
function UpdateGPOitem(collection,extensionsCollection,session,config,gfs) {
  //Run the parent constructor first
  //"id" is the updateKey used for updating and "item" is just updateName which
  //is text used on errors, logging, etc
  this.__parent__.constructor
    .call(this,'id','item',collection,extensionsCollection,session,config);

  //New stuff now

  //For saving to Grid FS
  this.gfs = gfs;
  //Current thumbnail upload file object passed through
  this.thumbnail = null;

  //Current Owner of item that will be updated
  this.updateOwner = null;
  //Update Folder for item needed
  this.updateFolder = null;

  //Note this.appRoot should be loaded from parent constructor
  //initialize the audit object
  var AuditClass = require(this.appRoot + '/shared/Audit.js');
  this.audit = new AuditClass();
}

UpdateGPOitem.prototype.checkPermission = function() {
  var self = this;
  var Q = require('q');

  var GPOid = self.updateDoc.id;
  var hasPermission = false;
  return Q(self.collection.findOne({id: GPOid},{fields: {owner: 1}}))
    .then(function(doc) {
      //If owner ID of this object is accessible by user then update otherwise
      //return error
      if (self.session.user.ownerIDs.indexOf(doc.owner) >= 0) {
        self.updateOwner = doc.owner;
        hasPermission = true;
      }
    })
//Need to get the folder for the item to update. Dumb design by ESRI.
// Maybe in future the folder will be on item but for now it's not becuase its
    //not in search result just individual item result
    //Have to put this in checkpermission because that is the start of stuff
    //before update happens.
    //Maybe shouldn't be called checkPermission() but beforeUpdate() in the
    //parent class
    .then(function() {
      return self.getOwnerFolder(GPOid);
    })
    .then(function() {
      return hasPermission;
    });

};

UpdateGPOitem.prototype.onUpdateSuccess = function() {
  var fs = require('fs');
  var Q = require('q');
  var self = this;
  //If update was a success then remove temporary thumbnail from file system
  return Q.fcall(function() {
    if (self.thumbnail && self.thumbnail.path) {
      return Q.ninvoke(fs,'unlink',self.thumbnail.path)
    }
  }).catch(function(err) {
      console.error(
        'Error removing temporary thumbnail in UpdateGPOitem.update for ' +
        self.updateDoc.id + ' : ' + err.stack) ;
      self.utilities.getHandleError(self.resObject,'UpdateError')(err);
    });
};

UpdateGPOitem.prototype.getRemoteUpdateRequest = function(formData) {
  var fs = require('fs');
  var self = this;

  //Get read stream from uploaded thumb file and add to form data with name
  if (self.thumbnail) {
    formData.thumbnail = {value: fs.createReadStream(self.thumbnail.path),
      options: {filename: self.thumbnail.originalname,
        contentType: self.thumbnail.mimetype,},};
  }

  var updateFolder = self.updateFolder || '';
  if (updateFolder) {
    updateFolder = '/' + updateFolder;
  }

  var url = self.config.portal + '/sharing/rest/content/users/' +
    self.updateOwner + updateFolder + '/items/' + self.updateDoc.id + '/update';
  console.log(url);
  var qs = {token: self.session.token,f: 'json'};
  //      Console.log(req.session.token);

  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: url, formData: formData, qs: qs };
  return requestPars;
};

UpdateGPOitem.prototype.getOwnerFolder = function(id) {
  var self = this;
  var itemURL = this.config.portal + '/sharing/rest/content/items/' + id ;

  var qs = {token: self.session.token,f: 'json'};

  //Pass parameters via form attribute
  var requestPars = {method: 'get', url: itemURL, qs: qs };

  return this.hr.callAGOL(requestPars)
    .then(function(body) {
      //      Var body = JSON.parse(bodyJSON);
      if (body.error) {
        console.error(body.error);
        throw(new Error('Error getting owner Folder : ' +
          JSON.stringify(body.error)));
      }
      self.updateFolder = body.ownerFolder;
      console.log(self.updateFolder);
      return self.updateFolder;
    });
};

//Creating child version of this to take care of Audit and thumbnail stuff
UpdateGPOitem.prototype.updateLocal = function() {
  var self = this;
  var Q = require('q');
  var merge = require('merge');

  //Only update items that we are using (could just hardcode ID instead of
  //updateKey
  var updateDocID = self.updateDoc[self.updateKey];
  var queryCommand = {};
  queryCommand[self.updateKey] = updateDocID;

  //Get the FULL doc and do audit before updating
  //audit
  //Note: slash data not used in audit yet so this might speed up query
  return Q(self.collection.findOne(queryCommand, {SlashData: 0}))
    .then(function(fullDoc) {
      if (!fullDoc) {
        throw new Error('Error updating Local GPO item. id = ' +
          updateDocID + ' does not exist');
      }
      //Have to audit before updating
      //merge the updated info into the existing doc in DB before auditing
      merge.recursive(fullDoc, self.updateDoc);
      self.audit.validate(fullDoc);
      self.updateDoc.AuditData = fullDoc.AuditData;

      //Use the parent version of updateLocalGPO to do the standard update of
      //DB part
      //have to run in the scope of this not the scope of parent
      return self.__parent__.updateLocal.call(self);
    })
    .then(function(success) {
      return self.saveThumbnailToGridFS();
    });

};

UpdateGPOitem.prototype.saveThumbnailToGridFS = function() {
  var self = this;
  var Q = require('q');
  var fs = require('fs');

  if (!self.thumbnail) {
    return false;
  }
  var defer = Q.defer();

  //Use gpo item id as name of file in grid fs
  var writestream = self.gfs.createWriteStream(
    {
      filename: self.thumbnail.originalname,
      metadata: {id: self.updateDoc.id, type: 'thumbnail'},
    }
  );
  //When done writing need to resolve the promise
  writestream.on('close', function(file) {
    console.log('Thumb File with id = ' + self.updateDoc.id + ' and file = ' +
      self.thumbnail.originalname + ' written to GridFS');

    //Now update thumbnailID in DB
    //    self.updateSlashData.thumbnailID = file._id;
    //Note: Make sure there is a SlashData object to store thumbnailID
    Q(self.collection.findOne({id: self.updateDoc.id,SlashData: null}, {id: 1}))
      .then(function(doc) {
        if (doc) {
          return Q(self.collection.update({id: doc.id},
            {$set: {SlashData: {}}}));
        }
        return null;
      })
      .then(function() {
        return Q(self.collection.update({id: self.updateDoc.id},
          {$set: {'SlashData.thumbnailID': file._id}}))
      })
      .catch(function(err) {
        defer.reject('Error updating Thumbnail Binary ID for ' +
          self.updateDoc.id + ' : ' + err);
      })
      .done(function() {
        defer.resolve();
      });
  });
  //Handle error due to writing
  writestream.on('error', function(err) {
    defer.reject('Error writing thumbnail stream to GridFS : ' + err);
  });
  //Now actually pipe response into gfs writestream
  fs.createReadStream(self.thumbnail.path).pipe(writestream);

  return defer.promise;
};

module.exports = UpdateGPOitem;
