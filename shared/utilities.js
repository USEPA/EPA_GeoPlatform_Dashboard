var utilities = {};

utilities.getRequestInputs = function(req,errors) {
//get value from request form or querystring
//returns false if output is not a string (like an object or something)

  var inputs=req.body;
  if (req.method.toLowerCase()==="get") inputs=req.query;

  return inputs;
};

utilities.getCleanRequestInputs = function(req,errors) {
//get value from request form or querystring
//add to error list if input value not a string

  var inputs=utilities.getRequestInputs(req,errors);

  Object.keys(inputs).forEach(
      function (key) {
        if (typeof inputs[key] !== "string") {
          error.push(key + " must be a string");
          inputs[key] = JSON.stringify(inputs[key]);
        }
      });
  return inputs;
};

//Not on a big JSON object this can be VERY sloq where it basically isn't pratical
utilities.removeJSONkeyDots = function(json) {
//get rids of dots in JSON keys. Mongo doesn't like it for one.
  var JafarClass = require('jafar');

  var jafar = new JafarClass({
    json: json
  } );

  var allKeys = jafar.listAllKeys();

  allKeys.forEach(function (key) {
    newkey=key.replace(/\./g,"");
    jafar.replaceKey(key, newkey, true, true);
  })

  return jafar.json;
};

utilities.streamify = function(text) {
//Converts a string to a stream
  var stream = require('stream');
  var s = new stream.Readable();
  s.push(text);
  s.push(null);
  return s;
};

utilities.getHandleError = function (resObject,code) {
  return function(error) {
    resObject = {error: {message: error.message, code: code}, body: null};
  }
};

utilities.writeStreamPromise = function (stream,text,encoding) {
  var Q = require('q');
//writes text to stream and returns promise
//NOTE: If text is empty then does not write
  if (text===0) text="0";
  if (text) {
    return Q.ninvoke(stream, "write", text,encoding);
  }else {
    return Q(true);
  }
};


module.exports = utilities;

