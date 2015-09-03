var util = require('util');
var utilities=require('../shared/utilities');


utilities.streamify('foo\n').pipe(process.stdout);


disp = 'attachment; filename="SCAT.sd"'

var AuditClass=require('../shared/Audit');
var audit = new AuditClass();

var doc = {};
//Remember to escape the escape characters

doc.access = "public";
doc.type = "Web Mapping Application";
doc.title = "My name is Aaron Evans joke-copy test";
doc.tags = ["tag 1 is a test","tag 2 is a -copy"];
doc.snippet = "<div>testing snippet test</div>";
doc.description = "contains four words test";
doc.thumbnail = null;

audit.validate(doc);

//audit.checkForbiddenWords("title",doc,[" test ","-copy "]);
//audit.checkForbiddenWords("tags",doc,[" test ","-copy "]);

//audit.checkForbiddenWords(["title","tags"],doc,[" test ","-copy "]);

//audit.checkForbiddenWords(["snippet","description"],doc,[" test "]);

//audit.checkWordLimit("description",doc,5,10);

//audit.checkArrayLimit("tags",doc,3);

//audit.checkRequiredField("thumbnail",doc);

//audit.checkInArray("tags",doc,[" dogs ", " usepa "]);

console.log(util.inspect(audit, false, null))
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

