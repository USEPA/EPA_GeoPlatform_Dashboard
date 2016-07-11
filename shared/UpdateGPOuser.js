var appRoot = appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');

var UpdateGPOgenericClass = require(appRoot + '/shared/UpdateGPOgeneric');
//Call parent constructor and then use child constructor stuff too
utilities.inheritClass(UpdateGPOgenericClass,UpdateGPOuser);

//Name this function so that class name will come up in debugger, etc.
function UpdateGPOuser(collection,extensionsCollection,session,config) {
  //Run the parent constructor first
  //"user" is the updateKey used for updating and "user" is just updateName
  //which is text used on errors, logging, etc
  this.__parent__.constructor.call(
      this,
      'username',
      'user',
      collection,
      extensionsCollection,
      session,
      config
  );

  //Nothing extra in constructor for UpdateGPOuser

}

UpdateGPOuser.prototype.checkPermission = function() {
  //Check if logged in user can update this user
  var self = this;
  var Q = require('q');

  var hasPermission = false;
  //User can see this username they can modify it
  if (self.session.user.ownerIDs.indexOf(self.updateDoc.username) >= 0) {
    return Q.fcall(function() {return true});
  }
  //If logged in user is not admin then can not modify external user
  if (!self.session.user.isAdmin) {
    return Q.fcall(function() {return false});
  }
  //If external user and logged in user is admin then they can modifiy it
  return Q(self.collection.findOne({username: self.updateDoc.username},{isExternal: 1}))
    .then(function(doc) {
      //If username not found then return false (maybe have error later but
      //should we expose this type of lookup?)
      if (!doc) {
        return false;
      }
      return doc.isExternal;
    });
};

//In the future we might want to update user info and add the authgroup and will
//probably have to just over ride entire parent updateRemote function
UpdateGPOuser.prototype.getRemoteUpdateRequest = function(formData) {
  var self = this;

  //For now we are only adding the authGroup here
  if (!self.updateDoc.authGroup) {
    return null;
  }

  //Need to find the auth group ID that we are adding user to . using require
  //reload so we don't have to restart EGAM if authGroup added can change later
  //when stable
  var requireReload = require('require-reload')(require);
  var authGroupIDs = requireReload(self.appRoot + '/config/authGroups.js').ids;
  if (!authGroupIDs[self.updateDoc.authGroup]) {
    console.log('self.updateDoc.authGroup does not exist: ' +
        JSON.stringify(self.updateDoc));
  }
  var authGroupID = authGroupIDs[self.updateDoc.authGroup].id;
  if (!authGroupID) {
    return null;
  }

  var url = self.config.portal + '/sharing/rest/community/groups/' +
      authGroupID + '/addUsers';

  //Just over ride the formData passed in here. All we will be updating is user
  //to group
  formData = {users: self.updateDoc.username};

  //Console.log(url);
  var qs = {token: self.session.token,f: 'json'};
  //Console.log(req.session.token);

  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: url, formData: formData, qs: qs };
  return requestPars;
};


module.exports = UpdateGPOuser;
