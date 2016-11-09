var appRoot = appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');
//Have to pass the name of this new class as string if inheriting parent
//constructor
//var UpdateGPOitem = utilities.inheritClass(UpdateGPOgenericClass,"UpdateGPOitem");

var UpdateGPOgenericClass = require(appRoot + '/shared/UpdateGPOgeneric');
//Call parent constructor and then use child constructor stuff too
utilities.inheritClass(UpdateGPOgenericClass,UpdateGPOitemAccess);

//Name this function so that class name will come up in debugger, etc.
function UpdateGPOitemAccess(collections,session,config) {
  //Run the parent constructor first
  //"id" is the updateKey used for updating and "item" is just updateName which
  //is text used on errors, logging, etc
  this.__parent__.constructor
    .call(this,'id','item access',collections.items,null,session,config);

  //New stuff now
  this.collections = collections;

  //The update fields here is only access. Override what parent created
  this.updateFields = ['access','AuditData'];

  //Note this.appRoot should be loaded from parent constructor
  //initialize the audit object
  var AuditClass = require(this.appRoot + '/shared/Audit.js');
  this.audit = new AuditClass();
}

UpdateGPOitemAccess.prototype.checkPermission = function() {
  //Check if logged in user can update these items (and get the checklist items)
  var self = this;
  var Q = require('q');

  //If logged in user is admin they have permission
  if (self.user.isAdmin) {
    //hit db to get the authgroup for checklist approving
    return Q(self.collections.checklists.findById(self.updateDoc.checkListID,{fields:{'submission.items':1,'submission.authGroup':1}}))
      .then(function (doc) {
        //Set the items that will go public (actually a list of ids but the key for the update will be id)
        if (doc) {
          self.updateDoc.id = doc.submission.items;
          self.updateDoc.access = 'public';
          return true;
          //has perms if admin in authgroup on checklist
          //Actually as long as there is a doc let admins change access now
          //return self.user.authGroups.indexOf(doc.submission.authGroup) > -1 ;
        } else {
          return false;
        }
      });
  } else {
    return false;
  }
};


UpdateGPOitemAccess.prototype.getRemoteUpdateRequest = function(formData) {
  var fs = require('fs');
  var self = this;

  //Overwrite the form data that was passed in because we have custom fields that are different than local
  formData = self.parseFormData({everyone:"true",items:self.updateDoc.id},["everyone","items"]);

  var url = self.config.portal + '/sharing/rest/content/users/' +
    self.user.username + '/shareItems';
  console.log(url);
  var qs = {token: self.session.token,f: 'json'};
  //      Console.log(req.session.token);

  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: url, formData: formData, qs: qs };
  return requestPars;
};


//Creating child version of this to take care of Audit and thumbnail stuff
UpdateGPOitemAccess.prototype.updateLocal = function() {
  var self = this;
  var Q = require('q');
  var merge = require('merge');

  //Have to get the items we are updating to do an audit on them
  var updateDocIDs = self.updateDoc[self.updateKey];
  var queryCommand = {};
  queryCommand[self.updateKey] = {$in:updateDocIDs};

  //This is to save to access change log
  var accessDocs = [];
  var changeTime =  (new Date()).getTime();

  //Get the FULL doc and do audit before updating
  //audit
  //Note: slash data not used in audit yet so this might speed up query
  return Q(self.collection.find(queryCommand, {SlashData: 0}))
    .then(function(fullDocs) {
      if (!fullDocs) {
        throw new Error('Error updating Local GPO item. Could not find items with ids = ' + updateDocIDs );
      }
      //Have to audit before updating
      //merge the updated info into the existing doc in DB before auditing
      fullDocs.forEach(function (doc) {
        var accessDoc = {id:doc.id,datetime:changeTime,old:doc.access,new:'public',type:'checklist'};
        if (accessDoc.old != accessDoc.new) accessDocs.push(accessDoc);
        //basically need to make access=public only
        doc.access = 'public';
        self.audit.validate(doc);
        self.updateDoc.AuditData = doc.AuditData;
      });

      //Use the parent version of updateLocalGPO to do the standard update of
      //DB part
      //have to run in the scope of this not the scope of parent
      return self.__parent__.updateLocal.call(self);
    })
//Now insert the access change to mongo access collection
    .then(function () {
      if (accessDocs.length > 0) return Q(self.collections.access.insert(accessDocs));
      return;      
    })

};


module.exports = UpdateGPOitemAccess;
