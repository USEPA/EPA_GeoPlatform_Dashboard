var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Express'
  });
});


router.get('/gpoitemslist', function(req, res) {
  var db = req.db;
  var collection = db.get('gpoitemcollection');
  collection.find({}, {}, function(e, docs) {
    res.render('gpoitemslist', {
      "gpoitemslist": docs
    });
  });
});


module.exports = router;