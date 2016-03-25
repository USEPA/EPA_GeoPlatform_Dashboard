var UpdateGPOitem =  function(itemscollection,extensionscollection,session,config,gfs){
//Current doc that will be updated
  this.updateDoc=null;
//The collection to update
  this.itemscollection=itemscollection;
//The collection to update
  this.extensionscollection=extensionscollection;
//The ownerIDs this user can update
  this.session=session;
//Config info passed in
  this.config=config;
//For saving to Grid FS
  this.gfs=gfs;
//Current Owner of item that will be updated
  this.updateOwner=null;
//Current SlashData object that will be updated
//  this.updateSlashData=null;
//Current thumbnail upload file object passed through
  this.thumbnail=null;
//This is result object for current doc
  this.resObject={};
//get appRoot
  this.appRoot = appRoot=require('app-root-path');
//These are fields on doc we can possibly update to GPO
  this.updateFields=require(appRoot + '/config/updateGPOitemFields');
//These are extension fields on doc we can possibly update
  this.updateExtensionFields=require(appRoot + '/config/updateGPOitemExtensionFields');
//initialize the audit object
  var AuditClass=require(appRoot + '/shared/Audit.js');
  this.audit = new AuditClass();

  this.utilities=require(appRoot + '/shared/utilities');
};


UpdateGPOitem.prototype.update = function(updateDoc) {
  var self = this;
  var Q = require('q');
  var fs = require('fs');

  if (updateDoc) self.updateDoc = updateDoc;

  self.resObject={};

  return self.getOwnerID()
    .then(function (ownerID) {
      if (self.updateOwner) {
//Update Local and Remote GPO item in DB including thumbnail
        return Q.all([self.updateRemoteGPOitem(),self.updateLocalGPOitem()]);
//          return Q(self.updateRemoteGPOitem());
      }else {
        self.resObject={error: {message: "You do not have Access to Update GPO item: " + self.updateDoc.id, code: "InvalidAccess"}, body: null};
      }})
    .catch(function (err) {
      console.error("Error running UpdateGPOitem.update for " + self.updateDoc.id + " : " + err.stack) ;
      self.utilities.getHandleError(self.resObject,"UpdateError")(err);
    })
    .then(function () {if (self.thumbnail && self.thumbnail.path) return Q.ninvoke(fs,"unlink",self.thumbnail.path)})
    .catch(function (err) {
      console.error("Error removing thumb in UpdateGPOitem.update for " + self.updateDoc.id + " : " + err.stack) ;
      self.utilities.getHandleError(self.resObject,"UpdateError")(err);
    })
    .then(function () {
//Now that update is done we can finally return result
      return self.resObject;
    });
};

UpdateGPOitem.prototype.getOwnerID = function() {
  var self = this;
  var Q = require('q');

  var GPOid = self.updateDoc.id;
  return Q(self.itemscollection.findOne({id:GPOid},{fields:{owner:1}}))
//Don't need to update all the slash data just to update the thumbnailID
//  return Q(self.itemscollection.findOne({id:GPOid},{fields:{owner:1,SlashData:1}}))
    .then(function (doc) {
//Make sure SlashData is at least an empty object for updating later
//Don't need to update all the slash data just to update the thumbnailID
//      self.updateSlashData = doc.SlashData || {};
//If owner ID of this object is accessible by user then update otherwise return error
      if (self.session.ownerIDs.indexOf(doc.owner)>=0) {
        self.updateOwner = doc.owner;
        return doc.owner;
      }else {
        return null;
      }
    });
};

UpdateGPOitem.prototype.updateRemoteGPOitem = function() {
  var self = this;
  var Q = require('q');

  var fs = require('fs');
//module to deal with requests easier
  var hrClass = require(self.appRoot + '/shared/HandleGPOresponses');
  var hr = new hrClass();

//Want own copy of the update doc to for formdata to add thumbnail to
  var formData = self.parseFormData(self.updateDoc,self.updateFields);
//If there are no fields in update Doc that are editable then return false (eg. maybe they are only passing extensions)
  if (Object.keys(formData).length < 1) return self.handleUpdateResponse("");

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

  return hr.callAGOL(requestPars)
    .then(function (body) {return self.handleUpdateResponse(body)});

};

UpdateGPOitem.prototype.parseFormData = function (obj,slice) {
  var mySlice = {};

  slice.forEach(function (key) {
    if (Array.isArray(obj[key])) {
      mySlice[key] =obj[key].join(",");
    }else{
//needs to be at least empty string
      mySlice[key] = obj[key] || "";
    }
  });

  return mySlice;
};

UpdateGPOitem.prototype.handleUpdateResponse= function(body) {
  this.resObject = {error: null, body: {}};
  return this.resObject;
};

UpdateGPOitem.prototype.updateLocalGPOitem= function() {
  var self = this;
  var Q = require('q');
  var merge = require('merge');

//Only update items that we are using
  var updateDocID = self.updateDoc.id;
//First need to get only the item extensions such as EDG we will be updating in Extensions collection
  self.updateDocExtensions=self.utilities.sliceObject(self.updateDoc,self.updateExtensionFields);
//Now keep only the GPOitem and extension fields we will update
  self.updateDoc=self.utilities.sliceObject(self.updateDoc,self.updateFields.concat(self.updateExtensionFields));

  //If there are no GPO fields or GPO extension in fields in updateDoc then don't need to do anything
  var updateDocLength = Object.keys(self.updateDoc).length;
  var updateDocExtensionsLength = Object.keys(self.updateDocExtensions).length;
  if (updateDocLength < 1 && updateDocExtensionsLength < 1) return false;

//Get the doc and do audit before updating
// audit
  return Q(self.itemscollection.findOne({id:updateDocID}, {}))
    .then(function (doc) {
//merge the updated info into the existing doc in DB before validating
      merge.recursive(doc, self.updateDoc);
      self.audit.validate(doc);
      self.updateDoc.AuditData=doc.AuditData;
      return doc.id;
    })
    .then(function (foundID) {
      //make sure the id exists before we add item or extension data for it
      if (foundID != updateDocID ) return false;
      return Q.all([
        function () {
          if (updateDocLength < 1) return false;
          return Q(self.itemscollection.update({id:updateDocID},{$set:self.updateDoc}));
        }(),
//This will upsert only the extensions collection
        function () {
          if (updateDocExtensionsLength < 1) return false;
          return Q(self.extensionscollection.update({id:updateDocID},{$set:self.updateDocExtensions},{upsert:true}));
        }(),
        self.saveThumbnailToGridFS()
      ]);
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

    Q(self.itemscollection.update({id: self.updateDoc.id}, {$set: {"SlashData.thumbnailID": file._id}}))
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
