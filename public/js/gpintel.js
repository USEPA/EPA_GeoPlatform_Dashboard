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

      //var regdata = JSON.stringify(data, null, 2);
      //alert(regdata);

      //var rowModel = function (id, title, type, description, tags, snippet, thumbnail, accessInformation, licenseInfo, access, numViews, owner, url, compliant, doc) {
      //    this.id = ko.observable(id);
      //    this.title = ko.observable(title);
      //    this.access = ko.observable(access);
      //    this.type = ko.observable(type);
      //    this.description = ko.observable(description);
      //    this.tags = ko.observableArray(tags);
      //    this.snippet = ko.observable(snippet);
      //    this.thunbnail = ko.observable(thumbnail);
      //    this.accessInformation = ko.observable(accessInformation);
      //    this.licenseInfo = ko.observable(licenseInfo);
      //    this.numViews = ko.observable(numViews);
      //    this.owner = ko.observable(owner);
      //    this.url = ko.observable(url);
      //    this.compliant = ko.observable(compliant);
      //
      //    //this.doc = ko.observable(doc);
      //    //ko.mapping.fromJS(doc, {}, this);
      //
      //
      //    //if(type == 'Web Mapping Application'){
      //    //    this.descComp = ko.observable(auditData.errors.description.compliant);
      //    //}else{
      //    //    this.descComp = ko.observable(true);
      //    //}
      //    //this.compliant2 = ko.computed(function(){
      //    //    var auditRes = new Audit();
      //    //    auditRes.validate(doc,"");
      //    //    return auditRes.results.compliant
      //    //});
      //
      //
      //
      //    //this.DescComp = ko.observable(descComp);
      //    //this.errorThumb = ko.observableArray(errorThumb);
      //
      //    //tags
      //    this.tagItemToAdd = ko.observable("");
      //    this.selectedItems = ko.observableArray([""]);
      //
      //    this.tnURLs = ko.computed(function(){
      //        return "http://epa.maps.arcgis.com/sharing/rest/content/items/" + id + "/info/" + thumbnail + "?token=" + utoken;
      //    });
      //
      //    this.uDoc = ko.computed(function(){
      //        //var auditRes = new Audit();
      //        //auditRes.validate(doc,"");
      //
      //        var jsonDoc = {
      //            "id": this.id(),
      //            "title": this.title(),
      //            "description": this.description(),
      //            "tags": this.tags(),
      //            "snippet": this.snippet(),
      //            "accessInformation": this.accessInformation(),
      //            "licenseInfo": this.licenseInfo(),
      //            "url": this.url()
      //            //"AuditData":{
      //            //    "compliant": auditRes.results.compliant
      //            //}
      //        }
      //        return jsonDoc
      //    }, this);
      //
      //    //Add tag to tags array
      //    this.addItem = function () {
      //        //alert("here");
      //        if ((this.selected().tagItemToAdd() != "") && (this.selected().tags.indexOf(this.selected().tagItemToAdd()) < 0)) // Prevent blanks and duplicates
      //            this.selected().tags.push(this.selected().tagItemToAdd());
      //        this.selected().tagItemToAdd(""); // Clear the text box
      //    };
      //    //Remove tag from tags array
      //    this.removeSelected = function () {
      //        this.selected().tags.removeAll(this.selected().selectedItems());
      //        this.selected().selectedItems([]); // Clear selection
      //    };
      //    //Post updated docs back to Mongo
      //    //this.postback = function() {
      //    //
      //    //    //alert(data[0]["id"]);
      //    //    //var jDoc = JSON.stringify(doc)
      //    //    //alert(doc.AuditData.errors);
      //    //    //alert(jDoc);
      //    //    //var auditRes = new Audit();
      //    //    //auditRes.validate(doc,"");
      //    //    //this.compliant = auditRes.results.compliant;
      //    //
      //    //    alert(this.selected().compliant);
      //    //    alert(JSON.stringify(this.selected().uDoc()));
      //    //
      //    //    var mydata = new FormData();
      //    //    //var updateDocs = $("#updateDocs")[0].value; {"id" : "40894bca74de46d4b92abd8fd0a5160e","title" : "AChangeTest2"}
      //    //    //get docs
      //    //    mydata.append("updateDoc",JSON.stringify(this.selected().uDoc()));
      //    //    //get thumbnail
      //    //    var thumbnail = $('#thumbnail')[0].files[0];
      //    //    mydata.append("thumbnail",thumbnail);
      //    //
      //    //    $.ajax({
      //    //        url: 'gpoitems/update',
      //    //        type: 'POST',
      //    //        data: mydata,
      //    //        cache: false,
      //    //        dataType: 'json',
      //    //        processData: false, // Don't process the files
      //    //        contentType: false, // Set content type to false as jQuery will tell the server its a query string request
      //    //        success: function(data, textStatus, jqXHR)
      //    //        {
      //    //            if(! data.error) //will need to change to data.errors.length when merged back to sprint 3
      //    //            {
      //    //                // Success so call function to process the form
      //    //                console.log('success: ' + data);
      //    //            }
      //    //            else
      //    //            {
      //    //                // Handle errors here
      //    //                console.log('ERRORS: ' + data);
      //    //            }
      //    //        },
      //    //        error: function(jqXHR, textStatus, errorThrown)
      //    //        {
      //    //            // Handle errors here
      //    //            console.log('ERRORS: ' + textStatus);
      //    //            // STOP LOADING SPINNER
      //    //        }
      //    //    });
      //    //
      //    //    console.log("Post back updated Items");
      //    //};
      //
      //
      //};
      var rowModel1 = function(i){
          //This is the doc
          this.doc = ko.mapping.fromJS(i);


          //computed thumbnail url
          this.tnURLs = ko.computed(function(){
              return "http://epa.maps.arcgis.com/sharing/rest/content/items/" + i.id + "/info/" + i.thumbnail + "?token=" + utoken;
          }, this);

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
              alert("Posting");

              var unmappedDoc = ko.mapping.toJS(this.selected().doc);


              var auditRes = new Audit();
              auditRes.validate(unmappedDoc,"");
              ko.mapping.fromJS(unmappedDoc, this.selected().doc);

              alert(JSON.stringify(unmappedDoc));
              //
              var mydata = new FormData();
              mydata.append("updateDoc",JSON.stringify(unmappedDoc));
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
                      if(! data.error) //will need to change to data.errors.length when merged back to sprint 3
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