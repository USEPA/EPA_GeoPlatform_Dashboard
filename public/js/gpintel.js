// Mockup items =============================================================


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

var gpoData = [];
var rootRowModelINstance = null;

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

    gpoData = data;

    var rowModel1 = function(i){
      //This is the doc
      this.doc = ko.mapping.fromJS(i);

      //computed thumbnail url
      this.tnURLs = ko.computed(function(){
        return "http://epa.maps.arcgis.com/sharing/rest/content/items/" + i.id + "/info/" + i.thumbnail + "?token=" + utoken;
      }, this);

      //Subscribes Setup
      this.doc.title.subscribe(function(){
        this.execAudit("title");
      }.bind(this));

      this.doc.snippet.subscribe(function(){
        this.execAudit("snippet");
      }.bind(this));

      this.doc.description.subscribe(function(){
        this.execAudit("description");
      }.bind(this));

      this.doc.licenseInfo.subscribe(function(){
        this.execAudit("licenseInfo");
      }.bind(this));

      this.doc.accessInformation.subscribe(function(){
        this.execAudit("accessInformation");
      }.bind(this));

      this.doc.url.subscribe(function(){
        this.execAudit("url");
      }.bind(this));

      this.doc.tags.subscribe(function(){
        this.execAudit("tags");
      }.bind(this), null, 'arrayChange');

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
      }

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


        var auditRes = new Audit();
        auditRes.validate(unmappedDoc,"");
        ko.mapping.fromJS(unmappedDoc, this.selected().doc);

        //alert(JSON.stringify(unmappedDoc));

        var mydata = new FormData();
        mydata.append("updateDocs",JSON.stringify(unmappedDoc));
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
    rootRowModelINstance = new RootViewModel(data);

    ko.applyBindings(rootRowModelINstance);

    //apply data table magic, ordered ascending by title
    $('#gpoitemtable1').DataTable({
      "order": [[1,"asc"]]
    });



  });


};