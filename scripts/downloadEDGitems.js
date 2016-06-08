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

var edgDcat = 'https://edg.epa.gov/metadata/dcat.json';
var requestPars = {method: 'get', url: edgDcat};


Q.nfcall(request, requestPars)
  .then(function(response) {
    if (response[0].statusCode == 200) {
      dataArray = JSON.parse(response[0].body)['dataset'];
      dataArray.forEach(function(item) {
        item.auditStatus = auditInstance.validate(item);

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
      return fullEDGcollection.insert(dataArray);
    });
}
