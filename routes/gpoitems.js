module.exports = function(app) {
  var express = require('express');
  var router = express.Router();

  router.use('/list', function(req, res) {
    var utilities = require(app.get('appRoot') + 'utilities');
//    var db = req.db;
    var db = app.get('monk');
    
    var collection = db.get('GPOitems');

    var error=null;
//This function gets input for both post and get for now
    var query = utilities.getRequestInputs(req).query;

//parse JSON query in object
    if (typeof query ==="string") query = JSON.parse(query);
//If query is falsey make it empty object
    if (! query) query = {};

    var username = "";
    if ('session' in req && req.session.username) username=req.session.username;
//Only return gpo itmes where this user is the owner (or later probably group admin)
      //query.owner = username;
//    res.send("username= " + username);return;

//      collection.find(query, ['owner','title'], function(e, docs) {
      collection.find(query, {}, function(e, docs) {
        res.json(docs);
      });
  });
  
  return router;
};