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

    //$('#myModal').on('show.bs.modal', function (e) {
    //    alert("Modal Opening");
    //})



});
//function to  apply error checking
function titleCheck(e){
   //alert("here");
    e.validate('validate');

};
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
function populateUserTables(query){
  query=JSON.stringify(query)

  // jQuery AJAX call for JSON
  $.getJSON('/gpoitems/list', {query:query}, function(data) {
    console.log(data);

      gpoData = data;
      //ko.applyBindings({content: data});
      //alert("hello");

      var rowModel = function (title, type, description, tags, access, numViews, owner, audit) {
          this.title = ko.observable(title);
          this.access = ko.observable(access);
          this.type = ko.observable(type);
          this.description = ko.observable(description);
          this.tags = ko.observable(tags);
          this.numViews = ko.observable(numViews);
          this.owner = ko.observable(owner);
          this.AuditData = ko.observable(audit);
      };

      var RootViewModel = function(data){
          var self = this;

          self.content = ko.observableArray(data.map(function(i){
              return new rowModel(i.title, i.type, i.description, i.tags, i.access, i.numViews, i.owner, i.AuditData.compliant);
          }));

          self.select = function(item){
            self.selected(item);
          };

          self.selected = ko.observable(self.content()[0]);


      };
      ko.applyBindings(new RootViewModel(data));
  });

};