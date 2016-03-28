var UpdateGPOuser =  function(userscollection,extensionscollection,session,config){
//Current doc that will be updated
  this.updateDoc=null;
//The collection to update
  this.userscollection=userscollection;
//The collection to update
  this.extensionscollection=extensionscollection;
//The ownerIDs this user can update
  this.session=session;
//Config info passed in
  this.config=config;
//This is result object for current doc
  this.resObject={};
//get appRoot
  this.appRoot = appRoot=require('app-root-path');
//These are fields on doc we can possibly update
  this.updateFields=require(appRoot + '/config/updateGPOuserFields');
//These are the extension fields on doc we can possibly update
  this.updateExtensionFields=require(appRoot + '/config/updateGPOuserExtensionFields');

  this.utilities=require(appRoot + '/shared/utilities');
};


UpdateGPOuser.prototype.update = function(updateDoc) {
  var self = this;
  var Q = require('q');

  if (updateDoc) self.updateDoc = updateDoc;

  return self.checkPermission()
    .then(function (hasPermission) {
        if (hasPermission) {
  //Update Local and Remote GPO user in DB
          return Q.all([self.updateRemoteGPOuser(),self.updateLocalGPOuser()]);
        }else {
          self.resObject={error: {message: "You do not have Access to Update GPO user: " + self.updateDoc.username, code: "InvalidAccess"}, body: null};
          return false;
        }
      })
    .catch(function (err) {
      console.error("Error running UpdateGPOuser.update for " + self.updateDoc.username + " : " + err.stack) ;
      self.utilities.getHandleError(self.resObject,"UpdateError")(err);
    })
    .then(function () {
//Now that update is done we can finally return result
      return self.resObject;
    });
};

UpdateGPOuser.prototype.checkPermission = function() {
//Check if logged in user can update this user
  var self = this;
  var Q = require('q');

  var hasPermission = false;
//user can see this username they can modify it
  if (self.session.ownerIDs.indexOf(self.updateDoc.username)>=0) return Q.fcall(function () {return true});
//If logged in user is not admin then can not modify external user
  if (! self.session.user.isAdmin) return Q.fcall(function () {return false});
//If external user and logged in user is adimin then they can modifiy it
  return Q(self.userscollection.findOne({username:self.updateDoc.username}, {isExternal:1}))
    .then(function (doc) {
      return doc.isExternal;
    });
};

UpdateGPOuser.prototype.updateRemoteGPOuser = function() {
//for now do nothing remotely
  return true;

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

//  var url= self.config.portal + '/sharing/rest/content/users/' + self.updateOwner + '/items/' + self.updateDoc.id + '/update';
//Need to find the REST api user for updating user
  var url= self.config.portal + '/sharing/rest/content/users/';

//      console.log(url);
  var qs = {token: self.session.token,f:'json'};
//      console.log(req.session.token);

//Pass parameters via form attribute
  var requestPars = {method:'post', url:url, formData:formData, qs:qs };

  return hr.callAGOL(requestPars)
    .then(function (body) {return self.handleUpdateResponse(body)});

};

UpdateGPOuser.prototype.parseFormData = function (obj,slice) {
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

UpdateGPOuser.prototype.handleUpdateResponse= function(body) {
  this.resObject = {error: null, body: {}};
  return this.resObject;
};

UpdateGPOuser.prototype.updateLocalGPOuser= function() {
  var self = this;
  var Q = require('q');
  var merge = require('merge');

//need username as key for updating
  var updateUsername =  self.updateDoc.username;
//Ge update command for normal GPO user fields and the extensions that both will be saved in Extensions collection
  var UpdateCommand= self.getUpdateCommand(self.updateDoc,self.mergeFieldMaps(self.updateFields,self.updateExtensionFields));
//Get update command with set and push of arrays for item extensions such as sponsorship that will be saved in Extensions collection
  var ExtensionsUpdateCommand= self.getUpdateCommand(self.updateDoc,self.updateExtensionFields);

  if (! ExtensionsUpdateCommand && ! UpdateCommand) return false;

  return Q.all([
    function () {
      if (! UpdateCommand) return false;
      return Q(self.userscollection.update({username:updateUsername},UpdateCommand));
    }(),
//This will upsert only the extensions collection
    function () {
      if (! ExtensionsUpdateCommand) return false;
      return Q(self.extensionscollection.update({username:updateUsername},ExtensionsUpdateCommand,{upsert:true}));
    }()
  ]);

};

UpdateGPOuser.prototype.mergeFieldMaps = function(map1,map2) {
  var merge = require('merge');
  var fullmap1 = map1;
  var fullmap2 = map2;
  if (Array.isArray(map1)) fullmap1 = {fields:map1};
  if (Array.isArray(map2)) fullmap2 = {fields:map2};

  var mergedMap = {};
//first have to concatenate the map.fields arrays together
  var fields = [];
  if (fullmap1.fields) fields = fields.concat(fullmap1.fields);
  if (fullmap2.fields) fields = fields.concat(fullmap2.fields);
  if (fields.length>0) mergedMap.fields = fields;
//then we can merge the map.arrays object togehter
  var arrays = true;
  if (map1.arrays) arrays = merge(arrays,map1.arrays);
  if (map2.arrays) arrays = merge(arrays,map2.arrays);
  if (arrays !== true) mergedMap.arrays = arrays;
  return mergedMap;
};

UpdateGPOuser.prototype.getUpdateCommand= function(updateDoc,fieldsMap) {
  var updateCommand = {};

  var arrayMap = null;
  var fields = null;
//can also just pass fields as array if we aren't passing array items to push to array
  if (Array.isArray(fields)) {
    fields = fieldsMap;
  }else {
//in this case pass an object like {fields:[field1,field2],arrays:{item1:array1,item2:array2}}
    if ("fields" in fieldsMap) fields = fieldsMap.fields;
    if ("arrays" in fieldsMap) arrayMap = fieldsMap.arrays;
  }
//now slice out the fields
  if (fields) {
    var setCommand = this.utilities.sliceObject(updateDoc,fields);
    if (Object.keys(setCommand).length>0) updateCommand["$set"] = setCommand;
  }

//now slice out the arrays to push
  if (arrayMap) {
    var pushCommand = {};
    Object.keys(arrayMap).forEach(function (item) {
      if (item in updateDoc) pushCommand[arrayMap[item]] = updateDoc[item];
    });
    if (Object.keys(pushCommand).length>0) updateCommand["$push"] = pushCommand;
  }

//check if push and set have similar keys
  var arrayExtended = require('array-extended');
  var commonFields = arrayExtended.intersect(Object.keys(setCommand), Object.keys(pushCommand));
  if (commonFields.length>0) throw Error("Error updating " + commonFields + ".Updating full array and adding item at same time is not allowed.");

//if at least a set or push command then return object otherwise just return null
  if (Object.keys(updateCommand).length>0) return updateCommand;
  return null;
};

module.exports = UpdateGPOuser;
