// Expose dashboard especially helpful for debugging
var egam = {};

egam.edgItems = {
  resultSet: [],
  tableModel: null,
  dataTable: null,
};

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
      egam.edginit();
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


egam.searchEDG = function() {
  $('#edgModal').modal('show');
  var title = $('#title').val();
  $('#edgTitleSearch').val(title);

  // If the Search button on the EDG modal is clicked, re-search EDG
  $('#edgBtnModal').click(function() {
    egam.edginit($('#edgTitleSearch').val(), true);
  });
  egam.edginit(title, true);
  $('#myModal').modal('hide');
}


// TODO: all EDG code should go in its own module
egam.edginit = function(itemTitle, edgModal) {

  // Handle default values
  itemTitle = typeof itemTitle !== 'undefined' ? itemTitle : '';
  edgModal = typeof edgModal !== 'undefined' ? edgModal : false;

  // If first time ever binding to table, need to apply binding, but can only
  // bind once so don't bind again if reloading table
  var needToApplyBindings = false;

  if (egam.edgItems.tableModel) {
    // Only occurs if reloading the whole table have to actually remove
    // dataTable rows and destroy datatable in order to get knockout to
    // rebind table
    if (egam.edgItems.dataTable) {
      egam.edgItems.dataTable.api().clear().draw();
      if ('fnDestroy' in egam.edgItems.dataTable) {
        egam.edgItems.dataTable.fnDestroy();
      }
    }
    egam.edgItems.tableModel.content.removeAll();
    console.log('Wiped out table model and data table: ' +
        egam.edgItems.tableModel.content().length);
  } else {
    // Setting up the new tableModel instance with no rows yet
    egam.edgItems.tableModel = new egam.edgItemTableModel([]);
    needToApplyBindings = true;
  }

  var edgURLRoot = 'https://edg.epa.gov/metadata/rest/find/document?';
  var edgURLParams = {};

  var edgDiv = '#edgitemtable';

  if (edgModal) {
    edgURLParams = {
      f: 'dcat',
      max: '20',
      searchText: itemTitle,
    };
    edgDiv = '#edgitemmodaltable';
  } else {
    edgURLParams = {
      f: 'dcat',
      max: '100',
    };
  }

  $.ajax({
    url: edgURLRoot + $.param(edgURLParams),
    dataType: 'json',
    success: function(data) {
      egam.edgItems.tableModel.add(data.dataset)
          .then(function() {
            // If there are no rows then don't try to bind
            if (data.dataset.length < 1) {
              return;
            }
            if (needToApplyBindings) {
              // Bind the data
              ko.applyBindings(egam.edgItems.tableModel,
                  document.getElementById('edgViewViewTable'));
              ko.applyBindings(egam.edgItems.tableModel,
                  document.getElementById('edgModal'));
            }
            setTimeout(function() {
              if (egam.edgItems.dataTable &&
                  ('fnDestroy' in egam.edgItems.dataTable)) {
                egam.edgItems.dataTable.fnDestroy();
              }
              egam.renderEDGitemsDataTable(edgDiv)
                  .then(function(dt) {
                    egam.edgItems.dataTable = dt;
                  });
            }, 0);
          });
    },
    error: function(request, textStatus, errorThrown) {
      if (edgModal) {
        $('#edgModal').modal('hide');
      }
      alert('EDG Error, ' + request.statusText + ': ' +
          (edgURLRoot + $.param(edgURLParams)));
      console.log('EDG JSON parse error, ' + request.statusText + ': ' +
          (edgURLRoot + $.param(edgURLParams)));
    },
  });

};

function populateUserMngntTable() {

  var queryUM = {isExternal: true};
  $.post('gpousers/list', {
    query: JSON.stringify(queryUM),
  }, function(data) {
    // Alert(data);
    egam.gpoUsers.resultSet = data;

    var gpoUserModel = function(u) {
      var self = this;

      if (!u.sponsors) {
        u['sponsors'] = [];
      }
      this.uData = ko.mapping.fromJS(u);

      // Sponsor fields
      this.latestSponsor = ko.computed(function() {
        var sponsorsLen = self.uData.sponsors().length;
        if (sponsorsLen > 0) {
          return self.uData.sponsors()[sponsorsLen - 1].username();
        }
      });

      this.spStartDate = ko.computed(function() {
        var spLen = self.uData.sponsors().length;
        if (spLen > 0) {
          var dDate = new Date(self.uData.sponsors()[spLen - 1].startDate());
          return formatDate(dDate);
        }
      });

      this.spEndDate = ko.computed(function() {
        var spLen = self.uData.sponsors().length;
        if (spLen > 0) {
          var dDate = new Date(self.uData.sponsors()[spLen - 1].endDate());
          return formatDate(dDate);
        }
      });

      this.spOrg = ko.computed(function() {
        var spLen = self.uData.sponsors().length;
        if (spLen > 0) {
          return self.uData.sponsors()[spLen - 1].organization();
        }
      });

      this.spAuthGroup = ko.computed(function() {
        var spLen = self.uData.sponsors().length;
        if (spLen > 0) {
          return self.uData.sponsors()[spLen - 1].authGroup();
        }
      });

      this.spReason = ko.computed(function() {
        var spLen = self.uData.sponsors().length;
        if (spLen > 0) {
          return self.uData.sponsors()[spLen - 1].reason();
        }
      });

      this.spDescript = ko.computed(function() {
        var spLen = self.uData.sponsors().length;
        if (spLen > 0) {
          return self.uData.sponsors()[spLen - 1].description();
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
      };

      this.sponsoreeAuthGroups = ko.observableArray(
          egam.communityUser.authGroups);

      this.renew = function() {

        // Get current data for sponsoring
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
          username: self.uData.username(),
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

        // Alert(JSON.stringify(updateUserData));
        var unmapped = ko.mapping.toJS(self.uData);

        // Update in UI doc
        unmapped.sponsors.push(updatedSponsor);
        unmapped.authGroups.push(authGroup);

        // Console.log(JSON.stringify(unmapped));
        ko.mapping.fromJS(unmapped, self.uData);

        // Console.log(userAuthDrop);

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
        $('#userMgmtModal').modal('hide');
        $('#updateAuth').hide();
      };
    };

    var gpoUserTableModel = function(usersDoc) {
      var self = this;

      self.users = ko.observableArray(usersDoc.map(function(doc) {
        return new gpoUserModel(doc);
      }));

      self.select = function(item) {
        self.selected(item);
      };

      // Allows you to select an item based on index, usually index will be
      // coming from row number
      self.selectIndex = function(index) {
        var selectedItem = self.users()[index];
        self.selected(selectedItem);
      };

      self.selected = ko.observable();

      if (self.users().length > 0) {
        // Automatically select the 1st item in the table
        // no idea why we are doing this?
        self.selected = ko.observable(self.users()[0]);
      }

      self.clear = function() {
        self.users().length = 0;
      };

    };

    // JSON.parse(data)
    egam.gpoUsers.tableModel = ko.applyBindings(new gpoUserTableModel(JSON.parse(data)), document.getElementById("userMgmtView"));

    $.fn.dataTable.ext.buttons.alert = {
      className: 'buttons-alert',
      action: function(e, dt, node, config) {

        // Alert( this.text() );
        var userTable = $('#userMgmtTable').DataTable();

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

    egam.gpoUsers.tableModel = $('#userMgmtTable').DataTable( {
      dom: 'Bfrtip',
      buttons: [
          {
            extend: 'alert',
            text: 'All External Users',
          },
          {
            extend: 'alert',
            text: 'Sponsored',
          },
          {
            extend: 'alert',
            text: 'Unsponsored',
          },
        ],
      order: [
        [1, 'asc'],
      ],
    });
    //make All External Users button active
    egam.gpoUsers.tableModel.buttons(0).active(true);
  });
}

egam.renderEDGitemsDataTable = function(edgDiv) {
  // Apply data table magic, ordered ascending by title
  // Use this so we know when table is rendered
  var defer = $.Deferred();
  $(edgDiv).DataTable({
    aaSorting: [],
    oLanguage: {
      // Changing DataTables search label to Filter to not confuse with EDG
      // Search
      sSearch: 'Filter: ',
    },
    initComplete: function() {
      defer.resolve(this);
      $(edgDiv).addClass('loaded');
    },
  });

  return defer;
};

egam.setAuthGroupsDropdown = function(ownerIDsByAuthGroup) {
  var dropAuthGroups = $('#dropAuthGroups');
  dropAuthGroups.on('change', function() {
    // If we only downloaded some authGroups then download again instead of
    // client side filtering
    if (egam.gpoItems.allAuthGroupsDownloaded === false) {
      // Call accessSelectEventHandler in proper context of dropAccess
      egam.accessSelectEventHandler.apply($('#dropAccess'), []);
    } else {
      var reOwnerIDs = '';
      if (this.value) {
        var ownerIDs = ownerIDsByAuthGroup[this.value];
        reOwnerIDs = ownerIDs.join('|');
      }
      egam.gpoItems.dataTable.column(".ownerColumn")
        .search(reOwnerIDs, true, false)

        //      .search(this.value,true,false)
        .draw();
    }

    // Also set the download link
    var authgroup = this.value;
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

egam.edgItemModel = function(data) {
  var self = this;

  // Knockout mapping JSON data to view model
  ko.mapping.fromJS(data, {}, self);
};

// Data here is the actual array of edg JSON documents that came back from the
// REST endpoint
egam.edgItemTableModel = function(data) {
  var self = this;

  self.content = ko.observableArray(data.map(function(doc) {
    return new egam.edgItemModel(doc);
  }));

  // On the entire table, we need to know which item is selected to use later
  // with modal, etc.
  self.select = function(item) {
    self.selected(item);
  };

  // Allows you to select an item based on index, usually index will be coming
  // from row number
  self.selectIndex = function(index) {
    var selectedItem = self.content()[index];
    self.selected(selectedItem);
  };

  // A new observable for the selected row
  self.selected = ko.observable();

  if (self.content().length > 0) {
    // Automatically select the 1st item in the table
    // no idea why we are doing this?
    self.selected = ko.observable(self.content()[0]);
  }

  self.clear = function() {
    self.content().length = 0;
  };


  // Data is an array of documents from the REST endpoint
  self.add = function(data, callback) {
    // Use this so we know when everything is loaded
    var defer = $.Deferred();

    // This lets things work async style so that page is not locked up when ko
    // is mapping
    // Maybe use an async library later
    var i = 0;
    var interval = setInterval(function() {
      if (i >= data.length) {
        // Needed because it calls it once more after promise is resolved
        // (don't know why!)
        return;
      }
      if (data.length > 0) {
        self.content.push(new egam.edgItemModel(data[i], true));
        if (callback) {
          callback(i);
        }
      }
      i += 1;
      if (i >= data.length) {
        defer.resolve();
        clearInterval(interval);
      }
    }, 0);

    return defer;
  };


  self.linkRecord = function(gpoID, edgURLs) {
    var edgURL = '';
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
            id: gpoID, EDGdata: {
              title: title,
              purpose: purpose,
              abstract: abstract,
              useconst: useconst,
              publisher: publisher,
              url: edgURL,},
          }));
          console.log(mydata);
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
                    egam.gpoItems.tableModel.selected().doc());
                doctemp.EDGdata = {
                  title: title,
                  purpose: purpose,
                  abstract: abstract,
                  useconst: useconst,
                  publisher: publisher,
                  url: edgURL,};
                egam.gpoItems.tableModel.selected().doc(
                    ko.mapping.fromJS(doctemp));
                $('#edgModal').modal('hide');

                // Refresh the data table so it can search updated info
                // egam.gpoItems.dataTable.destroy();
                egam.gpoItems.dataTable.fnDestroy();
                egam.renderGPOitemsDataTable();

                // Show reconciliation modal
                $('#reconciliationModal').modal('show');
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
  }
};

