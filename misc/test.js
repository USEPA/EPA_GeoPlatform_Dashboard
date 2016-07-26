var Q = require('q');

var asyncLoop = function(items) {
  var async = require('async');

  var defer = Q.defer();

  var testThrow = function (i) {
    console.log('throw before ' + i);
    return Q.fcall(function () {return i})
      .then(function (i) {
        console.log("throw i " + i);
        if (i > 3) throw(new Error('Error on i = ' + i));
      });
  };

  var testFn = function (i) {
    console.log(i);
    return Q.fcall(function () {return i})
      .then(function (i) {
        return Q.fcall(function () {return true})
          .then(function () {return testThrow(i)});
      })
      //.catch(function (err) {
      //    console.log('catch err ' + err.stack);
      //})
      ;

  };

  async.forEachOf(items, function(gpoItem, index, done) {
      testFn(gpoItem)
        .catch(function (err) {
          console.log('catch in for each err ' + err.stack);
        })
        .done(function() {
          console.log('is done ' + gpoItem);
          done();
          //          Self.downloadLogs.log('for loop success')
        });
    }
    , function(err) {
      if (err) console.error('For Each GPO Audit Error :' + err.message);
      //Resolve this promise
      //      self.downloadLogs.log('resolve')
      defer.resolve();
    });

  //I have to return a promise here for so that chain waits until everything is
  //done until it runs process.exit in done.
  //chain was NOT waiting before and process exit was executing and data data
  //not being retrieved
  return defer.promise
};

var items = [1,2,3,4,5,6];

asyncLoop(items).then(function () {
  console.log('end');
})
return;

var utilities=require('../shared/utilities');

var testObj = {a:{},b:{},c:1,d:2};
testObj.a = {};
testObj.a.a2 = {};
testObj.a.a2.a3 = 100;
testObj.a.a2.b3 = 200;
testObj.b = {};
testObj.b.a2 = 10;
testObj.b.b2 = 20;

var testSlice = utilities.sliceObject(testObj,['a.a2.a3','b.b2','c']);
console.log(testSlice);

return;

var MonkClass = require('monk');

var monk = MonkClass('mongodb://localhost:27017/egam');
var itemsCollection = monk.get('GPOitems');
var usersCollection = monk.get('GPOusers');
console.log(new Date());

var items = ['cbac72d48fe84ed2a814e103de4e6f84','507b33c0f4b84c08b6223134eec8f044','ecfe2dcdbc234a0781bd43d2acde2b6a'];
utilities.getDistinctArrayFromDB(itemsCollection,{id:{$in:items}},'owner')
  .then(function (owners){
    console.log(owners);
  });

console.log(itemsCollection.id("570edd967ed06330369c9033"));

//itemsCollection.find({_id:"570edd967ed06330369c9033"},{},function (e,docs) {
itemsCollection.findById("570edd967ed06330369c9033",{fields:{'AuditData.compliant':1}},function (e,docs) {
    console.log(docs);
    console.log("end")
  });

return;
console.log("here");

var uniq = {};

var query = {"authGroups": {$ne: []}, "isAdmin": true};

utilities.getDistinctArrayFromDB(usersCollection, query, "authGroups")
  .then(function (authGroups) {
    console.log("done " + authGroups[0]);
    console.log("done " + authGroups[1]);
    console.log("done " + authGroups[2]);
    console.log("done " + authGroups.length);
    console.log(new Date());
    return true;
  });

return;

return utilities.getDistinctArrayFromDB(itemsCollection, {}, "owner")
  .then(function (ownerIDs) {
    console.log("done " + ownerIDs.length);
    console.log(new Date());
    return true;
  });

return;

return utilities.getDistinctArrayFromDBaggregate(itemsCollection, {}, "owner")
  .then(function (ownerIDs) {
    console.log("done " + ownerIDs.length);
    console.log(new Date());
    return true;
  });

return;

return utilities.getDistinctArrayFromDBaggregate(usersCollection, query, "authGroups")
  .then(function (authGroups) {
    console.log("done " + authGroups.length);
    console.log(new Date());
    return true;
  });

return;




itemsCollection.find({}, {fields:{owner:1},limit:null,stream:true})
  .each(function (doc) {
    uniq[doc.owner]=1;
//    console.log(doc.id);
  })
  .success(function () {
    console.log(Object.keys(uniq));
    console.log("done");
    console.log(new Date());
  })
;

return;

itemsCollection.find({},{fields:{owner:1},limit:null},function (e,docs) {

  console.log(new Date());
  console.log("end")
});
return;

itemsCollection.col.aggregate(
  [
    {"$match": {} },
    {
      "$group" : {
        "_id" : "$owner"
      }
    },
    {"$project": {owner:1}}
  ],function () {console.log(new Date())}
);

return;

return utilities.getDistinctArrayFromDB(itemsCollection, {}, "owner")
  .then(function (ownerIDs) {
    console.log("done " + ownerIDs.length);
    console.log(new Date());
    return true;
  });

return;

var Q = require('q');

var dum1 = function () {
  var defer = Q.defer();
  setTimeout(function () {defer.resolve('dum1');console.log('dum1 done')},3000);
  return defer.promise;
};
var dum2 = function () {
  var defer = Q.defer();
  setTimeout(function () {defer.resolve('dum2');console.log('dum2 done')},1000);
  return defer.promise;
};
//dum1();
//dum2();
Q.spread([dum1(),dum2()],function(a,b) {
  console.log('a=' + a);
  console.log('a=' + b);
});
return;
Q.all([dum1(),dum2()])
  .then(function(a,b) {
    console.log('a=' + a);
    console.log('a=' + b);
  });
return;
Q.all([dum1(),dum2()])
  .spread(function(a,b) {
    console.log('a=' + a);
    console.log('a=' + b);
  });
return;

var test = function () {
  return Q.fcall(function () {console.log("foo")})
    .then(function (value) {
//      throw new Error("Can't bar.");
    });
};

test()
  .then(function () {console.log("the then")})
  .catch(function (err) {console.error(err.stack)});

return;

return Q.fcall(function () {console.log("foo")})
  .then(function (value) {
    throw new Error("Can't bar.");
  })
  .then(function (value) {
    console.log("after bar");
  })
  .catch(function (error) {
    console.error(error);
    // We get here with either foo's error or bar's error
  })
  .then(function (value) {
    throw new Error("Can't bar22.");
  })
    .catch(function (error) {
      console.error(error);
      // We get here with either foo's error or bar's error
    });

return;


var AuditClass=require('../shared/Audit');
var audit = new AuditClass();
var dirty = "<script>alert('hi');</script><div>outer<div>inner</div>after</div>";
var clean = audit.cleanHTML(dirty);
console.log(dirty);
console.log(clean);
return;

var AuditClass=require('../shared/Audit');
var audit = new AuditClass();

var doc = {};

//Remember to escape the escape characters
doc.type = "Web Mapping Application";
//doc.type = "File Geodatabase";
doc.title = "My name is Aaron Evans joke-copy test";
doc.tags = ["tag 1 is a test","tag 2 is a -copy"];
doc.snippet = "<div>testing snippet test</div>";
doc.description = "contains four words test";
doc.thumbnail = null;
doc.access = "public";

doc.AuditData = {};

audit.validate(doc);
console.log(doc);

audit.clear(doc);

console.log(doc);

doc.access = "private";
audit.validate(doc,["title"]);
console.log(doc);

doc.access = "public";
audit.validate(doc,["tags"]);
console.log(doc);

audit.clear(doc);
audit.validate(doc,["tags"]);
console.log(doc);

return;

var Q = require('q');
var MonkClass = require('monk');

var monk = MonkClass('mongodb://localhost:27017/egam');
var userscollection = monk.get('GPOusers');
var ownerIDsCollection = monk.get('GPOownerIDs');

var utilities=require('../shared/utilities');

var itemsCollection = monk.get('GPOitems');

var json2csv = require('json2csv');

var jsonexport  = require('jsonexport');

Q(userscollection.find({},{}))
  .then(function (docs) {
    return getJson2csvPromise({data: docs[0]});
  })
  .then(function (csv) {
    var fs = require('fs');
    fs.writeFile("C:\\EGAM\\test\\test.csv",csv ,function (err) {
      if (err) return console.error(err);
      console.log("file written");});
  })
  .catch(function (err) {console.error(err);})
  .then(function (docs) {
    return;
//    console.log(docs);
    var name = "Aaron's Name";
    var one = 1;
    docs[0].dum=JSON.stringify([one.toString(),2,3,name]);
//    docs[0].dum="[1,2,3,'Aaron']";
    console.log(docs[0].dum);
//    jsonexport([docs[0]], function(err, csv) {
    json2csv({ data: docs[0] }, function(err, csv) {
      if (err) console.error(err);
      console.log(csv);
      var fs = require('fs');
      fs.writeFile("C:\\EGAM\\test\\test.csv",csv ,function (err) {
        if (err) return console.error(err);
        console.log("file written");});
    });
  });

 function getJson2csvPromise (options) {
  var Q = require('q');
  var json2csv = require('json2csv');

  return Q.nfcall(json2csv, options);
}

return;

var arrayExtended = require('array-extended');
var diff = arrayExtended.difference([1,3,2,5,4], [1,2,3,4,5]);
var diff = arrayExtended.difference(null, null);
var diff = arrayExtended.difference([1,3,2,5,4], [1,2,3,4]);
var diff = arrayExtended.difference([1,2,3,4], [1]);

console.log("diff.length: " + diff.length + diff);
console.log(diff);

var isDiff=false;
if (diff && diff.length>0) isDiff = true;

console.log("isDiff: " + isDiff);

var test ={};
//var same= arrayExtended.intersect(test.dum, [1,2,3,4]);

var out = arrayExtended.intersect([5,2,4,1], [1,2]);
console.log(out);

return;



utilities.getDistinctArrayFromDB(itemsCollection,{},"owner")
  .then(function (owners) {console.log(owners);});
;

return;

Q.ninvoke(itemsCollection.col,"aggregate",
    [
      {"$match": {} },
      {
        "$group" : {
          "_id" : "$owner"
        }
      }
    ])
    .then(function (docs) {
      return docs.map(function (doc) {
        return (doc._id);
      });
    })
  .then(function (owners) {console.log(owners);});



return;

Q.ninvoke(userscollection.col,"aggregate",
  [
    {"$match":{
      "authGroups":{$ne:[]}
      ,"isAdmin":true
      }
    },
    {
      "$group" : {
        "_id" : "$authGroups"
      }
    }
  ])
  .then(function (docs) {
    return docs.map(function (doc) {
      return (doc._id);
      });
  })
  .then(function (authGroups) {console.log(authGroups)});



return;
utilities.getArrayFromDB(userscollection,{username:{$in:["aaron.evans_EPA","lmaclear_EPA"]}},"authGroups")
  .then(function (x) {console.log(x);});


return;


var monk = MonkClass('mongodb://localhost:27017/egam');
var userscollection = monk.get('GPOusers');

//orderBy like this doesn't work
Q(userscollection.findOne({authGroups:{$all:["GPO Meta-Inteligence","Region 7"]}},{}))
      .then(function (doc) {
//    console.log(historycollection.id(doc._id));
        console.log(doc);
  });

return;



var monk = MonkClass('mongodb://localhost:27017/egam');
var userscollection = monk.get('GPOusers');
var authgroupscollection = monk.get('GPOauthGroups');

var UpdateAdminOwnerIDsClass = require("../shared/UpdateAuthGroupsAndOwnerIDs");
var updateAdminOwnerIDs = new UpdateAdminOwnerIDsClass(userscollection,authgroupscollection);

updateAdminOwnerIDs.update({username:"aaron.evans_EPA",groups:["GPO Meta-Inteligence"],role:"org_admin"});

return;

var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'evansaaroncgi@gmail.com',
    pass: '9699257tag'
  }
});
transporter.sendMail({
  from: 'evansaaroncgi@gmail.com',
  to: 'aaron.evans@cgi.com',
  subject: 'hello',
  text: 'hello world!'
});

return;

var monk = MonkClass('mongodb://localhost:27017/egam');
var historycollection = monk.get('GPOhistory');
var GPOid = "a5ca9de470064ae791647fc5c85dce09";

//orderBy like this doesn't work
Q(historycollection.findOne({$query:{id:GPOid},$orderBy:{_id:-1}},{fields:{_id:1}}))
  .then(function (doc) {
//    console.log(historycollection.id(doc._id));
    if (! doc) return null;
    return doc._id});


Q(historycollection.findOne({id:GPOid},{sort:{_id:-1}}))
  .then(function (doc) {
    console.log(doc.date);
    console.log(historycollection.id(doc._id));
    if (! doc) return null;
    return doc._id});

//Get just ID
Q(historycollection.findOne({id:GPOid},{sort:{_id:-1},fields:{_id:1}}))
  .then(function (doc) {
    console.log(historycollection.id(doc._id));
    if (! doc) return null;
    historycollection.update({_id:historycollection.id(doc._id)},{$set:{"doc.description":"test"}});
    return doc._id});


Q(historycollection.find({id:GPOid},{sort:{_id:-1}}))
  .then(function (docs) {
    console.log(docs[0].date);
    console.log(docs[11].date);
    if (!docs) return null;
  });

return;

var util = require('util');
var utilities=require('../shared/utilities');


function test2() {
  tq = require('../shared/TasksQueues');

  var Q = require('q');

  var long = function () {
    for (var i = 1; i <= 100; i=i+1) {
      console.log(i);
    }
    return Q(true);
  };

  var short = function () {
    console.log("short");
    return Q(true);
  };

  tq.add('sample task',long);
  tq.add('sample task',short);

}
test2();
return;

function test1() {

var TasksQueue = require('tasks-queue');

var Q = require('q');

tq = new TasksQueue({autostop:false});

// The queue should not execute more than one task in 500 ms.
tq.setMinTime(500);
tq.setVar('value',0);

tq.execute();

tq.on('sample task', process);


var long = function () {
  for (var i = 1; i <= 100000; i=i+1) {
    console.log(i);
  }
  return Q(true);
};

var short = function () {
    console.log("short");
  return Q(true);
};

tq.pushTask('sample task',long);
tq.pushTask('sample task',short);

function process(jinn,promise) {
  console.log("process");
  promise().then(function () {jinn.done()}); // important!
}

}

test1();

if (1==0) {

  q = new TasksQueue({autostop:false});

// The queue should not execute more than one task in 500 ms.
  q.setMinTime(500);
  q.setVar('value',0);

  q.on('sample task', process);
  q.on('stop', logResults);

  q.execute();

  q.pushTask('sample task',{n:5});
  q.pushTask('sample task',{n:32});
  q.pushTask('sample task',{n:98});
  q.pushTask('sample task',{n:33});

  function process(jinn,data) {
    var q = jinn.getQueue();
    q.setVar('value', data.n + ' ' + q.getVar('value'));
    console.log(q.getVar('value'));
    jinn.done(); // important!
  }

  function logResults(jinn) {
    console.log( jinn.getQueue().getVar('value') );
  }

return

  utilities.streamify('foo\n').pipe(process.stdout);


disp = 'attachment; filename="SCAT.sd"'

var AuditClass=require('../shared/Audit');
var audit = new AuditClass();

var doc = {};

//Remember to escape the escape characters
doc.access = "public";
//doc.access = "private";
doc.type = "Web Mapping Application";
//doc.type = "File Geodatabase";
doc.title = "My name is Aaron Evans joke-copy test";
doc.tags = ["tag 1 is a test","tag 2 is a -copy"];
doc.snippet = "<div>testing snippet test</div>";
doc.description = "contains four words test";
doc.thumbnail = null;

audit.validate(doc,["description","tags"]);

audit.validate(doc,["thumbnail"]);

//audit.checkForbiddenWords("title",doc,[" test ","-copy "]);
//audit.checkForbiddenWords("tags",doc,[" test ","-copy "]);

//audit.checkForbiddenWords(["title","tags"],doc,[" test ","-copy "]);

//audit.checkForbiddenWords(["snippet","description"],doc,[" test "]);

//audit.checkWordLimit("description",doc,5,10);

//audit.checkArrayLimit("tags",doc,3);

//audit.checkRequiredField("thumbnail",doc);

//audit.checkInArray("tags",doc,[" dogs ", " usepa "]);

console.log(util.inspect(audit, false, null))

audit.clear();

var config = require('../config/env');
monk = require('monk')
var db = monk(config.mongoDBurl);

db.get('GPOitems').find({id:"3ec8c9c352674bd69f6477d747f2cae2"},{},function (e,docs) {
  audit.validate(docs[0]);
  console.log(util.inspect(audit, false, null))
})
return;

var mapcheck = audit.mapFunctionToArray(audit.checkForbiddenWords,tags,comp);
console.log(mapcheck);

var arrcheck = audit.checkArrayLimits(tags,3);
console.log(arrcheck );

var reqcheck = audit.checkRequiredWords(test,comp);
console.log(reqcheck);

var mapcheck = audit.mapFunctionToArray(audit.checkRequiredWords,tags,comp);
console.log(mapcheck);

var wordcheck = audit.checkWordLimits(test,4);
console.log(wordcheck  );

return;


var testjson= {
  thing: {
    "another": "somethingsomething"
  },
  "thing2": {
    "another2": "something2"
  },
  "thing3": {
    "thing4": {
      "thing5.thing5.thing5": "something3"
    }
  }
};

console.log(utilities.removeJSONkeyDots(testjson));

return;

var MonkClass = require('monk');
var monk = MonkClass('mongodb://localhost:27017/test');

var history2 = monk.get('history2');

//history2.col.find({},{}, function (doc) {

history2.find({},{}, function (e,doc) {
  var test = doc._id;
  console.log(doc);
});


}
