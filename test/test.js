var utilities=require('../utilities');


utilities.streamify('foo\n').pipe(process.stdout);


disp = 'attachment; filename="SCAT.sd"'

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

