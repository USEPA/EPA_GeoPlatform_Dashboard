// Expose dashboard especially helpful for debugging
var egam = {};
egam.gpoItems = {
  resultSet: [],
  tableModel: null,
  dataTable: null,
};

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
    ko.applyBindings(new gpoUserTableModel(JSON.parse(data)),
        document.getElementById('userMgmtView'));

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

    var userManagementTable = $('#userMgmtTable').DataTable({
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

    // Make All External Users button active
    userManagementTable.buttons(0).active(true);
  });
}

// Populate table for GPO User's Items View Projection in Mongo/Monk is what
// fields you want to return and sorting, offsetting, etc.
function populateUserTables(query, projection) {
  query = JSON.stringify(query);
  projection = JSON.stringify(projection);

  // Use this so we know when everything is loaded
  var defer = $.Deferred();

  // Do a post because some long query strings were breaking staging server
  // reverse proxy hit our Express endpoint to get the list of items for this
  // logged in user
  $.post('gpoitems/list', {
    query: query,
    projection: projection,
  }, function(data) {
    egam.gpoItems.resultSet = data;

    // If paging then data.results is array of data
    var dataResults = data;
    if ('results' in data) {
      dataResults = data.results;
    }

    $('#loadingMsgCountContainer').removeClass('hidden');
    $('#loadingMsgCount').text(0);
    $('#loadingMsgTotalCount').text(dataResults.length);

    // Show the loading message and count. Hide the table.
    $('div#loadingMsg').removeClass('hidden');
    $('div#overviewTable').addClass('hidden');

    // If first time ever binding to table, need to apply binding, but can only
    // bind once so don't bind again if reloading table
    var needToApplyBindings = false;

    if (egam.gpoItems.tableModel) {
      // Only occurs if reloading the whole table have to actually remove
      // dataTable rows and destroy datatable in order to get knockout to
      // rebind table
      if (egam.gpoItems.dataTable) {
        egam.gpoItems.dataTable.api().clear().draw();
        if ('fnDestroy' in egam.gpoItems.dataTable) {
          egam.gpoItems.dataTable.fnDestroy();
        }
      }
      egam.gpoItems.tableModel.content.removeAll();
      console.log('Wiped out table model and data table: ' +
          egam.gpoItems.tableModel.content().length);
    } else {
      // Setting up the new tableModel instance with no rows yet
      egam.gpoItems.tableModel = new egam.gpoItemTableModel([]);
      needToApplyBindings = true;
    }

    // Add these using .add because it should be async and lock up UI less
    // dataResults is just an array of objects
    egam.gpoItems.tableModel.add(dataResults, updateLoadingCountMessage)
      .then(function() {
        // If there are no rows then don't try to bind
        if (dataResults.length < 1) {
          return defer.resolve();
        }

        // Cluge to make row model work because it is trying to bind
        // rowmodel.selected()
        egam.gpoItems.tableModel.selectIndex(0);
        if (needToApplyBindings) {
          ko.applyBindings(egam.gpoItems.tableModel,
              document.getElementById('overviewView'));
        }

        setTimeout(function() {
          if (egam.gpoItems.dataTable &&
              ('fnDestroy' in egam.gpoItems.dataTable)) {
            egam.gpoItems.dataTable.fnDestroy();
          }
          egam.renderGPOitemsDataTable()
            .then(function(dt) {
              egam.gpoItems.dataTable = dt;
              defer.resolve()
            });
        }, 0);
      });


    function updateLoadingCountMessage(index) {
      // Only show every 10
      if (index % 10 === 0) {
        $('#loadingMsgCount').text(index + 1);
      }
    }

    calcItemsPassingAudit(dataResults);

    // Initialize tags once the table has loaded
    egam.gpoItems.tableModel.initializeTags();

  },'json');
  return defer;
}

function calcItemsPassingAudit(dataResults) {
  // Get percent of docs passing the Audit
  var passing = 0;
  dataResults.forEach(function(result, index) {
    var i = result.AuditData.compliant;
    if (i) {
      passing++;
    }
  });
  var percentPassing = Math.round((passing / dataResults.length) * 100);
  $('#percPublicPassingAudit').text(percentPassing + '% Passing');
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


egam.renderGPOitemsDataTable = function() {
  // Apply data table magic, ordered ascending by title
  // Use this so we know when table is rendered
  var defer = $.Deferred();

  $('#gpoitemtable1').DataTable({
    order: [
      [0, 'desc'],
    ],

    initComplete: function() {
      defer.resolve(this);
      $('#gpoitemtable1').addClass('loaded');
      this.api().columns().every(function() {

        var column = this;
        var headerSelect = $(column.header()).find('select.search');
        var footerSelect = $(column.footer()).find('select.search');

        // This is the special case for access column that we only want one
        // access at a time
        if (egam.communityUser.isSuperUser && $(column.header()).hasClass
          ('accessColumn')) {
          addAccessSelectEventHandler(headerSelect);
        } else {
          addSelectEventHandler(headerSelect);
        }
        if (egam.communityUser.isSuperUser && $(column.footer()).hasClass
          ('accessColumn')) {
          addAccessSelectEventHandler(footerSelect);
        } else {
          addSelectEventHandler(footerSelect);
        }

        function addAccessSelectEventHandler(select) {
          if (select.length > 0) {
            // Needed to remove the on change event or else multiple event
            // handlers were being added
            select.off('change');
            select.on('change', egam.accessSelectEventHandler);
          }
        }

        function addSelectEventHandler(select) {
          if (select.length > 0) {
            select.off('change');
            select.on('change', function() {
              var val = $.fn.dataTable.util.escapeRegex(
                $(this).val()
              );
              column.search(val ? '^' + val + '$' : '', true, false)
                .draw();
            });

            if (select.length > 0 && select[0].options.length > 1) {
              return;
            }

            // If first item has data-search then have to map out data-search
            // data
            var att = column.nodes().to$()[0].attributes;
            if ('data-search' in att) {
              var selectData = {};
              column.nodes().each(function(node, index) {
                var data = node.attributes['data-search'].value;
                selectData[data] = data;
              });
              selectData = Object.keys(selectData);
              selectData.sort();
              selectData.forEach(function(data, index) {
                // Only add unique items to select in case already in there
                if (!select.find('option[value=\'' + data + '\']').length > 0) {
                  select.append('<option value="' + data + '">' + data +
                      '</option>');
                }
              });
            } else {
              // Simply just use data which is contents of cell
              column.data().unique().sort().each(function(data, index) {
                if (!select.find('option[value=\'' + data + '\']').length > 0) {
                  select.append('<option value="' + data + '">' + data +
                      '</option>');
                }
              });
            }
          }
        }

        var input = $(column.footer()).find('input.search');
        addInputEventHandler(input);
        input = $(column.header()).find('input.search');
        addInputEventHandler(input);

        function addInputEventHandler(input) {
          if (input.length > 0) {
            input.off('keyup change');
            input.on('keyup change', function() {
              if (column.search() !== this.value) {
                column.search(this.value)
                  .draw();
              }
            });
          }
        }
      });
      defer.resolve(this);
    },

  });
  return defer;
};

egam.runAllClientSideFilters = function() {
  egam.gpoItems.dataTable.api().columns().every(function() {
    var column = this;

    // Don't fire dropAccess handler because it will download again
    if (egam.communityUser.isSuperUser &&
        $(column.header()).hasClass('accessColumn')) {
      return true;
    }

    var headerSelect = $(column.header()).find('select.search');
    if (headerSelect.length > 0) {
      headerSelect.trigger('change');
    }
    var headerInput = $(column.header()).find('input.search');
    if (headerInput.length > 0) {
      headerInput.trigger('change');
    }
  });
};

egam.accessSelectEventHandler = function() {
  var val = $.fn.dataTable.util.escapeRegex(
    $(this).val()
  );
  var query = {};
  if (val) {
    query.access = val;
  }
  var authGroupValue = $('#dropAuthGroups').val();

  // So we know not all authgroups were downloaded and need to retrieve
  egam.gpoItems.allAuthGroupsDownloaded = true;
  if (authGroupValue) {
    var ownerIDs = egam.communityUser.ownerIDsByAuthGroup[authGroupValue];
    query.owner = {$in: ownerIDs};
    egam.gpoItems.allAuthGroupsDownloaded = false;
  }
  populateUserTables(query, {
    sort: {
      modified: -1,
    },
    fields: egam.gpoItems.resultFields,

  })
    .then(function() {
      // Hide the loading panel now after first page is loaded
      $('div#loadingMsg').addClass('hidden');
      $('div#overviewTable').removeClass('hidden');
      $('#loadingMsgCountContainer').addClass('hidden');

      // Now run any client side filters that were selected
      egam.runAllClientSideFilters();
      return true;
    })
    .fail(function(err) {
      console.error(err);
    });
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
      egam.gpoItems.dataTable.api().column('.ownerColumn')
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

egam.gpoItemModel = function(i, loading) {
  var self = this;
  this.loading = loading || false;

  // This is the doc
  var docTemp = ko.mapping.fromJS(i);
  this.doc = ko.observable(docTemp);

  // This is just a place to store current version of row before they hit save
  this.tableDoc =  i;

  this.complianceStatus = ko.computed(function() {
    return this.doc().AuditData.compliant() ? 'Pass' : 'Fail'
  }, this);

  // Computed thumbnail url
  this.tnURLs = ko.computed(function() {
    if (self.doc().thumbnail() == null) {
      return 'img/noImage.png';
    }

    // Else
    return 'https://epa.maps.arcgis.com/sharing/rest/content/items/' +
        self.doc().id() + '/info/' + self.doc().thumbnail() +
        '?token=' + egam.portalUser.credential.token;
  }, this);

  // Format Modified Date
  this.modDate = ko.computed(function() {
    var monthNames = [
      'Jan', 'Feb', 'Mar',
      'Apr', 'May', 'Jun', 'Jul',
      'Aug', 'Sep', 'Oct',
      'Nov', 'Dec',
    ];

    var dDate = new Date(self.doc().modified());

    return monthNames[dDate.getMonth()] + ' ' + dDate.getDate() + ', ' +
        dDate.getFullYear();
  }, this);

  this.epaKeywords = function() {
  };

  // Link to item in GPO
  this.gpoLink = ko.computed(function() {
    return 'https://epa.maps.arcgis.com/home/item.html?id=' + self.doc().id();
  }, this);

  // Doc of changed fields
  this.changeDoc = {};

  // Subscribes Setup
  this.updateFields = ['title',
    'snippet',
    'description',
    'licenseInfo',
    'accessInformation',
    'url',
  ];

  // Condensed this repetitive code
  $.each(this.updateFields,function(index,field) {
    self.doc()[field].subscribe(function(evt) {
      self.execAudit(field);
      self.addFieldChange(field, evt);
    }.bind(self));
  });

  // Could condense arrays later if
  this.doc().tags.subscribe(function(evt) {
    this.execAudit('tags');
    this.addFieldChange('tags', this.doc().tags());
  }.bind(this), null, 'arrayChange');

  // Add and field that has changed to the changeDoc
  this.addFieldChange = function(changeField, changeValue) {
    this.changeDoc['id'] = this.doc().id();
    this.changeDoc[changeField] = changeValue;
  };

  // Execute Audit on specified field in doc
  this.execAudit = function(auditField) {
    var unmappedDoc = ko.mapping.toJS(this.doc());
    var auditRes = new Audit();
    auditRes.validate(unmappedDoc, auditField);
    ko.mapping.fromJS(unmappedDoc, this.doc());
  };

  // Tags
  this.epaTagItemToAdd = ko.observable('');
  this.placeTagItemToAdd = ko.observable('');
  this.orgTagItemToAdd = ko.observable('');
  this.selectedItems = ko.observableArray(['']);

  // Add tag to tags array
  this.addEPAItem = function() {
    // Prevent blanks and duplicates
    if ((this.selected().epaTagItemToAdd() != '') && (this.selected
      ().doc().tags.indexOf(this.selected().epaTagItemToAdd()) < 0)) {
      this.selected().doc().tags.push(this.selected().epaTagItemToAdd());
    }

    // Clear the text box
    this.selected().epaTagItemToAdd('');
  };
  this.addPlaceItem = function() {
    // Prevent blanks and duplicates
    if ((this.selected().placeTagItemToAdd() != '') && (this.selected
        ().doc().tags.indexOf(this.selected().placeTagItemToAdd()) < 0)) {
      this.selected().doc().tags.push(this.selected().placeTagItemToAdd());
    }

    // Clear the text box
    this.selected().placeTagItemToAdd('');
  };
  this.addOrgItem = function() {
    // Prevent blanks and duplicates
    if ((this.selected().orgTagItemToAdd() != '') && (this.selected
        ().doc().tags.indexOf(this.selected().orgTagItemToAdd()) < 0)) {
      this.selected().doc().tags.push(this.selected().orgTagItemToAdd());
    }

    // Clear the text box
    this.selected().orgTagItemToAdd('');
  };

  // Remove tag from tags array
  this.removeSelected = function() {
    this.selected().doc().tags.removeAll(this.selected().selectedItems());

    // Clear selection
    this.selected().selectedItems([]);
  };

  this.loadReconciledFields = function() {
    var doctemp = ko.mapping.toJS(egam.gpoItems.tableModel.selected().doc());
    doctemp.title = $('#GPOtitle').val();
    doctemp.snippet = $('#GPOinputSnippet').val();
    doctemp.description = $('#GPOinputDesc').val();
    doctemp.licenseInfo = $('#GPOinputAccessUse').val();
    doctemp.accessInformation = $('#GPOinputAccessInfo').val();

    egam.gpoItems.tableModel.selected().doc(ko.mapping.fromJS(doctemp));
    $('#myModal').modal('show');
  };


  // Post updated docs back to Mongo
  this.update = function() {

    // Need to add thumbnail name to document before auditing
    var thumbnailFile = null;
    try {
      thumbnailFile = $('#thumbnail')[0].files[0];
    }catch (ex) {
    }
    if (!thumbnailFile) {
      console.log('No thumbnail to post');
    } else {
      // Add to to change doc
      i.thumbnail = 'thumbnail/' + thumbnailFile.name;
      self.addFieldChange('thumbnail', i.thumbnail);

      // Self.doc.thumbnail(i.thumbnail);
      // self.doc.thumbnail.valueHasMutated();
    }

    // Var thumbnail = $('#thumbnail')[0].files[0];
    // if (thumbnail && thumbnail.name)
    // unmappedDoc.thumbnail = "thumbnail/" + thumbnail.name;

    // Original Audit of full Doc
    var unmappedDoc = ko.mapping.toJS(this.selected().doc());

    var auditRes = new Audit();
    auditRes.validate(unmappedDoc, '');
    ko.mapping.fromJS(unmappedDoc, this.selected().doc());

    var mydata = new FormData();
    var updateDocsJSON = JSON.stringify(self.changeDoc);

    // Don't try to update if there is nothing to update
    if (updateDocsJSON == '{}' && !thumbnailFile) {
      return;
    }

    // ChangeDoc should be cleared for next time
    self.changeDoc = {};
    mydata.append('updateDocs', updateDocsJSON);
    mydata.append('thumbnail', thumbnailFile);

    $.ajax({
      url: 'gpoitems/update',
      type: 'POST',
      data: mydata,
      cache: false,
      dataType: 'json',

      // Don't process the files
      processData: false,

      // Set content type to false as jQuery will tell the server its a query
      // string request
      contentType: false,
      success: function(data, textStatus, jqXHR) {
        if (data.errors < 1) {
          // Success so call function to process the form
          console.log('success: ' + data);

          if (thumbnailFile !== undefined) {
            self.doc().thumbnail(i.thumbnail);
            self.doc().thumbnail.valueHasMutated();
          }

          // Refresh the data table so it can search updated info
          // egam.gpoItems.dataTable.destroy();
          egam.gpoItems.dataTable.fnDestroy();
          egam.renderGPOitemsDataTable();

          // Updating currrent doc
          egam.gpoItems.tableModel.selected().tableDoc = unmappedDoc;
        } else {
          // Handle errors here
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

  // Close button on modal click event
  this.closeModal = function() {
    // Alert("clicked");
    var tableDocObservable = ko.mapping.fromJS(this.selected().tableDoc);
    this.selected().doc(tableDocObservable);

    self.changeDoc = {};

    // Alert(JSON.stringify(self.changeDoc));
    // alert(JSON.stringify(this.selected().tableDoc));
  };

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

// Data here is the actual array of JSON documents that came back from the REST
// endpoint
egam.gpoItemTableModel = function(data) {
  var self = this;

  self.content = ko.observableArray(data.map(function(doc) {
    return new egam.gpoItemModel(doc);
  }));

  self.initializeTags = function() {
    // Get official EPA tags from gpoItemsTags.js
    $.ajax({
      url: 'gpoitems/availableTags',
      dataType: 'json',
      success: function(data, textStatus, jqXHR) {
        // EPA Keywords
        $('#epaTagSelect').append('<option></option>');
        $.each(data.epaKeywords, function(key, value) {
          $('#epaTagSelect')
              .append($('<option></option>')
                  .attr('value',value)
                  .text(value));
        });

        // Place Keywords
        $('#placeTagSelect').append('<option></option>');
        $.each(data.placeKeywords, function(key, value) {
          $('#placeTagSelect')
              .append($('<option></option>')
                  .attr('value',value)
                  .text(value));
        });

        // EPA Office Names (for filtering all organizations)
        $('#officeTagSelect').append('<option></option>');
        $.each(data.epaOrganizationNames, function(key, value) {
          $('#officeTagSelect')
              .append($('<option></option>')
                  .attr('value',key)
                  .text(key));
        });
      },
    });

    // Once EPA Office is selected, add sub-offices
    $('#officeTagSelect').change(function() {
      var $orgTagSelect = $('#orgTagSelect');

      // Match either national office acronym or regional office number
      var userAuthGroup = /\((.*)\)|EPA Region ([1-9]0?)/
          .exec(egam.communityUser.authGroups[0]);

      // Current dropdown value
      var office = $(this).val();
      if (office) {
        // Get official EPA tags from gpoItemsTags.js
        $.ajax({
          url: 'gpoitems/availableTags/epaOrganizationNames',
          dataType: 'json',
          success: function(data) {
            // Enable dropdown & button and empty
            $('#dropOrgTags').prop('disabled', false);
            $orgTagSelect.empty().append('<option></option>')
                .prop('disabled', false);

            // EPA Organization Names for the selected office
            $.each(data[office], function(key, value) {
              $orgTagSelect.append($('<option></option>')
                .attr('value', value)
                .text(value));
            });

            // If it's a regional office and the user has it as their primary
            // authoritative group, set the organization
            if (office = 'REG' && userAuthGroup && userAuthGroup[2]) {
              $orgTagSelect
                  .find('option[value="REG 0' + userAuthGroup[2] + '"]')
                  .prop('selected', true).change();
            }
          },
          error: function(request) {
            alert('Error loading EPA Organizational Tags: ' +
                request.statusText);
            console.log('Error loading EPA Organizational Tags: ' +
                request.statusText);
          },
        });
      } else {
        // If no office selected, check user's first auth group to see if it is
        // an EPA office
        if (userAuthGroup && userAuthGroup.length > 1) {
          var group;
          if (userAuthGroup[1]) {
            // For the national offices, just set the top-level office
            group = userAuthGroup[1];
          } else {
            // For the regional offices, can actually set the full name
            group = 'REG';
          }
          $(this).find('option[value="' + group + '"]')
              .prop('selected', true).change();
        } else {
          // If no matching office to auth group, disable dropdown & button
          $('#dropOrgTags').prop('disabled', true);
          $orgTagSelect.empty().prop('disabled', true);
        }
      }
    });
  };

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
      if (data.length > 0) {
        self.content.push(new egam.gpoItemModel(data[i], true));
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

  // Switch view for image upload
  $('.fileinput').on('change.bs.fileinput', function(e) {
    $('#agoThumb').toggle();
    $('#imageUpload').toggle();
  });

  // On modal close with out saving change thumbnail view clear thumbnail form
  $('#myModal').on('hidden.bs.modal', function(e) {
    var thumbnailFile = $('#thumbnail')[0].files[0];
    if (thumbnailFile !== undefined) {
      $('#agoThumb').toggle();
      $('#imageUpload').toggle();
      $('.fileinput').fileinput('clear');
    }
  });


  self.addPushAll = function(data) {
    // Use this so we know when everything is loaded
    var defer = $.Deferred();

    // This lets things work async style so that page is not locked up when ko
    // is mapping. Maybe use an async library later
    var interval = setInterval(function() {
      var array = data.map(function(i) {
        return new egam.gpoItemModel(i)
      });

      ko.utils.arrayPushAll(self.content, array);

      defer.resolve();
      clearInterval(interval);
    }, 0);

    return defer;
  };

  self.addPushRedefine = function(data) {
    // Use this so we know when everything is loaded
    var defer = $.Deferred();

    var array = $.extend([], self.content());

    // This lets thing work async style so that page is not locked up when ko
    // is mapping. Maybe use an async library later
    var i = 0;
    var interval = setInterval(function() {
      if (data.length > 0) {
        array.push(new egam.gpoItemModel(data[i], true));
      }
      i += 1;
      if (i >= data.length) {
        console.log('before setting' + array.length);
        setTimeout(function() {
          self.content(array);
        }, 0);
        defer.resolve();
        clearInterval(interval);
      }
    }, 0);

    return defer;
  };
};

