//For tracking when script started

console.log('Running with NODE_ENV = ' + process.env.NODE_ENV);

var appRoot = require('app-root-path');
var config = require(appRoot + '/config/env');
//Var config = require('../config/env');

var utilities = require(appRoot + '/shared/utilities');

var mongo = require('mongodb');
var MonkClass = require('monk');
var monk = MonkClass(config.mongoDBurl);

var itemscollection = monk.get('GPOitems');

//Audit stuff
var AuditClass = require(appRoot + '/shared/Audit');

var async = require('async');

var count = 1;
function processAudit(doc, done) {
  // Code for your update
  var audit = new AuditClass();
  audit.validate(doc);
  console.log(doc.AuditData);

  itemscollection.update({_id: doc._id}, {$set: {AuditData: doc.AuditData}},
    function(err) {
      if (err) {
        console.error('Error Updating Audit on Doc : ' + err);
      }
      console.log('Update Count = ' + count);
      count += 1;
      return done(err);
    }
  );
}

var q = async.queue(processAudit, Infinity);

var cursorClosed = false;

q.drain = function() {
  if (cursorClosed) {
    console.log('All Audits were Processed');
    process.exit();
  }
};

itemscollection.find({}, {fields: {SlashData: 0}, stream: true })
  .each(function(doc) {
    // Dispatching doc to async.queue
    if (doc) {
      q.push(doc);
    }
  })
  .error(function(err) {
    console.error('Error Adding Audit to Queue: ' + err);
  })
  .success(function() {
    cursorClosed = true;
  });


