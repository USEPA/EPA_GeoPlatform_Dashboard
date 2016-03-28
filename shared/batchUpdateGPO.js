module.exports = function (updateDocs,getUpdateClassInstance,updateName,updateID,useSync,AsyncRowLimit) {
//updateClassMembers are extra members to UpdateClass such as thumbnail
//updateClassConstructorArgs are args passed to constructor
  var Q = require('q');
  var appRoot = require('app-root-path') + '/';
  var hrClass = require(appRoot + 'shared/HandleGPOresponses');
  var hr = new hrClass();

  //This is global result object that will be passed back to user
  var resObjects = {errors:[]};
//To keep count when looping over promises
  var updateGPOrow = 1;
//function we will use to update set with this variable
  var updateGPOfunction=null;
//this is instance of the update class
  var updateGPOinstance = null;

  if (useSync) {
    console.log('Updating using Sync');
    updateGPOfunction=updateGPOaync;
  } else {
    if(AsyncRowLimit===null){
      console.log('Updating using Full Async ');
      updateGPOfunction=updateGPOasync;
    }else {
      console.log('Updating using Hybrid ');
      updateGPOfunction=updateGPOhybrid;
    }
  }

//Now update gpo items using method (sync, async, hybrid) chosen
  return Q.fcall(function () {return updateGPOfunction()})//note:  use fcall so that if exception in updateGPOfunction still returns promise
    .catch(function (err) {
      console.error('Error received running updateGPOfunction for ' + updateName + ' :' + err.stack);
      resObjects.errors.push(err.stack);
    })
    .then(function () {return resObjects});

  function updateSingleGPO(updateDoc,updateRow,async) {
//If in async mode need to create new updateGPOitem instance each time so each will have it's own data
//Get the instance from a passed function
    if (! updateRow) updateRow=updateGPOrow; //if no updateRow passed then use the global updateGPOrow variable
    if (! updateGPOinstance || async===true) updateGPOinstance = getUpdateClassInstance(updateRow);

    if (! updateDoc) updateDoc=updateDocs[updateGPOrow-1];
    updateGPOrow += 1;

    return updateGPOinstance.update(updateDoc)
      .then(function (){
//update the resObjects and update the count
        if (updateGPOinstance.resObject.error) resObjects.errors.push(updateGPOinstance.resObject.error);
      })
      .catch(function (err) {resObjects.errors.push("Error updating " + updateDoc[updateID] + " : " + err.message);
        console.error("Error updating Single GPO " + updateName + ' ' + updateDoc[updateID] + " : " + err.stack)})
  }
  function updateGPOsync() {
    return hr.promiseWhile(function() {return updateGPOrow<=updateDocs.length;}, updateSingleGPO);
  }

  function updateGPOhybrid() {
    return hr.promiseWhile(function() {return updateGPOrow<=updateDocs.length;}, updateGPOasync);
  }

  function updateGPOasync () {
    var defer = Q.defer();

    var async = require('async');
    var updateDocsAsync;
    if (AsyncRowLimit) {
//take slice form current row to async row limit
      updateDocsAsync= updateDocs.slice(updateGPOrow-1,updateGPOrow-1+AsyncRowLimit);
    }else {
      updateDocsAsync= updateDocs;
    }

    console.log("Updating " + updateName + " from row " + updateGPOrow + " to " + (updateGPOrow + updateDocsAsync.length -1));

    async.forEachOf(updateDocsAsync, function (doc, index, done) {
        updateSingleGPO(doc,updateGPOrow+index,true)
          .catch(function(err) {
            resObjects.errors.push("Error updating " + updateName + ' ' + doc[updateID] + " : " + err.message);
            console.error('Async For Each Single Update GPO ' + updateName + ' ' + doc[updateID] +' Error :', err.stack);
          })
          .done(function() {
            done();
//          console.log('for loop success')
          });
      }
      , function (err) {
        if (err) console.error('Async For Each Update GPO ' + updateName + ' Error :' + err.stack);
//resolve this promise
//      console.log('resolve')
        defer.resolve();
      });

//I have to return a promise here for so that chain waits until everything is done until it runs process.exit in done.
//chain was NOT waiting before and process exit was executing and data data not being retrieved
    return defer.promise
  }

//end of update endpoint
};