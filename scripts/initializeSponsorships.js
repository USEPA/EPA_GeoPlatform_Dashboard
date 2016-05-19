var startDate = new Date();

//How many aysnc requests can be run at one time. too many and things crash
//set to null to run all at one time (can crash for large data sets)
//Setting this too high might force request to timeout if timeout is too low
//eg I had timeout at 3 seconds and AsyncRowLimit=100 and it was timing out before it could get URL
var AsyncRowLimit = 50;
//This is just for testing if we don't want all docs
var TotalRowLimit = null;

//Default duration in days
var defaultDuration = 90;

var Q = require('q');
var fs = require('fs');
var readline = require('readline');

var appRoot = require('app-root-path');
var config = require(appRoot + '/config/env');

var hrClass = require(appRoot + '/shared/HandleGPOresponses');
var hr = new hrClass(config);

var UpdateGPOclass = require(appRoot + '/shared/UpdateGPOuser');

var MonkClass = require('monk');
var monk = MonkClass(config.mongoDBurl);

var usersCollection = monk.get('GPOusers');
var extensionsCollection = monk.get('GPOuserExtensions');

//This is the name of the column in the item file with the list of url domains
//found for the item (we aren't including full urls just the url domains)
var itemDomainsFieldName = 'urlDomainsWithValidHttps';

var sponsorsFile = appRoot + '/scripts/ExternalUserSponsorships.tsv';

//Hr.save is where we store the output from REST calls like token and OrgID so
//it can be used by handlers
var currentRow = 1;

var totalRows = 0;

//This is list of {id,url} objects
var externalUsers = [];

//Now run the promise chain using desired getGPOheaders
//(sync vs async vs hybrid)
getToken()
  .then(function() {return getExternalUser(sponsorsFile)})
  .then(addSponsorsHybrid)
  .catch(function(err) {
    console.error('Error received:', err.stack);
  })
  .done(function() {
    //    Console.log(hr.saved.GPOitems);
    //    console.log(hr.saved.GPOitemFields);

    console.log('Start Date: ' + startDate);
    console.log('End Date: ' + new Date());
    process.exit();
  });
//Simply finish the script using process.exit()

function getToken() {
  var tokenURL = config.portal + '/sharing/rest/generateToken?';
  var parameters = {
    username: config.AGOLadminCredentials.username,
    password: config.AGOLadminCredentials.password,
    client: 'referer',
    referer: config.portal,
    expiration: config.AGOLadminCredentials.expiration,
    f: 'json',};
  var tokenFieldName = 'token';
  //Pass parameters via form attribute
  var requestPars = {method: 'post', url: tokenURL, form: parameters };

  return hr.callAGOL(requestPars)
    .then(function(body) {
      if (body.error) {
        console.error(body.error);
        throw(new Error('Error getting token: ' + body.error));
      }
      hr.saved.token = body[tokenFieldName];
      //      Console.log(body);
      console.log(hr.saved.token);
      return hr.saved.token;
    });
}

function getExternalUser(inputFile) {
  var defer = Q.defer();
  var lineReader = readline.createInterface({
    terminal: false,
    input: fs.createReadStream(inputFile),
  });

  var count = 0;
  var row,rowObject,fields;
  lineReader.on('line', function(line) {
    //      Console.log('Line from file:', line);
    //temporary slice for testing
    if (TotalRowLimit && count > TotalRowLimit) {
      return;
    }

    var row = line.split('\t');

    if (count == 0) {
      fields = row;
    }else {
      rowObject = {};
      fields.forEach(function(field,index) {
        rowObject[field] = row[index];
      });
      externalUsers.push(rowObject);
      //Now push each URL individuvally
    }
    count += 1;
  });
  lineReader.on('close',function() {
    //Total items to process
    totalRows = externalUsers.length;
    defer.resolve();
  });
  return defer.promise;
}


function addSingleSponsor(currentRow) {
  //    Var token = getHandleResponsePromise('token')(data);
  var currentItem = externalUsers[currentRow - 1];

  var sponsorExists = false;

  return getSponsorUsername(currentItem.sponsor)
    .then(function(sponsorUsername) {
      if (!sponsorUsername) {
        console.log('Sponsor ' + currentItem.sponsor + ' doesn\'t exist');
        return;
      }
      sponsorExists = true;
      currentItem.sponsorUsername = sponsorUsername;
      return checkExternalUsername(currentItem.username);
    })
  .then(function(user) {
    if (!sponsorExists) {
      return;
    }
    if (!user) {
      console.log('External Username ' + currentItem.username +
        ' doesn\'t exist');
      return;
    }
    if (!user.isExternal) {
      console.log('External Username ' + currentItem.username +
        ' with provider = ' + user.provider + ' and email = ' +
        user.email + 'is not an External User');
      return;
    }
    return updateExternalUser(currentItem);
  });
}

function getSponsorUsername(fullName) {
  return Q(usersCollection.findOne({fullName: fullName}, {username: 1}))
    .then(function(doc) {
      //If fullName not found then return null
      if (!doc) {
        return null;
      }
      return doc.username;
    });
}
function checkExternalUsername(username) {
  return Q(usersCollection.findOne({username: username}, {username: 1}))
    .then(function(doc) {
      //If fullName not found then return null
      if (!doc) {
        return null;
      }
      return doc;
    });
}

function updateExternalUser(item) {
  var self = this;
  var Q = require('q');

  //Note: need to get "mock" session info because update checks permission to
  //update user (needs to be admin to update external users)
  var session = {ownerIDs: [],user: {isAdmin: true},token: hr.saved.token};

  var updateInstance = new UpdateGPOclass(usersCollection, extensionsCollection,
                                          session,config);

  var updateDoc = {username: item.username};
  var startDate = (new Date()).getTime();
  var endDate = startDate + defaultDuration * 24 * 3600 * 1000;
  var sponsor = {
    username: item.sponsorUsername,
    startDate: startDate,
    endDate: endDate,
    authGroup: item.authGroup,
    reason: item.reason,
    organization: item.organization,
    description: item.description,
  };
  updateDoc.sponsor = sponsor;
  //This will acutally update the authGroup on GPO
  //(and locally on user not just sponsor)
  updateDoc.authGroup = item.authGroup;

  return updateInstance.update(updateDoc)
}


function addSponsorsHybrid() {
  return hr.promiseWhile(function() {
    return currentRow <= totalRows;
  }, addSponsorsAsync);
}

function addSponsorsAsync() {
  var async = require('async');

  var defer = Q.defer();


  var externalUsersSlice;
  if (AsyncRowLimit) {
    //Take slice form current row to async row limit
    externalUsersSlice = externalUsers
      .slice(currentRow - 1,currentRow - 1 + AsyncRowLimit);
  }else {
    externalUsersSlice = externalUsers;
  }

  //Need to get the value of currentRow when this function is called because
  //addSingleSponsor changes it
  //THis is basically the currentRow when the async loop started
  var asyncStartcurrentRow = currentRow;

  console.log('currentRow and externalUsers.length ' + currentRow + ' ' +
    externalUsers.length);

  async.forEachOf(externalUsersSlice, function(value, key, done) {
    //      Console.log("current row " + (key+asyncStartcurrentRow));
    addSingleSponsor(key + asyncStartcurrentRow)
        //.then(function () {
        //done();})
        .catch(function(err) {
          console.error('single sponsor add Error received at ' +
            externalUsers[key + asyncStartcurrentRow - 1].username + ':');
          console.error(err.stack);
        })
        .done(function() {
          currentRow += 1;
          done();
          //Console.log('for loop success')
        });
  }
    , function(err) {
      if (err) console.error('for each error :' + err.message);
      //Resolve this promise
      //      console.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything
  //is done until it runs process.exit in done. chain was NOT waiting before
  //and process exit was executing and header data not being retrieved
  return defer.promise
}



