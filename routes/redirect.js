module.exports = function() {
  var express = require('express');
  var router = express.Router();

  //Now the root of the app is gpdashboard/ so if they hit just / need to redirect to gpdashboard
  router.use('/',function(req, res, next) {
    res.redirect('gpdashboard/');
  });

  return router;
};
