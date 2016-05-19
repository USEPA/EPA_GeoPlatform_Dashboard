if (!egam) egam = {};
egam.gpoItems = {
  data: null,
  model: null,
  dataTable: null,
  tableElement: $("#gpoItemsTable")
};

//Only these fields will be returned from gpoItems/list endpoint
egam.gpoItems.resultFields = {
  id: 1,
  title: 1,
  description: 1,
  tags: 1,
  thumbnail: 1,
  snippet: 1,
  licenseInfo: 1,
  accessInformation: 1,
  url: 1,
  AuditData: 1,
  numViews: 1,
  modified: 1,
  type: 1,
  owner: 1,
  access: 1,
  EDGdata: 1
};

egam.gpoItems.init = function (query, projection) {
  var self = this;
  //Only run init once for gpoItems page/model
  if (this.model) return;
//Populate table for GPO User's Items View
  query = JSON.stringify(query);
//Projection in Mongo/Monk is what fields you want to return and sorting, offsetting, etc.
  projection = JSON.stringify(projection);

  //Use this so we know when everything is loaded
  var defer = $.Deferred();

  //Do a post because some long query strings were breaking staging server reverse proxy
  //hit our Express endpoint to get the list of items for this logged in user
  console.log("Call Endpoint Start: " + new Date());

  $.ajax({
    type: 'POST',
    url: 'gpoitems/list',
    data: {query: query, projection: projection},
    dataType: 'json',
    timeout: 50,
    success: function(data){
      console.log("Endpoint Data Received : " + new Date());
      //If "limit" passed to the endpoint then return paging info where data is in data.results
      //if only data returned for no paging just save data in same structure
      if ("results" in data) {
        self.data = data;
      } else {
        self.data = {results: data};
      }

      $("#loadingMsgCountContainer").removeClass("hidden");
      $("#loadingMsgCount").text(0);
      $("#loadingMsgTotalCount").text(self.data.results.length);

      //Show the loading message and count. Hide the table.
      $('div#loadingMsg').removeClass('hidden');
      $('div#overviewTable').addClass('hidden');

      //setting up the new PageModel instance with no rows yet
      self.model = new egam.gpoItems.PageModelClass([]);
      console.log("Knockout Model created: " + new Date());

      //If there are no rows in results then don't try to bind
      if (self.data.results.length < 1) return defer.resolve();

      //Add these using .add to push to array
      //data.results is just the array of objects returned by server
      self.model.add(self.data.results);
      //    egam.gpoItems.model.add(data.results,updateLoadingCountMessage)
      console.log("Knockout Model data added: " + new Date());
      ko.applyBindings(egam.gpoItems.model, document.getElementById('overviewTable'));
      console.log("Bindings Applied: " + new Date());
      self.dataTable = self.tableElement.DataTable({"bRetrieve": true});

      self.tableElement.addClass("loaded");
      //Now do all the custom filter stuff to dataTable in scope of dataTable
      egam.gpoItems.customizeDataTable.call(self.dataTable);

      self.calcItemsPassingAudit(self.data.results);

      defer.resolve();

      function updateLoadingCountMessage(index) {
        //Only show every 10
        if (index % 10 === 0) $("#loadingMsgCount").text(index + 1);
      }
    },
    error: function(request, status, err){
      if(status == 'timeout'){
        alert("Timeout!");
        $("#loadingMsgCountContainer").addClass("hidden");
        $("#loadingGraphic").addClass("hidden");

      }
    }
  });

  // $.post('gpoitems/list', {
  //   query: query,
  //   projection: projection
  // }, function (data) {
  //
  //
  // }, 'json');

  //switch view for image upload
  $('.fileinput').on('change.bs.fileinput', function (e) {
    $('#agoThumb').toggle();
    $('#imageUpload').toggle();
  });
  //On modal close with out saving change thumbnail view clear thumbnail form
  $('#gpoItemsModal').on('hidden.bs.modal', function (e) {
    var thumbnailFile = $('#thumbnail')[0].files[0];
    if (thumbnailFile !== undefined) {
      $('#agoThumb').toggle();
      $('#imageUpload').toggle();
      $('.fileinput').fileinput('clear');
    }
  });

  return defer;
};

egam.gpoItems.calcItemsPassingAudit = function (dataResults) {
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
};

egam.gpoItems.customizeDataTable = function () {
  this.columns().every(function () {
    var column = this;
    var headerSelect = $(column.header()).find("select.search");

    //This is the special case for access column that we only want one access at a time
    addSelectEventHandler(headerSelect, column);

    var input = $(column.header()).find("input.search");
    addInputEventHandler(input, column);

  });
  console.log("DataTable customized: " + new Date());

  function addSelectEventHandler(select, column) {
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

  function addInputEventHandler(input, column) {
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

};

egam.gpoItems.runAllClientSideFilters = function () {
  egam.gpoItems.dataTable.api().columns().every(function () {
    var column = this;
    //Don't fire dropAccess handler because it will download again
    if (egam.communityUser.isSuperUser && $(column.header()).hasClass("accessColumn")) return true;

    var headerSelect = $(column.header()).find("select.search");
    if (headerSelect.length > 0) headerSelect.trigger("change");
    var headerInput = $(column.header()).find("input.search");
    if (headerInput.length > 0) headerInput.trigger("change");
  });
};


//This is limited model which is used for the table rows. It is condensed so that table loads faster
egam.gpoItems.RowModelClass = function (doc, index, loading) {
  var self = this;
  this.loading = loading || false;
  //This is the doc

  this.doc = doc;
//to keep track of this row when selected
  this.index = index;

  //This is basically just formatting stuff
  this.complianceStatus = ko.computed(function () {
    return this.doc.AuditData.compliant ? 'Pass' : 'Fail';
  }, this);

  //Format Modified Date
  this.modifiedDate = ko.computed(function () {
    var monthNames = [
      "Jan", "Feb", "Mar",
      "Apr", "May", "Jun", "Jul",
      "Aug", "Sep", "Oct",
      "Nov", "Dec"
    ];

    var modDate = new Date(this.doc.modified);
    return monthNames[modDate.getMonth()] + " " + modDate.getDate() + ", " + modDate.getFullYear();
  }, this);

};

//This is the FULL model which binds to the modal allowing 2 way data binding and updating etc
egam.gpoItems.FullModelClass = function (doc, parent, index) {
  var self = this;
//The pageModel this belows to
  this.parent = parent;
//The index in array for this item
  this.index = index;
  //This is the doc
  this.doc = ko.observable(ko.mapping.fromJS(doc));
  this.doc2 = ko.mapping.fromJS(doc);

  //computed thumbnail url
  this.thumbnailURL = ko.computed(function () {
    if (self.doc().thumbnail() == null) {
      return "img/noImage.png";
    } else {
      return "https://epa.maps.arcgis.com/sharing/rest/content/items/" + self.doc().id() + "/info/" + self.doc().thumbnail() + "?token=" + egam.portalUser.credential.token;
    }
  }, this);

  this.epaKeywords = function () {
  };

  //Link to item in GPO
  this.gpoLink = ko.computed(function () {
    return "https://epa.maps.arcgis.com/home/item.html?id=" + self.doc().id();
  }, this);

  //Doc of changed fields
  this.changeDoc = {};

  //Subscribes Setup
  this.updateFields = ["title", "snippet", "description", "licenseInfo", "accessInformation", "url"];

//condensed this repetitive code
  $.each(this.updateFields, function (index, field) {
    self.doc()[field].subscribe(function (evt) {
      self.execAudit(field);
      self.addFieldChange(field, evt);
    }.bind(self));
  });
//could condense arrays later if have more than one
  this.doc().tags.subscribe(function (evt) {
    self.execAudit("tags");
    self.addFieldChange("tags", self.doc().tags());
  }.bind(this), null, 'arrayChange');

  //Add and field that has changed to the changeDoc
  this.addFieldChange = function (changeField, changeValue) {
    self.changeDoc["id"] = self.doc().id();
    self.changeDoc[changeField] = changeValue;
  };

  //Execute Audit on specified field in doc
  this.execAudit = function (auditField) {
    var unmappedDoc = ko.mapping.toJS(self.doc());
    var auditRes = new Audit();
    auditRes.validate(unmappedDoc, auditField);
    //Note if you are trying to remap observable doc then have to make doc second parameter do NOT do doc(ko.mapping.fromJS(unmappedDoc)). that will lose subscribers on original doc
    ko.mapping.fromJS(unmappedDoc, self.doc());
  };

  //this are the selected Tags that we save so they can be removed
  this.selectedTags = ko.observableArray([""]);
  //Add tag to tags array
  //This is where the tag for each cat being added is stored
  this.tagToAdd = {};
  //This is where function to add Tag for each cat is stored
  this.addTag = {};
  this.addTagByCat = function (cat) {
    //Make sure a tag category exists
    if (!self.tagToAdd[cat]) return false;
    var tagToAdd = self.tagToAdd[cat]();
    // Prevent blanks and duplicates (I guess let a tag=0 since its falsey)
    if ((tagToAdd || tagToAdd==0) && (self.doc().tags().indexOf(tagToAdd) < 0)) {
      //push the tag to the tags array
      self.doc().tags.push(tagToAdd);
    }
    // Clear the text box
    self.tagToAdd[cat]("");
  };

  //I generate the observable for tags to add and the add tag function for each tag category
  //Also storing the Office dropdown value even though it doesn't get acted as a tag but need this to set value of drop. Otherwise Please Select kept getting reset
  this.tagCategories = ['EPA', 'Place', 'Office','Org'];

  $.each(this.tagCategories, function (i, cat) {
    //this is just observable for tag that is being added
    self.tagToAdd[cat] = ko.observable("");
    //This just calls the more generic addTag function which is just convenience for knockout binding
    self.addTag[cat] = function () {
      return self.addTagByCat(cat)
    };
  });

  //Remove tag from tags array
  this.removeSelectedTags = function () {
    self.doc().tags.removeAll(self.selectedTags());
    self.selectedTags([]); // Clear selection
  };

  //Post updated docs back to Mongo
  //Note: just attache the function to the object for now instead of prototype ala: egam.gpoItems.FullModelClass.prototype.update = function () {
  //If attaching to prototype we can't get self from the constructor and click binding will call this from Page Model scope if that is model binded to Modal Div
  //If the object was going to be used a lot and wanted to save memory we could use prototype and wrap .update() call in function in click binding ala : click2: function () {return selected().update()}
  this.update = function () {
    //note self was declared outside in the constructor so this works when called in scope that is not FullModelClass
//note: this is in context of the pageModel calling update
    //need to add thumbnail name to document before auditing
    var thumbnailFile = null;
    try {
      thumbnailFile = $('#thumbnail')[0].files[0];
    } catch (ex) {
    }
    if (!thumbnailFile) {
      console.log('No thumbnail to post');
    } else {
      //Add to to change doc
      self.doc().thumbnail("thumbnail/" + thumbnailFile.name);
      self.addFieldChange("thumbnail", self.doc().thumbnail());
    }
    //var thumbnail = $('#thumbnail')[0].files[0];
    //if (thumbnail && thumbnail.name) unmappedDoc.thumbnail = "thumbnail/" + thumbnail.name;

    var updateDocsJSON = JSON.stringify(self.changeDoc);
    //don't try to update if there is nothing to update
    if (updateDocsJSON == "{}" && !thumbnailFile) return;
    //changeDoc should be cleared for next time
    self.changeDoc = {};

    var mydata = new FormData();
    mydata.append("updateDocs", updateDocsJSON);
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
        if (data.errors < 1) {
          // Success so call function to process the form
          console.log('success: ' + data);

          //refresh the data table now that save went through
          self.parent.items[self.index].doc = ko.mapping.toJS(self.doc());
          //have to update the data AND redraw the table/row also. passing false will not page/sort
          //Updating data will allow data to be refreshed in regards to search and sort. draw just changes html
          egam.gpoItems.dataTable.row([self.index]).data(self.parent.items[self.index]).draw(false)
        } else {
          // Handle errors here
          console.error('ERRORS: ');
          console.error(data.errors);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        // Handle errors here
        console.log('ERRORS: ' + errorThrown);
        // STOP LOADING SPINNER
      }
    });

    console.log("Post back updated Items");
  };

};

//data here is the actual array of JSON documents that came back from the REST endpoint
egam.gpoItems.PageModelClass = function (data) {
  var self = this;

  self.items = data;

  //Have to set authGroups in this context so knockout has access to it from PageModel
  self.authGroups = egam.communityUser.authGroups;

  //This is basically generic way to hit endopint get dataset and store it
  //Example datasets are available authgroups and available tags
  self.dataSets = {};
  self.getDataset = function (name,endpoint) {
    var defer = $.Deferred();

    //If already got avail tags just return don't ajax them again
    if (self.dataSets[name]) {
      defer.resolve(self.dataSets[name]);
      return defer;
    }

    $.ajax({
        url: endpoint,
        dataType: 'json',
        success: function(data, textStatus, jqXHR) {
          self.dataSets[name] = data;
          defer.resolve(self.dataSets[name]);
        },
      });

    return defer;
  };

  self.selectedOfficeOrganizations = ko.observableArray([]);

  self.initializeTags = function() {
    return self.getDataset('availableTags','gpoitems/availableTags')
      .then(function () {
        return self.getDataset('availableAuthgroups','gpoitems/authGroups');
      })
      .then(function () {
        var $officeTagSelect = $('#officeTagSelect');
        //Only add change handler if it doesn't already have one
        if ($._data($officeTagSelect[0]).events && $._data($officeTagSelect[0]).events.change) {
        }else {
        //Only set the change handler once if it doesn't exist otherwise there will be multiple handlers fired on change
        //This also fires right after binding are applied
          $officeTagSelect.change(function() {
            var $orgTagSelect = $('#orgTagSelect');
            var $officeTagSelect = $('#officeTagSelect');

            // Current office selected
            var office = $officeTagSelect.val();
            if (office) {
                  $('#addOrgTag').prop('disabled', false);
                  $orgTagSelect.prop('disabled', false);

                  //Get just the orgs for this one office from all the available tags and set the ko obs array
                  self.selectedOfficeOrganizations(self.dataSets.availableTags.epaOrganizationNames[office]);
            } else {
                // If no office selected then disable the org sub drop and button
                $('#addOrgTag').prop('disabled', true);
                $orgTagSelect.prop('disabled', true);
                self.selectedOfficeOrganizations([]);
            }
          });
        }
      });
  };

  self.selectOrgTags = function() {
    //Find office or region from users first authgroup then select it
    var userAuthGroup = self.dataSets.availableAuthgroups.ids[
      egam.communityUser.authGroups[0]].edgName;
    var office = userAuthGroup;
    if (/REG /.exec(userAuthGroup)) office = 'REG';
    $('#officeTagSelect').val(office).change();
    //If there authGroup is a region then select the region number
    if (office = 'REG' && /REG /.exec(userAuthGroup)) $('#orgTagSelect').val(userAuthGroup);
  };

    //a new observable for the selected row storing the FULL gpoItem model
  self.selected = ko.observable();

  //on the entire table, we need to know which item is selected to use later with modal, etc.
  self.select = function (item) {
    var needToApplyBindings = self.selected() ? false : true;
//    var fullRowModel = self.selectedCache[item.index] || new egam.gpoItems.FullModelClass(item.doc,self,item.index) ;
    var fullRowModel = new egam.gpoItems.FullModelClass(item.doc, self, item.index);
    self.selected(fullRowModel);

    //Now apply binding but first must initialize the tag information

    self.initializeTags()
      .then(function () {
        if (needToApplyBindings) ko.applyBindings(self, document.getElementById('gpoItemsModal'));
      })
      .then(function () {
        return self.selectOrgTags();
      });
  };

  //allows you to select an item based on index, usually index will be coming from row number
  self.selectIndex = function (index) {
    self.select(self.items[index]);
  };

  self.clear = function () {
    self.items.length = 0;
  };

//*****NOTE: Here is command for refreshing the table after .content array has been updated
//It just gets the datatable object with "bRetrieve": true then passing false to draw makes it not page or sort
//not sure if you have to do .row().draw or just .draw() but you would think the former would be faster. not sure
//  $("#gpoitemtable1").DataTable({"bRetrieve": true}).row(0).draw(false)

  //data is an array of documents from the REST endpoint
  self.add = function (data, callback) {
    //Use this so we know when everything is loaded
    var defer = $.Deferred();

    //This lets things work async style so that page is not locked up when ko is mapping
    //Maybe use an async library later
    var i = 0;
    if (1 == 1) {
      for (i == 0; i < data.length; i++) {
//        self.content.push({compliant:ko.observable(data[i].AuditData.compliant),doc:data[i],loading:false,complianceStatus:true,modDate:new Date(data[i].modified)});
//this took 20 seconds vs less than 1 second above
        self.items.push(new egam.gpoItems.RowModelClass(data[i], i, false));
        if (callback) callback(i);
      }
      defer.resolve();
    } else if (1 == 0) {
      var asyncLoop = function (o) {
        var i = -1;

        var loop = function () {
          i++;
          if (i == o.length) {
            o.callback();
            return;
          }
          o.functionToLoop(loop, i);
        };
        loop();//init
      };
      asyncLoop({
        length: data.length,
        functionToLoop: function (loop, i) {
          self.items.push(new egam.gpoItems.RowModelClass(data[i], i, false));
          if (callback) callback(i);
          loop();
        },
        callback: function () {
          console.log('All done!');
          defer.resolve();
        }
      });
    }

    return defer;
  };


};

