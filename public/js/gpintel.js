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

});


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
    // For each item in our JSON, add a table row and cells to the content string
    $.each(data, function() {
      tableContent += '<tr>';
      tableContent += '<td>' + this.id + '</td>';
      tableContent += '<td>' + this.title + '</td>';
      tableContent += '<td>' + this.access + '</td>';
      tableContent += '<td>' + this.tags + '</td>';
      tableContent += '<td>' + this.thumbnail + '</td>';
      tableContent += '<td>' + this.owner + '</td>';
      tableContent += '</tr>';
    });

    // Inject the whole content string into our existing HTML table
    $('#' + vTable + ' tbody').empty();
    $('#' + vTable + ' tbody').prepend(tableContent);
  });
};