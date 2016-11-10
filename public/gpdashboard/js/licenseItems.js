//Place to stash the edgItmes models for now
//When AMD is implemented we won't need so much .(dot) namespacing for the
//model, utility and control classes. They will be in directories
egam.models.licenseItems = {};



//Data here is the actual array of JSON documents that came back from the REST
//endpoint
egam.models.licenseItems.PageModelClass = function() {
  var self = this;

  self.$tableElement = $('#licenseItemsTable');
  self.$pageElement = $('#licenseItemsPage');

  self.resultFields = {
    title: 1,
    description: 1,
    keyword: 1,
    modified: 1,
    publisher: 1,
    contactPoint: 1,
    contactPointEmail: 1,
    identifier: 1,
    accessLevel: 1,
    bureauCode: 1,
    programCode: 1,
    license: 1,
    spatial: 1,
    accrualPeriodicity: 1,
    distribution: 1,
    AuditData: 1
  };

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
  self.table = new egam.controls.Table([],
    self.$tableElement,egam.models.licenseItems.RowModelClass);

  ////Set up the details control now which is part of this Model Class
  self.details = new egam.models.licenseItems.DetailsModel(self);
};

//Load EDG table on initial click of EDG
egam.models.licenseItems.PageModelClass.prototype.init = function() {
  var self = this;
  var defer = $.Deferred();

  //Only run init once for gpoItems page/model
  if (self.model) {
    defer.resolve();
    return defer;
  }

  //Show the loading message but hide count (doesn't work for external).
  //Hide the table.
  $('#loadingMsgTotalCount').text('');
  $('div#loadingMsg').removeClass('hidden');
  self.$pageElement.addClass('hidden');

  //Apply the bindings for the page now
  ko.applyBindings(self, self.$pageElement[0]);
  console.log('Bindings Applied: ' + new Date());


  //Now initialize the table. ie. download data and create table rows
  //the payload can be reduced if resultFields array was set
  var fields = this.resultFields || {};

  var query = {};
  var projection = {fields: fields};

  //Now that we are downloading EDG data, load it from Mongo
  return self.table.init('edgitems/list', query, projection)
  //After table is loaded we can do other stuff
    .then(function() {
      //Now stop showing loading message that page is load
      $('div#loadingMsg').addClass('hidden');
      self.$pageElement.removeClass('hidden');

      defer.resolve();
    });
};

//This is limited model which is used for the table rows. It is condensed so
//that table loads faster
egam.models.licenseItems.RowModelClass = function(doc, index) {
  var self = this;
  //This is the doc

  this.doc = doc;
  //To keep track of this row when selected
  this.index = index;

};