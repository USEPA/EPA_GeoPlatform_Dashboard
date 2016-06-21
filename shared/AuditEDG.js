var appRoot = require('app-root-path');

//Formal URL regex.
var urlRegex = '^(?:(?:http|https|ftp)://)' +
  '(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])' +
  '(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}' +
  '(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|' +
  '(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)' +
  '(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*' +
  '(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)' +
  '(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';

var AuditEDG = function() {
  var self = this;
  //FieldsToValidate is limited list of fields to validate. The default case is
  //to set [] and all fields will be validated
  this.fieldsToValidate = [
    'title',
    'description',
    'keyword',
    'modified',
    'publisher',
    'contactPoint',
    'identifier',
    'accessLevel',
    'bureauCode',
    'programCode',
    'license',
    'spatial',
    'distribution',
    'accrualPeriodicity'
  ];
  //Get valid tags
  this.availableTags = require(appRoot + '/config/gpoItemsTags');
  //Convert epa & place keywords to lowercase for comparison purposes
  this.availableTags.epaKeywords = this.availableTags.epaKeywords.map(
    function(epaKeyword) {
      return epaKeyword.toLowerCase();
    }
  );
  this.availableTags.placeKeywords = this.availableTags.placeKeywords.map(
    function(placeKeyword) {
      return placeKeyword.toLowerCase();
    }
  );
  //Flatten all EPA offices/orgs into a single flat array for comparison
  //purposes.
  this.validOffices = [].concat.apply(this.availableTags.epaOffices,
    this.availableTags.epaOffices.map(function(office) {
      return self.availableTags.epaOrganizationNames[office]
    })
  );
  //Also convert to lowercase
  this.validOffices = this.validOffices.map(
    function(office) {return office.toLowerCase()});

  this.programCodes = require(appRoot + '/config/programCodes').programCodes;

  this.validAccess = ['public', 'restricted public', 'non-public'];

  this.validAccrualGeo = [
    'continual',
    'daily',
    'weekly',
    'fortnightly',
    'monthly',
    'quarterly',
    'biannually',
    'annually',
    'as needed',
    'irregular',
    'not planned',
    'unknown'
  ];
  this.validAccrualNonGeo = [
    'R/P10Y',
    'R/P4Y',
    'R/P1Y',
    'R/P2M',
    'R/P0.5M',
    'R/P3.5D',
    'R/P1D',
    'R/P2W',
    'R/P0.5W',
    'R/P6M',
    'R/P2Y',
    'R/P3Y',
    'R/P0.33W',
    'R/P0.33M',
    'R/PT1S',
    'R/P1M',
    'R/P3M',
    'R/P0.5M',
    'R/P4M',
    'R/P1W'
  ];
};

AuditEDG.prototype.createRequiredFields = function(doc) {
  var self = this;
  //Loop through required fields
  self.fieldsToValidate.forEach(function(validField) {
    //If they don't exist for this row, create it w/ empty string
    if (Object.keys(doc).indexOf(validField) == -1) {
      doc[validField] = '';
    }
  });
  return doc;
};

AuditEDG.prototype.validate = function(doc, fieldsToValidate) {
  var self = this;
  var valid = true;
  self.fieldsToValidate.forEach(function(validField) {
    //Check if required fields exist
    if (!doc[validField]) {
      valid = false;
    } else {
      //Is the Publisher EPA? If so, do more thorough validation
      if (doc['publisher'] &&
          (/Environmental Protection Agency/i.exec(doc['publisher'].name)) ||
           /U\.?S\.? ?E\.?P\.?A/.exec(doc['publisher'].name)) {
        //Check if identifier is formatted correctly
        //(8 digits-4 digits-4 digits-4 digits-12 digits)
        //There are several EDG records that have malformed identifiers so this
        //should catch that.
        if (validField == 'identifier' &&
            !(/{?.{8}-.{4}-.{4}-.{4}-.{12}}?/.test(doc[validField]))) {
          valid = false;
        }

        if (validField == 'keyword') {
          //Find intersection between valid EPA keywords and this record's tags
          var matchingEPAtags = doc[validField].filter(function(tag) {
            return self.availableTags.epaKeywords.indexOf(tag.toLowerCase()) != -1
          });
          //If no intersection, mark as invalid
          if (matchingEPAtags.length == 0) {
            valid = false;
          }
          //Find intersection between valid Place keywords and this record's
          //tags
          var matchingPlacetags = doc[validField].filter(function(tag) {
            return self.availableTags.placeKeywords.indexOf(tag.toLowerCase()) != -1
          });
          //If no intersection, mark as invalid
          if (matchingPlacetags.length == 0) {
            valid = false;
          }
          //Find intersection between valid Place keywords and this record's
          //tags
          var matchingOfficetags = doc[validField].filter(function(tag) {
            return self.validOffices.indexOf(tag.toLowerCase()) != -1
          });
          //If no intersection, mark as invalid
          if (matchingOfficetags.length == 0) {
            valid = false;
          }
        }
        //Valid program code?
        if (validField == 'programCode' &&
            self.programCodes.indexOf(doc[validField][0]) == -1) {
          valid = false;
        }
        //Check date
        if (validField == 'modified' &&
            isNaN(new Date(doc[validField]).getTime())) {
          valid = false;
        }
        //Check email
        if (validField == 'contactPoint') {
          if (!doc[validField].hasEmail) {
            valid = false;
          } else {
            //Check if it's a valid email address. The long regex is just a
            //formal email checker (preceeded by mailto). The map/join at the
            //end are a workaround to get this long regex broken into multiple
            //lines to meet the style-guide limit. Can't just concatenate
            //strings together due to all the character escaping.
            var emailRE = new RegExp([
              /^mailto:/,
              /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@/,
              /(\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|/,
              /(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})$/
            ].map(function(r) {return r.source}).join(''));
            if (!emailRE.test(doc[validField].hasEmail)) {
              valid = false;
            }
          }
        }
        //Is access level one of the accepted values
        if (validField == 'accessLevel' &&
            self.validAccess.indexOf(doc[validField]) == -1) {
          valid = false;
        } else {
          //If restricted, must have rights field
          if (doc[validField] == 'non-public' ||
              doc[validField] == 'restricted public') {
            if (!doc['rights']) {
              valid = false;
            }
          }
        }
        //Check license URL
        if (validField == 'license') {
          var licenseRE = new RegExp(urlRegex, 'i');
          if (!licenseRE.test(doc[validField])) {
            valid = false;
          }
        }
        //Check update frequency
        if (validField == 'accrualPeriodicity' &&
            self.validAccrualGeo.indexOf(doc[validField]) == -1 &&
            self.validAccrualNonGeo.indexOf(doc[validField]) == -1) {
          valid = false;
        }
      }
    }
  });
  return valid;
};

if (!(typeof window != 'undefined' && window.document)) {
  module.exports = AuditEDG;
}
