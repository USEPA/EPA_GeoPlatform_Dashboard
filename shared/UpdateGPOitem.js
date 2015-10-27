var UpdateGPOitem =  function(itemscollection,session,config,gfs){
//Current doc that will be updated
  this.updateDoc=null;
//The collection to update
  this.itemscollection=itemscollection;
//The ownerIDs this user can update
  this.session=session;
//Config info passed in
  this.config=config;
//For saving to Grid FS
  this.gfs=gfs;
//Current Owner of item that will be updated
  this.updateOwner=null;
//Current SlashData object that will be updated
  this.updateSlashData=null;
//Current thumbnail upload file object passed through
  this.thumbnail=null;
//This is result object for current doc
  this.resObject={};
};


UpdateGPOitem.prototype.update = function(updateDoc) {
  var self = this;
  var Q = require('q');
  var fs = require('fs');
  var appRoot=require('app-root-path');
  var utilities=require(appRoot + '/shared/utilities');

  if (updateDoc) self.updateDoc = updateDoc;

  self.resObject={};

    return self.getOwnerID()
      .then(function (ownerID) {
        if (self.updateOwner) {
//Update Local and Remote GPO item in DB including thumbnail
          return Q.all([self.updateRemoteGPOitem(),self.updateLocalGPOitem()]);
        }else {
          self.resObject={error: {message: "You do not have Access to Update GPO item: " + self.updateDoc.id, code: "InvalidAccess"}, body: null};
        }})
      .catch(function (err) {
        console.error("Error running UpdateGPOitem.update for " + updateDoc.id + " : " + err.stack) ;
        utilities.getHandleError(self.resObject,"UpdateError")(err);
      })
      .then(function () {if (self.thumbnail && self.thumbnail.path) return Q.ninvoke(fs,"unlink",self.thumbnail.path)})
      .catch(function (err) {
        console.error("Error removing thumb in UpdateGPOitem.update for " + updateDoc.id + " : " + err.stack) ;
        utilities.getHandleError(self.resObject,"UpdateError")(err);
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
  return Q(self.itemscollection.findOne({id:GPOid},{fields:{owner:1,SlashData:1}}))
    .then(function (doc) {
//Make sure SlashData is at least an empty object for updating later
      self.updateSlashData = doc.SlashData || {};
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
  var merge = require('merge');
//module to deal with requests easier
  var appRoot=require('app-root-path');
  var hrClass = require(appRoot + '/shared/HandleGPOresponses');
  var hr = new hrClass();

//Want own copy of the update doc to for formdata to add thumbnail to
  var formData = merge.recursive(true, self.updateDoc);

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

UpdateGPOitem.prototype.handleUpdateResponse= function(body) {
  this.resObject = {error: null, body: {}};
  return this.resObject;
};

UpdateGPOitem.prototype.updateLocalGPOitem= function() {
  var Q = require('q');

  return Q.all([
    Q(this.itemscollection.update({id:this.updateDoc.id},{$set:this.updateDoc})),
    this.saveThumbnailToGridFS()
  ]);

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
    self.updateSlashData.thumbnailID = file._id;

    Q(self.itemscollection.update({id: self.updateDoc.id}, {$set: {SlashData: self.updateSlashData}}))
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
