module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
    
  router.get('/list', function(req, res) {
//    var db = req.db;
    var db = app.get('monk');
    
    var collection = db.get('GPOitems');
    collection.find({}, {}, function(e, docs) {
      res.json(docs);
    });
  });
  
  return router;
}