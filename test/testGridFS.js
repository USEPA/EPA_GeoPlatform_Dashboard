var testReading=false;
var testReading=true;

var request = require('request');
var Q = require('q');
var GridFSstream = require('gridfs-stream');
var async = require('async');
var fs = require('fs');

var appRoot=require('app-root-path');
var config = require(appRoot + '/config/env');
//var config = require('../config/env');

var hrClass = require(appRoot + '/utilities/handleGPOresponses');
var hr = new hrClass(config);

var testUrls = ["http://tegasigns.com/sitemakr/media/tega/tega/home/home-pagemap.jpg","http://tegasigns.com"];
var testUrlNames = ["home.jpg","index.html"];


var token="q5-lGLqEWTuo_vi53hBjppKEtorHgfgHqmpP08SwTfAxAeorSm_rhvuyXwTFnSqnKYOaBDToDTEbD4b3iRTSIbZGdOog3CDaXWLVAOhkzY-RGYyXryfvgCFlCKj4CmpURuAsCXlFRRaM9Ho5hfcLyg..";
var testUrls = ["http://tegasigns.com","https://epa.maps.arcgis.com/sharing/rest/content/items/b1f88ef123c342879eae983888837c5d/data?&token="+token,"https://epa.maps.arcgis.com/sharing/rest/content/items/c38ed2fdf2644cccab8433789e560817/data?&token=OdPajFIyOwOT_iolwh6x8ohGiYEOSZt3jIrbADajBoPcCkNDEr2GrtbzefXCUzkP8_NJ0D61ERl5eu0I5IJ0ntPN6KryL0AqwK3o6LzzBc_f3z6PUCqMTISkER6AuXRSFjRTZmiXadHSno9jLwWfow.."];
testUrls.push("https://epa.maps.arcgis.com/sharing/rest/content/items/2b21ade2abbc423693762526f797272e/data?&token="+token);
var testUrlNames = ["index.html","ShapeFile.zip","WebMap.html","Attach.zip"];


https://epa.maps.arcgis.com/sharing/rest/content/items/c38ed2fdf2644cccab8433789e560817/data?&token=OdPajFIyOwOT_iolwh6x8ohGiYEOSZt3jIrbADajBoPcCkNDEr2GrtbzefXCUzkP8_NJ0D61ERl5eu0I5IJ0ntPN6KryL0AqwK3o6LzzBc_f3z6PUCqMTISkER6AuXRSFjRTZmiXadHSno9jLwWfow..
//ShapeFile at b1f88ef123c342879eae983888837c5d
//WebMap at c38ed2fdf2644cccab8433789e560817

var mongo = require('mongodb');
var MonkClass = require('monk');
var monk = MonkClass(config.mongoDBurl);

var fsFiles = monk.get('fs.files');
var fsChunks= monk.get('fs.chunks');

//var db = new mongo.Db('egam', new mongo.Server("localhost", 27017));

var url = require('url');
var mongoURL = url.parse(config.mongoDBurl);

var db = new mongo.Db(mongoURL.pathname.replace("/",""), new mongo.Server(mongoURL.hostname,mongoURL.port));


db.open(function (err) {
  db.on('close', function () {process.exit()});
  if (err) {handleError(err);db.close();};

  var gfs = GridFSstream(db, mongo);

  // all set!

  if (testReading) {
    fsFiles.find({}, {}, function(e, docs) {
//need to find a way to exit process so that file will be written finally (could just hit stop but sloppy)
      var openCount = docs.length;
      docs.forEach(function(doc) {
        var readstream = gfs.createReadStream({filename:doc.filename});
        var writestream = fs.createWriteStream('./' + doc.filename);
        writestream.on('close',function () {openCount+= -1;if (openCount<1) process.exit(); })
        readstream.pipe(writestream);
        console.log('./' + doc.filename);

      })
      console.log('test read');
//      process.exit();
    });

  }else{

    fsFiles.remove();
    fsChunks.remove();

    async.forEachOf(testUrls, function (value, key, done) {
      var writestream;
      var filename = url.parse(value).pathname;

      request
        .get(value)
        .on('response', function(response) {
          console.log(response.statusCode) // 200
          console.log(response.headers['content-type']) // 'image/png'
          writestream = gfs.createWriteStream(
            {filename:testUrlNames[key]}
          );
          writestream.on('close', function (file) {
            // do something with `file`
            console.log('_id : ' + file._id );
            console.log('closed for : ' + file.filename );
            done();
          });

          console.log(value);
          response.pipe(writestream);
        });
    }
    , function (err) {
//this is called after all loop processes are done
      if (err) console.error('for each error :' + err.message);

      db.close();

    });

  }


})

console.log("hi");


function handleError(err) {
  console.log("error connecting to db: " + err);
}
