if (typeof egam == 'undefined') {
  var egam = {};
}
if (typeof egam.pages == 'undefined') {
  egam.pages = {};
}
if (typeof egam.models == 'undefined') {
  egam.models = {};
}

//Place to stash the gpoItmes models for now
//Note the actual instance of the page models are in egam.pages so gpoItems page
//instance is egam.pages.gpoItems
//When AMD is implemented we won't need so much .(dot) namespacing for the
//model, utility and control classes. They will be in directories
egam.models.gpoItems = {};

//Data here is the actual array of JSON documents that came back from the REST endpoint
egam.models.gpoItems.PageModelClass = function() {
  var self = this;

  self.$tableElement = $('#gpoItemsTable');
  self.$pageElement = $('#gpoItemsPage');

  //Only these fields will be returned from gpoItems/list endpoint
  self.resultFields = {
    id: 1,
    title: 1,
    description: 1,
    tags: 1,
    thumbnail: 1,
    snippet: 1,
    licenseInfo: 1,
    accessInformation: 1,
    url: 1,
    AuditData: 1,
    numViews: 1,
    modified: 1,
    type: 1,
    owner: 1,
    access: 1,
    EDGdata: 1,
    ownerFolder: 1,
  };

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
  self.table = new egam.controls.Table([],
    self.$tableElement,egam.models.gpoItems.RowModelClass);

  //Have to set authGroups in this context so knockout has access to it from
  //PageModel
  self.authGroups = egam.communityUser.authGroups;

  //Set up the details control now which is part of this Model Class
  self.details = new egam.models.gpoItems.DetailsModel(self);

    //Set up the authGroups dropdown
  self.setAuthGroupsDropdown(egam.communityUser.ownerIDsByAuthGroup);

  //Percent passing, Count of personal items should be observable on here
  self.percentPublicPassing = ko.observable();
  self.myItemsCount = ko.observable();
  self.pendingChecklistCount = ko.observable();

};

egam.models.gpoItems.PageModelClass.prototype.init = function() {
  var self = this;
  var defer = $.Deferred();

  //Only run init once for gpoItems page/model
  if (self.model) {
    defer.resolve();
    return defer;
  }

  //Show the loading message and count. Hide the table.
  $('div#loadingMsg').removeClass('hidden');
  self.$pageElement.addClass('hidden');

  //Apply the bindings for the page now
  ko.applyBindings(self, self.$pageElement[0]);
  console.log('Bindings Applied: ' + new Date());

  //Now initialize the table. ie. download data and create table rows
  //the payload can be reduced if resultFields array was set
  var fields = this.resultFields || {};

  var query = {};
  var projection = {
    sort: {
      modified: -1,
    },
    fields: fields,};

  return self.table.init('gpoitems/list', query, projection)
    //After table is loaded we can do other stuff
    .then(function() {
      self.calculateStats();

      //Now stop showing loading message that page is load
      $('div#loadingMsg').addClass('hidden');
      self.$pageElement.removeClass('hidden');

      defer.resolve();
    });

  return defer;
};

//This could maybe be generalized later if it needed to be used on other
//"pages/screens"
egam.models.gpoItems.PageModelClass.prototype.calculateStats = function() {
  var self = this;
  var data = self.table.data;
  //Get percent of docs passing the Audit
  var publicCount = 0;
  var publicPassingCount = 0;
  var myItemsCount = 0;
  data.forEach(function(doc, index) {
    if (doc.access == 'public') {
      publicCount++;
      if (doc.AuditData.compliant) {
        publicPassingCount++;
      }
    }
    if (egam.communityUser.username == doc.owner) {
      myItemsCount++;
    }
  });

  if (publicPassingCount) {
    self.percentPublicPassing(
      Math.round((publicPassingCount / publicCount) * 100));
  }else {
    self.percentPublicPassing(Math.round('-'));
  }

  self.myItemsCount(myItemsCount);
};

//This could maybe be generalized later if it needed to be used on other
//"pages/screens"
egam.models.gpoItems.PageModelClass.prototype.setAuthGroupsDropdown = function(ownerIDsByAuthGroup) {
  var self = this;
  var dropAuthGroups = $('#dropAuthGroups');
  dropAuthGroups.on('change', function() {
    var reOwnerIDs = '';
    if (this.value) {
      var ownerIDs = ownerIDsByAuthGroup[this.value];
      reOwnerIDs = ownerIDs.join('|');
    }
    //Make sure the dataTable has been created in case this event is fired before that (it is being fired when dropdown created)
    if (self.table.dataTable) {
      self.table.dataTable.column('.ownerColumnForAuthGroupSearch')
        .search(reOwnerIDs, true, false)
        .draw();
    }
    // Also set the download link
    var authgroup = this.value;
    //Pass authgroup to email list function. If no authgroup, pass empty string
    var emailFunc = $('#emailAuthgroupsCSVall').attr('onclick');
    $('#emailAuthgroupsCSVall').attr('onclick',
      emailFunc.replace(/(\(.*\))/, '(\'' + authgroup + '\')'));
    if (authgroup) {
      $('#downloadAuthgroupsCSVall').addClass('hidden');
      $('#downloadAuthgroupsCSVregions').removeClass('hidden');
      var href = $('#downloadAuthgroupsCSVregions').attr('href');

      // Tack on authgroup to the end of the route to get csv. Note: use ^ and $
      // to get exact match because it matches regex(Region 1 and 10 would be
      // same if not). Also we are using authGroup by name so need to escape
      // ( and ) which is offices like (OAR)
      // TODO: Not sure about this code, I've had a few weird bugs with this in
      // TODO: action where my dashboard is sent to a 404 error page upon
      // TODO: clicking download users CSV in the GUI -- looked like an escaping
      // TODO: issue to me
      //Maybe this could be cleaned up to use the group ID instead
      var escapeAuthGroup = authgroup.replace(/\(/g, '%5C(')
        .replace(/\)/g, '%5C)');
      href = href.substring(0, href.lastIndexOf('/') + 1) + '^' +
        escapeAuthGroup + '$';
      $('#downloadAuthgroupsCSVregions').attr('href', href);
    } else {
      $('#downloadAuthgroupsCSVall').removeClass('hidden');
      $('#downloadAuthgroupsCSVregions').addClass('hidden');
    }
  });
  var authGroups = Object.keys(ownerIDsByAuthGroup);
  authGroups.sort();

  dropAuthGroups[0].options.length = 0;

  if (authGroups.length > 1) {
    dropAuthGroups.append($('<option>', {value: ''}).text('All'));
  }

  $.each(authGroups, function(index, authGroup) {
    dropAuthGroups.append($('<option>', {value: authGroup}).text(authGroup));
  });
};

//This is limited model which is used for the table rows. It is condensed so that table loads faster
egam.models.gpoItems.RowModelClass = function(doc, index) {
  var self = this;
  //This is the doc

  //Actually need to make this observable so that it triggers the computed function when table updated
  //Can't just create a new RowModelClass instance because it wipes out existing one that jquery dataTables is bound to
  //Could have made the computed just standard function but don't want to keep calling it everytime referenced
  this.doc = ko.observable(doc);
  //To keep track of this row when selected
  this.index = index;

  //This is basically just formatting stuff
  this.complianceStatus = ko.computed(function() {
    return this.doc().AuditData.compliant ? 'Pass' : 'Fail';
  }, this);

  //This is to get the folder that the item is in
  this.ownerFolderTitle = ko.computed(function(){
    if (! this.doc().ownerFolder) return 'Root Folder';
    return this.doc().ownerFolder.title;
  }, this);

  this.isChecked = ko.observable(false);
};

//This is the FULL model which binds to the modal allowing 2 way data binding and updating etc
egam.models.gpoItems.FullModelClass = function(doc, index, parent) {
  var self = this;
  //The pageModel this belows to
  this.parent = parent;
  //The index in array for this item
  this.index = index;
  //This is the doc
  this.doc = ko.observable(ko.mapping.fromJS(doc));

  //Computed thumbnail url
  //Note the actual thumbnail in the GPO that this.thumbnailURL is dipslaying
  this.GPOthumbnail = ko.observable(self.doc().thumbnail());

  this.thumbnailURL = ko.computed(function() {
    if (self.GPOthumbnail() == null) {
      return 'img/noImage.png';
    } else {
      return 'https://epa.maps.arcgis.com/sharing/rest/content/items/' + self.doc().id() + '/info/' + self.GPOthumbnail() + '?token=' + egam.portalUser.credential.token;
    }
  }, this);

  this.epaKeywords = function() {
  };

  //Link to item in GPO
  this.gpoLink = ko.computed(function() {
    return 'https://epa.maps.arcgis.com/home/item.html?id=' + self.doc().id();
  }, this);

  //Doc of changed fields
  this.changeDoc = {};

  //Subscribes Setup
  this.updateFields = ['title', 'snippet', 'description', 'licenseInfo', 'accessInformation', 'url'];

  //Condensed this repetitive code
  $.each(this.updateFields, function(index, field) {
    self.doc()[field].subscribe(function(evt) {
      self.execAudit(field);
      self.addFieldChange(field, evt);
    }.bind(self));
  });
  //Could condense arrays later if have more than one
  this.doc().tags.subscribe(function(evt) {
    self.execAudit('tags');
    self.addFieldChange('tags', self.doc().tags());
  }.bind(this), null, 'arrayChange');

  //Add and field that has changed to the changeDoc
  this.addFieldChange = function(changeField, changeValue) {
    self.changeDoc['id'] = self.doc().id();
    self.changeDoc[changeField] = changeValue;
  };

  //Execute Audit on specified field in doc
  this.execAudit = function(auditField) {
    var unmappedDoc = ko.mapping.toJS(self.doc());
    var auditRes = new Audit();
    auditRes.validate(unmappedDoc, auditField);
    //Note if you are trying to remap observable doc then have to make doc second parameter do NOT do doc(ko.mapping.fromJS(unmappedDoc)). that will lose subscribers on original doc
    ko.mapping.fromJS(unmappedDoc, self.doc());
  };

};



//Data here is the actual array of JSON documents that came back from the
//REST endpoint
egam.models.gpoItems.DetailsModel = function(parent) {
  var self = this;
  self.parent = parent;

  self.$element = $('#gpoItemsModal');
  this.bound = false;
  //A new observable for the selected row storing the FULL gpoItem model
  self.selected = ko.observable();
  
  //Creates the tag controls when row is selected and details model is needed for first time
  self.tagControls = null;
  //set up reference to reconcillation stuff here since this page uses it
  //It is not actually created until somebody hits reconcilliation modal for first time
  self.reconcillation = null;
  self.linkEDG = null;
  //place to store the thumbnail file object
  self.thumbnailFile = null;
  //set up the listners that handle thumbnail changing so image showing changes, ko model changes and audit performed
  self.setupThumbnailFileHandlers();
};

egam.models.gpoItems.DetailsModel.prototype.setupThumbnailFileHandlers = function() {
  var self = this;
  // Maybe need to make this image stuff more knockout somehow. not sure how to
  //Switch view for image upload
  $('.fileinput').on('change.bs.fileinput', function(e) {
    //Use hide/show not toggle more robust
    $('#agoThumb').hide();
    $('#imageUpload').show();
    //Have to do the thumbnail audit/require thing and change thumbnail observable value
    self.handleThumbnailChange();
  });
  //On modal close with out saving change thumbnail view clear thumbnail
  //form
  self.$element.on('hidden.bs.modal', function(e) {
//    var thumbnailFile = self.getThumbnailFileObject();

//    if (thumbnailFile !== undefined) {
      $('#agoThumb').show();
      $('#imageUpload').hide();
      $('.fileinput').fileinput('clear');
//    }
  });
};

egam.models.gpoItems.DetailsModel.prototype.handleThumbnailChange = function(index) {
  var self = this;

  //Get the thumbnail object with file name on it
  var thumbnailFile = self.getThumbnailFileObject();

  if (!thumbnailFile) {
    console.log('No thumbnail to post');
  } else {
    //update thumbnail on selected doc and change doc. Note: Don't know how to two way databind thumbnail because don't know what element to databind to
    //Set thumbnail to pass the audit. If they don't update then when modal open again this will revert to original thumbnail next time detail modal opened
    //Don't change thumbnail used to img src to GPO image until after update is complete
    self.selected().doc().thumbnail('thumbnail/' + thumbnailFile.name);
    self.selected().addFieldChange('thumbnail', self.selected().doc().thumbnail());
  }
  //Now trigger an audit to reflect change
  self.selected().execAudit('thumbnail');
};

egam.models.gpoItems.DetailsModel.prototype.getThumbnailFileObject = function(index) {
  var self = this;
  var thumbnailFile = null;
  try {
    thumbnailFile= $('#thumbnail')[0].files[0];
  } catch (ex) {
  }
  return thumbnailFile;
};

//On the entire table, we need to know which item is selected to use later with
//modal, etc.
egam.models.gpoItems.DetailsModel.prototype.select = function(item) {
  var self = this;
  //    Var fullRowModel = self.selectedCache[item.index] || new egam.gpoItems.FullModelClass(item.doc,self,item.index) ;
  var fullRowModel = new egam.models.gpoItems.FullModelClass(ko.utils.unwrapObservable(item.doc), item.index, self);
  self.selected(fullRowModel);

  //If no tag Controls created yet then do it now
  if (!self.tagControls) self.tagControls = new egam.models.gpoItems.TagControlsClass(self);
  //Note: if the instance of these controls/models are used in multiple places it can be stored in something like egam.shared.tagConrols
  //Then the we would get self.tagControls = using functions that creates egam.shared.tagConrols if not exists otherwise returns existing so that we don't create another instance again if already created by different consumer
  // if (!self.tagControls) self.tagControls = egam.utilities.loadSharedControl("tagControls",egam.models.gpoItems.TagControlsClass,[self]);

  //This function will not reinitialize when called second time
  //If there would have been more promises then just this tagControls then could use .all or chain them
  self.tagControls.init()
    .then(function () {
      //Now apply binding if not applied and then refresh the tag controls for selected item (to select by doc.owners authGroup)
//  if (needToApplyBindings) ko.applyBindings(self, self.$element[0]);
      if (!self.bound) {
        ko.applyBindings(self, document.getElementById('gpoItemsModal'));
        self.bound=true;
      }

      //no need to pass the new doc, it just uses the parent's (this details control) selected doc
      self.tagControls.refresh();
    });
};

//Allows you to select an item based on index, usually index will be coming from row number
egam.models.gpoItems.DetailsModel.prototype.loadReconcile = function() {
  var self = this;
  if (!self.reconcillation) {
    self.reconcillation = new egam.models.edgItems.ReconcilliationModel(self.selected);
//    self.reconcillation = egam.utilities.loadSharedControl("reconcillation",egam.models.gpoItems.ReconcilliationModel,[self.selected]);
  }

  self.reconcillation.load(self.selected().doc);
  //Do things like turn off the details model stuff
  self.$element.modal('hide');

};


egam.models.gpoItems.DetailsModel.prototype.loadLinkEDG = function() {
  var self = this;
  if (!self.linkEDG) {
    self.linkEDG = new egam.models.edgItems.LinkEDGModel(self);
  }

  self.linkEDG.load(self.selected().doc);

  $('#edgTitleSearch').val(self.selected().doc().title());
};

//Allows you to select an item based on index, usually index will be coming from
//row number
egam.models.gpoItems.DetailsModel.prototype.selectIndex = function(index) {
  this.select(this.parent.table.items[index]);
};


//Post updated docs back to Mongo and change local view model
//Note: Update is called in details model scope so this will be correct
egam.models.gpoItems.DetailsModel.prototype.update = function() {
  var self = this;
  //Need to get thumbnail object to add to FormData for uploading thumbnail
  var thumbnailFile = self.getThumbnailFileObject();

  var updateDocsJSON = JSON.stringify(self.selected().changeDoc);
  //Don't try to update if there is nothing to update
  if (updateDocsJSON == '{}' && !thumbnailFile) {
    return;
  }
  //ChangeDoc should be cleared for next time
  self.selected().changeDoc = {};

  var mydata = new FormData();
  mydata.append('updateDocs', updateDocsJSON);
  mydata.append('thumbnail', thumbnailFile);


  $.ajax({
    url: 'gpoitems/update',
    type: 'POST',
    data: mydata,
    cache: false,
    dataType: 'json',
    //Don't process the files
    processData: false,
    //Set content type to false as jQuery will tell the server its a query
    //string request
    contentType: false,
    success: function(data, textStatus, jqXHR) {
      if (data.errors < 1) {
        //Success so call function to process the form
        console.log('success: ' + data);

        //update the thumbnail now on the selected doc now. If we did it before update the img tag is referencing non existent image on GPO
        self.selected().GPOthumbnail(self.selected().doc().thumbnail());
        //Refresh the data table now that save went through
        //convert the full model observable doc to the simple JS doc.
        //Only update the doc field in row model item
        var jsDoc = ko.mapping.toJS(self.selected().doc());
        self.parent.table.update(self.selected().index, jsDoc, 'doc');
      } else {
        //Handle errors here
        console.error('ERRORS: ');
        console.error(data.errors);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      // Handle errors here
      console.log('ERRORS: ' + errorThrown);
      // STOP LOADING SPINNER
    },
  });

  console.log('Post back updated Items');
};

//This just encapsulates all the logic for the gpoItems tag controls
//(dropdowns and list box)
egam.models.gpoItems.TagControlsClass = function(parent) {
  var self = this;

  self.parent = parent;
  self.isInit = false;
  //By default the doc to use which contains tag and other item info is self.parent.selected().doc()
  //It is possible to override this and set self.doc
  self._doc = null;
  //Note: call doc() to get the manually set doc or the default doc from
  //selected()
  self.doc = function() {
    return self._doc || ko.utils.unwrapObservable(self.parent.selected().doc);
  };

  self.$orgTagSelect = $('#orgTagSelect');
  self.$officeTagSelect = $('#officeTagSelect');
  self.$addOrgTag = $('#addOrgTag');

  //Also storing the Office dropdown value even though it doesn't get acted as
  //a tag but need this to set value of drop. Otherwise Please Select kept
  //getting reset
  self.tagCategories = ['EPA', 'Place', 'Office', 'Org'];

  //These are the selected Tags that we save so they can be removed
  self.selectedTags = ko.observableArray(['']);
  //This is where the tag for each cat being added is stored
  self.tagToAdd = {};
  //This is where function to add Tag for each cat is stored
  //(just a convenience for markup to use)
  self.addTag = {};

  //These are the organizations that go with each office
  self.selectedOfficeOrganizations = ko.observableArray([]);

  //Generate the observable for tags to add and the add tag function for each
  //tag category
  $.each(this.tagCategories, function(i, cat) {
    //This is just observable for tag that is being added
    self.tagToAdd[cat] = ko.observable('');
    //This just calls the more generic addTag function which is just convenience
    //for knockout binding
    self.addTag[cat] = function() {
      return self.addTagByCat(cat)
    };
  });

};

//Need to use an init function so we can defer before moving onto bindings
egam.models.gpoItems.TagControlsClass.prototype.init = function(doc) {
  var self = this;
  var defer = $.Deferred();

  //If already got avail tags just return don't ajax them again
  if (self.isInit) {
    defer.resolve();
    return defer;
  }

  egam.utilities.getDataStash('availableTags', 'gpoitems/availableTags')
    .then(function() {
      return egam.utilities.getDataStash('availableAuthgroups',
        'gpoitems/authGroups');
    })
    .then(function() {
      //Only add change handler if it doesn't already have one
      if ($._data(self.$officeTagSelect[0]).events &&
        $._data(self.$officeTagSelect[0]).events.change) {
      } else {
        //Only set the change handler once if it doesn't exist otherwise there
        //will be multiple handlers fired on change
        //This also fires right after binding are applied
        self.$officeTagSelect.change(function() {
          // Current office selected
          var office = self.$officeTagSelect.val();
          if (office) {
            self.$addOrgTag.prop('disabled', false);
            self.$orgTagSelect.prop('disabled', false);
            //Get just the orgs for this one office from all the available
            //tags and set the ko obs array
            self.selectedOfficeOrganizations(
              egam.dataStash.availableTags.epaOrganizationNames[office]);
          } else {
            // If no office selected then disable the org sub drop and button
            self.$addOrgTag.prop('disabled', true);
            self.$orgTagSelect.prop('disabled', true);
            self.selectedOfficeOrganizations([]);
          }
        });
      }
      self.isInit = true;
      defer.resolve();
    });
  return defer;
};

//Pass the tags here and update the controls with this information
egam.models.gpoItems.TagControlsClass.prototype.refresh = function(doc) {
  //Basically allows the selected doc to manually change if
  //parent.selected().doc() not avail
  if (doc) {
    this._doc = ko.utils.unwrapObservable(doc);
  }
  //This will change the selected tag for organziation due to owner of
  //selected() doc
  this.selectOrg();
};

egam.models.gpoItems.TagControlsClass.prototype.addTagByCat = function(cat) {
  //Make sure a tag category exists
  if (!this.tagToAdd[cat]) {
    return false;
  }
  var tags = this.doc().tags;
  var tagToAdd = this.tagToAdd[cat]();
  // Prevent blanks and duplicates (I guess let a tag=0 since its falsey)
  if ((tagToAdd || tagToAdd == 0) && (tags.indexOf(tagToAdd) < 0)) {
    //Push the tag to the tags array
    tags.push(tagToAdd);
  }
  // Clear the text box
  this.tagToAdd[cat]('');
};

egam.models.gpoItems.TagControlsClass.prototype.selectOrg = function() {
  //Find office or region from item owners first authgroup then select it
  var ownerEDGauthGroup = '';
  var ownersAuthgroups = egam.communityUser.authGroupsByownerID[
    this.doc().owner()];
  //Note: If owner has more than one auth group then we can't really assume
  //what auth group to pre select
  if (ownersAuthgroups.length == 1) {
    ownerEDGauthGroup = egam.dataStash.availableAuthgroups.ids[
      ownersAuthgroups[0]].edgName;
  }
  var office = ownerEDGauthGroup;
  if (/REG /.exec(ownerEDGauthGroup)) {
    office = 'REG';
  }
  this.$officeTagSelect.val(office).change();
  //If there authGroup is a region then select the region number
  if (office = 'REG' && /REG /.exec(ownerEDGauthGroup)) {
    this.$orgTagSelect.val(ownerEDGauthGroup);
  }
};

//Remove tag from tags array
egam.models.gpoItems.TagControlsClass.prototype.removeSelected = function() {
  var tags = this.doc().tags;
  tags.removeAll(this.selectedTags());
  // Clear tags selectd in list box
  this.selectedTags([]);
};


