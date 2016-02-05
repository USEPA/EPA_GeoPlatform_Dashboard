//For tracking when script started
var startTime = new Date();

var getTokenOnly = false;

var appRoot = require('app-root-path');
var config = require(appRoot + '/config/env');

var DownloadGPOdataClass = require(appRoot + '/shared/DownloadGPOdata')
var downloadGPOdata = new DownloadGPOdataClass();

var downloadGPOdataConfig = {};
try {
  downloadGPOdataConfig = config.scripts.downloadGPOdata;
  if (typeof downloadGPOdataConfig !== "object") downloadGPOdataConfig = {}; //Make sure downloadGPOdataConfig is an object
}catch (e){
}

//This is the number of items downloaded from AGOL in one request (max is 100)
downloadGPOdata.requestItemCount = 100;

downloadGPOdata.useSync = false;
//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
downloadGPOdata.AsyncRequestLimit = 25;
//How many aysnc slash data rows can be downloaded at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//setting to 0 or 1 is the same as useSync=true
downloadGPOdata.AsyncRowLimit = 25;

downloadGPOdata.AsyncAuditRowLimit = 100;

//For overnight script we want to get slash and metadata so set to false
// For testing overnight to only get metadata set it to true, will be much faster
//Other application of DownloadGPOdata.
downloadGPOdata.onlyGetMetaData = downloadGPOdataConfig.onlyGetMetaData | false;

//This will make execution must faster since we don not have to download all remote items and only need to download modified
//Set this to false for the overnight download so that we don't keep the removed items locally
//But don't do this if you are downloading the entire DB at first because querying on AGOL by Modified Date is actually slow over entire data set
downloadGPOdata.dontRemoveGPOitems = false;
//For testing saving json and text only set to true, usually set to false
downloadGPOdata.dontSaveBinary = false;
//For testing download of specific slash data, usually set to null
downloadGPOdata.HardCodeSlashDataTestIDs = null;
if (downloadGPOdata.HardCodeSlashDataTestIDs) {
  downloadGPOdata.HardCodeSlashDataTestIDs.push('091f277d34aa4e4996d142b2585bd12c');
}
//This is just for testing if we don't want all docs, usually set to null
downloadGPOdata.TotalRowLimit = null;
//Harcode in token
downloadGPOdata.token = null;
//*******END FOR TESTING only

//Set up scriptErrors email info
downloadGPOdata.downloadLogs.from = config.email.defaultFrom;
downloadGPOdata.downloadLogs.to = config.email.admins;
downloadGPOdata.downloadLogs.subject = " produced running scripts\downloadGPOdata";

try {
  downloadGPOdata.appID = config.AGOLadminCredentials.appID;
  downloadGPOdata.appSecret = config.AGOLadminCredentials.appSecret;
  if (!downloadGPOdata.appID || !downloadGPOdata.appSecret) throw "";
}
catch (e) {
  downloadGPOdata.downloadLogs.log("AGOL app ID or secret not defined in config file, trying usename/password");
  try {
    downloadGPOdata.username = config.AGOLadminCredentials.username;
    downloadGPOdata.password = config.AGOLadminCredentials.password;
  }
  catch (e) {
    downloadGPOdata.downloadLogs.error("AGOL admin username and password not defined in config file");
    downloadGPOdata.downloadLogs.emailExit();
  }
  if (!downloadGPOdata.username || !downloadGPOdata.password) {
    downloadGPOdata.downloadLogs.error("AGOL admin username and password can not be empty");
    downloadGPOdata.downloadLogs.emailExit();
  }
}


try {
  downloadGPOdata.expiration = config.AGOLadminCredentials.expiration;
}
catch (e) {
  downloadGPOdata.expiration = null;
}

try {
  downloadGPOdata.portal = config.portal;
  if (!downloadGPOdata.portal) throw "";
}
catch (e) {
  downloadGPOdata.downloadLogs.error("AGOL portal not defined in config file");
  downloadGPOdata.downloadLogs.emailExit();
}
try {
  downloadGPOdata.mongoDBurl = config.mongoDBurl;
  if (!downloadGPOdata.mongoDBurl) throw "";
}
catch (e) {
  downloadGPOdata.downloadLogs.error("mongoDB url not defined in config file");
  downloadGPOdata.downloadLogs.emailExit();
}

try {
  if ("AGOLorgID" in config) downloadGPOdata.orgID = config.AGOLorgID;
}
catch (e) {
}

//If errors were found above do not proceed
if (downloadGPOdata.downloadLogs.errors.length == 0) {
  if (getTokenOnly) {
    downloadGPOdata.getToken()
      .catch(function (err) {
        var errMsg = err.stack || err;
        downloadGPOdata.downloadLogs.error("Error while getting Token using downloadGPOdata.getToken():\n" + errMsg);
      })
      .done(function () {
        console.log("\n" + downloadGPOdata.hr.saved.token);
        downloadGPOdata.downloadLogs.emailExit();
      });
  } else {
    downloadGPOdata.download()
      .catch(function (err) {
        var errMsg = err.stack || err;
        downloadGPOdata.downloadLogs.error("Error while downloading GPO meta data and slash data using downloadGPOdata.download():\n" + errMsg);
      })
      .done(function () {
        downloadGPOdata.downloadLogs.log("Start Time: " + startTime);
        downloadGPOdata.downloadLogs.log("End Time: " + new Date());
        downloadGPOdata.downloadLogs.emailExit();
      });
  }
}
