// Expose dashboard especially helpful for debugging
if (typeof egam == 'undefined') {
  var egam = {};
}
if (typeof egam.models == 'undefined') {
  egam.models = {};
}
//Place to stash utility functions
if (typeof egam.utilities == 'undefined') {
  egam.utilities = {};
}
//Place for shared instances of controls/models
if (typeof egam.utilities == 'undefined') {
  egam.utilities = {};
}

//For now i'm using .(dot) namespacing categorized by model, utility and control
//classes. Most classes are models but reusable ones like Table class are
//controls. When AMD is implemented we won't need so much .(dot) namespacing.
//Different categories will be in directories and each class in own file.

//Note the acutal instance of the page models are in egam.pages

//Place to stash the edgItems models for now
egam.models.edgItems = {};

//Place to store and save general data retrieved from REST endpoints
egam.dataStash = {};

egam.gpoUsers = {
  resultSet: [],
  tableModel: null,
  dataTable: null,
  isLoaded: false,
};

$(document).ready(function() {


  $(document).on('click', '.nav li', function(e) {
    $('.nav-sidebar li').removeClass('active');
    $(this).addClass('active');
    var view = $(this).find(':first').attr('id');
    $('#' + view + 'View').collapse('show');
    $('.view').not(document.getElementById(view)).collapse('hide');
    if (e.target.hash == '#edgView') {
      loadEDGitemsPage();
    }else if (e.target.hash == '#userMgmtView') {
      // Only load user table the first time user click on userMgmtView
      if (!egam.gpoUsers.isLoaded) {
        populateUserMngntTable();
        egam.gpoUsers.isLoaded = true;
      }
    }
  });

  // Click event for Help Modal
  $('#egamHelp').on('click', function(e) {
    $('#helpModal').modal('show');
  });

  // Add tooltips
  var options = {delay: { show: 500, hide: 100 }};
  $('[data-toggle="tooltip"]').tooltip(options);

  ko.bindingHandlers['wysiwyg'].defaults = {
    plugins: [ 'link textcolor colorpicker' ],
    toolbar: 'bold italic underline forecolor backcolor | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'numlist bullist indent outdent | link image | undo redo | ' +
      'fontsizeselect ',
    menubar: false,
    statusbar: false,
    toolbar_items_size: 'small',
    body_class: 'form-group has-success form-control',
  };

  // Load the GPHE table
  $.getScript('js/gphedata.js')
      .done(function(script, textStatus) {
        $('#environmentTable').DataTable({
          data: GPHEdata,
          columns: [
          { title: 'Folder'},
          { title: 'Service Name'},
          { title: 'Service Type'},
          { title: 'Service Description'},
          ],
        });
      });

});


function populateUserMngntTable() {
  
  //alert("populate User table");
  egam.pages.gpoUsers = new egam.models.gpoUsers.PageModelClass();
  console.log('GPOusers Page Model created: ' + new Date());

  egam.pages.gpoUsers.init();
  // var queryUM = {isExternal: true};
  // $.post('gpousers/list', {
  //   query: JSON.stringify(queryUM),
  // }, function(data) {
  //   // Alert(data);
  //   egam.gpoUsers.resultSet = data;
  //
  //   var gpoUserModel = function(u) {
  //     var self = this;
  //
  //     if (!u.sponsors) {
  //       u['sponsors'] = [];
  //     }
  //     this.uData = ko.mapping.fromJS(u);
  //
  //     // Sponsor fields
  //     this.latestSponsor = ko.computed(function() {
  //       var sponsorsLen = self.uData.sponsors().length;
  //       if (sponsorsLen > 0) {
  //         return self.uData.sponsors()[sponsorsLen - 1].username();
  //       }
  //     });
  //
  //     this.spStartDate = ko.computed(function() {
  //       var spLen = self.uData.sponsors().length;
  //       if (spLen > 0) {
  //         var dDate = new Date(self.uData.sponsors()[spLen - 1].startDate());
  //         return formatDate(dDate);
  //       }
  //     });
  //
  //     this.spEndDate = ko.computed(function() {
  //       var spLen = self.uData.sponsors().length;
  //       if (spLen > 0) {
  //         var dDate = new Date(self.uData.sponsors()[spLen - 1].endDate());
  //         return formatDate(dDate);
  //       }
  //     });
  //
  //     this.spOrg = ko.computed(function() {
  //       var spLen = self.uData.sponsors().length;
  //       if (spLen > 0) {
  //         return self.uData.sponsors()[spLen - 1].organization();
  //       }
  //     });
  //
  //     this.spAuthGroup = ko.computed(function() {
  //       var spLen = self.uData.sponsors().length;
  //       if (spLen > 0) {
  //         return self.uData.sponsors()[spLen - 1].authGroup();
  //       }
  //     });
  //
  //     this.spReason = ko.computed(function() {
  //       var spLen = self.uData.sponsors().length;
  //       if (spLen > 0) {
  //         return self.uData.sponsors()[spLen - 1].reason();
  //       }
  //     });
  //
  //     this.spDescript = ko.computed(function() {
  //       var spLen = self.uData.sponsors().length;
  //       if (spLen > 0) {
  //         return self.uData.sponsors()[spLen - 1].description();
  //       }
  //     });
  //
  //     // Format Date from millaseconds to something useful
  //     function formatDate(uDate) {
  //       var monthNames = [
  //         'Jan', 'Feb', 'Mar',
  //         'Apr', 'May', 'Jun', 'Jul',
  //         'Aug', 'Sep', 'Oct',
  //         'Nov', 'Dec',
  //       ];
  //       return monthNames[uDate.getMonth()] + ' ' + uDate.getDate() + ', ' +
  //           uDate.getFullYear();
  //     }
  //
  //     this.sponsoreeAuthGroups = ko.observableArray(
  //         egam.communityUser.authGroups);
  //
  //     this.renew = function() {
  //
  //       // Get current data for sponsoring
  //       var defaultDuration = 90;
  //       var sD = new Date();
  //       var sponsorDate = sD.getTime();
  //       var endDate = sponsorDate + defaultDuration * 24 * 3600 * 1000;
  //
  //       // Get assigned authGroup from dropdown
  //       var userAuthDrop = $('#UserAuthDrop');
  //       var authGroup = userAuthDrop[0]
  //           .options[userAuthDrop[0].selectedIndex].value;
  //
  //       // Get other fields
  //       var org = $('#SponsoredOrg').val();
  //       var descript = $('#spDescription').val();
  //       var reason = $('#spPurpose');
  //       var reasonSelected = reason[0].options[reason[0].selectedIndex].value;
  //
  //       // Create updateDoc to post back to mongo
  //       myUserData = {};
  //       updateUserData = {
  //         username: self.uData.username(),
  //         sponsor: {
  //           username: egam.communityUser.username,
  //           startDate: sponsorDate,
  //           endDate: endDate,
  //           authGroup: authGroup,
  //           reason: reasonSelected,
  //           organization: org,
  //           description: descript,
  //         },
  //         authGroup: authGroup,
  //       };
  //       updatedSponsor = {
  //         username: egam.communityUser.username,
  //         startDate: sponsorDate,
  //         endDate: endDate,
  //         authGroup: authGroup,
  //         reason: reasonSelected,
  //         organization: org,
  //         description: descript,
  //       };
  //       myUserData.updateDocs = JSON.stringify(updateUserData);
  //
  //       // Alert(JSON.stringify(updateUserData));
  //       var unmapped = ko.mapping.toJS(self.uData);
  //
  //       // Update in UI doc
  //       unmapped.sponsors.push(updatedSponsor);
  //       unmapped.authGroups.push(authGroup);
  //
  //       // Console.log(JSON.stringify(unmapped));
  //       ko.mapping.fromJS(unmapped, self.uData);
  //
  //       // Console.log(userAuthDrop);
  //
  //       // Post to mongo
  //       $.ajax({
  //         url: 'gpousers/update',
  //         type: 'POST',
  //         data: myUserData,
  //         cache: false,
  //         dataType: 'json',
  //         success: function(rdata, textStatus, jqXHR) {
  //           console.log('Success: Posted new sponsor to Mongo');
  //
  //           // Alert(JSON.stringify(rdata));
  //         },
  //         error: function(jqXHR, textStatus, errorThrown) {
  //           // Handle errors here
  //           console.log('ERRORS: ' + textStatus);
  //         },
  //       });
  //       $('#userMgmtModal').modal('hide');
  //       $('#updateAuth').hide();
  //     };
  //   };
  //
  //   var gpoUserTableModel = function(usersDoc) {
  //     var self = this;
  //
  //     self.users = ko.observableArray(usersDoc.map(function(doc) {
  //       return new gpoUserModel(doc);
  //     }));
  //
  //     self.select = function(item) {
  //       self.selected(item);
  //     };
  //
  //     // Allows you to select an item based on index, usually index will be
  //     // coming from row number
  //     self.selectIndex = function(index) {
  //       var selectedItem = self.users()[index];
  //       self.selected(selectedItem);
  //     };
  //
  //     self.selected = ko.observable();
  //
  //     if (self.users().length > 0) {
  //       // Automatically select the 1st item in the table
  //       // no idea why we are doing this?
  //       self.selected = ko.observable(self.users()[0]);
  //     }
  //
  //     self.clear = function() {
  //       self.users().length = 0;
  //     };
  //
  //   };
  //
  //   // JSON.parse(data)
  //   egam.gpoUsers.tableModel = ko.applyBindings(new gpoUserTableModel(
  //     JSON.parse(data)), document.getElementById('userMgmtView'));
  //
  //   $.fn.dataTable.ext.buttons.alert = {
  //     className: 'buttons-alert',
  //     action: function(e, dt, node, config) {
  //
  //       // Alert( this.text() );
  //       var userTable = $('#userMgmtTable').DataTable();
  //
  //       // Console.log(e);
  //       var searchVal;
  //       if (this.text() == 'All External Users') {
  //         searchVal = '.*';
  //         this.active(true);
  //         userTable.button(1).active(false);
  //         userTable.button(2).active(false);
  //       }else if (this.text() == 'Sponsored') {
  //         searchVal = '.+';
  //         this.active(true);
  //         userTable.button(0).active(false);
  //         userTable.button(2).active(false);
  //       }else if (this.text() == 'Unsponsored') {
  //         searchVal = '^' + '$';
  //         this.active(true);
  //         userTable.button(0).active(false);
  //         userTable.button(1).active(false);
  //       }
  //
  //       userTable
  //           .column(3)
  //           .search(searchVal, true, false)
  //           .draw();
  //     },
  //   };
  //
  //   egam.gpoUsers.tableModel = $('#userMgmtTable').DataTable({
  //     dom: 'Bfrtip',
  //     buttons: [
  //         {
  //           extend: 'alert',
  //           text: 'All External Users',
  //         },
  //         {
  //           extend: 'alert',
  //           text: 'Sponsored',
  //         },
  //         {
  //           extend: 'alert',
  //           text: 'Unsponsored',
  //         },
  //       ],
  //     order: [
  //       [1, 'asc'],
  //     ],
  //   });
  //   //Make All External Users button active
  //   egam.gpoUsers.tableModel.buttons(0).active(true);
  // });
}


//This is basically generic way to hit endopint get dataset and store it
//Example datasets are available authgroups and available tags
egam.utilities.getDataStash = function(name,endpoint) {
  var self = this;
  var defer = $.Deferred();

  //If already got avail tags just return don't ajax them again
  if (egam.dataStash[name]) {
    defer.resolve(egam.dataStash[name]);
    return defer;
  }

  $.ajax({
    url: endpoint,
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      if (data.errors > 0) {
        defer.reject(data.errors);
      }

      egam.dataStash[name] = data;
      defer.resolve(data);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      defer.reject('Error getting Data Stash with status ' +
        textStatus + ': ' + errorThrown);
      console.error('ERRORS: ' + errorThrown);
    },
  });

  return defer;
};

egam.utilities.loadSharedControl = function(name,constructor,args) {
  if (egam.shared[name]) {
    return egam.shared[name];
  }else {
    args.unshift(null);
    var factoryFunction = constructor.bind.apply(constructor, args);
    return new factoryFunction();
  }
};


function loadEDGitemsPage() {
  if (!egam.pages.edgItems) {
    //Create the new PageModel instance
    egam.pages.edgItems = new egam.models.edgItems.PageModelClass();
    console.log('EDGitems Page Model created: ' + new Date());

    //Basically initialize the gpoItems page because that is the first page we
    //want to see on login

    egam.pages.edgItems.init()
      .then(function () {
        return true;
      })
      .fail(function (err) {
        console.error(err);
      });
  }
}
