var AuditEDG = function() {
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
    'distribution'
  ];
};


AuditEDG.prototype.validate = function(doc, fieldsToValidate) {
  var self = this;
  var valid = true;
  Object.keys(doc).forEach(function(key) {
    //Check if required fields exist and check if identifier is formatted
    //correctly (8 digits-4 digits-4 digits-4 digits-12 digits). There are
    //several EDG records that have malformed identifiers so this should
    //catch that.
    if (self.fieldsToValidate.indexOf(key) != -1 && !doc[key] ||
      (key == 'identifier' && !(/{?.{8}-.{4}-.{4}-.{4}-.{12}}?/.test(doc[key])))
    ) {
      valid = false;
    }
  });
  return valid;
};

if (!(typeof window != 'undefined' && window.document)) {
  module.exports = AuditEDG;
}
