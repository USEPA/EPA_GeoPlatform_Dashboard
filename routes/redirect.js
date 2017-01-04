module.exports = function() {
  var express = require('express');
  var router = express.Router();

  //Now the root of the app is gpdashboard/ so if they hit just / need to redirect to gpdashboard
  //had to do like /$ so that it didn't match everything but only exactly /
  //now we don't get a bunch of redirects but only valid routes will be like /gpdashboard/etc other than / route redirecting to /gpdashboard/
  router.use('/$',function(req, res, next) {
      res.redirect('/gpdashboard/');
  });

  return router;
};
