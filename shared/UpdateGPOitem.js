var appRoot = appRoot=require('app-root-path');
var utilities=require(appRoot + '/shared/utilities');
//Have to pass the name of this new class as string if inheriting parent constructor
//var UpdateGPOitem = utilities.inheritClass(UpdateGPOgenericClass,"UpdateGPOitem");

var UpdateGPOgenericClass=require(appRoot + '/shared/UpdateGPOgeneric');
//call parent constructor and then use child constructor stuff too
utilities.inheritClass(UpdateGPOgenericClass,UpdateGPOitem);

//Name this function so that class name will come up in debugger, etc.
function UpdateGPOitem(collection,extensionsCollection,session,config,gfs){
//run the parent constructor first
//"id" is the updateKey used for updating and "item" is just updateName which is text used on errors, logging, etc
  this.__parent__.constructor.call(this,"id","item",collection,extensionsCollection,session,config);

//New stuff now

//For saving to Grid FS
  this.gfs=gfs;
//Current thumbnail upload file object passed through
  this.thumbnail=null;

//Current Owner of item that will be updated
  this.updateOwner=null;

//note this.appRoot should be loaded from parent constructor
//initialize the audit object
  var AuditClass=require(this.appRoot + '/shared/Audit.js');
  this.audit = new AuditClass();
}

UpdateGPOitem.prototype.checkPermission = function() {
  var self = this;
  var Q = require('q');

  var GPOid = self.updateDoc.id;
  return Q(self.collection.findOne({id:GPOid},{fields:{owner:1}}))
    .then(function (doc) {
//If owner ID of this object is accessible by user then update otherwise return error
      if (self.session.ownerIDs.indexOf(doc.owner)>=0) {
        self.updateOwner = doc.owner;
        return true;
      }else {
        return false;
      }
    });
};

UpdateGPOitem.prototype.onUpdateSuccess = function () {
  var fs = require('fs');
  var Q = require('q');
  var self = this;
//if update was a success then remove temporary thumbnail from file system
  return Q.fcall(function () {if (self.thumbnail && self.thumbnail.path) return Q.ninvoke(fs,"unlink",self.thumbnail.path)})
    .catch(function (err) {
      console.error("Error removing temporary thumbnail in UpdateGPOitem.update for " + self.updateDoc.id + " : " + err.stack) ;
      self.utilities.getHandleError(self.resObject,"UpdateError")(err);
    });
};

UpdateGPOitem.prototype.getRemoteUpdateRequest = function(formData) {
  var fs = require('fs');
  var self = this;

//get read stream from uploaded thumb file and add to form data with name
  if (self.thumbnail) formData.thumbnail={value:fs.createReadStream(self.thumbnail.path),
    options: {filename: self.thumbnail.originalname,
      contentType: self.thumbnail.mimetype}};

  var url= self.config.portal + '/sharing/rest/content/users/' + self.updateOwner + '/items/' + self.updateDoc.id + '/update';
//      console.log(url);
  var qs = {token: self.session.token,f:'json'};
//      console.log(req.session.token);

//Pass parameters via form attribute
  var requestPars = {method:'post', url:url, formData:formData, qs:qs };
  return requestPars;
};


UpdateGPOitem.prototype.updateLocal= function() {
  var self = this;
  var Q = require('q');
  var merge = require('merge');

//Only update items that we are using (could just hardcode ID instead of updateKey
  var updateDocID = self.updateDoc[self.updateKey];
  var queryCommand = {};
  queryCommand[self.updateKey] = updateDocID;

//Get the FULL doc and do audit before updating
// audit
  return Q(self.collection.findOne(queryCommand, {SlashData:0}))//Note: slash data not used in audit yet so this might speed up query
    .then(function (fullDoc) {
      if (! fullDoc) throw new Error("Error updating Local GPO item. id = " + updateDocID + " does not exist");
//have to audit before updating
//merge the updated info into the existing doc in DB before auditing
      merge.recursive(fullDoc, self.updateDoc);
      self.audit.validate(fullDoc);
      self.updateDoc.AuditData=fullDoc.AuditData;

//use the parent version of updateLocalGPO to do the standard update of DB part
//have to run in the scope of this not the scope of parent
      return self.__parent__.updateLocal.call(self);
    })
    .then(function (success) {
      return self.saveThumbnailToGridFS();
    });

};

UpdateGPOitem.prototype.saveThumbnailToGridFS = function() {
  var self = this;
  var Q = require('q');
  var fs = require('fs');

  if (! self.thumbnail) return false;
  var defer = Q.defer();

//use gpo item id as name of file in grid fs
  var writestream = self.gfs.createWriteStream(
    {
      filename: self.thumbnail.originalname,
      metadata: {id: self.updateDoc.id, type: "thumbnail"}
    }
  );
//when done writing need to resolve the promise
  writestream.on('close', function (file) {
    console.log('Thumb File with id = ' + self.updateDoc.id + ' and file = ' + self.thumbnail.originalname + ' written to GridFS');

//now update thumbnailID in DB
//    self.updateSlashData.thumbnailID = file._id;

    Q(self.collection.update({id: self.updateDoc.id}, {$set: {"SlashData.thumbnailID": file._id}}))
      .catch(function(err) {
        defer.reject("Error updating Thumbnail Binary ID for " + self.updateDoc.id + " : " + err);
      })
      .done(function () {
        defer.resolve();
      });
  });
  //handle error due to writing
  writestream.on('error', function (err) {
    defer.reject('Error writing thumbnail stream to GridFS : ' + err);
  });
//Now actually pipe response into gfs writestream
  fs.createReadStream(self.thumbnail.path).pipe(writestream);

  return defer.promise;
};

module.exports = UpdateGPOitem;
