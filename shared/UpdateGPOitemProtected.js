var appRoot = appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');
//Have to pass the name of this new class as string if inheriting parent
//constructor
//var UpdateGPOitem = utilities.inheritClass(UpdateGPOgenericClass,"UpdateGPOitem");

var UpdateGPOgenericClass = require(appRoot + '/shared/UpdateGPOgeneric');
//Call parent constructor and then use child constructor stuff too
utilities.inheritClass(UpdateGPOgenericClass,UpdateGPOitemProtected);

//Name this function so that class name will come up in debugger, etc.
function UpdateGPOitemProtected(collections,session,config) {
  //Run the parent constructor first
  //"id" is the updateKey used for updating and "item" is just updateName which
  //is text used on errors, logging, etc
  this.__parent__.constructor
    .call(this,'id','item protected',collections.items,null,session,config);

  //New stuff now
  this.collections = collections;

  //The update fields here is only protect. Override what parent created
  this.updateFields = ['protected'];

  //Current Owner of item that will be updated
  this.updateOwner = null;
  //Update Folder for item needed
  this.updateFolder = null;

}

UpdateGPOitemProtected.prototype.checkPermission = function() {
  //Check if logged in user can update this item
  var self = this;
  var Q = require('q');

  var GPOid = self.updateDoc.id;

  var hasPermission = false;
  return Q(self.collection.findOne({id: GPOid},{fields: {owner: 1}}))
    .then(function(doc) {
      //If owner ID of this object is accessible by user then update otherwise
      //if (doc && self.session.user.ownerIDs.indexOf(doc.owner) >= 0) {
//Now only have to be admin to change protection level on any item if we can find the doc
      if (doc && self.user.isAdmin) {
        self.updateOwner = doc.owner;
        hasPermission = true;
      }else {
        hasPermission = false;
      }
    })
    //Have to get owner Folder to call protect endpoint on ESRI. Goofy that item can't be updated by id alone...
    .then(function() {
      //Don't even get the folder if user doesn't have permission
      if (hasPermission) {
        return self.getOwnerFolder(GPOid);
      }else {
        return false;
      }
    })
    .then(function() {
      return hasPermission;
    });

};

UpdateGPOitemProtected.prototype.getOwnerFolder = function(id) {
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


UpdateGPOitemProtected.prototype.getRemoteUpdateRequest = function(formData) {
  var fs = require('fs');
  var self = this;

  //Overwrite the form data that was passed in because we have custom fields that are different than local
  //For protect/unprotect don't need to pass anything so just make this empty
  formData = self.parseFormData({},[]);

  var updateFolder = self.updateFolder || '';
  if (updateFolder) {
    updateFolder = '/' + updateFolder;
  }

  //Have to get the protect or unprotect endpoint
  var endpoint = self.updateDoc.protected ? 'protect' : 'unprotect';

  var url = self.config.portal + '/sharing/rest/content/users/' +
    self.updateOwner + updateFolder + '/items/' + self.updateDoc.id + '/' + endpoint;
  var qs = {token: self.session.token,f: 'json'};
  //      Console.log(req.session.token);

  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: url, formData: formData, qs: qs };
  return requestPars;
};


//Creating child version of this to take care of Audit and thumbnail stuff
UpdateGPOitemProtected.prototype.updateLocal = function() {
  //Don't do anything locally for protect yet
  return false;
};


module.exports = UpdateGPOitemProtected;
