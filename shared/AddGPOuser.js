var appRoot = appRoot = require('app-root-path');
var utilities = require(appRoot + '/shared/utilities');
var Q = require('Q');

var UpdateGPOgenericClass = require(appRoot + '/shared/UpdateGPOgeneric');
//Call parent constructor and then use child constructor stuff too
utilities.inheritClass(UpdateGPOgenericClass,AddGPOuser);

//Name this function so that class name will come up in debugger, etc.
function AddGPOuser(collections,session,config) {
  //Run the parent constructor first
  // "username" is the updateKey used for updating
  // "user" is just updateName which is text used on errors, logging, etc
  this.__parent__.constructor.call(
      this,
      'username',
      'user',
    //Don't need to pass collection because user collection passed as extensions collection to allow upserts
    //Kind of a trick because this is used to insert external users
      null,
      collections.users,
      session,
      config
  );

  this.collections = collections;

  //Note: no need to pass the ownerID's collection. this call updateAuthGroup to update the extra fields like email,role but doesn't need to update ownerIDs collection because new user won't be in authGroup yet
  var updateAuthGroupsAndOwnerIDsClass = require(appRoot + '/shared/UpdateAuthGroupsAndOwnerIDs');
  this.updateAuthGroupsAndOwnerIDs = new updateAuthGroupsAndOwnerIDsClass(
    collections.users, null, appRoot + '/config/authGroups.js');

}

AddGPOuser.prototype.addExternal = function(addDoc) {
  var self = this;

  if (!self.session.user.isAdmin) {
    self.utilities.getHandleError(self.resObject,'InvalidAccess')
    ('You do not have Access to Add External User ');
    return Q.fcall(function() {return false});
  }

  //If no AddDoc passed then return error
  if (!addDoc || typeof addDoc != 'object') {
    self.utilities.getHandleError(self.resObject,'AddDocMissing')
    ('Add doc for ' + self.updateName + ' is missing or not an object ');
    return Q.fcall(function() {return false});
  }

  //Email has to be epa.gov email for external users
  if (/@[^@]*epa\.gov$/i.test(addDoc.email)) {
    self.utilities.getHandleError(self.resObject,'NotExternalUserEmail')
    ('Email for ' + self.updateName + ' can not be epa.gov email for external user.');
    return Q.fcall(function() {return false});
  }

  //Require FullName and Email
  if (! addDoc.firstname || ! addDoc.lastname || ! addDoc.email) {
    self.utilities.getHandleError(self.resObject,'RequiredFieldsMissing')
    ('First Name, Last Name and Email is required for external user.');
    return Q.fcall(function() {return false});
  }

  //If there is no username passed then use first and last name get username (lastfirst_EPAEXT)
  //ESRI uses email to get username in it's "suggestion" but EPA wants last and first
  if (! addDoc.username) {
    addDoc.username = addDoc.lastname.toLowerCase() + '.' + addDoc.firstname.toLowerCase() + '_EPAEXT';
  }

  //If passed username does not have _EPAEXT at end then force it to do so
  if (! /_EPAEXT$/.test(addDoc.username)) {
    addDoc.username += '_EPAEXT';
  }

  if (addDoc) {
    self.updateDoc = addDoc;
  }

  return self.checkUsername(addDoc.username)
    .then(function(suggested) {
      if (! self.resObject.body) self.resObject.body = {};
      self.resObject.body.requested = addDoc.username;
      if (suggested) {
        self.utilities.getHandleError(self.resObject,'UsernameTaken')
        (self.updateName + ' ' + addDoc.username + ' is already in system. Try suggested username: ' + suggested);
        self.resObject.body.suggested = suggested;
        return false;
      }else {
        //Invite User then Get this New User From AGOL and Update Local Mongo
        return self.inviteUser()
          .then(function () {return self.getRemoteUser()})
          .then(function (user) {return self.addLocalUser(user)});
      }
    })
    .catch(function(err) {
      console.error('Error running AddExternalGPOuser.update for ' +
        self.updateName + ' ' + addDoc.username +
        ' : ' + err.stack) ;
      self.utilities.getHandleError(self.resObject,'UpdateError')(err);
    })
    //If update was a success
    .then(function() {
      if (self.onUpdateSuccess && self.resObject.errors.length == 0) {
        return self.onUpdateSuccess();
      }})
    .then(function() {
      //Now that update is done we can finally return result
      return self.resObject;
    });
};

AddGPOuser.prototype.checkExternal = function(checkDoc) {
  var self = this;

  if (!self.session.user.isAdmin) {
    self.utilities.getHandleError(self.resObject,'InvalidAccess')
    ('You do not have Access to Check External User ');
    return Q.fcall(function() {return false});
  }

  //If no checkDoc passed or not object then return error
  if (!checkDoc || typeof checkDoc != 'object') {
    self.utilities.getHandleError(self.resObject,'CheckDocMissing')
    ('Add doc for ' + self.updateName + ' is missing or not an object ');
    return Q.fcall(function() {return false});
  }

  //Require userName or first and lastname
  if (!(checkDoc.firstname && checkDoc.lastname) && ! checkDoc.username) {
    self.utilities.getHandleError(self.resObject,'RequiredFieldsMissing')
    ('Either First and Last Name or Username is required for checking username.');
    return Q.fcall(function() {return false});
  }

  //If there is no username passed then use first and last name get username (lastfirst_EPAEXT)
  //ESRI uses email to get username in it's "suggestion" but EPA wants last and first
  if (! checkDoc.username) {
    checkDoc.username = checkDoc.lastname.toLowerCase() + '.' + checkDoc.firstname.toLowerCase() + '_EPAEXT';
  }

  //If passed username does not have _EPAEXT at end then force it to do so
  if (! /_EPAEXT$/.test(checkDoc.username)) {
    checkDoc.username += '_EPAEXT';
  }

  if (checkDoc) {
    self.updateDoc = checkDoc;
  }

  return self.checkUsername(checkDoc.username)
    .then(function(suggested) {
      if (! self.resObject.body) self.resObject.body = {};
      self.resObject.body.requested = checkDoc.username;
      if (suggested) {
        self.utilities.getHandleError(self.resObject,'UsernameTaken')
        ('username ' + checkDoc.username + ' is already in system. Try suggested username: ' + suggested);
        self.resObject.body.suggested = suggested;
        return false;
      }else {
      }
    })
    .catch(function(err) {
      console.error('Error running AddExternalGPOuser.update for ' +
        self.updateName + ' ' + checkDoc.username +
        ' : ' + err.stack) ;
      self.utilities.getHandleError(self.resObject,'UpdateError')(err);
    })
    .then(function() {
      //Now that update is done we can finally return result
      return self.resObject;
    });
};

AddGPOuser.prototype.checkUsername = function(username) {
  var self = this;

  var url = self.config.portal + '/sharing/rest/community/checkUsernames/';
//  var qs = {f: 'json'};
  var qs = {token: self.session.token,f: 'json'};
  var requestPars = {method: 'post', url: url, formData: {usernames: username}, qs: qs };

  return self.hr.callAGOL(requestPars)
    .then(function (body) {
      //return suggested only if it is different than requested
      var suggested = body.usernames[0].suggested;
      if (Array.isArray(body.usernames) && body.usernames.length>0 && body.usernames[0].requested!=suggested) {
        // Esri attachs number to very end but we want number before the _EPAEXT
        var reEPAEXT = RegExp("_EPAEXT(\\d+)$");
        return suggested.replace(reEPAEXT,"") + suggested.match(reEPAEXT)[1] + "_EPAEXT";
      }else {
        return null;
      }
    });
};

AddGPOuser.prototype.inviteUser = function() {
  var self = this;

  var url = self.config.portal + '/sharing/rest/portals/self/invite';
//  var qs = {f: 'json'};
  var qs = {token: self.session.token,f: 'json'};

  var invitationList = {invitations:[
    {username:self.updateDoc.username,
      firstname:self.updateDoc.firstname,
      lastname:self.updateDoc.lastname,
      fullname:self.updateDoc.firstname + ' ' + self.updateDoc.lastname,
      email:self.updateDoc.email,
      role:self.config.AGOLexternalUserRoleID,
      level:2}
  ]};

  var formData = {
    invitationList:JSON.stringify(invitationList),
    //This will be overwritten below
    html:"You were invited to the GPO"
  };

  var requestPars = {method: 'post', url: url, qs: qs, formData: formData};


  return self.getInviteEmail()
    .then(function (emailBody) {
      //Since formData is reference this will update formData on requestPars
      formData.html = emailBody;
    })
    .then(function () {
      return self.hr.callAGOL(requestPars)
    })
    .then(function (body) {
      if (body.error) {
        throw Error('Error inviting external user: ' +
          JSON.stringify(body.error));
      }
      return true;
    });
};

AddGPOuser.prototype.getInviteEmail = function() {
  var self = this;
  var fs = require('fs');
  var mustache = require('mustache');
  //now get the html that will be emailed to the user
  //if there is no sponsor username passed then used logged in user as sponsor name in email

  var templateData = null;

  return self.getInviteSponsor(self.updateDoc.sponsor)
    .then(function(sponsor) {
      if (!sponsor || typeof sponsor != "object") throw Error('Error getting invite email. Sponsor object not found.');
      if (!sponsor.fullName) throw Error('Error getting invite email. Sponsor object does not have fullName.');
      if (!sponsor.email) throw Error('Error getting invite email. Sponsor object does have email.');
      templateData = {sponsor:sponsor};

      return Q.ninvoke(fs,'readFile',appRoot + '\\public\\gpdashboard\\templates\\emails\\invitation.mst', 'utf8');
    })
    .then(function (template) {
      mustache.parse(template);
      return mustache.render(template,templateData);
    })
};

AddGPOuser.prototype.getInviteSponsor = function(sponsor) {
  var self = this;
  var loggedInInfo = {
      fullName:self.session.user.fullName,
      email:self.session.user.email
    };

  //wrap the return value will make non promise values into promise values
  return Q.fcall(function () {
    if (sponsor) {
      //If sponsor is not string assume sponsor object was passed to endpoint
      if (typeof sponsor != "string") {
        return sponsor;
        //If sponsor is string then it is username of sponsor and must look up info in mongo
      }else {
        return Q(self.collections.users.findOne({'username':sponsor}, {fullName:1,email:1}))
          .then(function (user) {
            //Could do a check here that it was found and if not throw error specifically here
            return user;
          });
      }
      //If sponsor not passed then use admin info as sponsor for email
    }else {
      return loggedInInfo;
    }
  });
};

AddGPOuser.prototype.getRemoteUser = function() {
  var self = this;

  var url = self.config.portal + '/sharing/rest/community/users/' + self.updateDoc.username;

  var parameters = {token: self.session.token, f: 'json'};
  //Pass parameters via form attribute

  var requestPars = {method: 'get', url: url, qs: parameters};

  return self.hr.callAGOL(requestPars)
    .then(function (body) {
      if (body.error) {
        throw Error('Error updating getting Remote User: ' +
          JSON.stringify(body.error));
      }
       return body;
    });
};

AddGPOuser.prototype.addLocalUser = function(user) {
  var self = this;
  //Not sure why I limited the user saved to mongo in DownloadGPOusers.js to these fields and those that updateAuthGroupsAndOwnerIDs.updateAuthGroups add
  //First just put these limited fields in and then use updateAuthGroup to add email,role,isAdmin,etc
  var localUser = self.utilities.sliceObject(user, [
    'username',
    'fullName',
    'email',
    'modified',
    'created']);

  return Q(self.extensionsCollection.update({username:user.username}, localUser,{upsert: true}))
    .then(function () {
      return self.updateAuthGroupsAndOwnerIDs.updateAuthGroups(user);
    });

};



module.exports = AddGPOuser;
