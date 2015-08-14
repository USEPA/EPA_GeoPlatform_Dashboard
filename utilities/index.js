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

module.exports = utilities;
