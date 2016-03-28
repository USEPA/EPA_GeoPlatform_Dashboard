//Expose dashboard especially helpful for debugging
var egam = {};
egam.gpoItems = {
  resultSet: [],
  tableModel: null,
  dataTable: null
};

egam.edgItems = {
  resultSet: [],
  tableModel: null,
  dataTable: null
};

$(document).ready(function () {

  $(document).on('click', '.nav li', function (e) {
    $(".nav-sidebar li").removeClass("active");
    $(this).addClass("active");
    var view = $(this).find(":first").attr("id");
    $('#' + view + 'View').collapse('show');
    $('.view').not(document.getElementById(view)).collapse('hide');
    //console.log("Sidebar click: " + e);
    if (e.target.hash == "#edgView") {
      egam.edginit();
    }
  });

  //Click event for Help Modal
  $('#egamHelp').on('click', function(e){
    $('#helpModal').modal('show');
  });

  //Add tooltips
  var options = {delay: { "show": 500, "hide": 100 }};
  $('[data-toggle="tooltip"]').tooltip(options);

  ko.bindingHandlers['wysiwyg'].defaults = {
    'plugins': [ 'link textcolor colorpicker' ],
    'toolbar': 'bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | numlist' +
    ' bullist indent outdent | link image | undo redo | fontsizeselect ',
    'menubar': false,
    'statusbar': false,
    'toolbar_items_size' : 'small',
    'body_class': 'form-group has-success form-control'
  };

  $('#environmentTable').DataTable( {
    data: GPHEdata,
    columns: [
      { title: "Folder" },
      { title: "Service Name" },
      { title: "Service Type" },
      { title: "Service Description" }
    ]
  } );
});


egam.edginit = function() {
  //setting up the new tableModel instance with no rows yet
  egam.edgItems.tableModel = new egam.edgItemTableModel([]);
  // get data from edg
  $.getJSON("https://edg.epa.gov/metadata/rest/find/document?f=dcat&max=2500&callback=?", function(data) {
    // bind the data
    ko.applyBindings(new egam.edgItemModel(data), document.getElementById('edgViewViewTable'));
    // apply DataTables magic
    egam.renderEDGitemsDataTable()
        .then(function (dt) {
          egam.edgItems.dataTable = dt;
          defer.resolve()
        });
  });

}

function populateUserMngntTable(){
  alert("Populate User Table");
  var queryUM = {}; //{isExternal:true};
  $.post('gpousers/list', {
    query: queryUM
  }, function(data){
    //alert(data);

    $.fn.dataTable.ext.buttons.alert = {
      className: 'buttons-alert',
      action: function ( e, dt, node, config ) {
        alert( this.text() );
      }
    };

    userManagementTable = $('#userMgmtTable').DataTable( {
      dom: 'Bfrtip',
      buttons: [
        {
          extend:'alert',
          text: 'All Users'
        },
        {
          extend:'alert',
          text: 'Sponsored'
        },
        {
          extend:'alert',
          text: 'Unsponsored'
        }
      ],
      "order": [
        [0, "desc"]
      ]
    });

    var viewModel2 = function(u){
      this.uData = ko.mapping.fromJS(u);
    };

    var viewModel = function(usersDoc){
      this.users = ko.observableArray(usersDoc.map(function (doc){
        return new viewModel2(doc);
      }));
      //this.uDoc = ko.mapping.fromJS(usersDoc);
      //this.other = ko.mapping.toJS(this.uDoc);
      //data.map(function (doc) {
      //  return new egam.edgItemModel(doc);
      //}
      alert("this not work");
    };

    alert(data);

    ko.applyBindings(new viewModel(JSON.parse(data)), document.getElementById("userMgmtView"));
  });
}

//Populate table for GPO User's Items View
//Projection in Mongo/Monk is what fields you want to return and sorting, offsetting, etc.
function populateUserTables(query, projection) {
  query = JSON.stringify(query);
  projection = JSON.stringify(projection);

  //Use this so we know when everything is loaded
  var defer = $.Deferred();

  //Do a post because some long query strings were breaking staging server reverse proxy
  //hit our Express endpoint to get the list of items for this logged in user
  $.post('gpoitems/list', {
    query: query,
    projection: projection
  }, function (data) {
    egam.gpoItems.resultSet = data;
    //If paging then data.results is array of data
    var dataResults = data;
    if ("results" in data) dataResults = data.results;

    $("#loadingMsgCountContainer").removeClass("hidden");
    $("#loadingMsgCount").text(0);
    $("#loadingMsgTotalCount").text(dataResults.length);

    //Show the loading message and count. Hide the table.
    $('div#loadingMsg').removeClass('hidden');
    $('div#overviewTable').addClass('hidden');

    //If first time ever binding to table, need to apply binding, but can only bind once so don't bind again if
    //reloading table
    var needToApplyBindings = false;

    if (egam.gpoItems.tableModel) {
      //only occurs if reloading the whole table
      //have to actually remove dataTable rows and destroy datatable in order to get knockout to rebind table
      if (egam.gpoItems.dataTable) {
        egam.gpoItems.dataTable.api().clear().draw();
        if ("fnDestroy" in egam.gpoItems.dataTable) egam.gpoItems.dataTable.fnDestroy();
      }
      egam.gpoItems.tableModel.content.removeAll();
      console.log("Wiped out table model and data table: " + egam.gpoItems.tableModel.content().length);
    } else {
      //setting up the new tableModel instance with no rows yet
      egam.gpoItems.tableModel = new egam.gpoItemTableModel([]);
      needToApplyBindings = true;
    }

    //Add these using .add because it should be async and lock up UI less
    //dataResults is just an array of objects
    egam.gpoItems.tableModel.add(dataResults, updateLoadingCountMessage)
      .then(function () {
        //If there are no rows then don't try to bind
        if (dataResults.length < 1) return defer.resolve();
        //cluge to make row model work because it is trying to bind rowmodel.selected()
        egam.gpoItems.tableModel.selectIndex(0);
        if (needToApplyBindings) ko.applyBindings(egam.gpoItems.tableModel, document.getElementById('overviewView'));

        setTimeout(function () {
          if (egam.gpoItems.dataTable && "fnDestroy" in egam.gpoItems.dataTable)
            egam.gpoItems.dataTable.fnDestroy();
          egam.renderGPOitemsDataTable()
            .then(function (dt) {
              egam.gpoItems.dataTable = dt;
              defer.resolve()
            });
        }, 0);
      });


    function updateLoadingCountMessage(index) {
      //Only show every 10
      if (index % 10 === 0) $("#loadingMsgCount").text(index + 1);
    }

    calcItemsPassingAudit(dataResults);

  },'json');
  return defer;
}

function calcItemsPassingAudit(dataResults) {
  //get percent of docs passing the Audit
  var passing = 0;
  dataResults.forEach(function (result, index) {
    var i = result.AuditData.compliant;
    if (i) {
      passing++;
    }
  });
  var percentPassing = Math.round((passing / dataResults.length) * 100);
  $('#percPublicPassingAudit').text(percentPassing + "% Passing");
}

egam.renderEDGitemsDataTable = function () {
  //apply data table magic, ordered ascending by title
  //Use this so we know when table is rendered
  var defer = $.Deferred();

  $('#edgitemtable').DataTable({
    //"order": [
    //  [0, "desc"]
    //],
  });
  return defer;
};


egam.renderGPOitemsDataTable = function () {
  //apply data table magic, ordered ascending by title
  //Use this so we know when table is rendered
  var defer = $.Deferred();

  $('#gpoitemtable1').DataTable({
    "order": [
      [0, "desc"]
    ],

    initComplete: function () {
      defer.resolve(this);
      $("#gpoitemtable1").addClass("loaded");
      this.api().columns().every(function () {

        var column = this;
        var headerSelect = $(column.header()).find("select.search");
        var footerSelect = $(column.footer()).find("select.search");

        //This is the special case for access column that we only want one access at a time
        if (egam.communityUser.isSuperUser && $(column.header()).hasClass
          ("accessColumn")) {
          addAccessSelectEventHandler(headerSelect);
        } else {
          addSelectEventHandler(headerSelect);
        }
        if (egam.communityUser.isSuperUser && $(column.footer()).hasClass
          ("accessColumn")) {
          addAccessSelectEventHandler(footerSelect);
        } else {
          addSelectEventHandler(footerSelect);
        }

        function addAccessSelectEventHandler(select) {
          if (select.length > 0) {
            //needed to remove the on change event or else multiple event handlers were being added
            select.off('change');
            select.on('change', egam.accessSelectEventHandler);
          }
        }

        function addSelectEventHandler(select) {
          if (select.length > 0) {
            select.off('change');
            select.on('change', function () {
              var val = $.fn.dataTable.util.escapeRegex(
                $(this).val()
              );
              column.search(val ? '^' + val + '$' : '', true, false)
                .draw();
            });

            if (select.length > 0 && select[0].options.length > 1) return;
            //If first item has data-search then have to map out data-search data
            var att = column.nodes().to$()[0].attributes;
            if ("data-search" in att) {
              var selectData = {};
              column.nodes().each(function (node, index) {
                var data = node.attributes["data-search"].value;
                selectData[data] = data;
              });
              selectData = Object.keys(selectData);
              selectData.sort();
              selectData.forEach(function (data, index) {
                //Only add unique items to select in case already in there
                if (!select.find("option[value='" + data + "']").length > 0) {
                  select.append('<option value="' + data + '">' + data + '</option>')
                }
              });
            } else {
              //Simply just use data which is contents of cell
              column.data().unique().sort().each(function (data, index) {
                if (!select.find("option[value='" + data + "']").length > 0) {
                  select.append('<option value="' + data + '">' + data + '</option>')
                }
              });
            }
          }
        }

        var input = $(column.footer()).find("input.search");
        addInputEventHandler(input);
        input = $(column.header()).find("input.search");
        addInputEventHandler(input);

        function addInputEventHandler(input) {
          if (input.length > 0) {
            input.off('keyup change');
            input.on('keyup change', function () {
              if (column.search() !== this.value) {
                column.search(this.value)
                  .draw();
              }
            });
          }
        }
      });
      defer.resolve(this);
    }

  });
  return defer;
};

egam.runAllClientSideFilters = function () {
  egam.gpoItems.dataTable.api().columns().every(function () {
    var column = this;
    //Don't fire dropAccess handler because it will download again
    if (egam.communityUser.isSuperUser && $(column.header()).hasClass
      ("accessColumn")) return true;

    var headerSelect = $(column.header()).find("select.search");
    if (headerSelect.length > 0) headerSelect.trigger("change");
    var headerInput = $(column.header()).find("input.search");
    if (headerInput.length > 0) headerInput.trigger("change");
  });
};

egam.accessSelectEventHandler = function () {
  var val = $.fn.dataTable.util.escapeRegex(
    $(this).val()
  );
  var query = {};
  if (val) query.access = val;
  var authGroupValue = $("#dropAuthGroups").val();
  //So we know not all authgroups were downloaded and need to retrieve
  egam.gpoItems.allAuthGroupsDownloaded = true;
  if (authGroupValue) {
    var ownerIDs = egam.communityUser.ownerIDsByAuthGroup[authGroupValue];
    query.owner = {$in: ownerIDs};
    egam.gpoItems.allAuthGroupsDownloaded = false;
  }
  populateUserTables(query, {
    sort: {
      modified: -1
    },
    fields: egam.gpoItems.resultFields

  })
    .then(function () {
      // Hide the loading panel now after first page is loaded
      $('div#loadingMsg').addClass('hidden');
      $('div#overviewTable').removeClass('hidden');
      $("#loadingMsgCountContainer").addClass('hidden');
      //Now run any client side filters that were selected
      egam.runAllClientSideFilters();
      return true;
    })
    .fail(function (err) {
      console.error(err);
    });
};


egam.setAuthGroupsDropdown = function (ownerIDsByAuthGroup) {
  var dropAuthGroups = $("#dropAuthGroups");
  dropAuthGroups.on("change", function () {
    //If the only downloaded some authGroups then download again instead of client side filtering
    if (egam.gpoItems.allAuthGroupsDownloaded === false) {
      // Call accessSelectEventHandler in proper context of dropAccess
      egam.accessSelectEventHandler.apply($("#dropAccess"), []);
    } else {
      var reOwnerIDs = "";
      if (this.value) {
        var ownerIDs = ownerIDsByAuthGroup[this.value];
        reOwnerIDs = ownerIDs.join("|");
      }
      egam.gpoItems.dataTable.api().column(".ownerColumn")
        .search(reOwnerIDs, true, false)
        //      .search(this.value,true,false)
        .draw();
    }
    //Also set the download link
    var authgroup = this.value;
    if (authgroup) {
      $('#downloadAuthgroupsCSVall').addClass('hidden');
      $('#downloadAuthgroupsCSVregions').removeClass('hidden');
      var href = $('#downloadAuthgroupsCSVregions').attr("href");
      //tack on authgroup to the end of the route to get csv. Note: use ^ and $ to get exact match because it matches regex(Region 1 and 10 would be same if not)
      //Also we are using authGroup by name so need to escape ( and ) which is offices like (OAR)
      var escapeAuthGroup = authgroup.replace(/\(/g, "%5C(").replace(/\)/g, "%5C)");
      href = href.substring(0, href.lastIndexOf("/") + 1) + "^" + escapeAuthGroup + "$";
      $('#downloadAuthgroupsCSVregions').attr("href", href);
    } else {
      $('#downloadAuthgroupsCSVall').removeClass('hidden');
      $('#downloadAuthgroupsCSVregions').addClass('hidden');
    }
  });
  var authGroups = Object.keys(ownerIDsByAuthGroup);
  authGroups.sort();

  dropAuthGroups[0].options.length = 0;

  if (authGroups.length > 1) dropAuthGroups.append($("<option>", {value: ""}).text("All"));

  $.each(authGroups, function (index, authGroup) {
//  $.each(ownerIDsByAuthGroup,function (authGroup,ownerIDs) {
//    var reOwnerIDs = ownerIDs.join("|");
//    dropAuthGroups.append($('<option>', { value : reOwnerIDs }).text(authGroup));
    dropAuthGroups.append($("<option>", {value: authGroup}).text(authGroup));
  });
};

egam.edgItemModel = function (data) {
  var self = this;
  // knockout mapping JSON data to view model
  ko.mapping.fromJS(data, {}, self);
}

egam.gpoItemModel = function (i, loading) {
  var self = this;
  this.loading = loading || false;
  //This is the doc
  this.doc = ko.mapping.fromJS(i);

  this.complianceStatus = ko.computed(function () {
    return this.doc.AuditData.compliant() ? 'Pass' : 'Fail'
  }, this);

  //computed thumbnail url
  this.tnURLs = ko.computed(function () {
    if(self.doc.thumbnail() == null){
      return "img/noImage.png";
    }else{
      return "https://epa.maps.arcgis.com/sharing/rest/content/items/" + self.doc.id() + "/info/" + self.doc.thumbnail() + "?token=" + egam.portalUser.credential.token;
    }
  }, this);
  //Format Modified Date
  this.modDate = ko.computed(function(){
    var monthNames = [
      "Jan", "Feb", "Mar",
      "Apr", "May", "Jun", "Jul",
      "Aug", "Sep", "Oct",
      "Nov", "Dec"
    ];

    var dDate = new Date(self.doc.modified());
    var formattedDate = monthNames[dDate.getMonth()] + " " + dDate.getDate() +", " + dDate.getFullYear();

    return formattedDate;
  }, this);
  //Link to item in GPO
  this.gpoLink = ko.computed(function(){
    return "http://epa.maps.arcgis.com/home/item.html?id=" + self.doc.id();
  }, this);

  //Doc of changed fields
  this.changeDoc = {};

  //Subscribes Setup
  this.doc.title.subscribe(function (evt) {
    this.execAudit("title");
    this.addFieldChange("title", evt);
  }.bind(this));

  this.doc.snippet.subscribe(function (evt) {
    this.execAudit("snippet");
    this.addFieldChange("snippet", evt);
  }.bind(this));

  this.doc.description.subscribe(function (evt) {
    this.execAudit("description");
    this.addFieldChange("description", evt);
  }.bind(this));

  /* this is actually Access and Use Constraints */
  this.doc.licenseInfo.subscribe(function (evt) {
    this.execAudit("licenseInfo");
    this.addFieldChange("licenseInfo", evt);
  }.bind(this));

  /* this is actually credits */
  this.doc.accessInformation.subscribe(function (evt) {
    this.execAudit("accessInformation");
    this.addFieldChange("accessInformation", evt);
  }.bind(this));

  this.doc.url.subscribe(function (evt) {
    this.execAudit("url");
    this.addFieldChange("url", evt);
  }.bind(this));

  this.doc.tags.subscribe(function (evt) {
    this.execAudit("tags");
    this.addFieldChange("tags", this.doc.tags());
  }.bind(this), null, 'arrayChange');

  //Add and field that has changed to the changeDoc
  this.addFieldChange = function (changeField, changeValue) {
    this.changeDoc["id"] = this.doc.id();
    this.changeDoc[changeField] = changeValue;
  };

  //Execute Audit on specified field in doc
  this.execAudit = function (auditField) {
    var unmappedDoc = ko.mapping.toJS(this.doc);
    var auditRes = new Audit();
    auditRes.validate(unmappedDoc, auditField);
    ko.mapping.fromJS(unmappedDoc, this.doc);
  };

  //tags
  this.tagItemToAdd = ko.observable("");
  this.selectedItems = ko.observableArray([""]);
  //Add tag to tags array
  this.addItem = function () {
    if ((this.selected().tagItemToAdd() != "") && (this.selected
      ().doc.tags.indexOf(this.selected().tagItemToAdd()) < 0)) // Prevent blanks and duplicates
      this.selected().doc.tags.push(this.selected().tagItemToAdd());
    this.selected().tagItemToAdd(""); // Clear the text box
  };
  //Remove tag from tags array
  this.removeSelected = function () {
    this.selected().doc.tags.removeAll(this.selected().selectedItems());
    this.selected().selectedItems([]); // Clear selection
  };

  //Post updated docs back to Mongo
  this.postback = function () {

    //need to add thumbnail name to document before auditing
    var thumbnailFile = null;
    try {
      thumbnailFile = $('#thumbnail')[0].files[0];
    }catch (ex) {
    }
    if (! thumbnailFile) {
      console.log('No thumbnail to post');
    } else {
      //Add to to change doc
      i.thumbnail = "thumbnail/" + thumbnailFile.name;
      this.selected().addFieldChange("thumbnail", i.thumbnail);
      //self.doc.thumbnail(i.thumbnail);
      //self.doc.thumbnail.valueHasMutated();
    }
    //var thumbnail = $('#thumbnail')[0].files[0];
    //if (thumbnail && thumbnail.name) unmappedDoc.thumbnail = "thumbnail/" + thumbnail.name;

    //Original Audit of full Doc
    var unmappedDoc = ko.mapping.toJS(this.selected().doc);

    var auditRes = new Audit();
    auditRes.validate(unmappedDoc, "");
    ko.mapping.fromJS(unmappedDoc, this.selected().doc);

    var mydata = new FormData();
    mydata.append("updateDocs", JSON.stringify(this.selected().changeDoc));
    mydata.append("thumbnail", thumbnailFile);
    $.ajax({
      url: 'gpoitems/update',
      type: 'POST',
      data: mydata,
      cache: false,
      dataType: 'json',
      processData: false, // Don't process the files
      contentType: false, // Set content type to false as jQuery will tell the server its a query string request
      success: function (data, textStatus, jqXHR) {
        if (data.errors.length < 1)
        {
          // Success so call function to process the form
          console.log('success: ' + data);

          if (thumbnailFile !== undefined) {
            self.doc.thumbnail(i.thumbnail);
            self.doc.thumbnail.valueHasMutated();
          }

          //refresh the data table so it can search updated info
          //              egam.gpoItems.dataTable.destroy();
          egam.gpoItems.dataTable.fnDestroy();
          egam.renderGPOitemsDataTable();
        }
        else
        {
          // Handle errors here
          console.log('ERRORS: ' + data);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        // Handle errors here
        console.log('ERRORS: ' + textStatus);
        // STOP LOADING SPINNER
      }
    });

    console.log("Post back updated Items");
  };
};


//data here is the actual array of edg JSON documents that came back from the REST endpoint
egam.edgItemTableModel = function (data) {
  var self = this;

  self.content = ko.observableArray(data.map(function (doc) {
    return new egam.edgItemModel(doc);
  }));

  //on the entire table, we need to know which item is selected to use later with modal, etc.
  self.select = function (item) {
    self.selected(item);
  };

  //allows you to select an item based on index, usually index will be coming from row number
  self.selectIndex = function (index) {
    var selectedItem = self.content()[index];
    self.selected(selectedItem);
  };

  //a new observable for the selected row
  self.selected = ko.observable();

  if (self.content().length > 0) {
    //automatically select the 1st item in the table
    //no idea why we are doing this?
    self.selected = ko.observable(self.content()[0]);
  }

  self.clear = function () {
    self.content().length = 0;
  };
}

//data here is the actual array of JSON documents that came back from the REST endpoint
egam.gpoItemTableModel = function (data) {
  var self = this;

  self.content = ko.observableArray(data.map(function (doc) {
    return new egam.gpoItemModel(doc);
  }));

  //on the entire table, we need to know which item is selected to use later with modal, etc.
  self.select = function (item) {
    self.selected(item);
  };

  //allows you to select an item based on index, usually index will be coming from row number
  self.selectIndex = function (index) {
    var selectedItem = self.content()[index];
    self.selected(selectedItem);
  };

  //a new observable for the selected row
  self.selected = ko.observable();

  if (self.content().length > 0) {
    //automatically select the 1st item in the table
    //no idea why we are doing this?
    self.selected = ko.observable(self.content()[0]);
  }

  self.clear = function () {
    self.content().length = 0;
  };

  //data is an array of documents from the REST endpoint
  self.add = function (data, callback) {
    //Use this so we know when everything is loaded
    var defer = $.Deferred();

    //This lets things work async style so that page is not locked up when ko is mapping
    //Maybe use an async library later
    var i = 0;
    var interval = setInterval(function () {
      if (data.length > 0) {
        self.content.push(new egam.gpoItemModel(data[i], true));
        if (callback) callback(i);
      }
      i += 1;
      if (i >= data.length) {
        defer.resolve();
        clearInterval(interval);
      }
    }, 0);

    return defer;
  };

  //switch view for image upload
  $('.fileinput').on('change.bs.fileinput', function (e) {
    $('#agoThumb').toggle();
    $('#imageUpload').toggle();
  });
  //On modal close with out saving change thumbnail view clear thumbnail form
  $('#myModal').on('hidden.bs.modal', function (e) {
    var thumbnailFile = $('#thumbnail')[0].files[0];
    if (thumbnailFile !== undefined) {
      $('#agoThumb').toggle();
      $('#imageUpload').toggle();
      $('.fileinput').fileinput('clear');
    }
  });


  self.addPushAll = function (data) {
    //Use this so we know when everything is loaded
    var defer = $.Deferred();

    //This lets things work async style so that page is not locked up when ko is mapping
    //Maybe use an async library later
    var interval = setInterval(function () {
      var array = data.map(function (i) {
        return new egam.gpoItemModel(i)
      });

      ko.utils.arrayPushAll(self.content, array);

      defer.resolve();
      clearInterval(interval);
    }, 0);

    return defer;
  };

  self.addPushRedefine = function (data) {
    //Use this so we know when everything is loaded
    var defer = $.Deferred();

    var array = $.extend([], self.content());

    //This lets thing work async style so that page is not locked up when ko is mapping
    //Maybe use an async library later
    var i = 0;
    var interval = setInterval(function () {
      if (data.length > 0) {
        array.push(new egam.gpoItemModel(data[i], true));
      }
      i += 1;
      if (i >= data.length) {
        console.log("before setting" + array.length);
        setTimeout(function () {
          self.content(array);
        }, 0);
        defer.resolve();
        clearInterval(interval);
      }
    }, 0);

    return defer;
  };
};







//generated from python script for now
//this is gispub only for now
var GPHEdata =
  [['AgSTAR', 'EPA_AgSTAR_AD_Projects', 'MapServer', 'Anaerobic digester systems can be installed successfully at operations that collect manure as a liquid, slurry, or semi-solid. Existing farms use a variety of different types of digester designs and energy use technologies. As of January 2014, AgSTAR estimates that there are approximately 239 anaerobic digester systems operating at commercial livestock farms in the United States. Projects that are under construction or have been previously shut down are also shown.  Details about projects can be reviewed by clicking on a map symbol. In-depth profiles are available for select projects.  These data were compiled by the AgSTAR program from a variety of sources and AgSTAR cannot guarantee the accuracy of these data. AgSTAR encourages farm operators, project developers, financers, and others involved in the development of farm digester projects to provide updates and corrections to these data by contacting AgSTAR.'], ['AgSTAR', 'EPA_AgSTAR_LMOP', 'MapServer', 'Hundreds of landfill gas (LFG) energy projects currently operate in the United States. Projects involve public and private organizations, small and large landfills, and various types of technology. Creative uses of LFG include heating greenhouses, producing electricity and heat in cogeneration applications, firing brick kilns, supplying high Btu pipeline quality gas, fueling garbage trucks, and providing fuel to chemical and automobile manufacturing. Projects range from small scale community driven initiatives to multi million dollar private investments. Data for operational LFG projects were compiled from a database managed by the EPAs Landfill Methane Outreach Program.'], ['AgSTAR', 'EPA_AgSTAR_MarketOps_2011', 'MapServer', 'Biogas recovery systems at livestock operations can be a cost effective source of clean, renewable energy that reduces greenhouse gas emissions. Because of its high energy content, biogas can be collected from manure and burned to supply on farm energy needs for electricity or heating. With growing interest in clean, renewable energy, many opportunities exist for farmers to market the biogas collected from anaerobic digestion systems. Experience has shown that the profitability of biogas systems depends on the size of the operation, the method of manure management, and local energy costs. The results of AgSTARs Market Opportunities Report June 2010 are used to represent the number of candidate farms and biogas energy generation potential by state for swine and dairy operations.'], ['AgSTAR', 'EPA_AgSTAR_Related_Orgs', 'MapServer', 'AgSTARs Partner program supports stronger relationships with our state and non governmental allies. Through the Partner program, AgSTAR collaborates with state agencies, agricultural extension offices, universities, and other state wide non governmental organizations to promote the planning, deployment, and long term success of anaerobic digester projects. AgSTAR Partners receive technical, marketing, and networking assistance in return for their commitment to help identify and overcome barriers for anaerobic digester projects, share information, and provide education and outreach to farms in their area. Colleges and universities across the country are helping to ensure anaerobic digester systems continue to progress to become more efficient and economical. Their research includes pilot studies, evaluations, and technical assistance.'], ['AgSTAR', 'EPA_Composting', 'MapServer', 'Composting facilities divert organic wastes away from traditional landfills. This map provides details for operating and pilot composting facilities across the United States, including the annual tonnage and number of households served by each. Facilities are organized by the types of waste being received.  Data were compiled by EPA staff in EPA Region 9 conjunction with the development of a pilot mapping tool.'], ['AgSTAR', 'EPA_DSIRE_Incentives_State', 'MapServer', 'This map provides summaries of incentives and policies established by the federal government, state governments and U.S. territories, local governments, and larger electric and gas utilities in the United States. Incentives and policies that support renewables include financial Incentives (tax incentives, grants, loans, rebates, industry recruitment/support, performance based incentives, green building incentives, etc.) and rules, regulations and policies (public benefits funds, renewable portfolio standards, net metering, interconnection standards, solar/wind access policies, contractor licensing, equipment certification, solar/wind permitting standards, building energy codes, energy standards for public buildings, etc.).'], ['AgSTAR', 'EPA_DSIRE_RPS_State', 'MapServer', 'A Renewable Portfolio Standard (RPS) provides states with a mechanism to increase renewable energy generation using a cost effective, market based approach that is administratively efficient. An RPS requires electric utilities and other retail electric providers to supply a specified minimum amount of customer load with electricity from eligible renewable energy sources. The goal of an RPS is to stimulate market and technology development so that, ultimately, renewable energy will be economically competitive with conventional forms of electric power. States may specify the types of energy that qualify for the RPS, such as biomass, wind, CSP, distributed photovoltaic, centralized photovoltaic, hydro, geothermal, landfill gas, and ocean.'], ['AgSTAR', 'EPA_MethaneEmmisons_State', 'MapServer', 'The U.S. EPA (EPA) develops the Inventory of U.S. Greenhouse Gas Emissions and Sinks (Inventory) to track annual U.S. emissions and removals by source, economic sector, and greenhouse gas going back to 1990.  EPA uses national energy data, data on national agricultural activities, and other national statistics to provide a comprehensive accounting of total greenhouse gas emissions for all man made sources in the United States. This map presents state-level summaries from the Inventory of U.S. Greenhouse Gas Emissions and Sinks:  1990-2011 for livestock operations, including beef, dairy, poultry, swine, sheep, goats, horses, mules and asses, and bison.'], ['AgSTAR', 'EPA_WWTP', 'MapServer', 'There are thousands of wastewater treatment facilities in the United States.  Many of those facilities operate anaerobic digestion systems to generate energy from biogas and to control emissions of greenhouse gases. Biogas flow from these digesters can be used as fuel to generate reliable electricity and heat for the facility. Details about the types of anaerobic digestion systems that are available from this map were compiled by EPA staff in EPA Region 9 conjunction with the development of a pilot mapping tool.'], ['AgSTAR', 'USDA_Investments_Energy_Type', 'MapServer', 'The map contains information regarding USDA programs that provide assistance to renewable energy and energy efficiency projects. Energy investments are categorized by energy type, including anaerobic digester, energy efficiency, geothermal, hydroelectric, hydrogen, renewable biomass, solar, and wind. Investments are also shown by funding program.'], ['AgSTAR', 'USDA_Investments_EnergyType_State', 'MapServer', 'The map contains information regarding USDA programs that provide assistance to renewable energy and energy efficiency projects. The energy investment data is summarized by state. '], ['AgSTAR', 'USDA_Investments_Funding_Program', 'MapServer', 'The map contains information regarding USDA programs that provide assistance to renewable energy and energy efficiency projects. Energy investments are categorized by energy type, including anaerobic digester, energy efficiency, geothermal, hydroelectric, hydrogen, renewable biomass, solar, and wind. Investments are also shown by funding program.'], ['AgSTAR', 'USDA_MarketPotential', 'MapServer', 'There is great potential to use anaerobic digestion systems to generate renewable energy from livestock operations in the United States.  In 2010, the AgSTAR program estimated that biogas recovery systems at these facilities have the potential to collectively generate more than 13 million megawatt hours (MWh) per year and displace about 1,670 megawatts (MW) of fossil fuel fired generation. Recent and evolving improvements in anaerobic digestion technologies and project approaches increase the feasibility of building anaerobic digestion systems to serve farm and community scale needs.  This map presents state and county level data for the number of livestock operations and the number of animals for cattle, chickens, and hogs.  The data are compiled from the USDA 2007 Census of Agriculture.'], ['AgSTAR', 'WBJ_Waste_Facilities', 'MapServer', 'Locations and other details are provided for nearly 9,000 waste facilities are available from this map.  Data were provided by the Waste Business Journal, which tracks and maintains business information about a variety of waste processing and disposal operations.  Details for each facility, categorized into 10 types of facilities, include the types of wastes or materials that are accepted, volume of primary waste, cost per ton, tipping fees, and remaining capacity. '], ['CDX_Demo', 'FRS_Subfac_Examples', 'MapServer', 'CDX Demo'], ['CDX_Demo', 'Samples_by_analyte', 'MapServer', 'Samples by analyte'], ['CDX_Demo', 'Samples_by_medium', 'MapServer', 'Samples by medium'], ['NELP', 'LakesPonds', 'MapServer', ''], ['NPDAT', 'NPDATA', 'MapServer', 'Nitrogen and Phosphorus Pollutant data layers for http://gispub2.epa.gov/NPDAT'], ['NPDAT', 'SDWIS', 'MapServer', ''], ['NPDAT', 'SPARROW_MRB_N', 'MapServer', 'SPARROW model results used in http://gispub2.epa.gov/NPDAT \n'], ['NPDAT', 'SPARROW_MRB_P', 'MapServer', 'SPARROW model results used in http://gispub2.epa.gov/NPDAT \n'], ['NPDAT', 'SPARROW', 'MapServer', 'SPARROW model results used in http://gispub2.epa.gov/NPDAT'], ['OA', 'SLD_Trans30', 'MapServer', '<A  href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B781BDD8F-2BF4-4072-86E9-FA67BC6C5E8B%7D">Full Metadata</A>\nThis map summarizes the total number of jobs that can be reached within a 30-minute public transit ride for census block groups across the U.S. Coverage is limited to areas of the U.S. served by transit agencies who share their service data in GTFS format. See http://epa.gov/smartgrowth/smartlocationdatabase.htm for more details.'], ['OA', 'SLD_Trans45', 'MapServer', '<A  href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B09649C32-7B39-4690-BFFB-88B250F6DF1B%7D">Full Metadata</A>\nThese map layers summarize accessibility to jobs via transit and workplace accessibility via transit for census block groups across the U.S. Coverage is limited to areas of the U.S. served by transit agencies who share their service data in GTFS format. See http://epa.gov/smartgrowth/smartlocationdatabase.htm for more details.'], ['OA', 'SmartLocationDatabase', 'MapServer', '<A href= "https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BBCE98875-BED3-4911-8BEA-32220B3E15E7%7D">Full Metadata</A>\nThis service provides a sample of variables from EPA\'s Smart Location Database (SLD), a consolidated geographic data resource for measuring location efficiency. The SLD includes over 90 different variables characterizing the built environment, accessibility to destinations, employment, and demographics for every census block group in the United States. Data reflects conditions in 2010 unless otherwise noted. See <A href= "http://epa.gov/smartgrowth/smartlocationdatabase.htm"> http://epa.gov/smartgrowth/smartlocationdatabase.htm</A>for more information.'], ['OAR', 'USEPA_NEI_2005', 'MapServer', '<a id="{3A6EEF8C-B7DC-416C-A759-93344436BC4B}" href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B3A6EEF8C-B7DC-416C-A759-93344436BC4B%7D">Full Metadata</a> This map service displays 2005 USEPA National Emissions Inventory (NEI) point facility information for the United States. The map service was created for inclusion in the USEPA Community/Tribal-Focused Exposure and Risk Screening Tool (C/T-FERST) mapping application (http://cfpub.epa.gov/cferst/index.cfm) and displays several NEI pollutants (Acetaldehyde, Acrolein, Arsenic, Benzene, 1,3-Butadiene, Chromium, Formaldehyde, Lead, Naphthalene, and PAH). The NEI is a comprehensive inventory of air emissions of both criteria air pollutants (CAPs) and hazardous air pollutants (HAPs) from all air emission sources for the United States. The NEI is prepared every three years by the USEPA based primarily on emission estimates and emission model inputs provided by state, local, and tribal air agencies for sources in their jurisdictions and supplemented by data developed by the USEPA. For more information about the 2005 NEI data, go to: http://www.epa.gov/ttn/chief/net/2005inventory.html OR http://www.epa.gov/ttn/chief/net/2005_nei_point.pdf.'], ['OAR_OAP', 'GrowingSeasonLength', 'MapServer', 'This indicator looks at the impact of temperature on the length of the growing season in the contiguous 48 states, as well as trends in the timing of spring and fall frosts. For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'HeatingCoolingDegreeDays', 'MapServer', 'This indicator shows how heating and cooling degree days have changed by state, based on a comparison of the first 60 years of available data (1895\xe2\x80\x931954) with the most recent 60 years (1955\xe2\x80\x932014). For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'HighLowTemperatures', 'MapServer', 'Figures 4 and 5 show how trends in unusually hot and cold daily temperatures throughout the year vary by location. Figure 4 shows how the total number of unusually hot days per year at each station has changed over time. The number of unusually hot days is the number of days with maximum temperatures higher than the 95th percentile. Figure 5 is similar except that it looks at unusually cold days, based on the 5th percentile of daily minimum temperatures. For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'LakeIce', 'MapServer', 'This map shows the change in the "ice-off" or thaw date for selected U.S. lakes. Circles represent the change (trend) in days for lake ice thaw dates. Red indicates earlier thaw dates. Yellow indicates lakes with no significant change. For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'LeafBloomDates', 'MapServer', 'This indicator shows trends in the timing of first leaf dates and first bloom dates in lilacs and honeysuckles across the contiguous 48 states.  Blue circles represent later leaf and bloom dates, and red circles represent earlier. For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'LymeDisease', 'MapServer', 'This indicator shows how reported Lyme disease incidence has changed by state since 1991, based on the number of new cases per 100,000 people. The total change has been estimated from the average annual rate of change in each state. This map is limited to the 14 states where Lyme disease is most common, where annual rates are consistently above 10 cases per 100,000. Connecticut, New York, and Rhode Island had too much year-to-year variation in reporting practices to allow trend calculation.  For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'RagweedPollenSeason', 'MapServer', 'This figure shows how the length of ragweed pollen season changed at 11 locations in the central United States and Canada between 1995 and 2013. Red circles represent a longer pollen season; the blue circle represents a shorter season. Larger circles indicate larger changes. For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'Snowfall_Indicators', 'MapServer', 'This map shows the average rate of change in total snowfall from 1930 to 2007 at 419 weather stations in the contiguous 48 states. Blue circles represent increased snowfall; red circles represent a decrease.  This indicator also shows the percentage change in winter snow-to-precipitation ratio from 1949 to 2015 at 265 weather stations in the contiguous 48 states. This ratio measures what percentage of total winter precipitation falls in the form of snow. A decrease (red circle) indicates that more precipitation is falling in the form of rain instead of snow. Yellow indicates streams with no significant change. For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'Snowpack', 'MapServer', 'This map shows trends in April snowpack in the western United States, measured in terms of snow water equivalent.  Blue circles represent increased snowpack; red circles represent a decrease.  For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'Southwest_Temperature', 'MapServer', 'This indicator shows how the average air temperature from 2000 to 2014 has differed from the long-term average (1895\xe2\x80\x932014).  To provide more detailed information, each state has been divided into climate divisions, which are zones that share similar climate features.  For more information: www.epa.gov/climatechange/science/indicators'], ['OAR_OAP', 'Streamflow_Indicators', 'MapServer', "Figure 1 shows trends in low flow conditions, which are commonly calculated by averaging the lowest seven consecutive days of streamflow in a year. In many locations, this method captures the year's driest conditions. Figure 2 shows trends in high flow conditions, which are commonly calculated by averaging the highest three consecutive days of streamflow in a year. Three days is an optimal length of time to characterize runoff associated with large storms and peak snowmelt. Figure 3 shows changes in the annual average streamflow, which is calculated by averaging daily flows over the entire year. Figure 4 shows trends in the timing of winter and spring runoff. For more information: www.epa.gov/climatechange/science/indicators"], ['OAR_OAP', 'Wildfires', 'MapServer', 'This map shows the average number of acres burned in each state per year as a proportion of that state\xe2\x80\x99s total land area; and how the number of acres burned in each state as a proportion of that state\xe2\x80\x99s total land area has changed over time, based on a simple comparison between the first half of the available years (1984\xe2\x80\x931998) and the second half (1999\xe2\x80\x932013). For more information: www.epa.gov/climatechange/science/indicators '], ['OAR_OAQPS', '1997NAAQS_NAA2013conditions', 'MapServer', 'Ozone slider app data '], ['OAR_OAQPS', '1997NAAQS_nonattainment_areas', 'MapServer', 'Ozone slider app data '], ['OAR_OAQPS', '2013DesignValues', 'MapServer', 'Ozone slider app data '], ['OAR_OAQPS', '2025BaselineDesignValues', 'MapServer', 'Ozone slider app data '], ['OAR_OAQPS', 'AirNowNationalAQI', 'MapServer', 'AirNow National AQI Forecast'], ['OAR_OAQPS', 'AQSmonitor_sites', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B7BF467D5-A5D7-427B-B896-5674A15B55B4%7D">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following air quality monitoring network point location layers: CO (carbon monoxide), Lead, Lead-TSP(LC) (lead, total suspended particulates, local conditions), Lead-PM10(LC) (lead, particluate matter up to 10um in size, local conditions), NO2 (nitrogen dioxide), Ozone, PM10 (particulate matter up to 10um in size), PM2.5 (particulate matter up to 2.5um in size), SO2 (sulfur dioxide), PM2.5 Chemical Speciation Network, IMPROVE (Interagency Monitoring of Protected Visual Environments), NATTS (National Air Toxics Trends Stations), NCORE (Multipollutant Monitoring Network). Layers are drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check\nsources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated.'], ['OAR_OAQPS', 'Class1_Areas', 'MapServer', '<A  href="http://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B77AAAADB-E237-49FC-8952-58A933AF0ED6%7D">Full Metadata</A>This web service displays Mandatory Class 1 Federal Areas in the United States. Features are drawn at all scales. Labels are drawn at scales greater than 1:3 million. The data displayed in this web service were assembled by EPA\'s Office of Air Quality Planning and Standards using data from various federal agencies.'], ['OAR_OAQPS', 'CleanPowerPlanStateData', 'MapServer', 'United States Environment Protection Agency (USEPA) Clean Power Plan Web Mapping '], ['OAR_OAQPS', 'NAA1987PM10', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BF335092D-E644-4967-8226-520172B3097E%7D">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following layers related to nonattainment areas and designations: PM10 Nonattainment Areas (1987 NAAQS). Layers are drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. '], ['OAR_OAQPS', 'NAA1997Ozone8hour', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B4EF36438-8026-4B6F-863F-62DBD9F9010C%7D">Full Metadata</A> \nThis U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following layers related to nonattainment areas and designations: Ozone 1997 NAAQS NAA State Level, and Ozone 1997 NAAQS NAA National Level. Layers are drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. '], ['OAR_OAQPS', 'NAA1997PM25Annual', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B8B003F09-7FB4-4D8E-BD27-5B3E6D31899A%7D">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following layers related to nonattainment areas and designations: PM2.5 Annual 1997 NAAQS State Level, and PM2.5 Annual 1997 NAAQS National. Layers are drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. '], ['OAR_OAQPS', 'NAA2006PM2524hour', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BBB79CB7F-6C4C-4CF3-8DD9-35B5A4718337%7D">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following layers related to nonattainment areas and designations: PM2.5 24hr 2006 NAAQS State Level, and PM2.5 24hr 2006 NAAQS National. Layers are drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. '], ['OAR_OAQPS', 'NAA2008Lead', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BBCE9E778-C0CD-4468-8234-F90ACEF43C24%7D"">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following layers related to nonattainment areas and designations: Lead NAA 2008 NAAQS, and Lead NAA Centroids 2008 NAAQS.  Layers are drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. '], ['OAR_OAQPS', 'NAA2008Ozone8hour', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B448451DF-30E7-4B29-9A08-B3F7A68870BE%7D">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following layers related to nonattainment areas and designations: Ozone 2008 NAAQS NAA State Level, and Ozone 2008 NAAQS NAA National Level.  Layers are drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. \n'], ['OAR_OAQPS', 'NAA2010SO21hour', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B2666B6DA-07AD-4CAA-9DEB-E90798D828B8%7D">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following layer related to nonattainment areas and designations: SO2 2010 NAAQS State Level. The Layer is drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. '], ['OAR_OAQPS', 'NAA2012PM25Annual', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B09E54579-FD59-4B09-AA3E-46E06D45F123%7D">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following layer related to nonattainment areas and designations: PM2.5 Annual NAAQS State Level. The Layer is drawn at all scales. Security classification: Public. Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. '], ['OAR_OAQPS', 'NAA2015Ozone', 'MapServer', 'Ozone Design Values'], ['OAR_OAQPS', 'NATA_2011_Emissions', 'MapServer', ''], ['OAR_OAQPS', 'NATA_2011_Risks_and_Ambient_Concentrations', 'MapServer', "This service contains cancer risk, respiratory hazard index (HI), and ambient concentration estimates at census tract resolution for the continental US, Alaska, Hawaii, Puerto Rico, and the US Virgin Islands. The estimates are based on a modeling analysis using EPA's 2011 National Emissions Inventory (NEI), version 2. The cancer risk and respiratory HI layers include source group and pollutant contribution information. The cancer risks are presented on a per million basis (e.g., a value of 10 means 10 in a million risk). The ambient concentration data are in units of \xc2\xb5g/m3."], ['OAR_OAQPS', 'NATA_Air_Toxics_Monitors', 'MapServer', 'These data include nationwide air toxics monitoring data for the year 2011, and for a recent year'], ['OAR_OAQPS', 'NonattainmentAreas', 'MapServer', '<A \nhref="https://edg.epa.gov/metadata/catalog/search/resource\n/details.page?uuid=%7B6D412E16-523A-4466-AE04-09EAEF7C16F3%7D">Full Metadata</A> This U.S. EPA Office of Air and Radiation (OAR) - Office of Air Quality Planning and Standards (OAQPS) web service contains the following state level layers related to nonattainment areas and designations: Ozone 8-hr (1997 standard), Ozone 8-hr (2008 standard),  Lead (2008 standard), SO2 1-hr (2010 standard), PM2.5 24hr (2006 standard), PM2.5 Annual (1997 standard), PM2.5 Annual (2012 standard), and PM10 (1987 standard). Layers are drawn at all scales. Access constraints: None. Use constraints: None. Please check \nsources, scale, accuracy, currency and other available information. Please confirm that you are \nusing the most recent copy of both data and metadata. Acknowledgement of the EPA would be \nappreciated.'], ['OAR_OAQPS', 'OzoneSeasonReview2014CBSA', 'MapServer', ''], ['OAR_OAQPS', 'OzoneSeasonReview2014Cities', 'MapServer', '2014 ozone season review.  Number of unhealthy days for ozone based on AQI data'], ['OAR_OAQPS', 'PM25NAA', 'MapServer', 'Current PM NAAs'], ['OAR_OAQPS', 'PM25SeasonReview2014CBSA', 'MapServer', '2014 ozone season review.  Number of unhealthy days for ozone based on AQI data'], ['OAR_OAQPS', 'PM25SeasonReview2014Cities', 'MapServer', '2014 ozone season review.  Number of unhealthy days for ozone based on AQI data'], ['OAR_OAQPS', 'States', 'MapServer', 'Ozone slider app data '], ['OECA', 'Annual_Report', 'MapServer', '<a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B75A5AC2F-E164-4901-839A-60C9B35C02C4%7D">Full Metadata</a>\nThis interactive map shows information on enforcement actions and cases from 2012. They include civil enforcement actions taken by EPA at facilities, criminal cases prosecuted by EPA under federal statutes and the U.S. Criminal Code, and cases in which EPA provided significant support to cases prosecuted under state criminal laws. The indicators on the map generally mark the location of the site or facility where the violations occurred or were discovered.'], ['OECA', 'AnnualResults2015', 'MapServer', ''], ['OECA', 'AnnualResultsMapFY14', 'MapServer', ''], ['OECA', 'CAFO_Density', 'MapServer', '<A  href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B5E5D97F1-B855-45C5-A856-D359AFAB51CC%7D">Full Metadata</A>\nThis map contains a polygon layer which depicts the boundaries of each US county.  It also contains a US EPA value-added dataset derived from the 2007 USDA Census of Agriculture.  The USDA dataset was procured for EPA through the Office of Water.  These data are available for public access and use and carry no restrictions.'], ['OECA', 'OECA_Annual_Report_FY2013', 'MapServer', 'This interactive map shows information on enforcement actions and cases from 2013. They include civil enforcement actions taken by EPA at facilities, criminal cases prosecuted by EPA under federal statutes and the U.S. Criminal Code, and cases in which EPA provided significant support to cases prosecuted under state criminal laws. The indicators on the map generally mark the location of the site or facility where the violations occurred or were discovered.'], ['OEI', 'ACS_Demographics_by_Tract_2006_2010', 'MapServer', '<a id="{A767674A-2BFB-4612-B42F-7A80D96002E0}" href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BA767674A-2BFB-4612-B42F-7A80D96002E0%7D">Full Metadata</a> This map service group layer contains data derived from the 2006-2010 American Community Survey (ACS) by census tract. Values derived from the ACS and used for this map service include: Total Population, Population Density (per square mile), Percent Minority, Percent Below Poverty Level, Percent Age (less than 5, less than 18, and greater than 64), Percent Housing Units Built Before 1950, Percent (population) 25 years and over (with less than a High School Degree and with a High School Degree), Percent Linguistically Isolated Households, Population of American Indians and Alaskan Natives, Population of American Indians and Alaskan Natives Below Poverty Level.'], ['OEI', 'CongressionalDistricts', 'MapServer', '<A  href="http://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BA9CD6C94-2F4F-40AA-A034-8F7F88C90EB9%7D">Full Metadata</A>\nThis SEGS web service contains the following layers: 114th Congressional district boundaries and 114th Congressional district labels, both at two scale ranges. All layers draw at the scale ranges indicated in their titles. This SEGS dataset was procured for EPA through the Office of Environmental Information (OEI). Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currentness and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated.'], ['OEI', 'EPA_Locations', 'MapServer', '<A  href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BEB015EB1-24CD-498F-9485-CE05EE14BC99%7D">Full Metadata</A>\nThis SEGS web service contains EPA facilities, EPA facilities labels, small- and large-scale versions of EPA region boundaries, and EPA regions extended to the 200nm exclusive economic zone (EEZ).  Small scale EPA boundaries render at scales of less than 5 million, large scale EPA boundaries draw at scales greater than or equal to 5 million.  EPA facilities labels draw at scales greater than 2 million.  This SEGS dataset was produced by EPA\'s Office of Environmental Information (OEI).  \n\nAccess constraints: None. Use constraints: None. Please check sources, scale, accuracy, currentness and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated.'], ['OEI', 'EPA_RegionalMasks', 'MapServer', '<A  href="http://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B6E1ADBAB-EF1F-4C30-9E8C-577D7E7D8C5F%7D">Full Metadata</A>\n\nThis SEGS web service contains masks and labels of EPA regions 1 through 10. The mask layers draw at all scales. The label layers draw at scales greater than 1:12.5 million. This SEGS dataset was produced by EPA\'s Office of Environmental Information (OEI). Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currentness and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated.'], ['OEI', 'Factle_Neighborhoods', 'MapServer', '<a id="{76142C0A-72A4-44C7-B19E-FA82431C9E60}" href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B76142C0A-72A4-44C7-B19E-FA82431C9E60%7D">Full Metadata</a> This map service depicts neighborhood boundaries in 393 U.S. cities.  Neighborhoods are defined based on information collected from official city websites, maps and background imagery, city officials, residents and real estate agents.  Neighborhood delineation is based on three different methodologies -- Neighborhood Descriptive Boundaries Method, Deduction Method and Scatter Plot Method.  \nAddtional information regarding the development of this dataset can be found at:  http://dret.net/netdret/docs/wilde-tipugg2008-neighborhoods.pdf or http://www.factle.com'], ['OEI', 'FRS_AQSTemp', 'MapServer', 'Facilities regulated or of environmental interest to EPA and the EPA programs they are tracked in.'], ['OEI', 'FRS_INTERESTS', 'MapServer', 'Facilities regulated or of environmental interest to EPA and the EPA programs they are tracked in.'], ['OEI', 'FRS_PowerPlants', 'MapServer', 'US Power Generation Facilities, compiled from most-current (as of June 2014) Energy Information Administration EIA-860 powerplant data, together with USEPA Facility Registry Service data.'], ['OEI', 'FRS_Subfacilities', 'MapServer', 'Facility subfacilities are additional locations to the main latitude longitude of the facility. This service contains subfacilities for the NPDES program faciities and the AIRS_AFS program facilities.'], ['OEI', 'FRS_Wastewater', 'MapServer', "This dataset combines facility data from US EPA's Facility Registry Service (FRS) and Integrated Compliance Information System (ICIS) for wastewater treatment plants.  This dataset combines FRS facility data and derived attributes with ICIS wastewater treatment data, and has been presented with three different view options at the facility level:  1.) display of Publicly Owned Treatment Works and Federal facilities, 2.) Display of all facilities, categorized as Major, Minor and Other/Nonclassified, and 3.) Display of facilities with Combined Sewer Outfalls.  The dataset displays at zoom levels of 1:10,000,000 and smaller."], ['OEI', 'ORNL_Education', 'MapServer', '<A  href="http://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B9C49AE4B-F175-43D0-BCC6-A928FF54C329%7D">Full Metadata</A>\nThis SEGS web service contains the following layers: Colleges and Universities, Supplemental Colleges, Private Schools, Public Schools and Day Care Centers .  Colleges and Universities draws at scales >= 1:3,000,000; Supplemental Colleges draw at scales >= 1:2 million; Private Schools draw at scales >= 1:1,000,000; Public Schools draw at scales >=1:100,000 and Day Care Centers draw at scales >= 1:50,000.  This SEGS dataset was procured for EPA through the Office of Environmental Information (OEI). Access constraints: None. Use constraints: None. Please check sources, scale, accuracy, currentness and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated. '], ['OEI', 'Place_Holder', 'MapServer', 'This map service is a generic place holder layer for web maps and applications to denote forthcoming data layers. In the future, a new map service with actual data will replace this place holder service in the web map.'], ['OEI', 'TRI_NationalAnalysis_2013', 'MapServer', 'The 2013 TRI National Analysis map datasets include Toxic Release Inventory (TRI) data summarized at the state, county, large aquatic ecosystem, metropolitan/micropolitan statistical area, and tribal levels.'], ['OEI', 'TRI_NationalAnalysis_2014', 'MapServer', 'The 2014 TRI National Analysis map datasets include Toxic Release Inventory (TRI) data summarized at the state, county, large aquatic ecosystem, metropolitan/micropolitan statistical area, and tribal levels.'], ['OEI', 'USEPA_AIR', 'MapServer', '<a id="{8ABDFBD8-270C-4270-9A5B-EBF2DE83D01E}" href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B8ABDFBD8-270C-4270-9A5B-EBF2DE83D01E%7D">Full Metadata</a> This map service displays all air-related layers used in the USEPA Community/Tribal-Focused Exposure and Risk Screening Tool (C/T-FERST) mapping application (http://cfpub.epa.gov/cferst/index.cfm). The following data sources (and layers) are contained in this service:\nUSEPA\'s 2005 National-Scale Air Toxic Assessment (NATA) data. Data are shown at the census tract level (2000 census tract boundaries, US Census Bureau) for Cumulative Cancer and Non-Cancer risks (Neurological and Respiratory) from 139 air toxics. In addition, individual pollutant estimates of Ambient Concentration, Exposure Concentration, Cancer, and Non-Cancer risks (Neurological and Respiratory) are provided for: Acetaldehyde, Acrolein, Arsenic, Benzene, 1,3-Butadiene, Chromium, Diesel PM, Formaldehyde, Lead, Naphthalene, and Polycyclic Aromatic Hydrocarbon (PAH).   \nThe original Access tables were downloaded from USEPA\'s Office of Air and Radiation (OAR) http://www.epa.gov/ttn/atw/nata2005/tables.html. The data classification (defined interval) for this map service was developed for USEPA\'s Office of Research and Development\'s (ORD) Community-Focused Exposure and Risk Screening Tool (C-FERST) per guidance provided by OAR.\nThe 2005 NATA provides information on 177 of the 187 Clean Air Act air toxics (http://www.epa.gov/ttn/atw/nata2005/05pdf/2005polls.pdf) plus diesel particulate matter (diesel PM was assessed for non-cancer only). For additional information about NATA, go to http://www.epa.gov/ttn/atw/nata2005/05pdf/nata_tmd.pdf or contact Ted Palma, USEPA (palma.ted@epa.gov). NATA data disclaimer: USEPA strongly cautions that these modeling results are most meaningful when viewed at the state or national level, and should not be used to draw conclusions about local exposures or risks (e.g., to compare local areas, to identify the exact location of "hot spots", or to revise or design emission reduction programs). Substantial uncertainties with the input data for these models may cause the results to misrepresent actual risks, especially at the census tract level. However, we believe the census tract data and maps can provide a useful approximation of geographic patterns of variation in risk within counties. For example, a cluster of census tracts with higher estimated risks may suggest the existence of a "hot spot," although the specific tracts affected will be uncertain. More refined assessments based on additional data and analysis would be needed to better characterize such risks at the tract level. (http://www.epa.gov/ttn/atw/nata2005/countyxls/cancer_risk02_county_042009.xls). Note that these modeled estimates are derived from outdoor sources only; indoor sources are not included in these examples, but may be significant in some cases. The modeled exposure estimates are for a median individual in the geographic area shown. Note that in some cases the estimated relationship between human exposure and health effect may be calculated as a high end estimate, and thus may be more likely to overestimate than underestimate actual health effects for the median individual in the geographic area shown. Other limitations to consider when looking at the results are detailed on the EPA 2005 NATA website. For these reasons, the NATA maps included in C-FERST are provided for screening purposes only. \nSee the 2005 National Air Toxic Assessment website for recommended usage and limitations on the estimated cancer and noncancer data provided above. \n\nUSEPA\'s NonAttainment areas data. C-FERST displays Ozone for 8-hour Ozone based on the 1997 standard for reporting and Particulate Matter PM-2.5 based on the 2006 standard for reporting. These are areas of the country where air pollution levels consistently exceed the national ambient air quality standards. Details about the USEPA\'s NonAttainment data are available at http://www.epa.gov/airquality/greenbook/index.html. \n\nCenter of Disease Control\'s (CDC) Environmental Public Health Tracking (EPHT) data. Averaged over three years (2004 - 2006). The USEPA\'s ORD calculated a three-year average (2004 - 2006) using the values for Ozone (number of days with the maximum 8-hour average above the National Ambient Air Quality Standards (NAAQS)) and PM 2.5 (annual ambient concentration). These data were extracted by the CDC from the USEPA\'s ambient air monitors and are displayed at the county level. USEPA received the Monitor and Modeled data from the CDC and calculated the three year average displayed in the web service. For more details about the CDC EPHT data, go to http://ephtracking.cdc.gov/showHome.action.'], ['ORD', 'EnvironmentalQualityIndex', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B53AE6A65-E2C4-4B84-B012-66BC473F5C04%7D">Full Metadata</A> The US Environmental Protection Agency\'s (EPA) National Health and Environmental Effects Research Laboratory (NHEERL) in the Environmental Public Health Division (EPHD) is currently engaged in research aimed at developing a measure that estimates overall environmental quality at the county level for the United States. This work is being conducted as an effort to learn more about how various environmental factors simultaneously contribute to health disparities in low-income and minority populations, and to better estimate the total environmental and social context to which humans are exposed. This dataset contains the finalized Environmental Quality Index (EQI), and an index for each of the associated domains (air, water, land, built, and sociodemographic environment). Indices are at the county level for all counties in the United States. More information about the EQI can be found at <A href="https://edg.epa.gov/data/Public/ORD/NHEERL/EQI">https://edg.epa.gov/data/Public/ORD/NHEERL/EQI</A>.\n\n1) The data used to create the index attempted to balance quality measurement with geographic breadth of coverage -  index does reasonable job estimating the general environment, but less useful for estimating specific environments. 2) Not all relevant environmental exposures are necessarily  included in the index. Data inclusion is dependent on data collection and coverage; if relevant data are not being collected, the exposure will not be captured in the EQI. 3) In areas where little data collection occurs the data may be over representing the environmental profile of those areas. For example, a county that contains a national park without data collected and a town with data collection will be solely represented by the town area, though that may be inaccurate for the entire county. 4) Focused solely on the outside environment, which may not be the most relevant exposure in relation to human health and disease. 5) Population-level analyses offer little predictive utility for individual-level risk. Therefore, while the index may be useful at identifying less healthy environments, it will not be useful for predicting adverse outcomes. \n\nAccess constraints: None. Use constraints: None. Please check sources, scale, accuracy, currency and other available information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated.\n'], ['ORD', 'FEGS', 'MapServer', 'This FEGS web service contains the following layers: FEGS. This FEGS dataset was procured for EPA through the Office of Research and Development (ORD). Access constraints: None. Use constraints: These data are not spatially-explicit and therefore have no scale dependencies. Points for all unique FEGS have been "placed" on the Corvallis EPA office were the FEGS study was conceived. These data are not to be used in any spatial analyses. Please check sources and currentness and other information. Please confirm that you are using the most recent copy of both data and metadata. Acknowledgement of the EPA would be appreciated.'], ['ORD', 'les_cmaq', 'MapServer', 'This map shows the CMAQ (Community Multi-scale Air Quality Model) annual deposition of nitrogen for 2002 and projections for 2020. CMAQ is an air quality model and software suite designed to model multiple pollutants at multiple scales.'], ['ORD', 'les_cropland', 'MapServer', 'This map shows the USDA, NASS Cropland Data Layer (CDL). This is a raster, \ngeo-referenced, crop-specific land cover data layer\n with a ground resolution of 56 meters. \n The CDL is produced using satellite imagery from\n the Indian Remote Sensing RESOURCESAT-1 (IRS-P6) \n Advanced Wide Field Sensor (AWiFS) collected \n during the current growing season. \n Some Cropland Data Layer states used \n Landsat 5 TM and/or Landsat 7 ETM+ satellite \n imagery to supplement the classification. \n Ancillary classification inputs include: \n the United States Geological Survey (USGS) \n National Elevation Dataset (NED), the USGS \n National Land Cover Dataset 2001 (NLCD 2001), \n and the National Aeronautics and Space \n Administration (NASA) Moderate Resolution \n Imaging Spectroradiometer (MODIS) 250 meter 16 day \n Normalized Difference Vegetation Index (NDVI) \n composites. Agricultural training and validation \n data are derived from the Farm Service Agency (FSA)\n Common Land Unit (CLU) Program. The NLCD 2001 \n is used as non-agricultural training and \n validation data. '], ['ORD', 'les_gp', 'GPServer', 'This geoprocessing tool takes a featureset from the NHDPlus lakes, buffers the lake by a user-defined distance then clips the USDA cropland data. It then does a frequency analysis on the clipped cropland to get a total ... (see Description)'], ['ORD', 'les_gp', 'MapServer', ''], ['ORD', 'les_nhd', 'MapServer', ''], ['ORD', 'les_nlcd2001', 'MapServer', 'This map shows the NLCD 2001 data clipped to the boundary of the NHD MRB1 area.'], ['ORD', 'les_omernik', 'MapServer', 'This map shows the Omenik levels I, II and III ecoregions for the northeast Region.'], ['ORD', 'les_rasterpopdens', 'MapServer', 'This map shows the2010 census population for the northeast region in raster format. The raster file is a product of the TIGER/Line files and 2010 Census population.'], ['ORD', 'les_sparrow', 'MapServer', 'SPARROW is a watershed based model designed for use in predicting long-term average values of water characteristics. This map shows the modeled nitrogen and phosphorus loads for NHD lakes in MRB1'], ['ORD', 'les_wadeable', 'MapServer', "This map shows the level 3 and level 9 Wadeable Streams Assessment ecoregions clipped to the MRB1 region. The Wadeable Streams Assessment is a statistically defensible summary of the nation's streams and small rivers. The ecoregions are aggregations of the Omernik ecoregions. "], ['ORD', 'les', 'MapServer', "This map shows the polygons and centroids of lakes sampled as part of the New England Lakes and Ponds project and the National Lakes Assessment project. These projects were designed to evaluate the condition of the region's waterbodies as a population."], ['ORD', 'Merganser', 'MapServer', 'This map shows the locations of lakes used in the merganser model. This model estimates mercury in fish tissue depending on environmental conditions.'], ['ORD', 'ROE_AcidSensitiveWaters', 'MapServer', '<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={17FAA6B7-9E34-4E69-A90A-2FB0CB0AA087}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nThe polygon dataset represents areas with acid-sensitive waters in the contiguous United States. Summary data in this indicator were provided by EPAs Office of Atmospheric Programs.'], ['ORD', 'ROE_BiomassPerSquareMile', 'MapServer', 'Polygon dataset showing forest biomass per square mile, by county.<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BC4F8FE9C-FC14-4402-A37F-AEC5986A6DAC%7D" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_EcologicalHubsAndCorridors', 'MapServer', 'The purpose of this web service is to display information about the NEF Ecological Hubs and Corridors data featured in EPA\'s Report on the Environment (ROE).\n\n<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={EE0477A4-3CD3-4675-8429-9F82DCFE18F0}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_FishFaunaAbsoluteLoss', 'MapServer', '<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={BC3F01BB-79AE-4B43-BAC4-7B4ADBBA03F2}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nThis polygon dataset shows the absolute number of native fish species that have been lost from each HUC-6 watershed in the contiguous 48 states.'], ['ORD', 'ROE_FishFaunaPercentLoss', 'MapServer', '<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={ABDB79AF-455C-4C17-97B8-B969BC1A9107}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nThis polygon dataset shows the percent loss of native fish species in each HUC-6 watershed in the contiguous 48 states.'], ['ORD', 'ROE_GulfofMexicoHypoxia', 'MapServer', 'Point data from data collection sites overlaid on a polygon that shows the extent of the summer hypoxic zone in the Gulf of Mexico.\n<br>\n<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={1F057D34-77FB-451E-A528-07954C31A2D8}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_LongIslandHypoxia', 'MapServer', '<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={BEFBA856-A56C-4FA5-976E-97A312125679}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nPoint data from data collection sites overlaid on a color-coded raster that shows the extent of the summer hypoxic zone in Long Island Sound.'], ['ORD', 'ROE_NLCD', 'MapServer', '<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={235B12CF-9C83-47B8-B0BF-9AD89710F5C5}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nColor-coded raster file showing the distribution of land cover across the contiguous 48 states as classified in the most recent National Land Cover Database (NLCD).'], ['ORD', 'ROE_PercentChangeCarbonStorage', 'MapServer', 'This polygon dataset depicts the percentage change in the amount of carbon stored in forests in counties across the United States.\n<br>\n<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={76A2C3C8-2C66-4438-AEE5-0384EDCE4C4C}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_Precipitation', 'MapServer', 'This polygon dataset represents the rate of change in precipitation across the United States in terms of percent change. <br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={172872A1-0DEB-4E17-98F2-CF44C1EFD62A}\n" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_Radon', 'MapServer', '<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={5AD08978-EAFB-4FBC-B6A4-3A604797FF0E}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nThe purpose of this MXD is to generate EPA\'s Radon web service. The graphic produced by these layers can be found in the Environmental Protection Agencys Report on the Environment. The Exhibit for this map is Exhibit 2-56 in the report.'], ['ORD', 'ROE_SeaLevelAbsolute', 'MapServer', 'This raster dataset represents changes in absolute sea level along U.S. coasts, as measured by satellites since 1993.\n<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={58E44371-7CC3-43E2-A7E4-0B11A5885EA5}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_SeaLevelRelative', 'MapServer', 'This point dataset represents changes in relative sea level along U.S. coasts, as measured by tide gauges with sufficient data for long-term analysis. '], ['ORD', 'ROE_StateBoundaries', 'MapServer', 'This polygon dataset shows the outlines of U.S. states. The data were provided by the U.S. Census Bureau.<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={3F6540D7-2F8A-4DC7-AF65-5F7A3E4CBD31}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_StateBoundariesThicker', 'MapServer', 'This polygon dataset shows the outlines of U.S. states. The data were provided by the U.S. Census Bureau. <A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={3F6540D7-2F8A-4DC7-AF65-5F7A3E4CBD31}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_Temperature', 'MapServer', 'This polygon dataset represents the rate of change in temperature across the United States in terms of degrees per century since 1901. Data are presented by climate division.\n<br>\n<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={CFC1A18F-778F-44C5-A691-57781C0D95F0}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_TotalNitrogenDeposition1989_1991', 'MapServer', 'This point map shows total atmospheric deposition of nitrogen at various stations throughout the contiguous 48 states from 1989 to 1991. It has been set up for comparison with a more recent three-year period. <A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={5E3E3B58-486C-4A10-B6B6-64CE98B93062}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_TotalNitrogenDeposition2007_2009', 'MapServer', 'The polygon dataset represents total nitrogen and sulfur deposition in the U.S., 2007-2009. These data are similar to, but more recent than, the map found on page 39 of the Environmental Protection Agencys Report on the Environment - 2008 (EPAROE_Final_2008.pdf). The sulfur-related data are featured in Exhibit 2-31 of the report. The nitrogen data are represented in Exhibit 2-32. Summary data in this indicator were provided by EPAs Office of Atmospheric Programs, based on deposition data from two sources. Wet deposition data are from the National Atmospheric Deposition Program/National Trends Network (NADP, 2007) (http://nadp.sws.uiuc.edu/), and dry deposition data are from the Clean Air Status and Trends Network (U.S. EPA, 2007) (http://www.epa.gov/castnet). <br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={B18A8C56-0C0E-4EFA-9938-708FE10373C9}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_TotalNitrogenDeposition2011_2013', 'MapServer', 'This point map shows total atmospheric deposition of nitrogen at various stations throughout the contiguous 48 states during a recent three-year period. It has been set up for comparison with an earlier three-year period.\n<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={E7004446-7062-483F-96A2-65D6B8A69A6D}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_TotalSulfurDeposition1989_1991', 'MapServer', 'This point map shows total atmospheric deposition of sulfur at various stations throughout the contiguous 48 states from 1989 to 1991. It has been set up for comparison with a more recent three-year period.\n <br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={A15DC62D-7387-48CB-94F7-7D97ED28692E}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_TotalSulfurDeposition2007_2009', 'MapServer', 'The polygon dataset represents total sulfur deposition in the U.S., 2007-2009. These data are similar to, but more recent than, the map found on page 39 of the Environmental Protection Agencys Report on the Environment - 2008 (EPAROE_Final_2008.pdf). This map corresponds to Exhibit 2-31 in the report. Summary data in this indicator were provided by EPAs Office of Atmospheric Programs, based on deposition data from two sources. Wet deposition data are from the National Atmospheric Deposition Program/National Trends Network (NADP, 2007) (http://nadp.sws.uiuc.edu/), and dry deposition data are from the Clean Air Status and Trends Network (U.S. EPA, 2007) (http://www.epa.gov/castnet).\n<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={3BB9DBE9-421E-4C53-85C3-FC224D13C0FD}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\n'], ['ORD', 'ROE_TotalSulfurDeposition2011_2013', 'MapServer', 'This point map shows total atmospheric deposition of sulfur at various stations throughout the contiguous 48 states during a recent three-year period. It has been set up for comparison with an earlier three-year period.<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={7221EC9A-88DC-4A47-B515-71B2C888773E}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_WetNitrateDeposition1989_1991', 'MapServer', '<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={49AF8FB7-3152-4FD3-938A-46A9D2593099}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nThe purpose of this MXD is to generate EPA\'s Wet Nitrate Deposition 1989-1991 web service. The graphic produced by these layers can be found in the Environmental Protection Agencys Report on the Environment. The Exhibit for this map is Exhibit 2-30 in the report.'], ['ORD', 'ROE_WetNitrateDeposition2008_2010', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7BDE08B26F-C23E-4C23-A70F-233DDF9976C8%7D"" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nThe purpose of this MXD is to generate EPA\'s Wet Nitrate Deposition 2008-2010 web service. The graphic produced by these layers can be found in the Environmental Protection Agencys Report on the Environment. This map data is more recent than the 2004-2006 Wet Nitrate Deposition data found on page 38 of the Environmental Protection Agencys Report on the Environment - 2008 (EPAROE_Final_2008.pdf).  '], ['ORD', 'ROE_WetNitrateDeposition2009_2011', 'MapServer', 'The raster data represent the amount of Wet Nitrate Deposition in Kilograms per Hectare from 2009-2011. This map data is more recent than the 2004-2006 Wet Nitrate Deposition data found on page 38 of the Environmental Protection Agencys Report on the Environment - 2008 (EPAROE_Final_2008.pdf). Summary data in this indicator were provided by EPAs Office of Atmospheric Programs, based on deposition data from two sources. Wet deposition data are from the National Atmospheric Deposition Program/National Trends Network (NADP, 2007) (http://nadp.sws.uiuc.edu/), and dry deposition data are from the Clean Air Status and Trends Network (U.S. EPA, 2007) (http://www.epa.gov/castnet). This indicator aggregates data across 3-year periods to avoid influences from short-term fluctuations in meteorological conditions, and wet deposition data were interpolated among monitoring stations to generate the maps shown in Exhibits 2-29 and 2-30. <br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={9EE63C90-2945-44A2-A0BA-538B08801051}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_WetNitrateDeposition2011_2013', 'MapServer', 'This raster dataset shows the amount of wet nitrate deposition across the contiguous 48 states during a recent three-year period. It has been set up for comparison with an earlier three-year period. The map has been interpolated between monitoring stations.\n <br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={9EE63C90-2945-44A2-A0BA-538B08801051}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_WetSulfateDeposition1989_1991', 'MapServer', '<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={49AF8FB7-3152-4FD3-938A-46A9D2593099}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>\nThe purpose of this MXD is to generate EPA\'s Wet Sulfate Deposition 1989-1991 web service. The graphic produced by these layers can be found in the Environmental Protection Agencys Report on the Environment.  The Exhibit for this map is Exhibit 2-37 in the report.'], ['ORD', 'ROE_WetSulfateDeposition2008_2010', 'MapServer', 'The raster data represent the amount of Wet Sulfate Deposition in Kilograms per Hectare from 2008 -2010. This map contains data more recent than the 2004-2006 Wet Nitrate Sulfate data found on page 37 of the Environmental Protection Agencys Report on the Environment - 2008 (EPAROE_Final_2008.pdf). Summary data in this indicator were provided by EPAs Office of Atmospheric Programs, based on deposition data from two sources. Wet deposition data are from the National Atmospheric Deposition Program/National Trends Network (NADP, 2007) (http://nadp.sws.uiuc.edu/), and dry deposition data are from the Clean Air Status and Trends Network (U.S. EPA, 2007) (http://www.epa.gov/castnet). This indicator aggregates data across 3-year periods to avoid influences from short-term fluctuations in meteorological conditions, and wet deposition data were interpolated among monitoring stations to generate the maps shown in Exhibits 2-29 and 2-30.<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={0A3DB7E5-E4AD-42E7-A78B-AE026C62DDBB}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_WetSulfateDeposition2009_2011', 'MapServer', 'The raster data represent the amount of Wet Sulfate Deposition in Kilograms per Hectare from 2009 -2011. This map contains data more recent than the 2004-2006 Wet Nitrate Sulfate data found on page 37 of the Environmental Protection Agencys Report on the Environment - 2008 (EPAROE_Final_2008.pdf). Summary data in this indicator were provided by EPAs Office of Atmospheric Programs, based on deposition data from two sources. Wet deposition data are from the National Atmospheric Deposition Program/National Trends Network (NADP, 2007) (http://nadp.sws.uiuc.edu/), and dry deposition data are from the Clean Air Status and Trends Network (U.S. EPA, 2007) (http://www.epa.gov/castnet). This indicator aggregates data across 3-year periods to avoid influences from short-term fluctuations in meteorological conditions, and wet deposition data were interpolated among monitoring stations to generate the maps shown in Exhibits 2-29 and 2-30.<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={3E5A0AA9-A85F-43DC-925A-6E40E0DE456F}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'ROE_WetSulfateDeposition2011_2013', 'MapServer', 'This raster dataset shows the amount of wet sulfate deposition across the contiguous 48 states during a recent three-year period. It has been set up for comparison with an earlier three-year period. The map has been interpolated between monitoring stations.<br><A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={3E5A0AA9-A85F-43DC-925A-6E40E0DE456F}" target="_blank"><IMG SRC="https://edg.epa.gov/clipship/doc/metadata.png" BORDER=0></A>'], ['ORD', 'USEPA_Ecoregions_Level_III_and_IV', 'MapServer', '<A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B02C99043-2E25-4A4E-BBE3-6AAE81ED7FC8%7D">Full Metadata<A/> This United States Environmental Protection Agency (US EPA) Shared Enterprise Geodata and Services (SEGS) web service displays Level III and Level IV Ecoregions of the United States and was created from ecoregion data obtained from the US EPA Office of Research and Development\'s Western Ecology Division. The original ecoregion data was projected from Albers to Web Mercator for this web service. To download shapefiles of ecoregion data (in Albers), please go to: www.epa.gov/wed/pages/ecoregions.htm. IMPORTANT NOTE ABOUT LEVEL IV POLYGON LEGEND DISPLAY IN ARCMAP: Due to the limitations of Graphical Device Interface (GDI) resources per application on Windows, ArcMap does not display the legend in the Table of Contents for the ArcGIS Server service layer if the legend has more than 100 items. As of December 2011, there are 968 unique legend items in the Level IV Ecoregion Polygon legend. Follow this link (http://support.esri.com/en/knowledgebase/techarticles/detail/33741) for instructions about how to increase the maximum number of ArcGIS Server service layer legend items allowed for display in ArcMap. Note the instructions at this link provide a slightly incorrect path to "Maximum Legend Count". The correct path is HKEY_CURRENT_USER > Software > ESRI > ArcMap > Server > MapServerLayer > Maximum Legend Count. When editing the "Maximum Legend Count", update the field, "Value data" to 1000. To download a PDF version of the Level IV ecoregion map and legend, go to ftp://ftp.epa.gov/wed/ecoregions/us/Eco_Level_IV_US_pg.pdf. Ecoregions denote areas of general similarity in ecosystems and in the type, quality, and quantity of environmental resources. Compilation of the level IV maps, performed at 1:250,000 scale, has been a part of collaborative projects between US Environmental Protection Agency, National Health and Environmental Effects Laboratory (NHEERL)--Corvallis, OR, the US Forest Service, Natural Resources Conservation Service, and a variety of other state and federal resource agencies. The ecoregions and subregions are designed to serve as a spatial framework for environmental resource management. The most immediate needs by the states are for developing regional biological criteria and water resource standards, and for setting management goals for nonpoint-source pollution. Level IV ecoregions are intended for large geographic extents (i.e. states, multiple counties, or river basins). Use for smaller areas, such as individual counties or a 1:24,000 scale map boundary, is not recommended. Explanation of the methods used to delineate the ecoregions are given in Omernik (1995), Griffith et al. (1994), and Gallant et al. (1989). For more information about Omernik ecoregions or to download ecoregion maps and GIS data, go to: http://www.epa.gov/wed/pages/ecoregions.htm. These data are available for public access and use and carry no restrictions. Level III and IV Ecoregions (US EPA) current through December 2011.'], ['OSWER', 'EPA6kQuads', 'MapServer', '<A  href="http://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B7A5A7E02-E65D-465A-AD89-416C8D611D6C%7D">Full Metadata</A> This map service contains draft reference grid cells developed by US Environmental Protection Agency to Support Reconnaissance and Tactical and Strategic Planning for Emergency Responses and Homeland Security Events. Grid cells are based on densification of the USGS Quarterquad (1:12,000 scale or 12K) grids for the continental United States, Alaska, Hawaii and Puerto Rico and are roughly equivalent to 1:6000 scale (6K) quadrangles approximately 2 miles long on each side. 12k and 24k grid cells are also provided for reference. '], ['OW', 'AquaticNuisanceSpeciesLocator', 'MapServer', 'This dataset includes only selected vegetative and non-vegetative organisms that are considered to be aquatic nuisance species. This list is not exhaustive and contains data for only a limited number of species. Some organisms may be foreign to United States waters while some may be foreign to a particular water body or region, but native to the United States.\n\nThe data includes GPS coordinates and other species information collected by and stored in the Nonindigenous Aquatic Species (NAS) information resource at United States Geological Survey. Data points are for informational use only and may contain inaccuracies. Data has been published by USGS on the NAS website at: http://nas.er.usgs.gov/. \n\nA limited number of species are identified in the dataset and is not conclusive. Any questions concerning data or information on species, should be directed to the USGS NAS information resource page. For recreational boating related questions, please contact the agency responsible for administering clean boating programs in your state. For a list of some contacts, visit the resources tab at www.epa.gov/cleanboatingact.'], ['OW', 'BestManagementPractices', 'MapServer', 'BMP Locations'], ['R1', 'Valleys', 'MapServer', 'Valleys (areas that are lower than their neighbors) are extracted from a Digital Elevation Model by finding the mean elevation within a certain radius, then subtracting the actual elevation from the mean. We accommodate the diversity of valley shapes and sizes by sampling the landscape at seven scales: 1, 2, 4, 7, 11, 16, and 22 km radius. The seven models are combined, and locations where at least four models occur together are flagged as valleys.'], ['R10', 'Region10AirAlaska', 'MapServer', 'This map shows the pounds per year of TRI-listed chemicals released to air in 2011 by TRI-reporting facilities.  Air emissions shown here include fugitive and point source air emissions. '], ['R10', 'Region10Air', 'MapServer', 'This map illustrates the facilities that reported to the Toxics Release Inventory Program (TRI) in reporting year 2011 and the pounds per year of TRI-listed chemicals released to air. Air emissions shown here include fugitive and point source air emissions:'], ['R10', 'Region10LandAlaska', 'MapServer', 'This map shows the 2011 TRI-reporting facilities and the pounds per year of TRI-listed chemicals released, or disposed of, on land at the facility location.  Disposal categories illustrated on the map include: \n\tUnderground Injection Class I wells \n\tDisposal in Underground Injection Class II-V Wells\n\tRCRA Subtitle C Landfills\n\tOther Landfills \n\tLand Treatment/Application Farming \n\tRCRA Subtitle C Surface Impoundments \n\tOther Surface Impoundments \n\tOther Disposal \n'], ['R10', 'Region10Land', 'MapServer', 'This map shows the 2011 TRI-reporting facilities and the pounds per year of TRI-listed chemicals released, or disposed of, on land at the facility location.  Disposal categories illustrated on the map include: \n\tUnderground Injection Class I wells \n\tDisposal in Underground Injection Class II-V Wells\n\tRCRA Subtitle C Landfills\n\tOther Landfills \n\tLand Treatment/Application Farming \n\tRCRA Subtitle C Surface Impoundments \n\tOther Surface Impoundments \n\tOther Disposal \n'], ['R10', 'Region10TotalsAlaska', 'MapServer', 'Contains the Total TRI On-Site releases reported by Burough for Alaska in 2011.\n'], ['R10', 'Region10Totals', 'MapServer', 'Contains the Total TRI releases reported by County for 2011.\n'], ['R10', 'Region10WaterAlaska', 'MapServer', 'This map shows the pounds per year of TRI-listed chemicals released to water in 2011 by TRI-reporting facilities, including discharges to streams, rivers, lakes, oceans and other bodies of water. These releases include those from contained sources, such as industrial process outflow pipes or open trenches. Releases due to runoff, including storm water runoff, are also reported to TRI as surface water discharges.'], ['R10', 'Region10Water', 'MapServer', 'This map shows the pounds per year of TRI-listed chemicals released to water in 2011 by TRI-reporting facilities, including discharges to streams, rivers, lakes, oceans and other bodies of water. These releases include those from contained sources, such as industrial process outflow pipes or open trenches. Releases due to runoff, including storm water runoff, are also reported to TRI as surface water discharges.'], ['R1AUL', 'EPA_Restricted_Use_fileGDB', 'MapServer', 'Displays Superfund National Priorities List (NPL) and RCRA Corrective Action point locations and site/facility and Activity and Use Limitation (AUL) Boundaries when available.  '], ['r4', 'HCZ', 'MapServer', "The Hydrologically Connected Zone (HCZ) mask is a grid file indicating all surface water features, including, lakes, rivers, streams, wetlands, estuaries, and nearshore ocean waters, as mapped in the 1:100,000-scale; plus all contiguous areas that have a wetness index value of 550 or greater.  The HCZ is determined using grid analysis to combine surface water features of three datasets.  First, the surface water features from the 2011 National Land Cover Database (NLCD).  Features included are 'Open Water' (code 11), 'Woody Wetlands' (code 90) and 'Emergent Herbaceous Wetlands' (code 95). Source data used was the NLCD2011 version 1 (see NLCD2011 metadata).  Second, the flowline and waterbody features as represented in the catseed grid from the National Hydrography Dataset (NHD) Plus version 2. Source data used was NHD Plus Version 2.1, downloaded October 31, 2012 (see NHD Plus Version 2 metadata). The combination of these two datasets represents surface water and is referred to as the \xe2\x80\x98Water Mask\xe2\x80\x99 (see Water Mask metadata).  Third, all areas contiguous to surface water that also has a wetness index value of 550 or greater. The wetness index, also known as the compound topographic index (CTI), is a steady state wetness index. It is commonly used to quantify topographic control on hydrological processes (see Wetness Index metadata). The combination of these three datasets represents the HCZ.  A cell value of one indicates the cell is a surface water feature and/or in the hydrologically connected zone.  Because the HCZ is based on a topographic moisture index rather than as a zone of assigned proximity to waters mapped at 1:100,000 scale, it can differ substantially from the Riparian zone; such as, when river floodplains far exceed the Riparian Zone\xe2\x80\x99s standard 100 meters-per-side width, or when moist HCZ areas occur along small tributaries not mapped at 1:100,000 scale (see also Riparian Zone)."], ['r4', 'RZ', 'MapServer', "The Riparian Zone mask is a grid file that identifies all surface water features; including, lakes, rivers, streams, wetlands, estuaries, and nearshore ocean waters, as mapped in the 1:100,000-scale; plus an approximate 100 meter buffer around these features.  The Riparian Zone is created using grid analysis to combine two surface water indicators and then place an approximate 100 meter buffer around these features.  First, the surface water features from the 2011 National Land Cover Database (NLCD).  Features included are 'Open Water' (code 11), 'Woody Wetlands' (code 90) and 'Emergent Herbaceous Wetlands' (code 95).  Source data used was NLCD2011 version 1, (see NLCD2011 metadata). Second, the flowline and waterbody features as represented in the catseed grid from the National Hydrography Dataset (NHD) Plus version 2.  Source data used was NHD Plus Version 2.1, downloaded October 31, 2012 (see NHD Plus version 2 metadata). The combination of these two datasets represents surface water and is referred to as the \xe2\x80\x98Water Mask\xe2\x80\x99 (see Water Mask metadata). Last, distance from surface water is calculated using the ArcMap Spatial Analyst Euclidean Distance tool.  All cells with a distance of 108 meters or less are included in the riparian zone.  The combination of these two datasets and all cells with a distance of 108 meters or less from surface water are given a value of one and are included in the Riparian Zone (RZ) mask.  A value of 1 indicates the cell is a surface water feature or in the riparian zone. "], ['r4', 'WaterMask', 'MapServer', "The Water Mask is a grid file indicating all surface waters; including, lakes, rivers, streams, wetlands, estuaries, and nearshore ocean waters, as mapped in the 1:100,000-scale. The Water Mask is created using grid analysis to combine the surface water features of two datasets.  First, the surface water features from the 2011 National Land Cover Database (NLCD).  Features included are 'Open Water' (code 11), 'Woody Wetlands' (code 90) and 'Emergent Herbaceous Wetlands' (code 95). Source data used was NLCD2011 version 1 (see NLCD metadata for more information). Second, the flowline and waterbody features as represented in the catseed grid from the National Hydrography Dataset (NHD) Plus version 2. Source data used was NHD Plus Version 2.1, downloaded October 31, 2012 (see NHD Plus Version 2.1 metadata for more information). A cell value of 1 in the grid indicates that the cell represents surface water. The combination of these two datasets into a grid represents surface water and is referred to as the Water Mask."], ['r4', 'Watersheds', 'MapServer', 'This map contains the Hydrologic Unit Codes (HUC) and geometry used in the Watershed Index Online Tool (WSIO). It is intended to be used with the tool during the HUC selection process. All layers have been simplified to optimize drawing performance, therefore the boundaries are not perfect, but they do give the user a quick and useful visual as to where the HUCs are located.'], ['r4', 'WatershedTable_Impervious', 'MapServer', 'This map service show impervious cover indicator data developed for the Watershed Online Index Tool .'], ['r4', 'WatershedTable', 'MapServer', 'Watershed based indicators to support for Watershed Online Index Tool'], ['r4', 'WSIO', 'MapServer', 'Watershed based indicators to support for Watershed Online Index Tool'], ['r6', 'albuquerquenmurbanwaters', 'MapServer', 'EPA Region 6 - Albuquerque, NM Urban Waters'], ['r7', 'westlake_overview', 'MapServer', ''], ['R9MarineDebris', 'ER1402150_MarineDebrisData', 'MapServer', 'Marine debris, also known as marine litter, is human-created waste that has deliberately or accidentally been released in a lake, sea, ocean or waterway. This map shows recorded observations of Marine Debris.'], ['R9MarineDebris', 'LosAngeles_ApproachingZeroTrash', 'MapServer', 'To address the imapairment the Los Angeles River, a Total Maximum Daily Load (TMDL), which establishes baseline trash loads to the river from the watershed, has been incorporated into the area stormwater permit. The permit requires each permittee to implement trash reduction measures for discharges through the storm drain system with an emphasis on the installation of full capture devices. The stormwater permit incorporates progressive reductions in trash discharges to the Los Angeles River, reaching a zero level in 2016.'], ['R9MarineDebris', 'SanFranciscoBayArea_BaselineTrashLoadEstimate', 'MapServer', 'To meet trash reduction milestones over the next decade. A trash reduction crediting program will be used to account for best management practice effectiveness. The permit establishes goals for trash reduction beginning in 2014 and reaching a zero level by 2022.'], ['R9Watersheds', 'CaNPSControlPrjs', 'MapServer', 'The California Nonpoint Source (NPS) Program allocates CWA Section 319 funding from the U.S. EPA to support water quality projects.'], ['R9Watersheds', 'Funding', 'MapServer', ''], ['R9Watersheds', 'ImpairedWaterQuality', 'MapServer', ''], ['R9Watersheds', 'LandUse', 'MapServer', ''], ['R9Watersheds', 'PollutionSources', 'MapServer', ''], ['R9Watersheds', 'Rivers', 'MapServer', ''], ['R9Watersheds', 'SanFranciscoBayWaterQualityImprovementFund', 'MapServer', ''], ['R9Watersheds', 'Tribes_Communites_SuccessStories', 'MapServer', ''], ['R9Watersheds', 'Watersheds', 'MapServer', 'Region 9 - San Francisco Watersheds'], ['R9Watersheds', 'Wetlands', 'MapServer', ''], ['Region9', 'ADMA_2015_Admin_Bndys', 'MapServer', 'Administrative Boundaries - as of February 11, 2015.  Administrative boundaries include; Counties, Tribal Lands, R9 Air Districts, California Air Basins, CBSA, Class 1 for Native American, US Forest Service and National Park Service.'], ['Region9', 'ADMA_2015_AQS_Design_Value', 'MapServer', 'Air Quality Systems (AQS) 2011-2013 Design Value Data - as of February 11, 2015.  A design value is a statistic that describes the air quality status of a given location relative to the level of the National Ambient Air Quality Standards (NAAQS).'], ['Region9', 'ADMA_2015_Designated_Areas', 'MapServer', 'Designated Areas - as of February 11, 2015.  A designation is the term EPA uses to describe the air quality in a given area for any of six common air pollutants known as criteria pollutants. After EPA establishes or revises a primary and/or secondary National Ambient Air Quality Standard (NAAQS), the Clean Air Act requires EPA to designate areas as \xe2\x80\x9cattainment\xe2\x80\x9d (meeting), \xe2\x80\x9cnonattainment\xe2\x80\x9d (not meeting), or \xe2\x80\x9cunclassifiable\xe2\x80\x9d (insufficient data) after monitoring data is collected by state, local and tribal governments. Once nonattainment designations take effect, the state and local governments have three years to develop implementation plans outlining how areas will attain and maintain the standards by reducing air pollutant emissions. '], ['Region9', 'EJ_Screening_Methods_Comparison_San_Joaquin_Valley', 'MapServer', 'Comparison of map patterns of scores for Environmental Justice Screening Method (EJSM), CalEnvironscreen (CES), and Cumulative Environmental Vulnerability Assessment (CEVA) for the eight county San Joaquin Valley area. Includes comparison of high scores, areas where all three methods agree on both high scores and high subscores for hazard proximity and pollution exposure.'], ['Region9', 'LND1502226Counties', 'MapServer', 'Administrative Area Boundaries 3 (County Boundaries) for Region 9.'], ['Region9', 'LND1502226LeakingUST', 'MapServer', 'In 1986, Congress amended Subtitle I of the Solid Waste Disposal Act, directing EPA to regulate Underground Storage Tanks (USTs). EPA directly implements the UST leak prevention program and the Leaking Underground Storage Tank (LUST) cleanup program in Indian Country. EPA Region 9 maintains this map to document the location of open and closed LUST cases in Region 9 Indian Country. Links are provided to No Further Action letters for closed LUST cases.'], ['Region9', 'LND1502226States', 'MapServer', 'Administrative Area Boundaries 2 (State Boundaries) for Region 9. '], ['Region9', 'LND1502252_1EPATribalActiveGrants2015', 'MapServer', 'Map shows Tribal Lands in EPA Region 9 and provides geospatial data for the purpose of managing and communicating information about current EPA project officers, tribal contacts, and tribal grants, both internally and with external stakeholders.\n\n <A href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid=%7B2834055E-F4A9-4ED2-AE66-DA71EFF29CC5%7D">Full Metadata</A>'], ['Region9', 'Navajo_Nation_Administrative_Boundaries', 'MapServer', 'Administrative boundary data from the Navajo Abandoned Uranium Mines project.Map includes Navajo Nation Administrative Boundaries, Agencies, Districts, Chapters and Abandoned Uranium Mine Regions.\n\n<br><a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={0F604D10-03DF-4918-B9CF-B61645D60F2D}">Full Metadata</a>. Map includes Navajo Nation Administrative Boundaries, Agencies, Districts, Chapters and Abandoned Uranium Mine (AUM) Regions.\n'], ['Region9', 'R9HomeViewBoundaries', 'MapServer', 'Full Metadata. Map of various boundaries and jurisdictions in Region 9 - including state, county, city, tribal, congressional, US Coast Guard boundaries, and the border with Mexico.\n'], ['Region9', 'R9HomeViewCadastral', 'MapServer', 'Public Land Survey (PLS) Township, section and quarter section data for EPA Region 9.\n\n\nR9 HV Cadastral\n<a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={762F0C50-7EB1-47E5-8FA2-A74AD3ADF32C}">Full Metadata</a>.  Township, section and quarter section data for EPA Region 9.\n'], ['Region9', 'R9HomeViewCensus', 'MapServer', '\nR9 Census\n<a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={45916641-BA98-4D1C-85E5-EB7972399D43}">Full Metadata</a>. Map of various Census - related information from 2010. Data include Tracts (Population Density), Block groups, and the Social Vulnerability Index from Arizona.\n'], ['Region9', 'R9HomeViewClimateMeteorological', 'MapServer', 'Climate and Meteorological layers for Region 9\n\n<a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={6CA65C83-A71F-4255-8D55-84F7EAC9ECEA}">Full Metadata</a>. Climate Metorological Data for Region 9, including Average Rainfall, Average Wind Potential, and US Solar Potential.\n'], ['Region9', 'R9HomeViewEducation', 'MapServer', '<a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={7E18D4E7-7C41-4C2A-9167-307DDE908FD0}">Full Metadata</a>. Region 9 Education data - including public and private schools as well as colleges and universities.\n'], ['Region9', 'R9HomeViewGeology', 'MapServer', 'Geology and seismic data for the EPA Region 9. Data include siesmic hazards, spectral and ground acceleration.\n<br>\n<a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={DEFF3BB3-47CB-4354-A953-430B818E5EC2}">Full Metadata</a>. Geology and seismic data for the EPA Region 9. Data include siesmic hazards, spectral and ground acceleration.\n'], ['Region9', 'R9HomeViewMilitary', 'MapServer', '\nR9 HV Military\nFull Metadata. Millitary Facilities within Region 9\n'], ['Region9', 'R9HomeViewNaturalResources', 'MapServer', 'Wetland areas in EPA Region 9.\n\n<br><a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={937EFE37-1EE0-4BA0-99D6-AD6008BA6DFC}">Full Metadata</a>. Wetlands within EPA Region 9\n'], ['Region9', 'R9HomeViewWaterHydrology', 'MapServer', 'Region 9 Hydrology Data - includes Wild and Scenic Rivers, Dams, Bridges, Lakes, and Tunnels.\n\n<br><a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={F8091661-10CD-4449-B75D-2DC716ACED0A}">Full Metadata</a>. Region 9 Hydrology Data - includes Wild and Scenic Rivers, Dams, Bridges, Lakes, and Tunnels.\n'], ['Region9', 'R9NNAUMFederalLandStatus', 'MapServer', 'Federal Land Status data from the Navajo Abandoned Uranium Mines project. \n\n<br><a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={CB22F858-4CAD-44ED-8B7D-D7CA5B02A4D1}">Full Metadata</a>. Map of public and private lands in Region 9 for use in association with Navajo Nation AUM project.\n'], ['Region9', 'R9NNAUMGeology', 'MapServer', 'Geology data from the Navajo Abandoned Uranium Mines project. Map of geologic features on and near the NNAUM. Data include geology (rock type and age) and mining district info.\n\n<br><a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={203CA2A4-3E96-4511-9431-1D144F2E95FB}">Full Metadata</a>. Map of geologic features on and near the NNAUM. Data include geology (rock type and age) and mining district info. For use in association with Navajo Nation AUM project.\n'], ['Region9', 'R9NNAUMRadiation', 'MapServer', 'Radiation sampling data from the Navajo Abandoned Uranium Mines project.\n\n<br><a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={D95B570E-1EEB-4602-9A4F-589A2CA6DDB7}">Full Metadata</a>. Map of radiation on the Navajo Reservation. Maps show excess Bi214 Polygons and Flight Areas. For use in association with Navajo Nation AUM project.\n'], ['Region9', 'R9NNAUMSampling', 'MapServer', 'A variety of water sampling data from the Navajo Abandoned Uranium Mines project.\n\n<br><a href="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={D34C7D7D-6C90-4CF7-82D3-FD4A8A44AFB8}">Full Metadata</a>. Water sampling on and near the Navajo Reservation. For use in association with Navajo Nation AUM project.\n'], ['Region9', 'R9TribalBnds', 'MapServer', 'METADATA'], ['Region9', 'TernIslandData', 'MapServer', 'A collection of Data extracted from the Draft Technical Support Document to the Preliminary Assement for the FWS - Hawaiian Islands National Wildlife Refuge:  Tern Island'], ['Region9', 'TernIslandImageryWM', 'MapServer', 'This is a licensed dataset from DigitalGlobe, Inc. USDA-NRCS-National Geospatial Center of Excellence acquired this dataset from the NOAA-Pacific Services Center. NOAA has purchased a Enterprise Premium license for this Orthoimagery dataset from DigitalGlobe, Inc. Any government, education, not-for-profit agency and public/individuals not engaged in using the "Product for Commercial Exploitation or Commercial Purposes" can use this licensed data. Use of this product for Commercial Purposes by a person/company/organization for a profit or fee is strictly prohibited. This dataset cannot be re-sold. Please refer to the separately attached license from DigitalGlobe, Inc. for additional information. Digital orthoimagery combines the image characteristics of a digital image with the geometric qualities of a map. The primary dynamic digital orthophoto is a 50 centimeter ground resolution, image cast to the customer specified projection and datum defined in the Spatial Reference Information section of this metadata document. The overedge is included to facilitate tonal matching for mosaicking and ensure full coverage if the imagery is reprojected. The normal orientation of data is by lines (rows) and samples (columns). Each line contains a series of pixels ordered from west to east with the order of the lines from north to south. DigitalGlobe WorldView-2 Satellite Orthoimagery was delivered to NOAA in GeoTIFF file format. This specific dataset was delivered to NOAA orthorectified to scale 1:12,000. This GeoTIFF composite contains the following four Multi-Spectral bands: Band 1: Blue (450 - 510 nm), Band 2: Green (510 - 580 nm), Band 3: Red (625 - 690 nm) and (585 - 625 nm) and Band 4: Color Infrared 1/NIR 1 (770 - 895 nm).'], ['SFBayWQIF', 'ImpairedWaterQuality', 'MapServer', 'Under section 303(d) of the Clean Water Act, states, territories, and authorized tribes are required to develop lists of impaired waters. These are waters that are too polluted or otherwise degraded to meet the water quality standards set by states, territories, or authorized tribes. The law requires that these jurisdictions establish priority rankings for waters on the lists and develop TMDLs for these waters. A Total Maximum Daily Load, or TMDL, is a calculation of the maximum amount of a pollutant that a waterbody can receive and still safely meet water quality standards.'], ['SFBayWQIF', 'SanFranciscoBayWaterQualityImprovementFund_2015', 'MapServer', 'EPA manages a competitive grant program to support projects to protect and restore San Francisco Bay. This grant program, known as the San Francisco Bay Water Quality Improvement Fund (SFBWQIF) began in 2008. The SFBWQIF has invested over $40 million in 58 projects through 33 grant awards. These projects include over 70 partners who are contributing an additional $149 million to restore wetlands and watersheds, and reduce polluted runoff.'], ['SFBayWQIF', 'SanFranciscoBayWaterQualityImprovementFund', 'MapServer', "The San Francisco Bay Water Quality Improvement Fund (SFBWQIF) has invested over $32 million in 53 projects across the Bay region since 2008. Since the Fund's inception, EPA's investments have been matched with another $105 million from 71 partner agencies and organizations to restore wetlands and watersheds, and reduce polluted runoff."], ['SFBayWQIF', 'SFBA_MajorRivers_Tributaries', 'MapServer', "These data were extracted from the National Hydrography Dataset (NHD) which is a feature-based database that interconnects and uniquely identifies the stream segments or reaches that make up the nation's surface water drainage system"], ['SFBayWQIF', 'SFBWQIF_Counties_Watershed', 'MapServer', 'These data layers represent CA counties and the Bay Area Watersheds. These data layers aid in identifying counties and watersheds where the grant projects occur.\n\n<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={6AA09044-B295-4173-918D-0CFE505D040C}" target="_blank">Watershed-Metadata</A>\n\n<A HREF="https://edg.epa.gov/metadata/catalog/search/resource/details.page?uuid={BA355E57-B40B-4839-BE23-969C3DCB5978}" target="_blank">Counties-Metadata</A>'], ['SFBayWQIF', 'Wetlands', 'MapServer', 'The NHD is a national framework for assigning reach addresses to water-related entities, such as industrial discharges, drinking water supplies, fish habitat areas, wild and scenic rivers. Reach addresses establish the locations of these entities relative to one another within the NHD surface water drainage network, much like addresses on streets. Once linked to the NHD by their reach addresses, the upstream/downstream relationships of these water-related entities--and any associated information about them--can be analyzed using software tools ranging from spreadsheets to geographic information systems (GIS). '], ['SFBayWQIF', 'WetlandsSFEI', 'MapServer', "BAARI can be used to track changes in the amount, extent and condition of aquatic resources, serve as the base map for environmental monitoring study designs, and support resource planning and management efforts. BAARI is viewable on EcoAtlas, where users can browse the area's aquatic features and restoration projects on an interactive map."], ['Utilities', 'Geometry', 'GeometryServer', ''], ['Utilities', 'PrintingTools', 'GPServer', 'The PrintingTools service is used by web application developers to export the contents of a webmap to pdf, jpeg, png or other formats. This service is generally used in the context of providing applications with printing functionality.']]
