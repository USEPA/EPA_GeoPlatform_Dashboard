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
//new: config file of authgroups now has object with names field and ids field. names field is array of auth group names. ids is obj keyed by name with id as value
      self.availableAuthGroups = requireReload(self.authgroupsCollection).names;
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
  var merge = require('merge');

//Check if this is admin and save isAdmin field to DB just for convenience
//Also have to fing user.role and user.provider and user.email in here on the full community/portal user object because these fields are not in search results
  var isAdmin = false;
  if (user.role==='org_admin') isAdmin=true;
  var isExternal = true;
//This would find SSO or ArcGIS login need to just look for epa.gov email
//  if (user.provider!=='enterprise') isExternal=true;
  if (/@epa\.gov$/.test(user.email)) isExternal=false;

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
//Note have to save a bunch of extra stuff here that is on the full community/portal user object but not on the user search result object
  var updateUser = {username:user.username,email:user.email,role:user.role,authGroups: authGroups,isAdmin: isAdmin,isExternal:isExternal, groups:groups, provider: user.provider};
  if (isAdmin) console.log("Updated Info:" + JSON.stringify(updateUser));
  return Q(self.usersCollection.update({username: user.username}, {$set: updateUser}))
    .then(function () {
 //merge the updated info into the other user info to get full updated user object
      var newUser = {};
//note first merge user into new empty user object so we don't overwrite user passed in
      merge.recursive(newUser, user);
      merge.recursive(newUser, updateUser);
      return newUser;});
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
  var appRoot = appRoot=require('app-root-path');
  var utilities=require(appRoot + '/shared/utilities');

  console.log("getOwnerIDs user " + JSON.stringify(user));

//Make sure this is actually an admin with authgroups otherwise OwnerIDs is only User
  if (! user.isAdmin || ! user.authGroups || user.authGroups.length<1) return Q.fcall(function () {return [user.username]});

  //If user is super user then return all ownerIDs
  if (user.isSuperUser) return utilities.getArrayFromDB(self.usersCollection, {}, "username");

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


UpdateAuthGroupsAndOwnerIDs.prototype.getOwnerIDsForEachAuthGroup = function(user) {
//Get the ownerIDs for each single Auth Group
//Basically just query OwnerIDs table where size=1
  var self = this;
  var Q = require('q');
  var async = require('async');
  var appRoot = require('app-root-path');
  var utilities = require(appRoot + '/shared/utilities');

  var defer = Q.defer();

  var ownerIDsByAuthGroup = {};

  if (! user.authGroups || user.authGroups.length<1) defer.resolve(ownerIDsByAuthGroup);

//if super user then get all authgroups, if not then only get authgroups user is member of

  Q(true)
    .then(function() {
      if (user.isSuperUser===true) {
        return self.getAvailableAuthGroups();
      }else {
        return user.authGroups;
      }
    })
    .then(function (authGroups) {
      async.forEachOf(authGroups, function (authGroup, key, done) {
          Q(self.ownerIDsCollection.findOne({authGroups:{$size:1,$eq:authGroup}},{fields:{authGroups:1,ownerIDs:1}}))
            .then(function (doc) {
              if (! doc) {
//if individual authGroup is NOT in ownerIDs DB then have to search Users DB to generate OwnerIDs
//Note when user/ownerID info changes in users DB need to clear out ownerIDsCollection cache
                return self.getOwnerIDsInAuthGroups([authGroup]);
              }else{
//if authGroup combo IS in DB then return coresponding OwnerIDs
                return doc.ownerIDs;
              }
            })
            .then(function (ownerIDs) {
//Now add to object pairing ownerIDs to individual auth group
              ownerIDsByAuthGroup[authGroup]=ownerIDs;
              return ownerIDsByAuthGroup;
            })
            .catch(function (err) {
              defer.reject('Error in async.forEachOf while calling UpdateAuthGroupsAndOwnerIDs.getOwnerIDsForEachAuthGroup():' + err.stack);
            })
            .done(function () {
              done();
            });
        }
        , function (err) {
          if (err) defer.reject('Error with async.forEachOf while looping over single Auth Groups to find onwers using UpdateAuthGroupsAndOwnerIDs.getOwnerIDsForEachAuthGroup:' + err.stack);
//resolve this promise
          defer.resolve(ownerIDsByAuthGroup);
        });
      return true;
    });

//I have to return a promise here for so that chain waits until everything is done .
  return defer.promise
};

module.exports = UpdateAuthGroupsAndOwnerIDs;
