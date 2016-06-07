//Place to stash the edgItmes models for now
//Note the actual instance of the page models are in egam.pages so edgItems page
//instance is egam.pages.edgItems
//When AMD is implemented we won't need so much .(dot) namespacing for the
//model, utility and control classes. They will be in directories
egam.models.edgItems = {};



//Data here is the actual array of JSON documents that came back from the REST
//endpoint
egam.models.edgItems.PageModelClass = function() {
  var self = this;

  self.$tableElement = $('#edgItemsTable');
  self.$pageElement = $('#edgItemsPage');

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
  self.table = new egam.controls.Table([],
    self.$tableElement,egam.models.edgItems.RowModelClass);

  ////Set up the details control now which is part of this Model Class
  //self.details = new egam.models.edgItems.DetailsModel(self);
};

// Load EDG table on initial click of EDG
egam.models.edgItems.PageModelClass.prototype.init = function() {
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


  // Get ALL the records for now (will make it more targeted later)
  var edgURLParams = {
    f: 'dcat',
    max: '5000',
  };
  var edgURL = 'https://edg.epa.gov/metadata/rest/find/document?' +
    $.param(edgURLParams);

  return self.table.init(edgURL, null, null, 'dataset')
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
egam.models.edgItems.RowModelClass = function(doc, index) {
  var self = this;
  //This is the doc

  this.doc = doc;
  //To keep track of this row when selected
  this.index = index;

};

//Model for Search EDG modal accessed from GPO details modal
egam.models.edgItems.LinkEDGModel = function() {
  var self = this;
  this.$element =  $('#edgModal');
  this.$tableElement = $('#edgModalItemsTable');

  this.gpoDoc = null;
  this.gpoID = null;
  this.gpoTitle = null;

  this.onload = onload;
  this.bound = false;

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
  self.table = new egam.controls.Table([],
    self.$tableElement,egam.models.edgItems.RowModelClass);

};


//This will load the controls when called (eg. the Search button is clicked)
egam.models.edgItems.LinkEDGModel.prototype.load = function(gpoDoc) {
  var self = this;
  this.$element.modal('show');

  //Get actual values for these instead of observables
  this.gpoDoc = ko.utils.unwrapObservable(gpoDoc);
  this.gpoID = ko.utils.unwrapObservable(this.gpoDoc.id);
  this.gpoTitle = ko.utils.unwrapObservable(this.gpoDoc.title);

  //If not bound yet then apply bindings
  if (!this.bound) {
    ko.applyBindings(this,this.$element[0]);
    this.bound = true;
  }

  // Get
  var edgURLParams = {
    f: 'dcat',
    max: '100',
    searchText: 'title:\'' + this.gpoTitle + '\'',
  };
  var edgURL = 'https://edg.epa.gov/metadata/rest/find/document?' +
    $.param(edgURLParams);

  return self.table.init(edgURL, null, null, 'dataset')
};

//Re-initialize the table on user-submitted search term
egam.models.edgItems.LinkEDGModel.prototype.customSearch = function() {
  var self = this;
  // Get
  var edgURLParams = {
    f: 'dcat',
    max: '100',
    searchText: 'title:\'' + $('#edgTitleSearch').val() + '\'',
  };
  var edgURL = 'https://edg.epa.gov/metadata/rest/find/document?' +
    $.param(edgURLParams);

  return self.table.init(edgURL, null, null, 'dataset')
};

//Get reference URLs from EDG Search. Find metadata URL and open full EDG
//metadata for this record.
egam.models.edgItems.LinkEDGModel.prototype.linkRecord = function(edgURLs) {
  var self = this;
  var edgURL = '';
  //Find reference URL that matches EDG metadata directory
  edgURLs.forEach(function(url, index) {
    if (url.indexOf('edg.epa.gov/metadata/rest/document') > -1) {
      edgURL = url;
    }
  });
  if (edgURL) {
    $.ajax({
      type: 'GET',

      // Name of file you want to parse
      url: edgURL,
      dataType: 'xml',
      success: function(xml) {
        var title = $(xml).find('citation').find('title').text();

        // Need to capture different metadata styles
        if (!title) {
          title = $(xml).find('title').text();
          if (!title) {
            title = $(xml).find('gmd\\:citation')
              .find('gmd\\:CI_Citation')
              .find('gmd\\:title')
              .find('gco\\:CharacterString').text()
          }
        }
        var purpose = $(xml).find('purpose').text();
        var abstract = $(xml).find('abstract').text();

        // Need to capture different metadata styles
        if (!abstract) {
          abstract = $(xml).find('description').text();
          if (!abstract) {
            abstract = $(xml).find('gmd\\:abstract')
              .find('gco\\:CharacterString').text();
          }
        }
        var acc = $(xml).find('accconst').text();
        var usecon = $(xml).find('useconst').text();

        // Need to capture different metadata styles
        if (!usecon) {
          acc = $(xml).find('gmd\\:MD_SecurityConstraints')
            .find('gmd\\:useLimitation')
            .find('gco\\:CharacterString').text();
          usecon = $(xml).find('gmd\\:MD_LegalConstraints')
            .find('gmd\\:useLimitation')
            .find('gco\\:CharacterString').text();
        }
        var useconst = '';
        if (acc || usecon) {
          useconst = 'Access constraints: ' + acc +
            ' Use constraints: ' + usecon;
        }

        var publisher = $(xml).find('publish').text();

        // Need to capture different metadata styles
        if (!publisher) {
          var agency = $(xml).find('agencyName').text();
          var subagency = $(xml).find('subAgencyName').text();
          if (agency) {
            if (subagency) {
              publisher = agency + ', ' + subagency;
            } else {
              publisher = agency;
            }
          } else {
            publisher = $(xml).find('gmd\\:contact')
              .find('gmd\\:organisationName')
              .find('gco\\:CharacterString').text();
          }
        }
        var mydata = new FormData();
        mydata.append('updateDocs', JSON.stringify({
          id: self.gpoID,
          owner: self.owner,
          EDGdata: {
            title: title,
            purpose: purpose,
            abstract: abstract,
            useconst: useconst,
            publisher: publisher,
            url: edgURL,},
        }));
        $.ajax({
          url: 'gpoitems/update',
          type: 'POST',
          data: mydata,
          cache: false,
          dataType: 'json',

          // Don't process the files
          processData: false,

          // Set content type to false as jQuery will tell the server its a
          // query string request
          contentType: false,
          success: function(data, textStatus, jqXHR) {
            if (data.errors < 1) {
              // Success so call function to process the form
              console.log('success: ' + data);
              var doctemp = ko.mapping.toJS(
                egam.pages.gpoItems.details.selected().doc());
              doctemp.EDGdata = {
                title: title,
                purpose: purpose,
                abstract: abstract,
                useconst: useconst,
                publisher: publisher,
                url: edgURL,};
              egam.pages.gpoItems.details.selected().doc(
                ko.mapping.fromJS(doctemp));
              $('#edgModal').modal('hide');

              // Show reconciliation modal
              egam.pages.gpoItems.details.loadReconcile();
            } else {
              // Handle errors here
              console.error('ERRORS: ');
              console.error(data.errors);
            }
          },
          error: function(jqXHR, textStatus, errorThrown) {
            // Handle errors here
            console.log('ERRORS: ' + textStatus);

            // STOP LOADING SPINNER
          },
        });
      },
      error: function(jqXHR, textStatus, errorThrown) {
        alert('EDG metadata record could not be loaded: ' + edgURL +
          ' (' + textStatus + ')');
        console.log('EDG metadata record could not be loaded: ' + edgURL +
          ' (' + textStatus + ')');
      },
    });
  } else {
    alert('No matching URL for this record: ' + gpoID);
    console.log('No matching URL for this record: ' + gpoID);
  }
};


//Model for reconciling EDG and GPO metadata
egam.models.edgItems.ReconcilliationModel = function() {
  var self = this;
  this.$element =  $('#reconciliationModal');

  this.fields = [
    'title',
    'snippet',
    'description',
    'licenseInfo',
    'accessInformation',
  ];

  this.onload = onload;
  this.bound = false;
  this.doc = ko.observable();
  this.fullDoc = null;

};

//This willl load the reconcillation controls when called
//(eg. the reconcile button is clicked)
egam.models.edgItems.ReconcilliationModel.prototype.load = function(fullDoc) {

  this.$element.modal('show');
  //Had to do this for testing
  //  $('#gpoItemsModal').modal('hide');

  this.loadCurrentFields(fullDoc);
  //If not bound yet then apply bindings
  if (!this.bound) {
    ko.applyBindings(this,this.$element[0]);
    this.bound = true;
  }
};

//This loads the current fields for item into reconcilliation model
egam.models.edgItems.ReconcilliationModel.prototype.loadCurrentFields = function(fullDoc) {
  var self = this;
  this.fullDoc = fullDoc;
  //FullDoc passed in might not be observable
  fullDoc = ko.utils.unwrapObservable(fullDoc);
  var docSlice = {};
  $.each(this.fields,function(index,field) {
    //UnwrapObservable in case the doc passed does not have observables for
    //fields
    docSlice[field] = ko.utils.unwrapObservable(fullDoc[field]);
  });
  this.doc(ko.mapping.fromJS(docSlice));
};

//This loads the reconciled fields into the current item for possible saving
egam.models.edgItems.ReconcilliationModel.prototype.loadReconciledFields = function() {
  var self = this;
  var fullDoc = ko.utils.unwrapObservable(this.fullDoc);

  $.each(this.fields,function(index,field) {
    //If FullDoc is observable need to pass the reconcilled field vs setting it
    if (ko.isObservable(fullDoc[field])) {
      fullDoc[field](self.doc()[field]());
    }else {
      fullDoc[field] = self.doc()[field]();
    }
  });
};

egam.models.edgItems.ReconcilliationModel.prototype.copyEDGtoGPO = function(source,destination) {
  var self = this;
  //If no destination then it is same name as source
  destination = destination || source;

  var fullDoc = ko.utils.unwrapObservable(this.fullDoc);
  var edgValue = ko.utils.unwrapObservable(fullDoc.EDGdata[source]);
  this.doc()[destination]($.trim(edgValue));
};