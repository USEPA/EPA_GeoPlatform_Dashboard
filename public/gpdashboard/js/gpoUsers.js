if (typeof egam == 'undefined') {
  var egam = {};
}
if (typeof egam.pages == 'undefined') {
  egam.pages = {};
}
if (typeof egam.models == 'undefined') {
  egam.models = {};
}

//Place to stash the gpoUsers models for now
//Note the actual instance of the page models are in egam.pages so gpoItems page
//instance is egam.pages.gpoUsers
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

  //Set events for user table filter buttons
  $.fn.dataTable.ext.buttons.userTableFilter = {
    className: 'buttons-alert',
    action: function(e, dt, node, config) {

      // Alert( this.text() );
      var userTable = self.table.dataTable;

      // Console.log(e);
      var searchVal;
      if (this.text() == 'All External Users') {
        searchVal = '.*';
        this.active(true);
        userTable.button(1).active(false);
        userTable.button(2).active(false);
      }else if (this.text() == 'Sponsored') {
        searchVal = '.+';
        this.active(true);
        userTable.button(0).active(false);
        userTable.button(2).active(false);
      }else if (this.text() == 'Unsponsored') {
        searchVal = '^' + '$';
        this.active(true);
        userTable.button(0).active(false);
        userTable.button(1).active(false);
      }

      userTable
          .column(3)
          .search(searchVal, true, false)
          .draw();
    },
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

  // Leaving this in for now because we will need to add a
  // loading message once there are more users
  // Show the loading message and count. Hide the table.
  $('div#loadingMsg').removeClass('hidden');
  self.$pageElement.addClass('hidden');

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

      //Set All External Users button to be the active button initially
      self.table.dataTable.buttons(0).active(true);

  //     //Now stop showing loading message that page is load
      $('div#loadingMsg').addClass('hidden');
      self.$pageElement.removeClass('hidden');
  //
       defer.resolve();
     });
  //
   return defer;
};

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

  //Doc of changed fields
  //this.changeDoc = {};

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

  }
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

  console.log('Post back updated GPO Users');
};


