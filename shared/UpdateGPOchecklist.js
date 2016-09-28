var appRoot = appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');

var UpdateGPOgenericClass = require(appRoot + '/shared/UpdateGPOgeneric');
//Call parent constructor and then use child constructor stuff too
utilities.inheritClass(UpdateGPOgenericClass,UpdateGPOchecklist);

//Name this function so that class name will come up in debugger, etc.
//Note the checklistCollection will be passed for extensionCollection into parent so it can do upserts
//Also need itemsCollections to check for owners of items
function UpdateGPOchecklist(collections,session,config) {
  //Run the parent constructor first
  // "_id" is the updateKey used for updating checklists
  // "checklist" is just updateName which is text used on errors, logging, etc
  this.__parent__.constructor.call(
      this,
      '_id',
      'checklist',
      //Don't need to pass collection because checklist collection passed as extensions collection for upserts
      null,
      collections.checklists,
      session,
      config
  );

  this.collections = collections;
  //Have access to these here for checking permissions, getting ObjectID etc
  this.checklistCollection = collections.checklists;
  this.itemsCollection = collections.items;
  this.usersCollection = collections.users;
}

UpdateGPOchecklist.prototype.checkPermission = function() {
  //Check if logged in user can update this user
  var self = this;
  var Q = require('q');

  //If user not created then don't go on. getUserFromSession(res) already sent login error message to user
  if (self.user) {
    //If this ia an insert then it can only be original user submission
    if (!self.updateDoc["_id"]) {
      return self.checkSubmissionInsert();
    } else {
    //If this is an update check if it is approval or submission update
      if ('approval' in self.updateDoc) {
          return self.checkApproval();
      } else {
          return self.checkSubmissionUpdate();
      }
    }
  }else {
    return Q.fcall(function() {return false});
  }

};

UpdateGPOchecklist.prototype.checkSubmissionInsert = function() {
  //Check if logged in user can update this user
  var self = this;
  var Q = require('q');

  //submission should only have approval.status=pending
  self.updateDoc.approval={status:'pending'};
  //First check if only one owner for these items and it is equal to logged in user
  return self.getItemsOwners(self.updateDoc.submission.items)
    .then(function (owners) {
      if (owners.length==1 && owners[0]==self.user.username && self.user.authGroups.indexOf(self.updateDoc.submission.authGroup) > -1) {
        //Only has perms if logged in user is ONLY owner on items and logged in user is in authgroup passed
        //Also force the passed owner to correpsond to logged in owner
        self.updateDoc.submission.owner = self.user.username;
        //Force the submit date to today
        self.updateDoc.submission.submitDate = new Date();
        //Actually need to get an ObjectID for _id so that it will insert when it doesn't find it (upsert) otherwise query was {_id:undefined} which actually found first value
        self.updateDoc['_id'] = self.checklistCollection.id();
        //return permission of true
        return true
      } else {
        //Doesn't have permission since either more than one owner and/or owner is not logged in user
        return false;
      }
    })
};

UpdateGPOchecklist.prototype.checkApproval = function() {
  //Check if logged in user can update this user
  var self = this;
  var Q = require('q');

  //No need to have admin changing submission info on approval
  delete self.updateDoc.submission;
  //If logged in user is admin and also in authgroup on checklist they have permission
  if (self.user.isAdmin) {
    //hit db to get the authgroup for checklist approving
    return Q(self.checklistCollection.findById(self.updateDoc["_id"],{fields:{'submission.authGroup':1}}))
      .then(function (doc) {
        //Also force the passed admin to correpsond to logged in admin
        self.updateDoc.approval.admin = self.user.username;
        //Force the approval status date to today
        self.updateDoc.approval.statusDate = new Date();
        //has perms if admin in authgroup on checklist
        return doc && self.user.authGroups.indexOf(doc.submission.authGroup) > -1 ;
      });
  } else {
    return false;
  }
};

UpdateGPOchecklist.prototype.checkSubmissionUpdate = function() {
  //Check if logged in user can update this user
  var self = this;
  var Q = require('q');

  //For now don't allow submission update
  // Later this can be chnaged to at least allow submission update to trigger status change from rejected to pending when they fix stuff
  return false;
};


UpdateGPOchecklist.prototype.getItemsOwners = function(items) {
  //Get the owners for this items list
  var self = this;
  var Q = require('q');

  //Get distinct owners in the item id list
  return self.utilities.getDistinctArrayFromDB(self.itemsCollection,{id:{$in:items}},'owner');

};

UpdateGPOchecklist.prototype.getExistingItems = function(items) {
  //Get list of ids that exist in data base (use distinct even though id should be unique)
  var self = this;
  var Q = require('q');

  //Get distinct id in the item id list (should always be distinct but just to make sure)
  return self.utilities.getDistinctArrayFromDB(self.itemsCollection,{id:{$in:items}},'id');
};

UpdateGPOchecklist.prototype.onUpdateSuccess = function(){
  var self = this;
  var Q = require('q');

  //This is the full version of the doc in the DB. the UpdateDoc could just be partial as for approval
  var dbDoc = null;
  if(self.updateDoc.approval.status == 'approved'){

    return Q(self.checklistCollection.findById(self.updateDoc["_id"],{}))
      .catch(function(error){
        throw(new Error('Error Getting Full Doc From DB When Approving'));
      })
      .then(function (doc) {
        dbDoc = doc;
//Actually make the thing public first and then send the email if it goes through
        return self.makePublic(dbDoc)
      })
      .then(function () {
        return self.sendIsoImoEmail(dbDoc);
      })
      .catch(function(error){
        console.error('Error UpdateGPOChecklist.onUpdateSuccess');
        self.utilities.getHandleError(self.resObject,'UpdateError')(error);
      });
  }
};
UpdateGPOchecklist.prototype.makePublic = function(dbDoc){
  var self = this;
  var Q = require('q');

  //create object with fields and arrays to render in email
  //add date as it is read in from mongo through promise chain
  var templateFields = {};

  if(self.updateDoc.approval.status == 'approved'){

    var UpdateGPOclass = require(appRoot + '/shared/UpdateGPOitemAccess');

    //This function will get the Update Class Instance needed to run .update
    var updateAccess = new UpdateGPOclass(self.collections, self.session, self.config);

    //Just need to supply the checkListID so that all items on that checklist will be made public
    return updateAccess.update({checkListID:self.updateDoc["_id"]})
      .then(function() {
        //If error in the class then throw it to be caught
        if (updateAccess.resObject.errors.length>0) throw(updateAccess.resObject.errors);
      })
      .catch(function(error){
        throw(new Error('Error Making Items Public on GPO'));
      })
  }
};

UpdateGPOchecklist.prototype.sendIsoImoEmail = function(){
  var self = this;
  var Q = require('q');
  var fs = require('fs');
  var mustache = require('mustache');
  var sendEmail = require(appRoot+'/shared/sendEmail');

  //create object with fields and arrays to render in email
  //add date as it is read in from mongo through promise chain
  var templateFields = {};

  //Don't try to send email if emails aren't supplied
  if (! self.updateDoc.approval.IMOemail && ! self.updateDoc.approval.ISOemail) return;

  if(self.updateDoc.approval.status == 'approved'){
//Actually make the thing public first and then send the email if it goes through
    return Q(self.checklistCollection.findById(self.updateDoc["_id"],{fields:{'submission':1}}))
      .then(function (doc) {
        templateFields.AuthGroup = doc.submission.authGroup;
        templateFields.owner = doc.submission.owner;
        return self.itemsCollection.find({id: {$in: doc.submission.items}}, {fields: {'title': 1, 'id': 1}})
      })
      .then(function(titles){
        templateFields.titles = titles;
        return self.usersCollection.find({username:{$in:[templateFields.owner, self.updateDoc.approval.admin]}},{fields:{'username':1, 'fullName':1, 'email':1}})
      })
      .then(function(users) {
        //Not sure what order the owner and admin will be in so have to determin which user object is which
        if (users[0].username == templateFields.owner) {
          templateFields.owner = users[0];
          //If submitter and approver is same person then users.length=1
          templateFields.admin = users[1] || users[0];
        } else {
          templateFields.owner = users[1];
          templateFields.admin = users[0];
        }

        //read the template from file.
        return Q.ninvoke(fs, 'readFile', appRoot + '\\templates\\emails\\ISO_IMO_approval.txt', 'utf8')
      })
      .then(function (template){
        mustache.parse(template);
        var emailBody = mustache.render(template,templateFields);
        //CreateEmailObject

        var fromAddress = self.config.email.defaultFrom;//FromAddress in config file
        var toAddress = self.updateDoc.approval.IMOemail + ',' + self.updateDoc.approval.ISOemail;
        var emailSubject = 'Request for GPO Item to be made Public';//EmailsSubject
        var html = emailBody;

        return sendEmail.send(fromAddress,toAddress, emailSubject, emailBody, html)
      })
      .catch(function(error){
        throw(new Error('Error Sending Checklist IMO/ISO Email'));
      });
  }
};

module.exports = UpdateGPOchecklist;
