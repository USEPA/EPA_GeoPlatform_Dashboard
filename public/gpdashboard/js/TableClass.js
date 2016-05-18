if (typeof egam == 'undefined') {
  var egam = {};
}
//Controls are reusable controls on a page where models are really not as reusable. just organizational
if (typeof egam.controls == 'undefined') {
  egam.controls = {};
}

egam.controls.Table = function(items,elementSelector,RowModelClass) {
  this.items = items;
  this.$element = $(elementSelector);
  this.RowModelClass = RowModelClass;
  this.data = null;
  this.dataTable = null;
};

egam.controls.Table.prototype.init = function(endpoint, query, projection) {
  var self = this;
  //First get the data for GPOitems table
  //Just for testing to speed some things up
  //  query.access = 'public';
  query = JSON.stringify(query);
  //Projection in Mongo/Monk is what fields you want to return and sorting,
  //offsetting, etc.
  projection = JSON.stringify(projection);
  //Use this so we know when everything is loaded
  var defer = $.Deferred();

  //Do a post because some long query strings were breaking staging server
  //reverse proxy
  //hit our Express endpoint to get the list of items for this logged in user
  console.log('Call Endpoint Start: ' + new Date());
  $.post(endpoint, {
    query: query,
    projection: projection,
  }, function(data) {
    console.log('Endpoint Data Received : ' + new Date());
    //If "limit" passed to the endpoint then return paging info where data is
    //in data.results
    //If only data returned for no paging just save data in same structure
    if ('results' in data) {
      self.data = data;
    } else {
      self.data = {results: data};
    }

    $('#loadingMsgCountContainer').removeClass('hidden');
    $('#loadingMsgTotalCount').text(self.data.results.length);

    //Doing this in the next tick at least shows the item count
    setTimeout(function() {

      //To get the datatable object already created us "bRetrieve": true
      self.dataTable = self.$element.DataTable({bRetrieve: true});
      //Add these using .add to push to array
      //data.results is just the array of objects returned by server
      self.add(self.data.results);
      console.log('Knockout Model data added: ' + new Date());

      //Now do all the custom filter stuff to dataTable in scope of dataTable
      self.customizeDataTable();

      defer.resolve();
    },0);

    function updateLoadingCountMessage(index) {
      //Only show every 10
      if (index % 10 === 0) {
        $('#loadingMsgCount').text(index + 1);
      }
    }

  }, 'json');

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
    self.items[index][field] = value;
  }else {
    self.items[index] = value;
  }

  //Have to update the data AND redraw the table/row also. passing false will
  //not page/sort. Updating data will allow data to be refreshed in regards to
  //search and sort. draw just changes html
  self.dataTable.row([index]).data(self.items[index]).draw(false);

  console.log('DataTable row end update' + new Date());
};

//This customizes the dataTable such as adding the filter add header of table
egam.controls.Table.prototype.customizeDataTable = function() {
  var self = this;
  self.dataTable.columns().every(function() {
    var column = this;
    var headerSelect = $(column.header()).find('select.search');

    //This is the special case for access column that we only want one access at
    //a time
    addSelectEventHandler(headerSelect, column);

    var input = $(column.header()).find('input.search');
    addInputEventHandler(input, column);

  });
  console.log('DataTable customized: ' + new Date());

  function addSelectEventHandler(select, column) {
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

      //If first item has data-search then have to map out data-search data
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
          //Only add unique items to select in case already in there
          if (!select.find('option[value=\'' + data + '\']').length > 0) {
            select.append('<option value="' + data + '">' + data + '</option>')
          }
        });
      } else {
        //Simply just use data which is contents of cell
        column.data().unique().sort().each(function(data, index) {
          if (!select.find('option[value=\'' + data + '\']').length > 0) {
            select.append('<option value="' + data + '">' + data + '</option>')
          }
        });
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

