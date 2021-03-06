var Audit = function() {
  //FieldsToValidate is limited list of fields to validate. The default case is
  //to set [] and all fields will be validated
  this.fieldsToValidate = [];
  this.updateFields = [
    'title',
    'description',
    'tags',
    'thumbnail',
    'snippet',
    'licenseInfo',
    'accessInformation',
    'url',
  ];
};

//We register functions with options such as processItems and template
//template will be used to create error message for the validation function
//processItems is used if doc.field is an array
//processItems is true by default which means a validation will be performed
//for each array items
//if processItems is false a validation is performed on the array as an
//individual object
//
//Creating this registry item here also will create function check{item}
//check{item} calls a function called get{item}Result
//To create a new function in registry must create the get{item}Result
//where function name is {item}
//It is important that the get{item}Result function return result object
//with parameters referenced in the registry template
Audit.prototype.registry = {};
Audit.prototype.registry.forbiddenWords = {};
Audit.prototype.registry.forbiddenWords.template = '<<field>><<number>> can not contain <<matches>>';

Audit.prototype.registry.requiredWords = {};
Audit.prototype.registry.requiredWords.template = '<<field>><<number>> must contain <<matches>>';

Audit.prototype.registry.requiredField = {};
Audit.prototype.registry.requiredField.template = '<<field>><<number>> is required';

Audit.prototype.registry.wordLimit = {};
Audit.prototype.registry.wordLimit.template = '<<field>><<number>> must contain <<limits>> words';

Audit.prototype.registry.arrayLimit = {};
Audit.prototype.registry.arrayLimit.processItems = false;
Audit.prototype.registry.arrayLimit.template = '<<field>><<number>> must contain <<limits>> items';

Audit.prototype.registry.inArray = {};
Audit.prototype.registry.inArray.processItems = false;
Audit.prototype.registry.inArray.template = '<<field>><<number>> array must contain <<matches>>';

Audit.prototype.registry.regexMatch = {};
Audit.prototype.registry.regexMatch.template = '<<error>>';

//These are the base auditing that can be overwritten or added to
Audit.prototype.validators = {
  access: {},
  type: {},
};

Audit.prototype.globalValidator = function(doc) {
  this.checkWordLimit('description', doc, 5, null, true);
  //When they upload a excel file for features it can make the title be excel
  //spread sheet cell or range of cells
  this.checkRegexMatch(['title'], doc, ['^\\s*\\$[A-Za-z]+\\$\\d+'],
    'Title can not be an excel spread sheet cell');
};

Audit.prototype.validators.access.public = function(doc) {
  //This function is called on all public items
  this.checkForbiddenWords(['title', 'tags'], doc, ['-copy ']);

  //this.checkForbiddenWords(['snippet', 'description'], doc, [' test '], true);
};

Audit.prototype.validators.type['Feature Service'] = function(doc) {
};

Audit.prototype.validators.type['Web Map'] = function(doc) {
  //This function is called on all Web Map types
  this.checkRequiredField('thumbnail', doc);

  //Use 2 tag min for now until we add usepa to all
  //  this.checkArrayLimit("tags",doc,3);
  this.checkArrayLimit('tags', doc, 3);

  //Don't do this for now because we are going to add usepa tags to all.
  //For now it shows too many errors
  //this.checkInArray("tags",doc,[" usepa "]);
};

Audit.prototype.validators.type['Web Mapping Application'] = function(doc) {
  //This function is called on all Web Map types
  //This was not maintaining scope of the audit object
  this.validators.type['Web Map'].apply(this, [doc]);
};


Audit.prototype.validate = function(doc, fieldsToValidate) {
  var self = this;


  //To initialize validation must clear out errors and set compliance to true
  //and populate this.fieldsToValidate
  //Not the same as clearing which empties everything out and sets
  //compliance to false
  self.init(doc, fieldsToValidate);

  //Run the global validator before doing the specific validators
  this.globalValidator(doc);

  //Loop through validators )(access, type, etc)
  Object.keys(this.validators).forEach(function(key) {
    //Get the function
    //This will be value like public or Web Map
    var docValue = doc[key];
    var valFunction = self.validators[key][docValue];
    //Now run the valFunction but must do it in audit scope or self
    if (valFunction) {
      valFunction.apply(self, [doc]);
    }
  });
  //If they are only validating a few fields check if it is globally compliant
  if (self.fieldsToValidate.length > 0) {
    self.checkCompliance(doc);
  }
  //If they do not have all update fields in Audit errors then just add
  //empty object now
  self.updateFields.forEach(function(field) {
    if (!doc.AuditData.errors[field]) {
      doc.AuditData.errors[field] = {
        compliant: true,
      };
    }
    if (!doc.AuditData.errors[field].messages) {
      doc.AuditData.errors[field].messages = [];
    }
    if (!doc.AuditData.errors[field].messagesByItem) {
      doc.AuditData.errors[field].messagesByItem = [];
    }
  });
};

//Initialize object for validation by setting compliance to true and clearing
//out errors
//Passing fields only clears out those fields but keeps errors intact for
//previously created errors
//This is important for persisting errors and only producing incremental
//change in objects errors
Audit.prototype.init = function(doc, fields) {
  var self = this;

  //If AuditData is not member of passed doc then create new AuditData object
  //and attach to doc.
  if (!doc.AuditData) {
    doc.AuditData = {};
  }
  if (!doc.AuditData.errors) {
    doc.AuditData.errors = {};
  }

  if (fields) {
    //Don't clear out all errors just for the pass fields
    if (!Array.isArray(fields)) {
      fields = [fields];
    }
    fields.forEach(function(field) {
      doc.AuditData.errors[field] = {
        compliant: true,
        messages: [],
      };
    });
  } else {
    fields = [];
    doc.AuditData.errors = {};
  }
  doc.AuditData.compliant = true;
  self.fieldsToValidate = fields;
};

//This completely resets the audit object to original form
Audit.prototype.clear = function(doc) {
  var self = this;
  if (doc && doc.AuditData) {
    doc.AuditData.errors = {};
    doc.AuditData.compliant = false;
  }
  self.fieldsToValidate = [];
};

//Create check{template} function on prototype
Object.keys(Audit.prototype.registry).forEach(function(key) {
  //Capitalize key to get camel case
  var registryitem = Audit.prototype.registry[key];
  var functionName = key.charAt(0).toUpperCase() + key.substring(1);
  var checkFunctionName = 'check' + functionName;
  var getResultsFunctionName = 'get' + functionName + 'Result';
  //If not processItems variable set then defaults to true. must set to
  //false to get false ie. falsey empty value will default to true.
  var processItems = registryitem.processItems !== false;
  Audit.prototype[checkFunctionName] = function() {
    var args = Array.prototype.slice.call(arguments);
    //Add the name of the function here because IE doesn't recognize the
    //name property of functions
    //Now I don't have to name the functions anymore. I was naming the function
    //so I would know what error template to use for the function
    //Note the template name begins with lowercase
    this[getResultsFunctionName].name = functionName.charAt(0).toLowerCase() +
      functionName.slice(1);
    args = Array.prototype
      .concat([this[getResultsFunctionName], processItems], args);
    this.checkGeneric.apply(this, args);
  };
});

//These are the get{Validation}Result functions that perform the actual
//validations. The first argument should be like myString or myArray
//representing the value of the field being validated. Subsequent arguments are
//additional parameters necessary for validation
//eg:  this.checkForbiddenWords("title",doc,[" test ","-copy "])
//calls getRequiredFieldResult(doc.title,[" test ","-copy "]) ;
//It is also possible to pass array to check{Validation} as first
//argument which will validate all fields
//There is no need to change get{Validation}Result to accomodate this and it
//should be written to handle individual doc.fields
//the get{Validation}Result returns a "result" which is an object like
//{pass:True/False,otherfields:etc}
//The other fields returend are important for rendering error messages
//getForbiddenWords returns {pass:True/False,matches:
//[forbidden words that were matched]}
//get{Validation}Result can also return an array of results
//if more than one result/error was returned
//It is important to make the function name of get{Validation}Result
//to be {Validation} for easier identification
//I am thinking about changing this requirement
//NOTE: You don't have to name the functions anymore I have lifted that
//requirement because it wasn't working in IE 11 (Now I directly set the name
//of the template as get{FunctionName}Result.name=FunctionName)

Audit.prototype.getRequiredFieldResult = function requiredField(myString,
                                                                cleanHTML) {
  if (cleanHTML === true) myString = this.cleanHTML(myString);
  var pass = false;
  if (myString) pass = true;

  return {
    pass: pass,
  };
};

//This is basically a regex search. forbidden can actually be a regex pattern
Audit.prototype.getForbiddenWordsResult = function forbiddenWords(myString,
                                                                  forbidden,
                                                                  cleanHTML) {
  if (cleanHTML === true) {
    myString = this.cleanHTML(myString);
  }
  //This matches forbidden words
  return this.getMatches(myString, forbidden, {
    checkAbsence: false,
  });
};

Audit.prototype.getRequiredWordsResult = function requiredWords(myString,
                                                                required,
                                                                cleanHTML) {
  if (cleanHTML === true) {
    myString = this.cleanHTML(myString);
  }
  return this.getMatches(myString, required, {
    checkAbsence: true,
  });
};

//This basically does the same thing as getForbiddenWordsResult or
// getRequiredWordsResult but allows a custom error to be passed
//It had to be a new function because we had to make a new template equal to
// <<error>> instead of the standard
Audit.prototype.getRegexMatchResult = function regexMatch(myString, pattern,
                                                          error, checkAbsence,
                                                          cleanHTML) {
  if (checkAbsence !== true) {
    checkAbsence = false;
  }
  if (cleanHTML === true) {
    myString = this.cleanHTML(myString);
  }

  //This matches regex words and requires a custom error to be passed
  var result = this.getMatches(myString, pattern, {
    checkAbsence: checkAbsence,
  });
  result.error = error;
  return result;
};


Audit.prototype.getWordLimitResult = function wordLimit(myString, floor,
                                                        ceiling, cleanHTML) {
  if (cleanHTML === true) {
    myString = this.cleanHTML(myString);
  }
  var wordCount = 0;
  if (myString) {
    wordCount = myString.split(/\s+/).length;
  }

  return this.getGenericLimitResult(wordCount, floor, ceiling)
};

Audit.prototype.getArrayLimitResult = function arrayLimit(myArray, floor,
                                                          ceiling) {
  return this.getGenericLimitResult(myArray.length, floor, ceiling)
};

Audit.prototype.getInArrayResult = function inArray(myArray, required,
                                                    cleanHTML) {
  //This returns result list of results for each required word in Array
  var self = this;
  var resultList = [];
  required.forEach(function(resultItem) {
    var myString = myArray.join(' ');
    if (cleanHTML === true) {
      myString = this.cleanHTML(myString);
    }
    var result = self.getMatches(myString, [resultItem], {
      checkAbsence: true,
    });
    resultList.push(result);
  });
  return resultList;
};

Audit.prototype.getGenericLimitResult = function(value, floor, ceiling) {
  var withinLimit = true;

  var limits = '';

  if (floor || floor === 0) {
    withinLimit = (value >= floor);
    limits += 'a minimum of ' + floor;
  }
  if (ceiling || ceiling === 0) {
    withinLimit = withinLimit && (value <= ceiling);
    if (floor) {
      limits += ' and a';
    }
    limits += ' maximum of ' + ceiling;
  }

  return {
    pass: withinLimit,
    floor: floor,
    ceiling: ceiling,
    limits: limits,
  };
};


//Audit.prototype.getMatches = function (myString,comparisons,checkAbsence) {
Audit.prototype.getMatches = function(myString, comparisons, options) {
  //Undefined or null myString needs to be empty string for regex
  if (!myString) {
    myString = '';
  }

  if (!options) {
    options = {};
  }

  if (typeof comparisons === 'string') {
    forbidden = [comparisons];
  }

  var matches = comparisons.filter(function(x) {
    //If matchWords then need to add word boundary to regex pattern
    if (options.matchWords === true) {
      x = '\\b' + x + '\\b';
    }

    var re = new RegExp(x);
    //Allow spacing around html so <html>test<html> -> < html > test < html >
    //and would consider test a word.
    myString = myString.replace(/[<>]/g, ' $& ');
    var match = re.test(' ' + myString + ' ');
    //If checking absence of something in value (finding required field errors)
    //then negate match
    return (options.checkAbsence === true) ? !match : match;
  });
  var pass = matches.length <= 0;
  matches = matches.map(function(x) {
    return x.trim()
  });
  return {
    pass: pass,
    matches: matches,
  };

};

Audit.prototype.mapFunctionToArray = function(myFunction, myArray) {
  var args = Array.prototype.slice.call(arguments, 2, arguments.length);
  var self = this;
  return myArray.map(function(x) {
    return myFunction.apply(self, Array.prototype.concat([x], args));
  });
};

Audit.prototype.checkGeneric = function(myFunction, processItems, fields, doc) {
  //This matches forbidden words
  var args = Array.prototype.slice.call(arguments, 3, arguments.length);
  var self = this;

  if (!Array.isArray(fields)) {
    fields = [fields];
  }

  fields.forEach(function(field) {
    //Only run check on field if we are validating all fields
    //( this.fieldsToValidate=[] )
    //OR field is in fields to be validatad
    if (self.fieldsToValidate.length === 0 ||
        self.fieldsToValidate.indexOf(field) >= 0) {
      var checkSingleArgs = Array.prototype.concat([myFunction, processItems, field], args);
      return self.checkGenericSingle.apply(self, checkSingleArgs);
    }
  });

};

//These are autogenerated now
//Just need to create the get{item}Result function and put {item} in registry
//Audit.prototype.checkForbiddenWords = function (fields,doc,comp) {
//This checks forbidden words
//  this.checkGeneric(this.getForbiddenWordsResult,true,fields,doc,comp)
//};


Audit.prototype.checkGenericSingle = function(myFunction, processItems,
                                              field, doc) {
  var args = Array.prototype.slice.call(arguments, 4, arguments.length);
  var self = this;
  //The function must be named so we can find it's template
  var template = myFunction.name;

  //This matches forbidden words and creates error messags and attaches to
  //audit doc.AuditData
  //If you pass a field which is an array it will create an array of error
  //messages for that field
  //If you pass processItems=false then don't process the array items and treat
  //as you would a string

  var values = doc[field];

  if (!Array.isArray(values) || processItems === false) {
    values = [values];
    //Make sure processItems is false if doc.field is string
    processItems = false;
  } else {
    processItems = true;
  }

  values.forEach(function(value, index) {
    var resultList = myFunction.apply(self,
      Array.prototype.concat([value], args));
    //Allow multiple results from one call.
    //Useful for testing multiple items in array
    if (!Array.isArray(resultList)) {
      resultList = [resultList];
    }
    //Now add error message for each result
    resultList.forEach(function(result) {
      result.field = field;
      result.index = processItems ? index : null;
      result.number = processItems ? ' item ' + (index + 1) : '';
      self.addErrorMessage(field, doc, template, result)
    })

  });
};

Audit.prototype.addErrorMessage = function(field, doc, template, result) {
  //Parse error message then add to results
  var error = Audit.prototype.registry[template].template;
  var self = this;

  //If one check fails audit then compliant is set to false
  if (!result.pass) {
    doc.AuditData.compliant = false;
  }
  //If there was an error then parse error message
  if (!result.pass) {
    Object.keys(result).forEach(function(key) {
      var re = new RegExp('<<' + key + '>>', 'g');
      error = error.replace(re, result[key]);
    });
  }

  error = error.charAt(0).toUpperCase() + error.slice(1);

  //If error object is uninitialized then initialize it here
  if (!doc.AuditData.errors[field]) {
    doc.AuditData.errors[field] = {
      compliant: true,
      messages: [],
    };
  }
  if (!doc.AuditData.errors[field].messages) {
    doc.AuditData.errors[field].messages = [];
  }
  //Let this field be compliant until it is possibly made false below
  doc.AuditData.errors[field].compliant = true;
  //Array fields like tags have object like
  //results.errors.tags = {messages:[],messagesByItem:{0:[],1:[]}}
  //with key equal to tag index
  if (Array.isArray(doc[field])) {
    if (result.index !== null) {
      if (!doc.AuditData.errors[field].messagesByItem) {
        doc.AuditData.errors[field].messagesByItem = {};
      }
      if (!doc.AuditData.errors[field].messagesByItem[result.index]) {
        doc.AuditData.errors[field].messagesByItem[result.index] = [];
      }
      //If there was an error add it to errors object
      if (!result.pass) {
        doc.AuditData.errors[field].messagesByItem[result.index].push(error);
        doc.AuditData.errors[field].compliant = false;
      }
    } else {
      //If there was an error add it to errors object
      if (!result.pass) {
        doc.AuditData.errors[field].messages.push(error);
        doc.AuditData.errors[field].compliant = false;
      }
    }
    //String fiels like title just have results.errors.title = []
  } else {
    //If there was an error add it to errors object
    if (!result.pass) {
      doc.AuditData.errors[field].messages.push(error);
      doc.AuditData.errors[field].compliant = false;
    }
  }
  //  If (! result.pass) console.log("Error for " + doc.id + " : " + error);

};

Audit.prototype.checkCompliance = function(doc) {
  var self = this;
  //Loop through all fields errors. if at least one field is not compliant
  //then set global compliance = false
  doc.AuditData.compliant = Object.keys(doc.AuditData.errors)
    .every(function(field) {
      return doc.AuditData.errors[field].compliant;
    });
};

Audit.prototype.cleanHTML = function(string) {
  //Browser version of cleaning
  if (typeof window != 'undefined' && window.document) {
    var divClean = document.createElement('div');
    divClean.innerHTML = string;
    string = divClean.textContent || divClean.innerText || '';
  } else {
    //Node.js version of cleaning using sanitize-html module
    var sanitizeHtml = require('sanitize-html');

    string = sanitizeHtml(string, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
  return string;
};

if (!(typeof window != 'undefined' && window.document)) {
  module.exports = Audit;
}
