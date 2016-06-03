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
egam.models.gpoUsers = {};

//Data here is the actual array of JSON documents that came back from the REST endpoint
egam.models.gpoUsers.PageModelClass = function() {
  var self = this;

  self.$tableElement = $('#gpoUsersTable');
  self.$pageElement = $('#userMgmtView');

  //Only these fields will be returned from gpoItems/list endpoint
  self.resultFields = {
    _id: 1,
    username: 1,
    fullName: 1,
    modified: 1,
    created: 1,
    groups: 1,
    authGroups: 1,
    isAdmin: 1,
    isExternal: 1,
    email: 1,
    role: 1,
    provider: 1,
    folders: 1,
    sponsors: 1,
  };

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
   self.table = new egam.controls.Table([],
     self.$tableElement,egam.models.gpoUsers.RowModelClass);

  //Have to set authGroups in this context so knockout has access to it from
  //PageModel
  self.authGroups = egam.communityUser.authGroups;

  //Set up the details control now which is part of this Model Class
  self.details = new egam.models.gpoUsers.DetailsModel(self);

    //Set up the authGroups dropdown
  // self.setAuthGroupsDropdown(egam.communityUser.ownerIDsByAuthGroup);

  //Percent passing, Count of personal items should be observable on here
  // self.percentPublicPassing = ko.observable();
  // self.myItemsCount = ko.observable();


};

egam.models.gpoUsers.PageModelClass.prototype.init = function() {
  console.log("gpoUsers init");

  var self = this;
  var defer = $.Deferred();

  //Only run init once for gpoItems page/model
  if (self.model) {
    defer.resolve();
    return defer;
  }

  // //Show the loading message and count. Hide the table.
  // $('div#loadingMsg').removeClass('hidden');
  // self.$pageElement.addClass('hidden');
  //
  //Apply the bindings for the page now
  ko.applyBindings(self, self.$pageElement[0]);
  console.log('Bindings Applied: ' + new Date());

  
  //Now initialize the table. ie. download data and create table rows
  //the payload can be reduced if resultFields array was set
  var fields = this.resultFields || {};

  var query = {isExternal: true};
  var projection = {
    sort: {
      modified: -1,
    },
    fields: fields,};

  return self.table.init('gpousers/list', query, projection)
    //After table is loaded we can do other stuff
    .then(function() {
      //Add stuff for filter buttons self.table.datatable



  //
  //     //Now stop showing loading message that page is load
  //     $('div#loadingMsg').addClass('hidden');
  //     self.$pageElement.removeClass('hidden');
  //
       defer.resolve();
     });
  //
   return defer;
};

//This could maybe be generalized later if it needed to be used on other
//"pages/screens"
// egam.models.gpoUsers.PageModelClass.prototype.calculateStats = function() {
//   var self = this;
//   var data = self.table.data.results;
//   //Get percent of docs passing the Audit
//   var publicCount = 0;
//   var publicPassingCount = 0;
//   var myItemsCount = 0;
//   data.forEach(function(doc, index) {
//     if (doc.access == 'public') {
//       publicCount++;
//       if (doc.AuditData.compliant) {
//         publicPassingCount++;
//       }
//     }
//     if (egam.communityUser.username == doc.owner) {
//       myItemsCount++;
//     }
//   });
//
//   if (publicPassingCount) {
//     self.percentPublicPassing(
//       Math.round((publicPassingCount / publicCount) * 100));
//   }else {
//     self.percentPublicPassing(Math.round('-'));
//   }
//
//   self.myItemsCount(myItemsCount);
// };

//This could maybe be generalized later if it needed to be used on other
//"pages/screens"
// egam.models.gpoItems.PageModelClass.prototype.setAuthGroupsDropdown = function(ownerIDsByAuthGroup) {
//   var dropAuthGroups = $('#dropAuthGroups');
//   dropAuthGroups.on('change', function() {
//     // Also set the download link
//     var authgroup = this.value;
//     if (authgroup) {
//       $('#downloadAuthgroupsCSVall').addClass('hidden');
//       $('#downloadAuthgroupsCSVregions').removeClass('hidden');
//       var href = $('#downloadAuthgroupsCSVregions').attr('href');
//
//       // Tack on authgroup to the end of the route to get csv. Note: use ^ and $
//       // to get exact match because it matches regex(Region 1 and 10 would be
//       // same if not). Also we are using authGroup by name so need to escape
//       // ( and ) which is offices like (OAR)
//       // TODO: Not sure about this code, I've had a few weird bugs with this in
//       // TODO: action where my dashboard is sent to a 404 error page upon
//       // TODO: clicking download users CSV in the GUI -- looked like an escaping
//       // TODO: issue to me
//       //Maybe this could be cleaned up to use the group ID instead
//       var escapeAuthGroup = authgroup.replace(/\(/g, '%5C(')
//         .replace(/\)/g, '%5C)');
//       href = href.substring(0, href.lastIndexOf('/') + 1) + '^' +
//         escapeAuthGroup + '$';
//       $('#downloadAuthgroupsCSVregions').attr('href', href);
//     } else {
//       $('#downloadAuthgroupsCSVall').removeClass('hidden');
//       $('#downloadAuthgroupsCSVregions').addClass('hidden');
//     }
//   });
//   var authGroups = Object.keys(ownerIDsByAuthGroup);
//   authGroups.sort();
//
//   dropAuthGroups[0].options.length = 0;
//
//   if (authGroups.length > 1) {
//     dropAuthGroups.append($('<option>', {value: ''}).text('All'));
//   }
//
//   $.each(authGroups, function(index, authGroup) {
//     dropAuthGroups.append($('<option>', {value: authGroup}).text(authGroup));
//   });
// };

//This is limited model which is used for the table rows. It is condensed so that table loads faster
egam.models.gpoUsers.RowModelClass = function(doc, index) {
  var self = this;
  //This is the doc

  this.doc = doc;
  //To keep track of this row when selected
  this.index = index;

  //Add computed object for Current Sponsor

  if (!doc.sponsors) {
    doc['sponsors'] = [];
  }

  this.latestSponsor = ko.computed(function() {
    var sponsorsLen = self.doc.sponsors.length;
    if (sponsorsLen > 0) {
      return self.doc.sponsors[sponsorsLen - 1].username;
    }else{
      return null;
    }
  });

  // Format Date from millaseconds to something useful
  function formatDate(uDate) {
    var monthNames = [
      'Jan', 'Feb', 'Mar',
      'Apr', 'May', 'Jun', 'Jul',
      'Aug', 'Sep', 'Oct',
      'Nov', 'Dec',
    ];
    return monthNames[uDate.getMonth()] + ' ' + uDate.getDate() + ', ' +
        uDate.getFullYear();
  }

  this.spStartDate = ko.computed(function() {
    var spLen = self.doc.sponsors.length;
    if (spLen > 0) {
      var dDate = new Date(self.doc.sponsors[spLen - 1].startDate);
      return formatDate(dDate);
    }else{
      return null;
    }
  });

  this.spEndDate = ko.computed(function() {
    var spLen = self.doc.sponsors.length;
    if (spLen > 0) {
      var dDate = new Date(self.doc.sponsors[spLen - 1].endDate);
      return formatDate(dDate);
    }else{
      return null;
    }
  });

  this.spOrg = ko.computed(function() {
    var spLen = self.doc.sponsors.length;
    if (spLen > 0) {
      if(self.doc.sponsors[spLen - 1].organization){
        return self.doc.sponsors[spLen - 1].organization;
      }else{
        return null;
      }
    }else{
      return null;
    }
  });

  this.spAuthGroup = ko.computed(function() {
    var spLen = self.doc.sponsors.length;
    if (spLen > 0) {
      if(self.doc.sponsors[spLen - 1].authGroup){
        return self.doc.sponsors[spLen - 1].authGroup;
      }else {
        return null;
      }
    }else{
      return null;
    }
  });

  this.spReason = ko.computed(function() {
    var spLen = self.doc.sponsors.length;
    if (spLen > 0) {
      if(self.doc.sponsors[spLen - 1].reason){
        return self.doc.sponsors[spLen - 1].reason;
      }else {
        return null;
      }
    }else{
      return null;
    }
  });

  this.spDescript = ko.computed(function() {
    var spLen = self.doc.sponsors.length;
    if (spLen > 0) {
      if(self.doc.sponsors[spLen - 1].description){
        return self.doc.sponsors[spLen - 1].description;
      }else{
        return null;
      }
    }else{
      return null;
    }
  });

};

//This is the FULL model which binds to the modal allowing 2 way data binding and updating etc
egam.models.gpoUsers.FullModelClass = function(doc, index, parent) {
  var self = this;
  //The pageModel this belows to
  this.parent = parent;
  //The index in array for this item
  this.index = index;
  //This is the doc
  this.doc = ko.observable(ko.mapping.fromJS(doc));

  this.sponsoreeAuthGroups = ko.observableArray(
      egam.communityUser.authGroups);


  //Computed thumbnail url
  // this.thumbnailURL = ko.computed(function() {
  //   if (self.doc().thumbnail() == null) {
  //     return 'img/noImage.png';
  //   } else {
  //     return 'https://epa.maps.arcgis.com/sharing/rest/content/items/' + self.doc().id() + '/info/' + self.doc().thumbnail() + '?token=' + egam.portalUser.credential.token;
  //   }
  // }, this);

  // this.epaKeywords = function() {
  // };

  //Link to item in GPO
  // this.gpoLink = ko.computed(function() {
  //   return 'https://epa.maps.arcgis.com/home/item.html?id=' + self.doc().id();
  // }, this);

  //Doc of changed fields
  this.changeDoc = {};

  //Subscribes Setup
  // this.updateFields = ['title', 'snippet', 'description', 'licenseInfo', 'accessInformation', 'url'];

  //Condensed this repetitive code
  // $.each(this.updateFields, function(index, field) {
  //   self.doc()[field].subscribe(function(evt) {
  //     self.execAudit(field);
  //     self.addFieldChange(field, evt);
  //   }.bind(self));
  // });
  //Could condense arrays later if have more than one
  // this.doc().tags.subscribe(function(evt) {
  //   self.execAudit('tags');
  //   self.addFieldChange('tags', self.doc().tags());
  // }.bind(this), null, 'arrayChange');

  //Add and field that has changed to the changeDoc
  // this.addFieldChange = function(changeField, changeValue) {
  //   self.changeDoc['id'] = self.doc().id();
  //   self.changeDoc[changeField] = changeValue;
  // };

  //Execute Audit on specified field in doc
  // this.execAudit = function(auditField) {
  //   var unmappedDoc = ko.mapping.toJS(self.doc());
  //   var auditRes = new Audit();
  //   auditRes.validate(unmappedDoc, auditField);
  //   //Note if you are trying to remap observable doc then have to make doc second parameter do NOT do doc(ko.mapping.fromJS(unmappedDoc)). that will lose subscribers on original doc
  //   ko.mapping.fromJS(unmappedDoc, self.doc());
  // };

};



//Data here is the actual array of JSON documents that came back from the
//REST endpoint
egam.models.gpoUsers.DetailsModel = function(parent) {
  var self = this;
  self.parent = parent;

  self.$element = $('gpoUsersModal');
  this.bound = false;
  //A new observable for the selected row storing the FULL gpoItem model
  self.selected = ko.observable();
  
  //Creates the tag controls when row is selected and details model is needed for first time
  //self.tagControls = null;
  //set up reference to reconcillation stuff here since this page uses it
  //It is not actually created until somebody hits reconcilliation modal for first time
  //self.reconcillation = null;

};

//On the entire table, we need to know which item is selected to use later with
//modal, etc.
egam.models.gpoUsers.DetailsModel.prototype.select = function(item) {
  var self = this;
  //    Var fullRowModel = self.selectedCache[item.index] || new egam.gpoItems.FullModelClass(item.doc,self,item.index) ;
  var fullRowModel = new egam.models.gpoUsers.FullModelClass(item.doc, item.index, self);
  self.selected(fullRowModel);

  //If no tag Controls created yet then do it now
  //if (!self.tagControls) self.tagControls = new egam.models.gpoItems.TagControlsClass(self);
  //Note: if the instance of these controls/models are used in multiple places it can be stored in something like egam.shared.tagConrols
  //Then the we would get self.tagControls = using functions that creates egam.shared.tagConrols if not exists otherwise returns existing so that we don't create another instance again if already created by different consumer
  // if (!self.tagControls) self.tagControls = egam.utilities.loadSharedControl("tagControls",egam.models.gpoItems.TagControlsClass,[self]);

  //This function will not reinitialize when called second time
  //If there would have been more promises then just this tagControls then could use .all or chain them
  //self.tagControls.init()
    //.then(function () {
      //Now apply binding if not applied and then refresh the tag controls for selected item (to select by doc.owners authGroup)
//  if (needToApplyBindings) ko.applyBindings(self, self.$element[0]);
      if (!self.bound) {
        ko.applyBindings(self, document.getElementById('gpoUsersModal'));
        self.bound=true;
      }

      //no need to pass the new doc, it just uses the parent's (this details control) selected doc
      //self.tagControls.refresh();
    //});
};

//Allows you to select an item based on index, usually index will be coming from row number
egam.models.gpoUsers.DetailsModel.prototype.loadReconcile = function() {
  var self = this;
  if (!self.reconcillation) {
    self.reconcillation = new egam.models.edgItems.ReconcilliationModel(self.selected);
//    self.reconcillation = egam.utilities.loadSharedControl("reconcillation",egam.models.gpoItems.ReconcilliationModel,[self.selected]);
  }

  self.reconcillation.load(self.selected().doc);
  //Do things like turn off the details model stuff
  //$element.modal('hide');

};

//Allows you to select an item based on index, usually index will be coming from
//row number
egam.models.gpoUsers.DetailsModel.prototype.selectIndex = function(index) {
  this.select(this.parent.table.items[index]);
};

//Post updated docs back to Mongo and change local view model
//Note: Update is called in details model scope so this will be correct
egam.models.gpoUsers.DetailsModel.prototype.update = function() {
  alert("update");
  var self = this;

  //Get current data for sponsoring
  var defaultDuration = 90;
  var sD = new Date();
  var sponsorDate = sD.getTime();
  var endDate = sponsorDate + defaultDuration * 24 * 3600 * 1000;

  // Get assigned authGroup from dropdown
  var userAuthDrop = $('#UserAuthDrop');
  var authGroup = userAuthDrop[0]
      .options[userAuthDrop[0].selectedIndex].value;

  // Get other fields
  var org = $('#SponsoredOrg').val();
  var descript = $('#spDescription').val();
  var reason = $('#spPurpose');
  var reasonSelected = reason[0].options[reason[0].selectedIndex].value;

  // Create updateDoc to post back to mongo
        myUserData = {};
        updateUserData = {
          username: self.selected().doc().username(),
          sponsor: {
            username: egam.communityUser.username,
            startDate: sponsorDate,
            endDate: endDate,
            authGroup: authGroup,
            reason: reasonSelected,
            organization: org,
            description: descript,
          },
          authGroup: authGroup,
        };
        updatedSponsor = {
          username: egam.communityUser.username,
          startDate: sponsorDate,
          endDate: endDate,
          authGroup: authGroup,
          reason: reasonSelected,
          organization: org,
          description: descript,
        };
        myUserData.updateDocs = JSON.stringify(updateUserData);

        //Alert(JSON.stringify(updateUserData));
        var unmapped = ko.mapping.toJS(self.selected().doc());

        // Update in UI doc
        unmapped.sponsors.push(updatedSponsor);
        unmapped.authGroups.push(authGroup);

        // Console.log(JSON.stringify(unmapped));
        ko.mapping.fromJS(unmapped, self.selected().doc());

        // Post to mongo
        $.ajax({
          url: 'gpousers/update',
          type: 'POST',
          data: myUserData,
          cache: false,
          dataType: 'json',
          success: function(rdata, textStatus, jqXHR) {
            console.log('Success: Posted new sponsor to Mongo');

            // Alert(JSON.stringify(rdata));
          },
          error: function(jqXHR, textStatus, errorThrown) {
            // Handle errors here
            console.log('ERRORS: ' + textStatus);
          },
        });
        $('#gpoUsersModal').modal('hide');
        $('#updateAuth').hide();
      //};

  // var updateDocsJSON = JSON.stringify(self.selected().changeDoc);
  // //Don't try to update if there is nothing to update
  // if (updateDocsJSON == '{}' && !thumbnailFile) {
  //   return;
  // }
  // //ChangeDoc should be cleared for next time
  // self.selected().changeDoc = {};
  //
  // var mydata = new FormData();
  // mydata.append('updateDocs', updateDocsJSON);
  // mydata.append('thumbnail', thumbnailFile);
  //
  //
  // $.ajax({
  //   url: 'gpoitems/update',
  //   type: 'POST',
  //   data: mydata,
  //   cache: false,
  //   dataType: 'json',
  //   //Don't process the files
  //   processData: false,
  //   //Set content type to false as jQuery will tell the server its a query
  //   //string request
  //   contentType: false,
  //   success: function(data, textStatus, jqXHR) {
  //     if (data.errors < 1) {
  //       //Success so call function to process the form
  //       console.log('success: ' + data);
  //
  //       //Refresh the data table now that save went through
  //       //convert the full model observable doc to the simple JS doc.
  //       //Only update the doc field in row model item
  //       var jsDoc = ko.mapping.toJS(self.selected().doc());
  //       self.parent.table.update(self.selected().index, jsDoc, 'doc');
  //     } else {
  //       //Handle errors here
  //       console.error('ERRORS: ');
  //       console.error(data.errors);
  //     }
  //   },
  //   error: function(jqXHR, textStatus, errorThrown) {
  //     // Handle errors here
  //     console.log('ERRORS: ' + errorThrown);
  //     // STOP LOADING SPINNER
  //   },
  // });

  console.log('Post back updated GPO Users');
};

//This just encapsulates all the logic for the gpoItems tag controls
//(dropdowns and list box)
// egam.models.gpoItems.TagControlsClass = function(parent) {
//   var self = this;
//
//   self.parent = parent;
//   self.isInit = false;
//   //By default the doc to use which contains tag and other item info is self.parent.selected().doc()
//   //It is possible to override this and set self.doc
//   self._doc = null;
//   //Note: call doc() to get the manually set doc or the default doc from
//   //selected()
//   self.doc = function() {
//     return self._doc || ko.utils.unwrapObservable(self.parent.selected().doc);
//   };
//
//   self.$orgTagSelect = $('#orgTagSelect');
//   self.$officeTagSelect = $('#officeTagSelect');
//   self.$addOrgTag = $('#addOrgTag');
//
//   //Also storing the Office dropdown value even though it doesn't get acted as
//   //a tag but need this to set value of drop. Otherwise Please Select kept
//   //getting reset
//   self.tagCategories = ['EPA', 'Place', 'Office', 'Org'];
//
//   //These are the selected Tags that we save so they can be removed
//   self.selectedTags = ko.observableArray(['']);
//   //This is where the tag for each cat being added is stored
//   self.tagToAdd = {};
//   //This is where function to add Tag for each cat is stored
//   //(just a convenience for markup to use)
//   self.addTag = {};
//
//   //These are the organizations that go with each office
//   self.selectedOfficeOrganizations = ko.observableArray([]);
//
//   //Generate the observable for tags to add and the add tag function for each
//   //tag category
//   $.each(this.tagCategories, function(i, cat) {
//     //This is just observable for tag that is being added
//     self.tagToAdd[cat] = ko.observable('');
//     //This just calls the more generic addTag function which is just convenience
//     //for knockout binding
//     self.addTag[cat] = function() {
//       return self.addTagByCat(cat)
//     };
//   });
//
// };

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


