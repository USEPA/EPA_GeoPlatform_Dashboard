module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
    
  router.get('/list', function(req, res) {
//    var db = req.db;
    var db = app.get('monk');
    
    var collection = db.get('GPOitems');

    var query = {};

    var username = "";
    if ('session' in req && req.session.username) username=req.session.username;
//Only return gpo itmes where this user is the owner (or later probably group admin)
    query.owner = username;

//    res.send("username= " + username);return;

//      collection.find(query, ['owner','title'], function(e, docs) {
      collection.find(query, {}, function(e, docs) {
        res.json(docs);
      });
  });
  
  return router;
}