// Mockup items =============================================================

//Expose dashboard especially helpful for debugging
var egam = {};
egam.gpoItems = {
  resultSet: [],
  rowModel: null,
  dataTable: null
};

$(document).ready(function() {

  $(document).on('click', '.nav-sidebar li', function() {
    $(".nav-sidebar li").removeClass("active");
    $(this).addClass("active");

    // alert($(this).find(":first").attr("id"));
    var view = $(this).find(":first").attr("id");
    $('#' + view + 'View').collapse('show');

    $('.view').not(document.getElementById(view)).collapse('hide');

  });

  $('#myModal').on('shown.bs.modal', function(e) {

    //validate everytime the form opens
    //$('#modalForm').validator('validate');

  });


});

// Fill table with data queried out of Mongo via Express/Monk
function populateTable(vTable, query) {

  //    console.log(vTable);
  //    console.log(query);
  var tableContent = '';
  //for query pass a string because things like null were being converted to empty string
  query = JSON.stringify(query)

  // jQuery AJAX call for JSON
  $.getJSON('/gpoitems/list', {
    query: query
  }, function(data) {
    console.log(data);

    ko.applyBindings({
      content: data
    });

    //function AppViewModel(){
    //    var self = this;
    //    self.people = ko.observableArray(data);
    //
    //    self.update = function(){
    //
    //    };
    //
    //};
    //
    //ko.applybindings(new AppViewModel());



  });

};


function rowSelect(x) {
  alert(x.rowIndex);
  //alert("hello");

  //alert(gpoData[x.rowIndex-1].title);
  //$('#myModal').modal('show');
};

//populate tables for GPO User view
function populateUserTables(query, projection, isTest) {
  query = JSON.stringify(query);
  projection = JSON.stringify(projection);

  var utoken = egam.portalUser.credential.token;

  //Use this so we know when everything is loaded
  var defer = $.Deferred();

  // jQuery AJAX call for JSON
  $.getJSON('/gpoitems/list', {
    query: query,
    projection: projection
  }, function(data) {
    egam.gpoItems.resultSet = data;
    //If paging then data.results is array of data
    var dataResults = data;
    if ("results" in data) dataResults = data.results;

    var rowModel1 = function(i, loading) {
      var self = this;
      this.loading = loading || false;
      //This is the doc
      this.doc = ko.mapping.fromJS(i);

      this.complianceStatus = ko.computed(function() {
        return this.doc.AuditData.compliant() ? 'Pass' : 'Fail'
      }, this);

      //computed thumbnail url
      this.tnURLs = ko.computed(function() {
        return "http://epa.maps.arcgis.com/sharing/rest/content/items/" + self.doc.id() + "/info/" + self.doc.thumbnail() + "?token=" + utoken;
      }, this);

      //Doc of changed fields
      this.changeDoc = {};

      //Subscribes Setup
      this.doc.title.subscribe(function(evt) {
        this.execAudit("title");
        this.addFieldChange("title", evt);
      }.bind(this));

      this.doc.snippet.subscribe(function(evt) {
        this.execAudit("snippet");
        this.addFieldChange("snippet", evt);
      }.bind(this));

      this.doc.description.subscribe(function(evt) {
        this.execAudit("description");
        this.addFieldChange("description", evt);
      }.bind(this));

      this.doc.licenseInfo.subscribe(function(evt) {
        this.execAudit("licenseInfo");
        this.addFieldChange("licenseInfo", evt);
      }.bind(this));

      this.doc.accessInformation.subscribe(function(evt) {
        this.execAudit("accessInformation");
        this.addFieldChange("accessInformation", evt);
      }.bind(this));

      this.doc.url.subscribe(function(evt) {
        this.execAudit("url");
        this.addFieldChange("url", evt);
      }.bind(this));

      this.doc.tags.subscribe(function(evt) {
        this.execAudit("tags");
        this.addFieldChange("tags", this.doc.tags());
      }.bind(this), null, 'arrayChange');

      //Add and field that has changed to the changeDoc
      this.addFieldChange = function(changeField, changeValue) {
        this.changeDoc["id"] = this.doc.id();
        this.changeDoc[changeField] = changeValue;
        //alert(JSON.stringify(this.changeDoc));
      };

      //this.tnURLs.subscribe(function(){
      //  alert("Change");
      //  this.execAudit("thumbnail");
      //}.bind(this));

      //Execute Audit on specified field in doc
      this.execAudit = function(auditField) {
        var unmappedDoc = ko.mapping.toJS(this.doc);
        var auditRes = new Audit();
        auditRes.validate(unmappedDoc, auditField);
        ko.mapping.fromJS(unmappedDoc, this.doc);
      };

      //tags
      this.tagItemToAdd = ko.observable("");
      this.selectedItems = ko.observableArray([""]);
      //Add tag to tags array
      this.addItem = function() {
        //alert("here");
        if ((this.selected().tagItemToAdd() != "") && (this.selected().doc.tags.indexOf(this.selected().tagItemToAdd()) < 0)) // Prevent blanks and duplicates
          this.selected().doc.tags.push(this.selected().tagItemToAdd());
        this.selected().tagItemToAdd(""); // Clear the text box
      };
      //Remove tag from tags array
      this.removeSelected = function() {
        this.selected().doc.tags.removeAll(this.selected().selectedItems());
        this.selected().selectedItems([]); // Clear selection
      };

      //Post updated docs back to Mongo
      this.postback = function() {
        //alert("Posting");


        //Original Audit of full Doc
        var unmappedDoc = ko.mapping.toJS(this.selected().doc);

        //need to add thumbnail name to document before auditing
        //var thumbnail = $('#thumbnail')[0].files[0];
        //if (thumbnail && thumbnail.name) unmappedDoc.thumbnail = "thumbnail/" + thumbnail.name;

        var auditRes = new Audit();
        auditRes.validate(unmappedDoc, "");
        ko.mapping.fromJS(unmappedDoc, this.selected().doc);

        //alert(JSON.stringify(this.selected().changeDoc));

        var mydata = new FormData();
        mydata.append("updateDocs", JSON.stringify(this.selected().changeDoc));
        //mydata.append("updateDoc", unmappedDoc);
        mydata.append("thumbnail", thumbnail);
        $.ajax({
          url: 'gpoitems/update',
          type: 'POST',
          data: mydata,
          cache: false,
          dataType: 'json',
          processData: false, // Don't process the files
          contentType: false, // Set content type to false as jQuery will tell the server its a query string request
          success: function(data, textStatus, jqXHR) {
            if (data.errors.length < 1) //will need to change to data.errors.length when merged back to sprint 3
            {
              // Success so call function to process the form
              console.log('success: ' + data);
              //refresh the data table so it can search updated info
              //              egam.gpoItems.dataTable.destroy();
              egam.gpoItems.dataTable.fnDestroy();
              renderGPOitemsDataTable();
            } else {
              // Handle errors here
              console.log('ERRORS: ' + data);
            }
          },
          error: function(jqXHR, textStatus, errorThrown) {
            // Handle errors here
            console.log('ERRORS: ' + textStatus);
            // STOP LOADING SPINNER
          }
        });
        console.log("Post back updated Items");
      };


    };

    var RootViewModel = function(data) {
      var self = this;

      self.content = ko.observableArray(data.map(function(i) {
        //return new rowModel(i.id, i.title, i.type, i.description, i.tags, i.snippet, i.thumbnail, i.accessInformation, i.licenseInfo, i.access, i.numViews
        //    , i.owner, i.url, i.AuditData.compliant, i);
        //var rowModel1 = ko.mapping.fromJS(i);
        return new rowModel1(i);
      }));

      self.select = function(item) {
        self.selected(item);
      };

      self.selected = ko.observable(self.content()[0]);



      self.add = function(data) {
        //Use this so we know when everything is loaded
        var defer = $.Deferred();

        var array = $.extend([], self.content());

        //This lets thing work async style so that page is not locked up when ko is mapping
        //Maybe use an async library later
        var i = 0;
        var interval = setInterval(function() {
          if (data.length > 0) {
            self.content.push(new rowModel1(data[i], true));
          }
          i += 1;
          if (i >= data.length) {
            defer.resolve();
            clearInterval(interval);
          }
        }, 0);

        //        self.content(array);
        console.log("done adding " + array.length);
        return defer;
      };

      //Leave these in here for now so they get checked into repo. Can remove after in repo
      self.addPushAll = function(data) {
        //Use this so we know when everything is loaded
        var defer = $.Deferred();

        //This lets thing work async style so that page is not locked up when ko is mapping
        //Maybe use an async library later
        var interval = setInterval(function() {
          var array = data.map(function(i) {
            return new rowModel1(i)
          });

          ko.utils.arrayPushAll(self.content, array);

          defer.resolve();
          clearInterval(interval);
        }, 0);

        return defer;
      };

      self.addPushRedefine = function(data) {
        //Use this so we know when everything is loaded
        var defer = $.Deferred();

        var array = $.extend([], self.content());

        //This lets thing work async style so that page is not locked up when ko is mapping
        //Maybe use an async library later
        var i = 0;
        var interval = setInterval(function() {
          if (data.length > 0) {
            array.push(new rowModel1(data[i], true));
          }
          i += 1;
          if (i >= data.length) {
            console.log("before setting" + array.length);
            setTimeout(function() {
              self.content(array);
            }, 0);
            console.log("done setting" + array.length);
            defer.resolve();
            clearInterval(interval);
          }
        }, 0);

        //        self.content(array);
        console.log("done adding " + array.length);
        return defer;
      };

    };

    var rowModelTest = function(i, loading) {
      //Test limited row model that doesn't do knockout observables
      var self = this;
      this.doc = i;
      this.compliant = i.AuditData.compliant;
      this.doc.AuditData.compliant = function() {
        return self.compliant
      };

      this.complianceStatus = function() {
        return self.compliant ? 'Pass' : 'Fail'
      };
      this.loading = loading || false;
    };


    if (egam.gpoItems.rowModel) {
      egam.gpoItems.rowModel.add(dataResults)
        .then(function() {
          console.log("Create data table");
          setTimeout(function() {
            if (egam.gpoItems.dataTable && "fnDestroy" in egam.gpoItems.dataTable) egam.gpoItems.dataTable.fnDestroy();
            renderGPOitemsDataTable()
              .then(function(dt) {
                egam.gpoItems.dataTable = dt;
                defer.resolve()
              });
          }, 0);
        });
    } else {
      egam.gpoItems.rowModel = new RootViewModel(dataResults);
      // This would only bind the table
      //      ko.applyBindings(egam.gpoItems.rowModel,$("#gpoitemtable1")[0]);
      ko.applyBindings(egam.gpoItems.rowModel);

      defer.resolve();
    }

    //    if (egam.gpoItems.dataTable && "destroy" in egam.gpoItems.dataTable) egam.gpoItems.dataTable.destroy();
    //    egam.gpoItems.dataTable = renderGPOitemsDataTable(defer);

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



  });

  return defer;

}

function renderGPOitemsDataTable(defer) {
  //apply data table magic, ordered ascending by title
  //Use this so we know when table is rendered
  var defer = $.Deferred();

  $('#gpoitemtable1').DataTable({
    "order": [
      [0, "desc"]
    ],

    initComplete: function() {
      $("#gpoitemtable1").addClass("loaded");
      console.log("INIT Compplete");
      this.api().columns().every(function() {

        var column = this;
        var select = $(column.footer()).find("select.search");
        addSelectEventHandler(select);
        select = $(column.header()).find("select.search");
        addSelectEventHandler(select);

        function addSelectEventHandler(select) {
          if (select.length > 0) {
            select.on('change', function() {
              var val = $.fn.dataTable.util.escapeRegex(
                $(this).val()
              );
              column.search(val ? '^' + val + '$' : '', true, false)
                .draw();
            });

            //If first item has data-search then have to map out data-search data
            var att = column.nodes().to$()[0].attributes;
            if ("data-search" in att) {
              var selectData = {};
              column.nodes().each(function(node, index) {
                var data = node.attributes["data-search"].value;
                selectData[data] = data;
              });
              selectData = Object.keys(selectData);
              selectData.sort();
              selectData.forEach(function(data, index) {
                //Only add unique items to select in case already in there
                if (!select.find("option[value='" + data + "']").length > 0) {
                  select.append('<option value="' + data + '">' + data + '</option>')
                }
              });
            } else {
              //Simply just use data which is contents of cell
              column.data().unique().sort().each(function(data, index) {
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
    }

  });
  return defer;
}