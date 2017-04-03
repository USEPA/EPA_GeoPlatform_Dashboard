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

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
   self.table = new egam.controls.Table([],
     self.$tableElement,egam.models.gpoUsers.RowModelClass);

  //Have to set authGroups in this context so knockout has access to it from
  //PageModel
  self.authGroups = egam.communityUser.authGroups;

  //Set up the authGroups dropdown
  self.setAuthGroupsDropdown(egam.communityUser.ownerIDsByAuthGroup);
  self.setFilterButtons();

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

      $('#gpoUsersModal').on('hidden.bs.modal', function () {
        // $('#SponsoredOrg').val('');
        // $('#spDescription').val('');
      });

      //Now stop showing loading message that page is load
      $('div#loadingMsg').addClass('hidden');
      self.$pageElement.removeClass('hidden');
      defer.resolve();
    });
  return defer;
};

egam.models.gpoUsers.PageModelClass.prototype.setFilterButtons = function() {
  var self = this;

  var extUsers = $('#externalUsers');
  var sponUsers = $('#sponsoredUsers');
  var unsponUsers = $('#unsponsoredUsers');

  extUsers.on('click', filterUsers);
  sponUsers.on('click', filterUsers);
  unsponUsers.on('click', filterUsers);

  function filterUsers(evt){
    var searchText;
    if (self.table.dataTable) {
      if(evt.currentTarget.id == 'externalUsers'){
        searchText = '.*';
      }else if(evt.currentTarget.id == 'sponsoredUsers'){
        searchText = '.+';
      }else if(evt.currentTarget.id == 'unsponsoredUsers'){
        searchText = '^' + '$';
      }
      self.table.dataTable.column(3)
          .search(searchText, true, false)
          .draw();
    }
  }
};

egam.models.gpoUsers.PageModelClass.prototype.setAuthGroupsDropdown = function(ownerIDsByAuthGroup) {
  var self = this;
  var dropAuthGroups = $('#dropAuthGroupsUsers');
  dropAuthGroups.on('change', function() {
    var reOwnerIDs = '';
    if (this.value) {
      var ownerIDs = ownerIDsByAuthGroup[this.value];
      reOwnerIDs = ownerIDs.join('|');
    }
    
    // Also set the download link
    var authgroup = this.value;
    //Pass authgroup to email list function. If no authgroup, pass empty string
    var emailFunc = $('#emailAuthgroupsCSVallUsers').attr('onclick');
    $('#emailAuthgroupsCSVallUsers').attr('onclick',
        emailFunc.replace(/(\(.*\))/, '(\'' + authgroup + '\')'));
    if (authgroup) {
      $('#downloadAuthgroupsCSVallUsers').addClass('hidden');
      $('#downloadAuthgroupsCSVregionsUsers').removeClass('hidden');
      var href = $('#downloadAuthgroupsCSVregionsUsers').attr('href');

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
      $('#downloadAuthgroupsCSVregionsUsers').attr('href', href);
    } else {
      $('#downloadAuthgroupsCSVallUsers').removeClass('hidden');
      $('#downloadAuthgroupsCSVregionsUsers').addClass('hidden');
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
egam.models.gpoUsers.RowModelClass = function(doc, index) {
  var self = this;
  //This is the doc

  //Actually need to make this observable so that it triggers the computed function when table updated
  //Can't just create a new RowModelClass instance because it wipes out existing one that jquery dataTables is bound to
  //Could have made the computed just standard function but don't want to keep calling it everytime referenced
  this.doc = ko.observable(doc);
  //To keep track of this row when selected
  this.index = index;

  //Have to return this for latest sponsor when no sponsor because jquery datatables actually wants the field in the first column
  this.emptySponsor = {username:null,organization:null,authGroup:"",reason:null,description:null,startDate:null,endDate:null};

  //Add computed object for Current Sponsor
  this.latestSponsor = ko.computed(function() {
    if (this.doc().sponsors && this.doc().sponsors.length > 0) {
      return this.doc().sponsors[this.doc().sponsors.length - 1];
    } else {
      return this.emptySponsor;
    }
  },this);

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

  //Have to return this for latest sponsor when no sponsor because jquery datatables actually wants the field in the first column
  //this.emptySponsor = {username:null,organization:null,authGroup:"",reason:null,description:null,startDate:null,endDate:null};
  
  this.latestSponsor = ko.computed(function() {
    if (this.doc().sponsors ) {//&& this.doc().sponsors().length > 0
      return this.doc().sponsors()[this.doc().sponsors().length - 1];
    } else {
      return {username:null,organization:ko.observable(),authGroup:ko.observable(),reason:ko.observable(),description:ko.observable(),startDate:null,endDate:null};
    }
  },this);

  this.sponsoreeAuthGroups = ko.observableArray(
      egam.communityUser.authGroups);

  this.sponsorPicklist = ko.computed(function() {
      //load array of geoplatform user that are in the same authgroup as the current user
      //http://localhost:3000/gpdashboard/gpoUsers/list
      var query ={};  //{isExternal: true};
      var projection = {};
          // sort: {
          //     modified: -1,
          // },
          // fields: fields,};
      userPicklist = [];
      $.ajax({
          type: 'POST',
          url: 'gpoUsers/list',
          data: {query: query, projection: projection},
          dataType: 'json',
          //Use default timeOut if it isn't passed
          success: function (returnedData) {
              console.log('Potentail Sponsors Data Received : ' + new Date());
              if(returnedData){

                  returnedData.forEach(function(u){
                      userPicklist.push({
                          value: u.username,
                          label: u.fullName
                      })
                  });
              }
          },
      });

  }, this);
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
  var fullRowModel = new egam.models.gpoUsers.FullModelClass(ko.utils.unwrapObservable(item.doc), item.index, self);
  self.selected(fullRowModel);

  if (!self.bound) {
    ko.applyBindings(self, document.getElementById('gpoUsersModal'));
    self.bound = true;
  }
};

//Allows you to select an item based on index, usually index will be coming from row number
egam.models.gpoUsers.DetailsModel.prototype.selectIndex = function(index) {
  this.select(this.parent.table.items[index]);
};

//Post updated docs back to Mongo and change local view model
//Note: Update is called in details model scope so this will be correct
egam.models.gpoUsers.DetailsModel.prototype.update = function() {
  var self = this;

  //Get current data for sponsoring
  var defaultDuration = 90;
  var sD = new Date();
  var sponsorDate = sD.getTime();
  var endDate = sponsorDate + defaultDuration * 24 * 3600 * 1000;

  // Create updateDoc to post back to mongo

  var updateUserData = {
    username: self.selected().doc().username(),
    sponsor: {
      username: egam.communityUser.username,
      startDate: sponsorDate,
      endDate: endDate,
      authGroup: self.selected().latestSponsor().authGroup,
      reason: self.selected().latestSponsor().reason,
      organization: self.selected().latestSponsor().organization,
      description: self.selected().latestSponsor().description
    },
    authGroup: self.selected().latestSponsor().authGroup
  };

  var myUserData = {};
  myUserData.updateDocs = JSON.stringify(updateUserData);

  //Could have maybe just directly changed self.selected().doc() instead of toJS and fromJS but would have to create observable array for user.sponsors if empty
  var unmapped = ko.mapping.toJS(self.selected().doc());

  //Need to initialize the sponsors array if it isn't there before push
  if (!unmapped.sponsors) unmapped.sponsors = [];
  unmapped.sponsors.push(updateUserData.sponsor);
  unmapped.authGroups.push(self.selected().latestSponsor().authGroup);

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
      //Refresh the data table now that save went through
      //convert the full model observable doc to the simple JS doc.
      //Only update the doc field in row model item
      var jsDoc = ko.mapping.toJS(self.selected().doc());
      self.parent.table.update(self.selected().index, jsDoc, 'doc');
    },
    error: function(jqXHR, textStatus, errorThrown) {
      // Handle errors here
      console.log('ERRORS: ' + textStatus);
    },
  });
  $('#gpoUsersModal').modal('hide');
  //$('#updateAuth').hide();

  console.log('Post back updated GPO Users');
};

//Query the endpoint for user email list for auth group selected
egam.models.gpoUsers.buildEmailMyUsersLink = function(group) {
  var url =  'gpoUsers/list?projection={"fields":{"email":1}}';
  if (group) {
    url = 'gpoUsers/list?query={"authGroups":"' + group + '"}' +
      '&projection={"fields":{"email":1}}'
  }
  $.ajax({
    url: url,
    type: 'GET',
    cache: false,
    dataType: 'json',
    success: function(rdata, textStatus, jqXHR) {
      //console.log('Success Querying for Email List');
      //Add email list to the textarea
      $('#emailList').val(rdata.filter(function(a) {
        return a.email ? true : false;
      }).map(function(a) {return a.email}).join(';'));
      //Show email list modal
      $('#emailModal').modal('show');
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log('Errors Building User Email List: ' + textStatus);
    }
  });
};
//Copy the emails to the clipboard
egam.models.gpoUsers.copyEmails = function() {
  $('#emailList').select();
  document.execCommand('copy');
};
