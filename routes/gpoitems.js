module.exports = function(app) {
  var express = require('express');
  var router = express.Router();
  var Q = require('q');

  router.use('/list', function(req, res) {
    var username = "";
    if ('session' in req && req.session.username) username=req.session.username;
//If they are not logged in (no username then
    if (! username) return res.json({error: {message: "Must be logged in to make this request.", code: "LoginRequired"}, body: null});

    var utilities = require(app.get('appRoot') + '/shared/utilities');
//    var db = req.db;
    var db = app.get('monk');
    var config = app.get('config');

    var collection = db.get('GPOitems');

    var error=null;
//This function gets input for both post and get for now
    var query = utilities.getRequestInputs(req).query;

//parse JSON query in object
    if (typeof query ==="string") query = JSON.parse(query);
//If query is falsey make it empty object
    if (! query) query = {};

    //This function gets input for both post and get for now
    var projection = utilities.getRequestInputs(req).projection;

//parse JSON query in object
    if (typeof projection ==="string") projection = JSON.parse(projection);
//If query is falsey make it empty object
    if (! projection) projection= {};


//Only return gpo itmes where this user is the owner (or later probably group admin)
//comment this out just to test with all
//      query.owner = username;
//Need to limit the number of rows to prevent crashing
//This was fixed by streaming and not sending back SlashData so if config.maxRowLimit=null don't force a limit
    if (config.maxRowLimit) {
      if (!('limit' in projection)) projection.limit = config.maxRowLimit;
//Force limit to be <= MaxRowLimit (Note passing limit=0 to Mongo means no limit so cap that also)
      if (projection.limit > config.maxRowLimit || projection.limit===0) projection.limit = config.maxRowLimit
    }
//Don't return SlashData!
    if (!('fields' in projection)) projection.fields = {};
    projection.fields.SlashData=0;
//Let front end decided on getting only public
      query.access = "public";

//    res.send("username= " + username);return;

//Assume if you pass limit return paging information
    if ('limit' in projection) {
      streamGPOitemsPaging()
        .then(function (beginning) {return streamGPOitems(beginning,"}")})
        .catch(function (err) {console.error("Error streaming GPOitems paging: " + err)})
        .done(function () {res.end()});
    } else {
//If no limit passed then just stream array of all items
      streamGPOitems()
        .catch(function (err) {console.error("Error streaming GPOitems: " + err)})
        .done(function () {res.end()});
    }

    function streamGPOitems(beginning,end) {
//This will make streaming output to client
      projection.stream=true;
//Make sure end is a string if null
      end = end || "";
//First have to stream the beginning text
      return utilities.writeStreamPromise(res,beginning)
        .then(function () {
          var defer = Q.defer();
          var firstCharacter="[";
          collection.find(query, projection)
            .each(function (doc) {
              res.write(firstCharacter);
              res.write(JSON.stringify(doc));
              if (firstCharacter == "[") firstCharacter = ",";
            })
            .error(function (err) {
              defer.reject("Error streaming GPO items: " + err);
            })
            .success(function () {
              res.write("]" + end, function () {
                defer.resolve();
              });
            });
            return defer.promise;
        })
    }
    function getTotalRowsPromise() {
//Save total rows in session for a query so we don't have to keep getting count when paging
      if ('session' in req && 'GPOitemsList' in req.session && req.session.GPOitemsList.query==JSON.stringify(query)) {
        console.log("Use Session Total");
        return Q(req.session.GPOitemsList.total);
      }else{
        return Q(collection.count(query))
          .then(function (total) {
            if ('session' in req) req.session.GPOitemsList={query:JSON.stringify(query),total:total};
            console.log("Save Session: " + JSON.stringify(req.session.GPOitemsList));
            return total;
          });
      }
    }

    function streamGPOitemsPaging() {
//Have to get the total rows either from DB or session and then get the paging stuff
      return getTotalRowsPromise()
        .then(function (total) {
          var resObject = {};
          resObject.total = total;
          resObject.start = projection.skip || 1;
          resObject.num = projection.limit || total;
          resObject.nextStart = resObject.start + resObject.num;
          if (resObject.nextStart > resObject.total) resObject.nextStart = -1;
          return JSON.stringify(resObject).replace(/}$/,',"results":');
        });
    }


  });

  return router;
};