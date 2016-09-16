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

  if(self.updateDoc.approval.status == 'approved'){

    return Q(self.checklistCollection.findById(self.updateDoc["_id"],{fields:{'submission':1}}))
        .then(function (doc) {
          return self.itemsCollection.find({id:{$in:doc.submission.items}}, {fields:{'title':1, 'id': 1}}).then(function(titles){
            return self.usersCollection.find({username:{$in:[doc.submission.owner, self.updateDoc.approval.admin]}},{fields:{'fullName':1, 'email':1}}).then(function(fullnames){

              var mustache = require('mustache');
              //create object with fields and arrays to render in email
              var templateFields = {
                'ContentOwner': fullnames[0].fullName,
                'contentOwnerEmail': fullnames[0].email,
                'geoPlatformAdmin': fullnames[1].fullName,
                'geoplatformAdminEmail': fullnames[1].email,
                'AuthGroup': doc.submission.authGroup,
                'titles' : titles,
              }

              //read the template from file.
              var fs = require('fs');
              Q.ninvoke(fs,'readFile',appRoot + '\\templates\\emails\\ISO_IMO_approval.txt','utf8')
                  .then(function (template){
                    mustache.parse(template);
                    body = mustache.render(template,templateFields);
                    return body;
                  })
                  .then(function (body){
                    //CreateEmailObject
                    var sendEmail = require(appRoot+'/shared/sendEmail');

                    var fromAddress = 'dyarnell@innovateteam.com';//FromAddress
                    var toAddress = self.updateDoc.approval.IMOemail + ',' + self.updateDoc.approval.ISOemail;
                    var emailSubject = 'Request for GPO Item to be made Public';//EmailsSubject
                    var emailBody = body;
                    var html = body;

                    return sendEmail.send(fromAddress,toAddress, emailSubject, emailBody, html)
                  });
            });
          }).catch(function(error){
            console.error('Error Sending Email');
            self.utilities.getHandleError(self.resObject,'UpdateError')(err);
          });
  });
  }
};

module.exports = UpdateGPOchecklist;
