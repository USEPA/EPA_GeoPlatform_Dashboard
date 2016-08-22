if (typeof egam == 'undefined') {
  var egam = {};
}
//Controls are reusable controls on a page where models are really not as reusable. just organizational
if (typeof egam.controls == 'undefined') {
  egam.controls = {};
}

egam.controls.Table = function(items,elementSelector,RowModelClass,resultsName) {
  this.items = items;
  this.$element = $(elementSelector);
  this.RowModelClass = RowModelClass;
  //Full data contains rows and info about the rows like paging info
  this.allData = null;
  // Data is just the array of objects used to create items
  this.data = null;
  this.dataTable = null;
  // ResultsName is the name of the results in object returned by endpoint (default='results'). for edg stuff it is dataSet
  this.resultsName = resultsName || 'results';
  //Set the default timeout. It can also be passed to init
  this.timeOut = 15000;
  //list of checked row
  this.checkedRows = ko.observableArray();

};

egam.controls.Table.prototype.init = function(endpoint, query, projection, resultsName, timeOut) {
  var self = this;
  //Clear out existing table/items if exists
  if (self.dataTable) {
    self.dataTable.clear();
  }
  if (self.items) {
    self.items.length = 0;
  }
  //First get the data for GPOitems table
  //Just for testing to speed some things up
  //  query.access = 'public';
  query = JSON.stringify(query);
  //Projection in Mongo/Monk is what fields you want to return and sorting,
  //offsetting, etc.
  projection = JSON.stringify(projection);
  // ResultsName is the name of the results in object returned by endpoint (default='results'). for edg stuff it is dataSet
  if (resultsName) {
    this.resultsName = resultsName;
  }

  //Use this so we know when everything is loaded
  var defer = $.Deferred();

  //Do a post because some long query strings were breaking staging server
  //reverse proxy
  //hit our Express endpoint to get the list of items for this logged in user
  console.log('Call Endpoint Start: ' + new Date());
  $.ajax({
    type: 'POST',
    url: endpoint,
    data: {query: query, projection: projection},
    dataType: 'json',
    //Use default timeOut if it isn't passed
    timeout: timeOut || this.timeOut,
    success: function(returnedData) {
      console.log('Endpoint Data Received : ' + new Date());
      //The endpoint might return return other info other than array of objects with desired table data which will be saved in this.data
      // eg. If "limit" passed to dashboard gpo endpoints then paging info is returned and this.data is actually in returnedData.results
      //If there is a field called resultsName (default=results) in data returned by endpoint that is where the array of objects or this.data resides
      //Otherwise have to assume data returned is the array of objets or this.data
      if (self.resultsName in returnedData) {
        self.allData = returnedData;
        self.data = returnedData[self.resultsName];
      } else {
        self.data = returnedData;
      }

      $('#loadingMsgCountContainer').removeClass('hidden');
      $('#loadingMsgTotalCount').text(self.data.length);

      //Doing this in the next tick at least shows the item count
      setTimeout(function() {

        //To get the datatable object already created us "bRetrieve": true
        self.dataTable = self.$element.DataTable({bRetrieve: true});
        //Add these using .add to push to array
        //self.data is just the array of objects returned by server
        self.add(self.data);
        console.log('Knockout Model data added: ' + new Date());

        //Now do all the custom filter stuff to dataTable in scope of dataTable
        self.customizeDataTable();

        defer.resolve();
      }, 0);

      function updateLoadingCountMessage(index) {
        //Only show every 10
        if (index % 10 === 0) {
          $('#loadingMsgCount').text(index + 1);
        }
      }

    },
    error: function(request, status, err) {
      $('#loadingMsgCountContainer').addClass('hidden');
      $('#loadingGraphic').addClass('hidden');
      $('#loadingMsgText').html('<span class="glyphicon glyphicon-warning-sign"></span> Table failed to Load');
      $('#loadingMsgText').append('</br><h4>Status: ' + status + '</h4>' + '<h4>Error: ' + err + '</h4>');
    }
  });

  return defer;
};

//This adds array of docs (data) to the table after creating ko RowModelClass.
//Also adds to the jquery DataTable and redraws
//also can take a callback which fires for each item in array
egam.controls.Table.prototype.add = function(data, callback) {
  var self = this;
  //Use this so we know when everything is loaded
  var defer = $.Deferred();

  var i;
  for (i = 0; i < data.length; i++) {
    //Now that Row Model is being used in table instead of Full Model it takes
    //less than 1 second to load 14,000 vs 20 seconds before
    var item = new self.RowModelClass(data[i], i);
    self.items.push(item);
    if (callback) {
      callback(i);
    }
  }
  //Actually add the rows to the dataTable also and then redraw dataTable
  //It just as fast (or maybe a bit faster) to add to dataTable after the ko
  //applyBindings command was run
  //Passing false to .draw() will not page or sort when redrawing
  self.dataTable.rows.add(self.items).draw(false);
  console.log('DataTable rows added ' + new Date());
  defer.resolve();

  return defer;
};

//Update the array of row model items and also the jquery dataTable then redraw
//Pass field to just update a field in for ow array
egam.controls.Table.prototype.update = function(index, value, field) {
  var self = this;

  console.log('DataTable row being update' + new Date());

  //Update the row model items in items array of at least just a field in the
  //row model item in array
  if (field) {
    //If the field value is observable then have to pass the value
    if (ko.isObservable(self.items[index][field])) {
      self.items[index][field](value);
    } else {
      self.items[index][field] = value;
    }

  }else {
    self.items[index] = value;
  }

  //Have to update the data AND redraw the table/row also. passing 'page' will
  //not page/sort/filter. Before I was passing false which wasn't paging but it was sorting/filtering after update and row item was being "lost"
  // Updating data will allow data to be refreshed in regards to search and sort. draw just changes html
  self.dataTable.row([index]).data(self.items[index]).draw('page');

  console.log('DataTable row end update' + new Date());
};

//This customizes the dataTable such as adding the filter add header of table
egam.controls.Table.prototype.customizeDataTable = function(refresh,selectColumn) {
  var self = this;
  self.dataTable.columns().every(function(i) {
    //Have to use .column() with index i so that we can get column with just
    //search data()
    var column = self.dataTable.column(i,{search: 'applied'});
    var headerSelect = $(column.header()).find('select.search');

    //This is the special case for access column that we only want one access at
    // a time
    addSelectEventHandler(headerSelect, column, i);

    var input = $(column.header()).find('input.search');
    addInputEventHandler(input, column);

  });
  console.log('DataTable customized: ' + new Date());

  function addSelectEventHandler(select, column, columnIndex) {
    if (select.length > 0) {
      select.off('change');
      select.on('change', function() {
        var val = $.fn.dataTable.util.escapeRegex(
          $(this).val()
        );
        var text = $(this).find('option:selected').text();
        column.search(val || !text ? '^' + val + '$' : '', true, false)
          .draw();
        //After search refresh the dropdowns to reflect search results
        //pass columnIndex so selected column doesn't get refreshed (unless they select all)
        self.customizeDataTable(true,val || !text ? columnIndex : null);
      });

      if (select[0].options.length <= 1) {
        //If this select originally had no options then mark that it can be
        //refreshed
        select.attr('refreshable',true);
      }
      //Don't create the options if they are already in there.
      //(Unless a refresh is being forced)
      if (!(refresh && select.attr('refreshable')) &&
        select[0].options.length > 1) {
        return;
      }
      //Don't redraw the select on column that was just selected
      if (selectColumn === columnIndex) {
        return;
      }

      //Empty out all but first option which is "All"
      var selectedValue = select.val();
      var selectedText = select.find('option:selected').text();
      select.find('option:gt(0)').remove();

      //Simply just use data (don't need to use data-search attribute anymore
      //possibly because dataTables binding sets data() different than ko cell
      //contents)
      column.data().unique().sort().each(function(data, index) {
        //If the value is falsey but not zero then make it empty string
        if (!data && data != 0) {
          data = '';
        }
        var selOptions = $(select[0].options).filter(function() { return $(this).html() == data; });
        if (!selOptions.length > 0) {
          select.append('<option value="' + data + '">' + data + '</option>');
        }
      });
      //Reset the selected value
      //if sel value is '' then must select by text
      if (selectedValue == '') {
        $(select[0].options).filter(function() { return $(this).html() == selectedText; }).attr('selected','selected');
      }else {
        select.val(selectedValue);
      }
      //If the selectedValue doesn't exist then I guess add it and select 8t
      if (select.val() != selectedValue) {
        select.append('<option value="' + selectedValue + '">' +
          selectedValue + '</option>');
        select.val(selectedValue);
      }
    }
  }

  function addInputEventHandler(input, column) {
    if (input.length > 0) {
      input.off('keyup change');
      input.on('keyup change', function() {
        if (column.search() !== this.value) {
          column.search(this.value)
            .draw();
          //After search refresh the dropdowns to reflect search results
          self.customizeDataTable(true);
        }
      });
    }

  }

};

egam.controls.Table.prototype.runAllClientSideFilters = function() {
  egam.gpoItems.dataTable.columns().every(function() {
    var column = this;

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

egam.controls.Table.prototype.checkRow = function(item, evt) {
  //Have to get item index in checkRows storage if adding also because don't want to add duplicates
  //This probably won't happen for single manually checking but could occur when checking ALL
  var itemID = item.doc().id;
  var index = $.inArray(itemID, this.checkedRows);

  if (evt.target.checked) {
    //Only add the row to checkRows if it is not in there
    if (index < 0) {
      this.checkedRows.push(itemID);
    }
  } else {
    //Remove the row from checkedRows storage using splice
    this.checkedRows.splice(index, 1);
  }

  return true;
};

egam.controls.Table.prototype.checkAll = function(model, evt) {
  var self = this;

  //Note: rows({"search":"applied"}) would just the indices for the displayed rows (after filtering/sorting) but .data() actually gets the row items
  //Also can access the dataTable on this table class instance using self.dataTable
  var displayedItems = self.dataTable.rows({search: 'applied'}).data();
  displayedItems.each(function(item) {

    //Note isChecked field on row model should be observable for 2 way data binding to work
    //(Actually might not be necessary because of way dataTable rebinds on draw())
    if(item.doc().owner == egam.portalUser.username && item.doc().AuditData.compliant){
      item.isChecked(evt.target.checked);
      //Just fire the checkRow function for this item
      self.checkRow(item,evt);
    }
  });

  //Pass false so that search/paging not reset when redrawn
  //Actually don't need to redraw table because isChecked field is observable (2 way data binding)
  //this.dataTable.draw(false);
  //console.log(self.checkedRows);

  return true;
};
