var appRoot = appRoot=require('app-root-path');
var utilities=require(appRoot + '/shared/utilities');

var UpdateGPOgenericClass=require(appRoot + '/shared/UpdateGPOgeneric');
//call parent constructor and then use child constructor stuff too
utilities.inheritClass(UpdateGPOgenericClass,UpdateGPOuser);

//Name this function so that class name will come up in debugger, etc.
function UpdateGPOuser(collection,extensionsCollection,session,config){
//run the parent constructor first
//"user" is the updateKey used for updating and "user" is just updateName which is text used on errors, logging, etc
  this.__parent__.constructor.call(this,"username","user",collection,extensionsCollection,session,config);

//Nothing extra in constructor for UpdateGPOuser

}

UpdateGPOuser.prototype.checkPermission = function() {
//Check if logged in user can update this user
  var self = this;
  var Q = require('q');

  var hasPermission = false;
//user can see this username they can modify it
  if (self.session.ownerIDs.indexOf(self.updateDoc.username)>=0) return Q.fcall(function () {return true});
//If logged in user is not admin then can not modify external user
  if (! self.session.user.isAdmin) return Q.fcall(function () {return false});
//If external user and logged in user is admin then they can modifiy it
  return Q(self.userscollection.findOne({username:self.updateDoc.username}, {isExternal:1}))
    .then(function (doc) {
      return doc.isExternal;
    });
};

//This just here for the future for now
UpdateGPOuser.prototype.getRemoteUpdateRequest = function(formData) {
  var fs = require('fs');
  var self = this;

//Need to find the API URL for updating user when we decided to do this
  var url= self.config.portal + '/sharing/rest/content/users/' + formData.username ;
//      console.log(url);
  var qs = {token: self.session.token,f:'json'};
//      console.log(req.session.token);

//Pass parameters via form attribute
  var requestPars = {method:'post', url:url, formData:formData, qs:qs };
  return requestPars;
};

UpdateGPOuser.prototype.getRemoteUpdateRequest = null;


module.exports = UpdateGPOuser;
