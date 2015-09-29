//For tracking when script started
var startTime = new Date();

var getTokenOnly=false;

var appRoot=require('app-root-path');
var config = require(appRoot + '/config/env');

var DownloadGPOdataClass = require(appRoot + '/shared/DownloadGPOdata')
downloadGPOdata = new DownloadGPOdataClass();

//This is the number of items downloaded from AGOL in one request (max is 100)
downloadGPOdata.requestItemCount = 100;

downloadGPOdata.useSync=false;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
downloadGPOdata.AsyncRequestLimit=50;
//How many aysnc slash data rows can be downloaded at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
downloadGPOdata.AsyncRowLimit=25;

downloadGPOdata.AsyncAuditRowLimit = 100;

//For overnight script we want to get slash and metadata so set to false
// For testing overnight to only get metadata set it to true, will be much faster
//Other application of DownloadGPOdata.
downloadGPOdata.onlyGetMetaData = false;
//This will make execution must faster since we don not have to download all remote items and only need to download modified
//Set this to false for the overnight download so that we don't keep the removed items locally
//But don't do this if you are downloading the entire DB at first because querying on AGOL by Modified Date is actually slow over entire data set
downloadGPOdata.dontRemoveGPOitems= false;
//For testing saving json and text only set to true, usually set to false
downloadGPOdata.dontSaveBinary = false;
//For testing download of specific slash data, usually set to null
downloadGPOdata.HardCodeSlashDataTestIDs =null;
if (downloadGPOdata.HardCodeSlashDataTestIDs) {
  downloadGPOdata.HardCodeSlashDataTestIDs.push('091f277d34aa4e4996d142b2585bd12c');
}
//This is just for testing if we don't want all docs, usually set to null
downloadGPOdata.TotalRowLimit=null;
//Harcode in token
downloadGPOdata.token = null;
//*******END FOR TESTING only


console.log('Running with NODE_ENV = ' + process.env.NODE_ENV);

try {
  downloadGPOdata.username = config.AGOLadminCredentials.username;
  downloadGPOdata.password = config.AGOLadminCredentials.password;
}
catch (e) {
    console.log("AGOL admin username and password or portal not defined in config file");
    process.exit();
}

try {
  downloadGPOdata.portal = config.portal;
}
catch (e) {
  console.log("AGOL portal not defined in config file");
  process.exit();
}
try {
  downloadGPOdata.mongoDBurl=config.mongoDBurl;
}
catch (e) {
  console.log("mongoDB url not defined in config file");
  process.exit();
}

try {
  if ("AGOLorgID" in config) downloadGPOdata.orgID=config.AGOLorgID;
}
catch (e) {
}


if (getTokenOnly) {
  downloadGPOdata.getToken()
    .catch(function (err) {
      console.error('Error received:', err);
    })
    .done(function () {
      console.log("\n" + downloadGPOdata.hr.saved.token);
      process.exit();
    });
}else {
  downloadGPOdata.download()
    .catch(function (err) {
      console.error('Error received:', err);
    })
    .done(function () {
      console.log("Start Time: " + startTime);
      console.log("End Time: " + new Date());
      process.exit();
    });
}