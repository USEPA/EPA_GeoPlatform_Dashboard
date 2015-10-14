var Audit =  function(config){
  this.config = config;
//fieldsToValidate is limited list of fields to validate. The default case is to set [] and all fields will be validated
  this.fieldsToValidate = [];
  this.results = {};
  this.results.errors = {};
  this.results.compliant = false;
};

//We register functions with options such as processItems and template
//template will be used to create error message for the validation function
// processItems is used if doc.field is an array
// processItems is true by default which means a validation will be performed for each array items
// if processItems is false a validation is performed on the array as an individual object
//
//Creating this registry item here also will create function check{item}
//check{item} calls a function called get{item}Result
//To create a new function in registry must create the get{item}Result where function name is {item}
//It is important that the get{item}Result function return result object with parameters referenced in the registry template
Audit.prototype.registry = {};
Audit.prototype.registry.forbiddenWords = {};
Audit.prototype.registry.forbiddenWords.template = "<<field>><<number>> can not contain <<matches>>";

Audit.prototype.registry.requiredWords = {};
Audit.prototype.registry.requiredWords.template = "<<field>><<number>> must contain <<matches>>";

Audit.prototype.registry.requiredField = {};
Audit.prototype.registry.requiredField.template = "<<field>><<number>> is required";

Audit.prototype.registry.wordLimit = {};
Audit.prototype.registry.wordLimit.template = "<<field>><<number>> must contain <<limits>> words";

Audit.prototype.registry.arrayLimit = {};
Audit.prototype.registry.arrayLimit.processItems = false;
Audit.prototype.registry.arrayLimit.template = "<<field>><<number>> must contain <<limits>> items";

Audit.prototype.registry.inArray = {};
Audit.prototype.registry.inArray.processItems = false;
Audit.prototype.registry.inArray.template = "<<field>><<number>> array must contain <<matches>>";


//These are the base auditing that can be overwritten or added to
Audit.prototype.validators = {access:{},type:{}};

Audit.prototype.validators.access.public = function (doc) {
//This function is called on all public items
  this.checkForbiddenWords(["title","tags"],doc,[" test ","-copy "]);

  this.checkForbiddenWords(["snippet","description"],doc,[" test "]);
};

Audit.prototype.validators.type["Web Map"] = function (doc) {
//This function is called on all Web Map types
  this.checkRequiredField("thumbnail",doc);

//Use 2 tag min for now until we add usepa to all
//  this.checkArrayLimit("tags",doc,3);
  this.checkArrayLimit("tags",doc,3);

//Don't do this for now because we are going to add usepa tags to all. For now it shows too many errors
//  this.checkInArray("tags",doc,[" usepa "]);
};

Audit.prototype.validators.type["Web Mapping Application"] = function (doc) {
//This function is called on all Web Map types
  this.validators.type["Web Map"].apply(this,[doc]);//this was not maintaining scope of the audit object
  this.checkWordLimit("description",doc,5);
};


Audit.prototype.validate = function (doc,fieldsToValidate) {
  var self = this;
//To initialize validation must clear out errors and set compliance to true and populate this.fieldsToValidate
//Not the same as clearing which empties everything out and sets compliance to false
  self.init(fieldsToValidate);

//loop through validators )(access, type, etc)
  Object.keys(this.validators).forEach(function (key) {
//Get the function
    var docValue = doc[key]; //this will be value like public or Web Map
    var valFunction = self.validators[key][docValue];
//now run the valFunction but must do it in audit scope or self
    if (valFunction) valFunction.apply(self,[doc]);
  });
//if they are only validating a few fields check if it is globally compliant now
  if (self.fieldsToValidate.length > 0) self.checkCompliance();
};

//Initialize object for validation by setting compliance to true and clearing out errors
//Passing fields only clears out those fields but keeps errors intact for previously created errors
//This is important for persisting errors and only producing incremental change in objects errors
Audit.prototype.init = function (fields) {
  var self = this;

  if (fields) {
//Don't clear out all errors just for the pass fields
    if (! Array.isArray(fields)) fields=[fields];
    fields.forEach(function (field) {self.results.errors[field] = {compliant:true,messages:[]};});
  }else {
    fields=[]
    self.results.errors = {};
  }
  self.results.compliant = true;
  self.fieldsToValidate = fields;
};

//This completely resets the audit object to original form
Audit.prototype.clear = function () {
  var self = this;
  self.results.errors = {};
  self.results.compliant = false;
  self.fieldsToValidate = [];
};

//Create check{template} function on prototype
Object.keys(Audit.prototype.registry).forEach(function (key) {
//capitalize key to get camel case
  var registryitem = Audit.prototype.registry[key];
  var checkFunctionName = "check" + key.charAt(0).toUpperCase() + key.substring(1);
  var getResultsFunctionName = "get" + key.charAt(0).toUpperCase() + key.substring(1) + "Result";
//if not processItems variable set then defaults to true. must set to false to get false ie. falsey empty value will default to true.
  var processItems = registryitem.processItems!==false;
  Audit.prototype[checkFunctionName] = function () {
    var args = Array.prototype.slice.call(arguments);
    args = Array.prototype.concat([this[getResultsFunctionName],processItems],args);
    this.checkGeneric.apply(this,args);
  };
});

//These are the get{Validation}Result functions that perform the actual validations
//The first argument should be like myString or myArray representing the value of the field being validated
//Subsequent arguments are additional parameters necessary for validation
//eg:  this.checkForbiddenWords("title",doc,[" test ","-copy "]) calls getRequiredFieldResult(doc.title,[" test ","-copy "]) ;
//It is also possible to pass array to check{Validation} as first argument which will validate all fields
//There is no need to change get{Validation}Result to accomodate this and it should be written to handle individual doc.fields
//the get{Validation}Result returns a "result" which is an object like {pass:True/False,otherfields:etc}
//The other fields returend are important for rendering error messages
// getForbiddenWords returns {pass:True/False,matches:[forbidden words that were matched]}
// get{Validation}Result can also return an array of results if more than one result/error was returned
// It is important to make the function name of get{Validation}Result to be {Validation} for eaiser identification
// I am thinking about changing this requiremnt

Audit.prototype.getRequiredFieldResult = function requiredField(myString) {
  var pass = false;
  if (myString) pass=true;

  return {pass:pass};
};

Audit.prototype.getForbiddenWordsResult = function forbiddenWords(myString,forbidden) {
//This matches forbidden words
  return this.getMatches(myString,forbidden,{checkAbsence:false});
};

Audit.prototype.getRequiredWordsResult = function requiredWords(myString,required) {
  return this.getMatches(myString,required,{checkAbsence:true});
};

Audit.prototype.getWordLimitResult = function wordLimit(myString,floor,ceiling) {
  var wordCount = 0;
  if (myString) wordCount = myString.split(/\s+/).length;

  return this.getGenericLimitResult(wordCount,floor,ceiling)
};

Audit.prototype.getArrayLimitResult = function arrayLimit(myArray,floor,ceiling) {
  return this.getGenericLimitResult(myArray.length,floor,ceiling)
};

Audit.prototype.getInArrayResult = function inArray(myArray,required) {
//This returns result list of results for each required word in Array
  var self = this;
  var resultList = [];
  required.forEach(function (resultItem) {
    var myString = myArray.join(" ");
    var result = self.getMatches(myString,[resultItem],{checkAbsence:true});
    resultList.push(result);
  });
  return resultList;
};

Audit.prototype.getGenericLimitResult = function (value,floor,ceiling) {
  var withinLimit=true;

  var limits = "";

  if (floor || floor===0) {
    withinLimit= (value >= floor);
    limits += "a minimum of " + floor;
  }
  if (ceiling || ceiling===0) {
    withinLimit= withinLimit && (value <= ceiling);
    if (floor) limits += " and a";
    limits += " maximum of " + ceiling;
  }

  return {pass:withinLimit,floor:floor,ceiling:ceiling,limits:limits};
};


//Audit.prototype.getMatches = function (myString,comparisons,checkAbsence) {
Audit.prototype.getMatches = function (myString,comparisons,options) {
//undefined or null myString needs to be empty string for regex
  if (! myString) myString="";

  if (! options) options = {};

  if (typeof comparisons === "string") forbidden=[comparisons];

  var matches = comparisons.filter(function (x) {
//if matchWords then need to add word boundary to regex pattern
    if (options.matchWords === true) x = "\\b" +  x + "\\b";

    var re= new RegExp(x);
    //Allow spacing around html so <html>test<html> -> < html > test < html > and would consider test a word.
    myString=myString.replace(/[<>]/g," $& ");
    var match=re.test(" " + myString + " ");
//If checking absence of something in value (finding required field errors) then negate match
    return (options.checkAbsence===true) ? ! match : match;
  });
  var pass = matches.length<=0 ;
  matches = matches.map(function(x) {return x.trim()});
  return {pass:pass,matches:matches};

};

Audit.prototype.mapFunctionToArray = function (myFunction, myArray) {
  var args = Array.prototype.slice.call(arguments,2,arguments.length);
  var self = this;
  return myArray.map(function (x) {
    return myFunction.apply(self,Array.prototype.concat([x],args));
  });
};

Audit.prototype.checkGeneric = function (myFunction,processItems,fields,doc) {
//This matches forbidden words
  var args = Array.prototype.slice.call(arguments,3,arguments.length);
  var self = this;

  if (! Array.isArray(fields) ) fields = [fields];

  fields.forEach(function (field) {
//Only run check on field if we are validating all fields ( this.fieldsToValidate=[] )
// OR field is in fields to be validatad
    if (self.fieldsToValidate.length===0 || self.fieldsToValidate.indexOf(field)>=0) {
      var checkSingleArgs = Array.prototype.concat([myFunction,processItems,field],args);
      return self.checkGenericSingle.apply(self,checkSingleArgs);
    }
  });

};

//These are autogenerated now
//Just need to create the get{item}Result function and put {item} in registry
//Audit.prototype.checkForbiddenWords = function (fields,doc,comp) {
//This checks forbidden words
//  this.checkGeneric(this.getForbiddenWordsResult,true,fields,doc,comp)
//};


Audit.prototype.checkGenericSingle = function (myFunction,processItems,field,doc) {
  var args = Array.prototype.slice.call(arguments,4,arguments.length);
  var self = this;
//The function must be named so we can find it's template
  var template = myFunction.name;

//This matches forbidden words and creates error messags and attaches to audit this.results
//If you pass a field which is an array it will create an array of error messages for that field
//If you pass processItems=false then don't process the array items and treat as you would a string

  var values = doc[field];

  if (! Array.isArray(values) || processItems===false) {
    values = [values];
    processItems =false; //make sure processItems is false if doc.field is string
  }else{
    processItems = true;
  }

  values.forEach(function (value,index) {
    var resultList = myFunction.apply(self,Array.prototype.concat([value],args));
//Allow multiple results from one call. Useful for testing multiple items in array
    if (! Array.isArray(resultList)) {
      resultList = [resultList];
    }
//now add error message for each result
    resultList.forEach(function (result) {
      result.field = field;
      result.index = processItems ? index : null;
      result.number = processItems ? " item " + (index+1) : "" ;
      self.addErrorMessage(field,doc,template,result)
    })

  });
};

Audit.prototype.addErrorMessage = function (field,doc,template,result) {
//parse error message then add to results
  var error = Audit.prototype.registry[template].template;
  var self = this;

  //If one check fails audit then compliant is set to false
  if (! result.pass) this.results.compliant=false;
//If there was an error then parse error message
  if (! result.pass) Object.keys(result).forEach(function (key) {
    var re = new RegExp("<<" + key + ">>","g");
    error = error.replace(re,result[key]);
  });

//If error object is uninitialized then initialize it here
  if (! this.results.errors[field]) this.results.errors[field] = {compliant:true,messages:[]};
  if (! this.results.errors[field].messages) this.results.errors[field].messages = [];
//let this field be compliant until it is possibly made false below
  this.results.errors[field].compliant=true;
//array fields like tags have object like results.errors.tags = {messages:[],messagesByItem:{0:[],1:[]}}with key equal to tag index
  if (Array.isArray(doc[field])) {
    if (result.index!==null) {
      if (! this.results.errors[field].messagesByItem) this.results.errors[field].messagesByItem = {};
      if (! this.results.errors[field].messagesByItem[result.index]) this.results.errors[field].messagesByItem[result.index] = [];
  //if there was an error add it to errors object
      if (! result.pass) {
        this.results.errors[field].messagesByItem[result.index].push(error);
        this.results.errors[field].compliant=false;
      }
    }else {
      //if there was an error add it to errors object
      if (! result.pass) {
        this.results.errors[field].messages.push(error);
        this.results.errors[field].compliant=false;
      }
    }
//string fiels like title just have results.errors.title = []
  }else {
//if there was an error add it to errors object
    if (! result.pass) {
      this.results.errors[field].messages.push(error);
      this.results.errors[field].compliant=false;
    }
  }
  if (! result.pass) console.log("Error for " + doc.id + " : " + error);

};

Audit.prototype.checkCompliance = function () {
  var self = this;
//Loop through all fields errors. if at least one field is not compliant then set global compliance = false
  self.results.compliant = Object.keys(self.results.errors).every(function (field) {
    return self.results.errors[field].compliant;
  });
};


if (!(typeof window != 'undefined' && window.document)) module.exports = Audit;
