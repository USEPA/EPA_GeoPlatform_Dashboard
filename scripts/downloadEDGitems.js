var Q = require('q');
var appRoot = require('app-root-path');
//Audit stuff
var EdgAuditClass = require(appRoot + '/shared/AuditEDG');
var request = require('request');
var config = require(appRoot + '/config/env');
var mongo = require('mongodb');
var MonkClass = require('monk');

var monk = MonkClass(config.mongoDBurl);

var fullEDGcollection = monk.get('EDGitems');

var dataArray = [];

var auditInstance = new EdgAuditClass();

//Get the full dcat (to be downloaded nightly)
var edgDcat = 'https://edg.epa.gov/metadata/dcat.json';
var requestPars = {method: 'get', url: edgDcat};


Q.nfcall(request, requestPars)
  .then(function(response) {
    if (response[0].statusCode == 200) {
      dataArray = JSON.parse(response[0].body)['dataset'];
      dataArray.forEach(function(item) {
        item.auditStatus = auditInstance.validate(item);
        //If publisher is an object, just grab the name
        if (item.publisher && item.publisher.name) {
          item.publisher = item.publisher.name;
        }
        item.contactPointEmail = '';
        // Store the contact point name and email as two separate fields
        if (item.contactPoint && item.contactPoint.hasEmail) {
          item.contactPointEmail = item.contactPoint.hasEmail;
          item.contactPoint = item.contactPoint.fn;
        }

      });
      return dealWithMongo();
    }

  })
  .catch(function(err) {
    console.error('you got at an error ' + err);
  })
  .done(function() {
    process.exit();
  });

function dealWithMongo() {
  return Q(fullEDGcollection.remove({}))
    .then(function() {
      //Put full EDG JSON into Mongo
      return fullEDGcollection.insert(dataArray);
    });
}
