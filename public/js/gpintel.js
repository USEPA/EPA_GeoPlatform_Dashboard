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
        $('#modalForm').validator('validate');


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
      //var regdata = JSON.stringify(data, null, 2);
      //alert(regdata);

      var rowModel = function (id, title, type, description, tags, snippet, thumbnail, accessInformation, licenseInfo, access, numViews, owner, url, audit) {
          this.id = ko.observable(id);
          this.title = ko.observable(title);
          this.access = ko.observable(access);
          this.type = ko.observable(type);
          this.description = ko.observable(description);
          this.tags = ko.observableArray(tags);
          this.snippet = ko.observable(snippet);
          this.thunbnail = ko.observable(thumbnail);
          this.accessInformation = ko.observable(accessInformation);
          this.licenseInfo = ko.observable(licenseInfo);
          this.numViews = ko.observable(numViews);
          this.owner = ko.observable(owner);
          this.url = ko.observable(url);
          this.AuditData = ko.observable(audit);
          //tags
          this.tagItemToAdd = ko.observable("");
          this.selectedItems = ko.observableArray([""]);

          this.tnURLs = ko.computed(function(){
              return "http://epa.maps.arcgis.com/sharing/rest/content/items/" + id + "/info/" + thumbnail + "?token=" + utoken;
          });

          this.uDoc = ko.computed(function(){
              var jsonDoc = {
                  "id": this.id(),
                  "owner": this.owner(),
                  "title": this.title()
              };
              return jsonDoc
          }, this);

          //Add tag to tags array
          this.addItem = function () {
              //alert("here");
              if ((this.selected().tagItemToAdd() != "") && (this.selected().tags.indexOf(this.selected().tagItemToAdd()) < 0)) // Prevent blanks and duplicates
                  this.selected().tags.push(this.selected().tagItemToAdd());
              this.selected().tagItemToAdd(""); // Clear the text box
          };
          //Remove tag from tags array
          this.removeSelected = function () {
              this.selected().tags.removeAll(this.selected().selectedItems());
              this.selected().selectedItems([]); // Clear selection
          };

          this.postback = function() {
              //alert(this.selected().title);
              //var myDoc = {"id": "7ba6b875453c41e4afb3e3f1055d0da4", "owner": "Yarnell.David_EPA", "title": "A ATest"};
              //var updateDoc = JSON.stringify(myDoc, null, 2)
              //  var updateDoc = {
              //    "id": this.selected().id(),
              //    "owner": "Yarnell.David_EPA",
              //    "title": this.selected().title()
              //}
              //

              //alert("hello");
              ////$.post('gpoitems/update', updateDoc, function(){alert("yes!")},"json");
              var mydata = new FormData();
              var updateDocs = JSON.stringify([{"id" : "40894bca74de46d4b92abd8fd0a5160e","title" : "AATest"}]);
              mydata.append("updateDocs",updateDocs);
              //mydata.append("updateDocs",updateDocs);
              $.ajax({
                  url: 'gpoitems/update',
                  type: 'POST',
                  data: mydata,
                  cache: false,
                  dataType: 'json',
                  processData: false, // Don't process the files
                  contentType: false, // Set content type to false as jQuery will tell the server its a query string request
                  success: function(dataP, textStatus, jqXHR)
                  {
                      if(! dataP.errors.length)
                      {
                          // Success so call function to process the form
                          console.log('success: ' + dataP);
                      }
                      else
                      {
                          // Handle errors here
                          console.log('ERRORS: ' + dataP);
                      }
                  },
                  error: function(jqXHR, textStatus, errorThrown)
                  {
                      // Handle errors here
                      console.log('ERRORS: ' + textStatus);
                      // STOP LOADING SPINNER
                  }
              });


              //$.ajax({
              //    url: 'gpoitems/update',
              //    type: 'POST',
              //    data: data2,
              //    cache: false,
              //    dataType: 'json',
              //    processData: false,
              //    contentType: false,
              //    success: function(data2, textStatus, jqXHR)
              //    {
              //        if(typeof data2.error === 'undefined')
              //        {
              //            // Success so call function to process the form
              //            submitForm(event, data2);
              //        }
              //        else
              //        {
              //            // Handle errors here
              //            console.log('ERRORS: ' + data2.error);
              //        }
              //    },
              //    error: function(jqXHR, textStatus, errorThrown)
              //    {
              //        // Handle errors here
              //        console.log('ERRORS: ' + textStatus);
              //        // STOP LOADING SPINNER
              //    }
              //});
              // Don't process the files contentType: false, // Set content type to false as jQuery will tell the server its a query string request

              //$.ajax({
              //    url:'gpoitems/update',
              //    type:'POST',
              //    data: myDoc,
              //    dataType: 'json',
              //    contentType: "application/json",
              //    success:function(res){
              //        alert("it works!");
              //    },
              //    error:function(res){
              //        alert("Bad thing happened! " + res.error);
              //    }
              //});


              //alert(JSON.stringify(updateDoc, null, 2));


              console.log("Post back updated Items");
          };



      };

      var RootViewModel = function(data){
          var self = this;

          self.content = ko.observableArray(data.map(function(i){
              return new rowModel(i.id, i.title, i.type, i.description, i.tags, i.snippet, i.thumbnail, i.accessInformation, i.licenseInfo, i.access, i.numViews
                  , i.owner, i.url, i.AuditData.compliant);
          }));

          self.select = function(item){
              self.selected(item);
          };

          self.selected = ko.observable(self.content()[0]);

      };
      ko.applyBindings(new RootViewModel(data));

      //apply data table magic, ordered ascending by title
      $('#gpoitemtable1').DataTable({
          "order": [[1,"asc"]]
      });


  });


};