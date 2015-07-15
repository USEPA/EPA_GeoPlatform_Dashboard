// Mockup items =============================================================


$(document).ready(function() {
  populateTable();
});


// Fill table with data queried out of Mongo via Express/Monk
function populateTable() {
  var tableContent = '';

  // jQuery AJAX call for JSON
  $.getJSON('/gpoitems/gpoitemslist', function(data) {
    console.log(data);
    // For each item in our JSON, add a table row and cells to the content string
    $.each(data, function() {
      tableContent += '<tr>';
      tableContent += '<td>' + this.id + '</td>';
      tableContent += '<td>' + this.name + '</td>';
      tableContent += '<td>' + this.access + '</td>';
      tableContent += '<td>' + this.tags + '</td>';
      tableContent += '<td>' + this.thumbnail + '</td>';
      tableContent += '<td>' + this.owner + '</td>';
      tableContent += '</tr>';
    });

    // Inject the whole content string into our existing HTML table
    $('#gpoitemtable').prepend(tableContent);
  });
};