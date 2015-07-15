var express = require('express');
var router = express.Router();


router.get('/gpoitemslist', function(req, res) {
  var db = req.db;
  var collection = db.get('gpoitemcollection');
  collection.find({}, {}, function(e, docs) {
    res.json(docs);
  });
});

module.exports = router;