var UpdateGPOgeneric =  function(updateKey, updateName, collection,
                                 extensionsCollection,session,config) {
  //Key for updating the doc could id, username, etc.
  this.updateKey = updateKey;
  //This is just name of the type of item being updated. eg. GPOitem, GPOuser, etc...
  //It is just used for display messages and errors etc
  this.updateName = updateName;
  //The collection to update
  this.collection = collection;
  //The collection to update
  this.extensionsCollection = extensionsCollection;
  //The ownerIDs this user can update
  this.session = session;
  //get the user object from session
  this.user = null;
  if (session) {
    this.user = session.user;
  }

  //Config info passed in
  this.config = config;

  //Current doc that will be updated
  this.updateDoc = null;

  //This is result object for current doc
  this.resObject = {errors: [],body: null};
  //Get appRoot
  this.appRoot = appRoot = require('app-root-path');
  //
  this.utilities = require(this.appRoot + '/shared/utilities');

  //These are fields on doc we can possibly update
  //Note: have to check if collection was pass to constructor.
  //Don't want to crash when inheriting from this
  this.updateFields=[];
  if (collection) {
    this.updateFields = require(this.appRoot + '/config/updateFields/' + collection.name);
  }
  //These are the extension fields on doc we can possibly update
  this.updateExtensionFields=[];
  if (extensionsCollection) {
    this.updateExtensionFields = require(this.appRoot + '/config/updateFields/' + extensionsCollection.name);
  }

  //Module to deal with requests easier
  var hrClass = require(this.appRoot + '/shared/HandleGPOresponses');
  this.hr = new hrClass();
};


UpdateGPOgeneric.prototype.update = function(updateDoc) {
  var self = this;
  var Q = require('q');

  //If there are no fields or now key field in update Doc then return
  if (Object.keys(updateDoc).length === 0) {
    self.utilities.getHandleError(self.resObject,'EmptyUpdateDoc')
      ('Update doc for ' + self.updateName + ' does not have any fields ');
    return Q.fcall(function() {return false});
  }
  if (!self.updateKey in updateDoc) {
    self.utilities.getHandleError(self.resObject,'MissingUpdateDocKey')
      ('Update ' + self.updateName + ' key field ' +
        self.updateKey + ' is missing ');
    return Q.fcall(function() {return false});
  }

  if (updateDoc) {
    self.updateDoc = updateDoc;
  }

  return Q.invoke(self,'checkPermission')
    .then(function(hasPermission) {
        if (hasPermission) {
          //Update Local and Remote GPO user in DB
          return Q.all([self.updateRemote(),self.updateLocal()]);
        }
        self.utilities.getHandleError(self.resObject,'InvalidAccess')
        ('You do not have Access to Update GPO ' + self.updateName + ' ' +
          self.updateDoc[self.updateKey]);
        return false;
      })
    .catch(function(err) {
      console.error('Error running UpdateGPOgeneric.update for ' +
        self.updateName + ' ' + self.updateDoc[self.updateKey] +
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

//Force this function to be defined or it will be crashed when called in update
UpdateGPOgeneric.prototype.checkPermission = function() {
  console.error('Need to define checkPermission in inherited class of UpdateGPOgeneric.checkPermission');
  return false;
};

//OnUpdateSuccess will be defined by inherited classes
UpdateGPOgeneric.prototype.onUpdateSuccess = null;

//Sample for updating GPOitems
//UpdateGPOgeneric.prototype.getRemoteUpdateRequest = function(formData) {
//  var url= self.config.portal + '/sharing/rest/content/users/' + self.updateOwner + '/items/' + self.updateDoc.id + '/update';
//  var qs = {token: self.session.token,f:'json'};

//Pass parameters via form attribute
//  var requestPars = {method:'post', url:url, formData:formData, qs:qs };
//  return requestPars;
//};

//This has to be set to function in children individually depending on
//remote update endpoint
UpdateGPOgeneric.prototype.getRemoteUpdateRequest = null;

UpdateGPOgeneric.prototype.updateRemote = function() {
  var self = this;
  var Q = require('q');

  //If self.getRemoteUpdateRequest function not defined in child class then
  //don't do remoteUpdate
  if (!self.getRemoteUpdateRequest) {
    return Q.fcall(function() {return null});
  }

  //Want own copy of the update doc to for formdata to add thumbnail to
  //Note fields can be stored in array in config file or as array on fields
  //key in config file
  var updateFields = self.updateFields;
  if (!Array.isArray(updateFields)) {
    updateFields = self.updateFields.fields;
  }

  var formData = self.parseFormData(self.updateDoc,updateFields);

  //If there are no fields in update Doc that are editable then return false
  //(eg. maybe they are only passing extensions)
  if (Object.keys(formData).length < 1) {
    return self.handleUpdateResponse('');
  }

  //Run the custom function to get request Pars
  var requestPars = self.getRemoteUpdateRequest(formData);

  //Also requestPars to be returned as null if we don't want to update for some
  //reason based on child
  if (!requestPars) {
    return self.handleUpdateResponse('');
  }

  return this.hr.callAGOL(requestPars)
    .then(function(body) {
      return self.handleUpdateResponse(body)});
};

UpdateGPOgeneric.prototype.parseFormData = function(obj,slice) {
  var mySlice = {};

  slice.forEach(function(key) {
    //Note: If obj value is equal to true or false then make that a string. Was crashing ESRI not being string
    //Don't want others to have to figure out this nightmare
    if (obj[key]==true) {obj[key]="true"}
    if (obj[key]==false) {obj[key]="false"}

    if (Array.isArray(obj[key])) {
      mySlice[key] = obj[key].join(',');
    }else {
      //Needs to be at least empty string
      //I would think we wouldn't have field in slice if it wasn't in object but ESRI seems to ignore the empty fields
      //Will look into getting not including non existent fields in slice
      mySlice[key] = obj[key] || '';
    }
  });

  return mySlice;
};

UpdateGPOgeneric.prototype.handleUpdateResponse = function(body) {
  if (body.error) {
    throw Error('Error updating ' + this.updateName + ': ' +
      JSON.stringify(body.error));
  }

  this.resObject = {errors: [], body: {}};
  return this.resObject;
};

UpdateGPOgeneric.prototype.updateLocal = function() {
  var self = this;
  var Q = require('q');
  var merge = require('merge');

  //Need username as key for updating
  var updateQueryCommand = {};
  //If the updateKey is an array then use $in for the query
  if (Array.isArray(self.updateDoc[self.updateKey])) {
    updateQueryCommand[self.updateKey] = {$in:self.updateDoc[self.updateKey]};
  }else {
    updateQueryCommand[self.updateKey] = self.updateDoc[self.updateKey];
  }

  //Ge update command for normal GPO user fields and the extensions that both
  //will be saved in Extensions collection
  var UpdateCommand = self.getUpdateCommand(self.updateDoc,
    self.mergeFieldMaps(self.updateFields,self.updateExtensionFields));
  //Get update command with set and push of arrays for item extensions such as
  //sponsorship that will be saved in Extensions collection
  var ExtensionsUpdateCommand = self.getUpdateCommand(self.updateDoc,
    self.updateExtensionFields);

  if (!ExtensionsUpdateCommand && !UpdateCommand) {
    return false;
  }

  return Q.all([
    function() {
      if (!UpdateCommand || !self.collection) {
        return false;
      }
      return Q(self.collection.update(updateQueryCommand,UpdateCommand,{multi: true}));
    }(),
//This will upsert only the extensions collection
    function() {
      if (!ExtensionsUpdateCommand || !self.extensionsCollection) {
        return false;
      }
      console.log(updateQueryCommand);
      console.log(ExtensionsUpdateCommand);
      return Q(self.extensionsCollection.update(updateQueryCommand,
        ExtensionsUpdateCommand,{upsert: true,multi: true}));
    }(),
  ])
    .then(function() {return true});

};

UpdateGPOgeneric.prototype.mergeFieldMaps = function(map1,map2) {
  var merge = require('merge');
  var fullmap1 = map1 || {fields: []};
  var fullmap2 = map2 || {fields: []};
  if (Array.isArray(map1)) {
    fullmap1 = {fields: map1};
  }
  if (Array.isArray(map2)) {
    fullmap2 = {fields: map2};
  }

  var mergedMap = {};
  //First have to concatenate the map.fields arrays together
  var fields = [];
  if (fullmap1.fields) {
    fields = fields.concat(fullmap1.fields);
  }
  if (fullmap2.fields) {
    fields = fields.concat(fullmap2.fields);
  }
  if (fields.length > 0) {
    mergedMap.fields = fields;
  }
  //Then we can merge the map.arrays object togehter
  var arrays = true;
  if (fullmap1.arrays) {
    arrays = merge(arrays,fullmap1.arrays);
  }
  if (fullmap2.arrays) {
    arrays = merge(arrays,fullmap2.arrays);
  }
  if (arrays !== true) {
    mergedMap.arrays = arrays;
  }
  //Then we can merge the map.sets object togehter
  var sets = true;
  if (fullmap1.sets) {
    sets = merge(sets,fullmap1.sets);
  }
  if (fullmap2.sets) {
    sets = merge(sets,fullmap2.sets);
  }
  if (sets !== true) mergedMap.sets = sets;
  return mergedMap;
};

UpdateGPOgeneric.prototype.getUpdateCommand = function(updateDoc,fieldsMap) {
  var updateCommand = {};

  var arrayMap = null;
  var setArrayMap = null;
  var fields = null;
  //Can also just pass fields as array if we aren't passing array items to
  //push to array
  if (Array.isArray(fieldsMap)) {
    fields = fieldsMap;
  }else {
    //    Console.log("fieldsMap " + JSON.stringify(fieldsMap));
    //in this case pass an object like
    //{fields:[field1,field2],
    // arrays:{item1:array1,item2:array2},sets:{item1:set1,item2:set2}}
    if ('fields' in fieldsMap) {
      fields = fieldsMap.fields;
    }
    if ('arrays' in fieldsMap) {
      arrayMap = fieldsMap.arrays;
    }
    //Note: a set is just an array that only allows unique values
    if ('sets' in fieldsMap) {
      setArrayMap = fieldsMap.sets;
    }
  }
  //Now slice out the fields
  var setCommand = {};
  if (fields) {
    setCommand = this.utilities.sliceObject(updateDoc,fields);
    if (Object.keys(setCommand).length > 0) {
      updateCommand['$set'] = setCommand;
    }
  }

  //Now slice out the arrays to push
  var pushCommand = {};
  if (arrayMap) {
    Object.keys(arrayMap).forEach(function(item) {
      if (item in updateDoc) {
        pushCommand[arrayMap[item]] = updateDoc[item];
      }
    });
    if (Object.keys(pushCommand).length > 0) {
      updateCommand['$push'] = pushCommand;
    }
  }

  //Now slice out the set arrays to addToSet
  var addToSetCommand = {};
  if (setArrayMap) {
    Object.keys(setArrayMap).forEach(function(item) {
      if (item in updateDoc) {
        addToSetCommand[setArrayMap[item]] = updateDoc[item];
      }
    });
    if (Object.keys(addToSetCommand).length > 0) {
      updateCommand['$addToSet'] = addToSetCommand;
    }
  }
  //  Console.log("setArrayMap " + setArrayMap);
  //  console.log("uc " + JSON.stringify(updateCommand));

  //Check if push and set have similar keys
  var arrayExtended = require('array-extended');
  var commonFields = arrayExtended.intersect(Object.keys(setCommand),
    Object.keys(pushCommand));
  if (commonFields.length > 0) {
    throw Error('Error updating ' + commonFields +
      '.Updating full array and adding item at same time is not allowed.');
  }

  //If at least a set or push command then return object otherwise just
  //return null
  if (Object.keys(updateCommand).length > 0) {
    return updateCommand;
  }
  return null;
};

module.exports = UpdateGPOgeneric;
