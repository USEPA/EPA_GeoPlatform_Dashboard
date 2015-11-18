// Mockup items =============================================================

//Expose dashboard especially helpful for debugging
var egam={};
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
    $('#' + view +'View').collapse('show');

    $('.view').not(document.getElementById( view )).collapse('hide');

  });

  $('#myModal').on('shown.bs.modal', function (e) {

    //validate everytime the form opens
    //$('#modalForm').validator('validate');

  });


});


// function AppViewModel() {
//         this.firstName = ko.observable("Bert");
//         this.lastName = ko.observable("Bertington");
//         this.fullName = ko.computed(function() {
//         return this.firstName() + " " + this.lastName();    
//     }, this);

//         this.capitalizeLastName = function() {
//             var currentVal = this.lastName();        // Read the current value
//             this.lastName(currentVal.toUpperCase()); // Write back a modified value
//         };
//     }

//     // Activates knockout.js
//     ko.applyBindings(new AppViewModel());


// Fill table with data queried out of Mongo via Express/Monk
function populateTable(vTable,query) {

//    console.log(vTable);
//    console.log(query);
  var tableContent = '';
//for query pass a string because things like null were being converted to empty string
  query=JSON.stringify(query)

  // jQuery AJAX call for JSON
  $.getJSON('/gpoitems/list', {query:query}, function(data) {
    console.log(data);

    ko.applyBindings({content: data});

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


    // // For each item in our JSON, add a table row and cells to the content string
    // $.each(data, function() {
    //   tableContent += '<tr>';
    //   tableContent += '<td>' + this.id + '</td>';
    //   tableContent += '<td>' + this.name + '</td>';
    //   tableContent += '<td>' + this.access + '</td>';
    //   tableContent += '<td>' + this.tags + '</td>';
    //   tableContent += '<td>' + this.thumbnail + '</td>';
    //   tableContent += '<td>' + this.owner + '</td>';
    //   tableContent += '<td>' + this.type + '</td>';
    //   tableContent += '</tr>';
    // });

    // // Inject the whole content string into our existing HTML table
    // $('#' + vTable + ' tbody').empty();
    // $('#' + vTable + ' tbody').prepend(tableContent);
  });

};


function rowSelect(x){
  alert(x.rowIndex);
  //alert("hello");

  //alert(gpoData[x.rowIndex-1].title);
  //$('#myModal').modal('show');
};

//populate tables for GPO User view
function populateUserTables(query, utoken){
  query=JSON.stringify(query)


  // jQuery AJAX call for JSON
  $.getJSON('/gpoitems/list', {query:query}, function(data) {
    //console.log(data);

    egam.gpoItems.resultSet = data;
//If paging then data.results is array of data
    var dataResults=data;
    if ("results" in data) dataResults=data.results;

    var rowModel1 = function(i){
      //This is the doc
      this.doc = ko.mapping.fromJS(i);

      this.complianceStatus = ko.computed(function() {return this.doc.AuditData.compliant() ? 'Pass' : 'Fail'},this);

      //computed thumbnail url
      this.tnURLs = ko.computed(function(){
        return "http://epa.maps.arcgis.com/sharing/rest/content/items/" + i.id + "/info/" + i.thumbnail + "?token=" + utoken;
      }, this);

      //Doc of changed fields
      this.changeDoc = {};

      //Subscribes Setup
      this.doc.title.subscribe(function(evt){
        this.execAudit("title");
        this.addFieldChange("title", evt);
      }.bind(this));

      this.doc.snippet.subscribe(function(evt){
        this.execAudit("snippet");
        this.addFieldChange("snippet", evt);
      }.bind(this));

      this.doc.description.subscribe(function(evt){
        this.execAudit("description");
        this.addFieldChange("description", evt);
      }.bind(this));

      this.doc.licenseInfo.subscribe(function(evt){
        this.execAudit("licenseInfo");
        this.addFieldChange("licenseInfo", evt);
      }.bind(this));

      this.doc.accessInformation.subscribe(function(evt){
        this.execAudit("accessInformation");
        this.addFieldChange("accessInformation", evt);
      }.bind(this));

      this.doc.url.subscribe(function(evt){
        this.execAudit("url");
        this.addFieldChange("url", evt);
      }.bind(this));

      this.doc.tags.subscribe(function(evt){
        this.execAudit("tags");
        this.addFieldChange("tags", this.doc.tags());
      }.bind(this), null, 'arrayChange');

      //Add and field that has changed to the changeDoc
      this.addFieldChange = function(changeField, changeValue){
        this.changeDoc["id"] = this.doc.id();
        this.changeDoc[changeField] = changeValue;
        alert(JSON.stringify(this.changeDoc));
      };

      //this.tnURLs.subscribe(function(){
      //  alert("Change");
      //  this.execAudit("thumbnail");
      //}.bind(this));

      //Execute Audit on specified field in doc
      this.execAudit = function(auditField){
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
        if ((this.selected().tagItemToAdd() != "") && (this.selected().doc.tags.indexOf(this.selected().tagItemToAdd()) < 0)) // Prevent blanks and duplicates
          this.selected().doc.tags.push(this.selected().tagItemToAdd());
        this.selected().tagItemToAdd(""); // Clear the text box
      };
      //Remove tag from tags array
      this.removeSelected = function () {
        this.selected().doc.tags.removeAll(this.selected().selectedItems());
        this.selected().selectedItems([]); // Clear selection
      };

      //Post updated docs back to Mongo
      this.postback = function() {
        //alert("Posting");

        var unmappedDoc = ko.mapping.toJS(this.selected().doc);


        //Original Audit of full Doc
        var unmappedDoc = ko.mapping.toJS(this.selected().doc);
        var auditRes = new Audit();
        auditRes.validate(unmappedDoc,"");
        ko.mapping.fromJS(unmappedDoc, this.selected().doc);

        alert(JSON.stringify(this.selected().changeDoc));

        var mydata = new FormData();
        mydata.append("updateDocs",JSON.stringify(this.selected().changeDoc));
        //mydata.append("updateDoc", unmappedDoc);
        var thumbnail = $('#thumbnail')[0].files[0];
        mydata.append("thumbnail",thumbnail);
        $.ajax({
          url: 'gpoitems/update',
          type: 'POST',
          data: mydata,
          cache: false,
          dataType: 'json',
          processData: false, // Don't process the files
          contentType: false, // Set content type to false as jQuery will tell the server its a query string request
          success: function(data, textStatus, jqXHR)
          {
            if(data.errors.length<1) //will need to change to data.errors.length when merged back to sprint 3
            {
              // Success so call function to process the form
              console.log('success: ' + data);
//refresh the data table so it can search updated info
              egam.gpoItems.dataTable.destroy();
              renderGPOitemsDataTable();
            }
            else
            {
              // Handle errors here
              console.log('ERRORS: ' + data);
            }
          },
          error: function(jqXHR, textStatus, errorThrown)
          {
            // Handle errors here
            console.log('ERRORS: ' + textStatus);
            // STOP LOADING SPINNER
          }
        });
        console.log("Post back updated Items");
      };


    };

    var RootViewModel = function(data){
      var self = this;

      self.content = ko.observableArray(data.map(function(i){
        //return new rowModel(i.id, i.title, i.type, i.description, i.tags, i.snippet, i.thumbnail, i.accessInformation, i.licenseInfo, i.access, i.numViews
        //    , i.owner, i.url, i.AuditData.compliant, i);
        //var rowModel1 = ko.mapping.fromJS(i);
        return new rowModel1(i);
      }));

      self.select = function(item){
        self.selected(item);
      };

      self.selected = ko.observable(self.content()[0]);

    };
    egam.gpoItems.rowModel = new RootViewModel(dataResults);

    ko.applyBindings(egam.gpoItems.rowModel);

    egam.gpoItems.dataTable = renderGPOitemsDataTable();

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


}

function renderGPOitemsDataTable() {
  //apply data table magic, ordered ascending by title
  return $('#gpoitemtable1').DataTable({
    "order": [[1,"asc"]],

    initComplete: function () {
      this.api().columns().every( function () {
        var column = this;
        var select = $(column.footer()).find("select.search");
        addSelectEventHandler(select);
        select = $(column.header()).find("select.search");
        addSelectEventHandler(select);

        function addSelectEventHandler(select) {
          if (select.length>0) {
            select.on( 'change', function () {
              var val = $.fn.dataTable.util.escapeRegex(
                $(this).val()
              );
              column.search( val ? '^'+val+'$' : '', true, false )
                .draw();
            } );

            //If first item has data-search then have to map out data-search data
            var att = column.nodes().to$()[0].attributes;
            if ("data-search" in att) {
              var selectData = {};
              column.nodes().each( function ( node, index ) {
                var data = node.attributes["data-search"].value;
                selectData[data]=data;
              } );
              selectData = Object.keys(selectData);
              selectData.sort();
              selectData.forEach( function ( data, index ) {
//Only add unique items to select in case already in there
                if (! select.find("option[value='" + data + "']").length>0) {
                  select.append( '<option value="'+data+'">'+data+'</option>' )
                }
              } );
            }else{
              //Simply just use data which is contents of cell
              column.data().unique().sort().each( function ( data, index ) {
                if (! select.find("option[value='" + data + "']").length>0) {
                  select.append( '<option value="'+data+'">'+data+'</option>' )
                }
              } );
            }
          }
        }

        var input = $(column.footer()).find("input.search");
        addInputEventHandler(input);
        input = $(column.header()).find("input.search");
        addInputEventHandler(input);
        function addInputEventHandler(input) {
          if (input.length > 0) {
            input.on('keyup change', function () {
              if (column.search() !== this.value) {
                column.search(this.value)
                  .draw();
              }
            });
          }
        }
      } );
    }

  });
}
