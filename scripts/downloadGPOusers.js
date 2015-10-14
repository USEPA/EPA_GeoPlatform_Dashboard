//For tracking when script started
var startTime = new Date();

var appRoot=require('app-root-path');
var config = require(appRoot + '/config/env');

var DownloadGPOusersClass = require(appRoot + '/shared/DownloadGPOusers')
downloadGPOusers = new DownloadGPOusersClass();


//This is the number of items downloaded from AGOL in one request (max is 100)
downloadGPOusers.requestItemCount = 100;

downloadGPOusers.useSync=false;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
downloadGPOusers.AsyncRequestLimit=10;
//How many aysnc slash data rows can be downloaded at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
downloadGPOusers.AsyncRowLimit=25;
//When finding Admin OwnerIDs asynchronously
//set to null to run all at one time
downloadGPOusers.AsyncAdminRowLimit = 100;

//For overnight script we want to get slash and metadata so set to false
// For testing overnight to only get metadata set it to true, will be much faster
//Other application of downloadGPOusers.
downloadGPOusers.onlyGetUsers = false;
//This will make execution must faster since we don not have to download all remote items and only need to download modified
//Set this to false for the overnight download so that we don't keep the removed items locally
//But don't do this if you are downloading the entire DB at first because querying on AGOL by Modified Date is actually slow over entire data set
downloadGPOusers.dontRemoveGPOusers= false;

//Just a test to see if this works. This would usually be called in Log in if it is decided that Mod Users need to be refreshed on log in
//downloadGPOusers.refreshOwnerIDsAdminUsers = ["USEPA.AGOLP"];


//This is just for testing if we don't want all docs, usually set to null
downloadGPOusers.TotalRowLimit=null;
//Harcode in token
downloadGPOusers.token = null;
//*******END FOR TESTING only


console.log('Running with NODE_ENV = ' + process.env.NODE_ENV);


try {
  downloadGPOusers.appID = config.AGOLadminCredentials.appID ;
  downloadGPOusers.appSecret = config.AGOLadminCredentials.appSecret;
  if (! downloadGPOusers.appID  || ! downloadGPOusers.appSecret) throw "";
}
catch (e) {
  console.log("AGOL app ID or secret not defined in config file, trying usename/password");
  try {
    downloadGPOusers.username = config.AGOLadminCredentials.username;
    downloadGPOusers.password = config.AGOLadminCredentials.password;
  }
  catch (e) {
    console.log("AGOL admin username and password not defined in config file");
    process.exit();
  }
}

try {
  downloadGPOusers.expiration = config.AGOLadminCredentials.expiration;
}
catch (e) {
  downloadGPOusers.expiration = null;
}

try {
  downloadGPOusers.portal = config.portal;
}
catch (e) {
  console.log("AGOL portal not defined in config file");
  process.exit();
}
try {
  downloadGPOusers.mongoDBurl=config.mongoDBurl;
}
catch (e) {
  console.log("mongoDB url not defined in config file");
  process.exit();
}

try {
  if ("AGOLorgID" in config) downloadGPOusers.orgID=config.AGOLorgID;
}
catch (e) {
}


  downloadGPOusers.download()
    .catch(function (err) {
      console.error('Error received getting GPO users and groups:', err);
    })
    .done(function () {
      console.log("Start Time: " + startTime);
      console.log("End Time: " + new Date());
      process.exit();
    });
