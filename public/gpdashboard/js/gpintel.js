//Expose dashboard especially helpful for debugging
var egam = {};
egam.gpoItems = {
  resultSet: [],
  rowModel: null,
  dataTable: null
};

$(document).ready(function () {


  $(document).on('click', '.nav-sidebar li', function () {
    $(".nav-sidebar li").removeClass("active");
    $(this).addClass("active");
    var view = $(this).find(":first").attr("id");
    $('#' + view + 'View').collapse('show');
    $('.view').not(document.getElementById(view)).collapse('hide');
  });

  //onshow event for Item Details modal
  $('#myModal').on('shown.bs.modal', function (e) {
    //console.log("Show Bootstrap modal");
    //$('#descriptionEditor').tinymce( { width: '100%', menubar: false});

  });

  $('#myModal').on('hidden.bs.modal', function (e) {
    //console.log("Hide Bootstrap modal");
    //tinymce.remove();
  });


  //Click event for Help Modal
  $('#egamHelp').on('click', function(e){
    $('#helpModal').modal('show');
  });

  //Add tooltips
  var options = {delay: { "show": 1000, "hide": 100 }};
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


});





// Fill table with data queried out of Mongo via Express/Monk
function populateTable(vTable, query) {

  var tableContent = '';

  //for query pass a string because things like null were being converted to empty string
  query = JSON.stringify(query);

  $.getJSON('gpoitems/list', {
    query: query
  }, function (data) {
    ko.applyBindings({
      content: data
    });
  });
}


//populate tables for GPO User view
function populateUserTables(query, projection) {
  query = JSON.stringify(query);
  projection = JSON.stringify(projection);

  var utoken = egam.portalUser.credential.token;

  //Use this so we know when everything is loaded
  var defer = $.Deferred();

  // jQuery AJAX call for JSON
//  $.getJSON('gpoitems/list', {
// Do a post because some long query strings were breaking staging server reverse proxy
    $.post('gpoitems/list', {
    query: query,
    projection: projection
  }, function (data) {
    egam.gpoItems.resultSet = data;
    //If paging then data.results is array of data
    var dataResults = data;
    if ("results" in data) dataResults = data.results;

    $('#loadingMsgCountContainer').removeClass('hidden');
    $("#loadingMsgCount").text(0);
    $("#loadingMsgTotalCount").text(dataResults.length);


    var rowModel1 = function (i, loading) {
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
          return "../img/noImage.png";
        }else{
          return "https://epa.maps.arcgis.com/sharing/rest/content/items/" + self.doc.id() + "/info/" + self.doc.thumbnail() + "?token=" + utoken;
        }
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
        //alert(JSON.stringify(this.changeDoc));
      };

      //this.tnURLs.subscribe(function(){
      //  alert("Change");
      //  this.execAudit("thumbnail");
      //}.bind(this));

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
        //alert("here");
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
        //alert("Posting");

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
        //mydata.append("updateDoc", unmappedDoc);
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
                //$('#agoThumb').toggle();
                //$('#imageUpload').toggle();
                //$('#thumbnail').fileinput('clear');
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

    var RootViewModel = function (data) {
      var self = this;

      self.content = ko.observableArray(data.map(function (i) {
        return new rowModel1(i);
      }));

      self.select = function (item) {
        self.selected(item);
      };
      self.selectIndex = function (index) {
        var selectedItem = self.content()[index];
        self.selected(selectedItem);
      };

      self.selected = ko.observable();
      if (self.content().length > 0) self.selected = ko.observable(self.content()[0]);

      self.clear = function () {
        self.content().length = 0;
      };

      self.add = function (data, callback) {
        //Use this so we know when everything is loaded
        var defer = $.Deferred();

        //This lets things work async style so that page is not locked up when ko is mapping
        //Maybe use an async library later
        var i = 0;
        var interval = setInterval(function () {
          if (data.length > 0) {
            self.content.push(new rowModel1(data[i], true));
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
            return new rowModel1(i)
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
            array.push(new rowModel1(data[i], true));
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

    var rowModelTest = function (i, loading) {
      //Test limited row model that doesn't do knockout observables
      var self = this;
      this.doc = i;
      this.compliant = i.AuditData.compliant;
      this.doc.AuditData.compliant = function () {
        return self.compliant
      };

      this.complianceStatus = function () {
        return self.compliant ? 'Pass' : 'Fail'
      };
      this.loading = loading || false;
    };


    //Show the loading message and count. Hide the table.
    $('div#loadingMsg').removeClass('hidden');
    $('div#overviewTable').addClass('hidden');
    $("#loadingMsgCountContainer").removeClass('hidden');

    //If first time every binding to table need to apply binding, but can only bind once so don't bind again if reloading table
    var needToApplyBindings = false;
    if (egam.gpoItems.rowModel) {
      //have to actually remove dataTable rows and destroy datatable in order to get knockout to rebind table
      if (egam.gpoItems.dataTable) {
        egam.gpoItems.dataTable.api().clear().draw();
        if ("fnDestroy" in egam.gpoItems.dataTable)
          egam.gpoItems.dataTable.fnDestroy();
      }
      egam.gpoItems.rowModel.content.removeAll();
      console.log("post remove" + egam.gpoItems.rowModel.content().length);
    } else {
      egam.gpoItems.rowModel = new RootViewModel([]);
      needToApplyBindings = true;
    }
    //Add these using .add because it should be async and lock up UI less
    egam.gpoItems.rowModel.add(dataResults, updateLoadingCountMessage)
      .then(function () {
        //If there are no rows then don't try to bind
        if (dataResults.length < 1) return defer.resolve();
        //cluge to make row model work because it is trying to bind rowmodel.selected()
        egam.gpoItems.rowModel.selectIndex(0);
        if (needToApplyBindings) ko.applyBindings(egam.gpoItems.rowModel);

        console.log("Create data table");
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

// This was loading first page and then the rest. Will remove later
//    if (egam.gpoItems.rowModel) {
//      egam.gpoItems.rowModel.add(dataResults)
//        .then(function() {
//          console.log("Create data table");
//          setTimeout(function() {
//            if (egam.gpoItems.dataTable && "fnDestroy" in egam.gpoItems.dataTable) egam.gpoItems.dataTable.fnDestroy();
//            egam.renderGPOitemsDataTable()
//              .then(function(dt) {
//                egam.gpoItems.dataTable = dt;
//                defer.resolve()
//              });
//          }, 0);
//        });
//    } else {
//      egam.gpoItems.rowModel = new RootViewModel(dataResults);
//      // This would only bind the table
//      //      ko.applyBindings(egam.gpoItems.rowModel,$("#gpoitemtable1")[0]);
//      ko.applyBindings(egam.gpoItems.rowModel);
//      defer.resolve();
//    }

    //    if (egam.gpoItems.dataTable && "destroy" in egam.gpoItems.dataTable) egam.gpoItems.dataTable.destroy();
    //    egam.gpoItems.dataTable = renderGPOitemsDataTable();

    //Set up data-search attribute from value on td cell
    //value:doc.AuditData.compliant() ? 'Pass' : 'Fail'
    //Don't need to do this any more just used knockout attr binding to bind data-search
    //Keep this for reference in case need to loop over html table
    //    var i; var j;
    //    var htmlTable = $('#gpoitemtable1')[0];
    //    for (i = 0; i < htmlTable.rows.length; i++) {
    //      var row = htmlTable.rows.item(i);
    //      for (j = 0; j < row.cells.length; j++) {
    //        var cell = row.cells.item(j);
    //        var dataValue = cell.value;
    //        if (dataValue) {
    //          var dataSearch = cell.attributes.getNamedItem("data-search");
    //          var dataSearch = document.createAttribute("data-search");
    //          dataSearch.value=dataValue;
    //          cell.attributes.setNamedItem(dataSearch);
    //        }
    //      }
    //    }


  },'json');
//need to add json type to post since not using getJSON now

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
      console.log("init complete");
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
//                column.search(this.value, true, false)
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