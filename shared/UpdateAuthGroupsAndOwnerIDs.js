var UpdateAuthGroupsAndOwnerIDs =  function(usersCollection,ownerIDsCollection,authgroupsCollection){
//The collection to update
  this.usersCollection=usersCollection;
//Where the OwnerIDs for given auth groups combinations are stored
  this.ownerIDsCollection=ownerIDsCollection;
//Where the names of all auth groups are stored.
// If a string is passed in then use auth groups config file and string is path to that file
  this.authgroupsCollection=authgroupsCollection;
//Available auth groups in the system used to filter auth groups from all groups
//If availableAuthGroups is null then have to query from DB
  this.availableAuthGroups=null;
};


//This can be called using any type of user and will update AuthGroup and IsAdmin fields
//It does NOT find OwnerIDs. Use getOwnerIDs for that.
//But To find OwnerIDs for an admin, DB needs to have AuthGroups updated for the admin all users in DB
UpdateAuthGroupsAndOwnerIDs.prototype.updateAuthGroups = function(user) {
  var self = this;
//Get the  available AuthGroups. It will save them to object so it doesn't have to keep hitting DB
  return self.getAvailableAuthGroups()
//Now acutally update auth groups
    .then(function () {
//      console.log("***** AvailableAuthGroups ****" + self.availableAuthGroups.length + self.availableAuthGroups);
      return self.updateAuthGroupsInner(user)});
};

UpdateAuthGroupsAndOwnerIDs.prototype.getAvailableAuthGroups = function () {
  var self=this;
  var Q = require('q');

  //If self.availableAuthGroups has not been loaded yet need to read them in
  if (self.availableAuthGroups===null) {
//    console.log("getAvailableAuthGroups");
    //If self.authgroupsCollection not provided then read in from config file instead of db
    if (typeof self.authgroupsCollection==="string") {
//Note have to use require-reload module so that available auth groups is not cached by require in case we change config file and don't want to restart express server
      var requireReload = require('require-reload')(require);
      self.availableAuthGroups = requireReload(self.authgroupsCollection);
      return Q(self.availableAuthGroups);
    }else {
      return Q(self.authgroupsCollection.find({}, {fields:{group:1}}))
        .then(function (docs) {
          self.availableAuthGroups = docs.map(function (doc) {return doc.group});return self.availableAuthGroups;});
    }
  }else{
    return Q(self.availableAuthGroups);
  }

};


//This does the real update Auth Group work and must be called after AvailableAuthGroups are found
UpdateAuthGroupsAndOwnerIDs.prototype.updateAuthGroupsInner = function(user) {
//Note user info is not saved to this object because this function will be called Async and don't want a bunch of instances
  var self = this;
  var Q = require('q');
  var arrayExtended = require('array-extended');

//Check if this is admin and save that to DB also just for convenience
  var isAdmin = false;
  if (user.role==='org_admin') isAdmin=true;


//Get groups from user object. Might need to transform groups from array of group objects to array of group names
  var groups = self.getGroupsFromUser(user);

  var authGroups=[];
//Make sure users groups is actually an array and fitler to keep only authGroups
  if (Array.isArray(groups) && groups.length > 0) {
    authGroups = arrayExtended.intersect(groups, self.availableAuthGroups);
//Sort authgroups so that only one sequence of same group is in DB
    authGroups.sort();
  }

//Now update the authGroup Info and return the updated Info so it can be used later to find OwnerIDs
  var updateUser = {username:user.username,role:user.role,authGroups: authGroups,isAdmin: isAdmin,groups:groups};
  if (isAdmin) console.log("Updated Info:" + JSON.stringify(updateUser));
  return Q(self.usersCollection.update({username: user.username}, {$set: updateUser}))
    .then(function () {
      return updateUser;});

};

UpdateAuthGroupsAndOwnerIDs.prototype.getGroupsFromUser = function(user) {
  var self = this;

  var groups;
//if user object is AGOL type then  groups array is array of group object with title as name of group
//if user object is local Mongo DB type then groups array is array of name of group strings
  if (user.groups.length>0 && typeof user.groups[0] === "string") {
    groups = user.groups;
  } else {
    groups = user.groups.map(function (group) {
      return group.title;
    });
  }
  return groups;
};

UpdateAuthGroupsAndOwnerIDs.prototype.getOwnerIDs = function(user) {
  var self = this;
  var Q = require('q');

  console.log("getOwnerIDs user " + JSON.stringify(user));

//Make sure this is actually an admin with authgroups otherwise OwnerIDs is only User
  if (! user.isAdmin || ! user.authGroups || user.authGroups.length<1) return Q([user.username]);

//Check if this Admins combination of authGroups is cached in ownerIDs DB
//Note had to use $all AND $size other wise db.authGroups=[Region 7,Region 8] was matching user.authGroups=[Region 7]
//Might not need to do this since I think authGroups should be sorted but do this just to make sure
  return Q(self.ownerIDsCollection.findOne({authGroups:{$size:user.authGroups.length,$all:user.authGroups}},{fields:{authGroups:1,ownerIDs:1}}))
      .then(function (doc) {
        if (! doc) {
//if authGroup combo is NOT in ownerIDs DB then have to search Users DB to generate OwnerIDs
//Note when user/ownerID info changes in users DB need to clear out ownerIDsCollection cache
          return self.getOwnerIDsInAuthGroups(user.authGroups)
            .then(function (ownerIDs) {
              //Make sure admin's own username is in ownerIDs
              if (ownerIDs.indexOf(user.username) < 0) ownerIDs.push(user.username);
              return ownerIDs;
            }) ;
        }else{
//if authGroup combo IS in DB then return coresponding OwnerIDs
          return doc.ownerIDs;
        }
      });
};

UpdateAuthGroupsAndOwnerIDs.prototype.getOwnerIDsInAuthGroups = function(authGroups) {
//Get the ownerIDs by searching User DB for users int this Auth Group
  var self = this;
  var Q = require('q');

  console.log("getOwnerIDsInAuthGroups authGroups " + JSON.stringify(authGroups));

  var ownerIDs = [];
//If there is no auth groups then return NO OwnerIDs
  if (! authGroups || authGroups.length<1) return Q(ownerIDs);

  return Q(self.usersCollection.find({authGroups:{$in:authGroups}}, {fields:{username:1}}))
//Now update the OwnerIDs is DB
    .then(function (docs) {
      ownerIDs = docs.map(function (doc) {return doc.username});
      return Q(self.ownerIDsCollection.insert({authGroups: authGroups,ownerIDs: ownerIDs}))})
    .then(function () {return ownerIDs ;})

};


module.exports = UpdateAuthGroupsAndOwnerIDs;