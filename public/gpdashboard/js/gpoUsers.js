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
  //self.setCreateNewUser();

  //Set up the details control now which is part of this Model Class
  self.details = new egam.models.gpoUsers.DetailsModel(self);
  self.newUser = new egam.models.gpoUsers.newUserModel(self);

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
      var emptySponsor = {username:ko.observable(),organization:ko.observable(),authGroup:ko.observable(),reason:ko.observable(),description:ko.observable(),startDate:null,endDate:null};
      //initialize authGroup to be first authGroup of logged in user
      if (egam.communityUser.authGroups.length>0) emptySponsor.authGroup(egam.communityUser.authGroups[0]);
      //initialize the user to be the logged in user
      emptySponsor.username(egam.communityUser.username);
      return emptySponsor;
    }
  },this);

  //Use ownerIDsByAuthGroup because it shows all the authgroups somebody can see not just those somebody is in ie. superusers can see all authgroups this way
//  var authGroups = Object.keys(egam.communityUser.ownerIDsByAuthGroup);
//  authGroups.sort();

//Only admin can see this and let admin see all authGroups. availableAuthgroups was already retrieved from server.
  var authGroups = egam.dataStash['availableAuthgroups'].names;
  this.sponsoreeAuthGroups = ko.observableArray(authGroups);

  this.latestSponsor().authGroup.subscribe(function(evt) {
      self.refreshSponsorList();
    }.bind(self));

  //get potential sponsors list
    var query ={};  //{isExternal: true};{id:{$in:ids}};
    var projection = {};

//    this.designatedSponsor = ko.observable({
//      value: egam.communityUser.username,
//      label: egam.communityUser.fullName + ' (' + egam.communityUser.username + ')'
//    });
//  this.sponsorPicklist = ko.observableArray([this.designatedSponsor()]);

  //This is object like {value,label}
    this.selectedSponsorOption = ko.observable();
    this.sponsorPicklist = ko.observableArray([]);

    //manually get the sponsor list the first time
    //Note have to pass the selected sponsor username because can't set value to be select value but select option object which is {value:,label:}.
    //We aren't storing fullName on sponsor so just select by option item when creating option items in dropdown
    //Could save fullName on Sponsor in db but would have to update existing DB . very weird knockout design that can't select by value only option item

    self.refreshSponsorList();
};

egam.models.gpoUsers.FullModelClass.prototype.refreshSponsorList = function(authGroup,selectedSponsor) {
    //pass authGroup and selectedSponsor otherwise it comes from self.latestSponsor
    var self = this;

    self.sponsorPicklist.removeAll();
    self.sponsorPicklist.push({
      value: egam.communityUser.username,
      label: egam.communityUser.fullName + ' (' + egam.communityUser.username + ')'
    });

    //if authGroup is not passed then get from latestSponsor which is bound to dropdown (and get selected sponsor)
    if (arguments.length==0) {
      authGroup = self.latestSponsor ().authGroup();
      selectedSponsor = self.latestSponsor().username();
    }

    //if authGroup falsey make it empty string so no users are returned
    if (! authGroup) authGroup="";

    var query = {authGroups:authGroup,isExternal:false};
    egam.utilities.queryEndpoint('gpoUsers/list?query=' + JSON.stringify(query) + '&showAll=true&projection={"sort":{"fullName":1}}').then(function (users) {
        //console.log("users List: ", users);
        if (users) {
          users.forEach(function (u) {
                if (u.username == egam.communityUser.username) {
                } else {
                  var newOption = {
                    value: u.username,
                    label: u.fullName + ' (' + u.username + ')'
                  };
                  self.sponsorPicklist.push(newOption);
                  if(selectedSponsor && selectedSponsor==u.username) self.selectedSponsorOption(newOption)
                }
            });
        }

    })
};

egam.models.gpoUsers.FullModelClass.prototype.selectSponsorListByValue = function(value) {
  var self = this;

  var selectedOption= null;
  self.sponsorPicklist().every(function (option) {
    if (option.value==value) selectedOption=option;
    return !selectedOption;
  });

  self.selectedSponsorOption(selectedOption);
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

    var authGroup = "";
    if (egam.communityUser.authGroups.length>0) {
        authGroup = egam.communityUser.authGroups[0];
    }
//    self.selected().refreshSponsorList(authGroup);

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

  var updateUserData = ko.mapping.toJS({
    username: self.selected().doc().username(),
    sponsor: {
      username: self.selected().selectedSponsorOption().value,
      startDate: sponsorDate,
      endDate: endDate,
      authGroup: self.selected().latestSponsor().authGroup,
      reason: self.selected().latestSponsor().reason,
      organization: self.selected().latestSponsor().organization,
      description: self.selected().latestSponsor().description
    },
    authGroup: self.selected().latestSponsor().authGroup
  });

  //Could have maybe just directly changed self.selected().doc() instead of toJS and fromJS but would have to create observable array for user.sponsors if empty
  var unmapped = ko.mapping.toJS(self.selected().doc());

  //Need to initialize the sponsors array if it isn't there before push
  if (!unmapped.sponsors) unmapped.sponsors = [];
  unmapped.sponsors.push(updateUserData.sponsor);
  unmapped.authGroups.push(self.selected().latestSponsor().authGroup);

    if (unmapped.authGroups.indexOf(updateUserData.authGroup)<0) unmapped.authGroups.push(updateUserData.authGroup);

  ko.mapping.fromJS(unmapped, self.selected().doc());

    var myUserData = {};
    myUserData.updateDocs = JSON.stringify(updateUserData);

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

egam.models.gpoUsers.newUserModel = function(item){
    var self = this;

    self.$element = $('gpoCreateUserModal');
    //fields to create new User
    self.userFirstName = ko.observable();
    self.userLastName = ko.observable();
    self.userEmail = ko.observable();
    self.emailAudit = ko.observable(false);
    //fields to sponsor new user
    self.userReason = ko.observable();
    self.userOrg = ko.observable();
    self.userDesc = ko.observable();
    var authGroups = egam.dataStash['availableAuthgroups'].names;
    self.posAuthGroups = ko.observableArray(authGroups);
    self.sponsorPicklist = ko.observableArray([]);
    self.userUserName = ko.observable();
    //Just select the first auth group user is in
    self.selectAuthGroup = ko.observable(egam.communityUser.authGroups[0]);
    self.selectedSponsorOption = ko.observable();

    self.reset = function(){
        self.userFirstName('');
        self.userLastName('');
        self.userEmail('');
        self.emailAudit(false);

        $("#newUserPurpose").val($("#newUserPurpose option:first").val());
        self.userReason('');
        self.userOrg('');
        self.userDesc('');
        self.userUserName('');
    }

    if (!self.bound) {
        ko.applyBindings(self, document.getElementById('gpoCreateUserModal'));
        self.bound = true;
    }

    self.userEmail.subscribe(function(evt){
        var email_regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        self.emailAudit(email_regex.test(self.userEmail()));
    }.bind(self));

    //update the sponosor list when auth group changes
    this.selectAuthGroup.subscribe(function(evt) {
      self.refreshSponsorList(self.selectAuthGroup());
    }.bind(self));

    //manually get the sponsor list the first time
    self.refreshSponsorList(self.selectAuthGroup());

};

//Reuse the code that refreshes sponsor
egam.models.gpoUsers.newUserModel.prototype.refreshSponsorList = egam.models.gpoUsers.FullModelClass.prototype.refreshSponsorList;

egam.models.gpoUsers.newUserModel.prototype.update = function(){
  var self = this;
  //create new user object
    var newUser = {
        "email": self.userEmail(),
        "firstname": self.userFirstName(),
        "lastname": self.userLastName(),
        "sponsor": egam.communityUser.username
    };
    var userData = {};
    userData.addDocs = JSON.stringify(newUser);

    $.ajax({
        url: 'gpousers/addExternal',
        type: 'POST',
        data: userData,
        cache: false,
        dataType: 'json',
        success: function(rdata, textStatus, jqXHR) {

            console.log('Success: created new user ', rdata);
            var newUserName = rdata.body[0].user.username;

            //get dates
            var defaultDuration = 90;
            var sD = new Date();
            var sponsorDate = sD.getTime();
            var endDate = sponsorDate + defaultDuration * 24 * 3600 * 1000;
            //Get current data for sponsoring
            var newUserSponsor = ko.mapping.toJS({
                username: newUserName,
                sponsor: {
                    username: self.selectedSponsorOption().value,
                    startDate: sponsorDate,
                    endDate: endDate,
                    authGroup: self.selectAuthGroup(),
                    reason: self.userReason(),
                    organization: self.userOrg(),
                    description: self.userDesc()
                },
                authGroup: self.selectAuthGroup()
            });
            var newUserSponsorData = {};
            newUserSponsorData.updateDocs = JSON.stringify(newUserSponsor);

            $.ajax({
                url: 'gpousers/update',
                type: 'POST',
                data: newUserSponsorData,
                cache: false,
                dataType: 'json',
                success: function(rdata, textStatus, jqXHR) {
                    console.log('Success: Posted new sponsor to Mongo', rdata);

                    var newRow = {
                            username: newUserName,
                            fullName: (self.userFirstName() + ' ' + self.userLastName()),
                            email: self.userEmail(),
                            isExternal: true,
                            sponsors: [{
                                username: self.selectedSponsorOption().value,
                                startDate: sponsorDate,
                                endDate: endDate,
                                authGroup: self.selectAuthGroup(),
                                reason: self.userReason(),
                                organization: self.userOrg(),
                                description: self.userDesc()
                            }]
                        };

                    egam.pages.gpoUsers.table.add([newRow], null, true);

                    $('#gpoCreateUserModal').modal('hide');
                    self.reset();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // Handle errors here
                    console.log('ERRORS: ' + textStatus);
                },
            });

        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle errors here
            console.log('ERRORS: ' + textStatus);
        }
    });

};

