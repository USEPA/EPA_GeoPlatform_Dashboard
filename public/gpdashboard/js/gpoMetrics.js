var timeChart;
function loadDC() {
  timeChart = dc.seriesChart('#time-chart');
  var authGroupsChart = dc.rowChart('#authgroups-chart');
  var licenseCount = dc.dataCount('.dc-data-count');
  //var licenseTable = dc.dataTable('.dc-data-table');
  var curDate;
  var ndx;
  egam.utilities.getDataStash('availableAuthgroups',
    'gpoitems/authGroups');

  //```javascript
  d3.json('licenseitems/list', function (data) {
    ndx = crossfilter(data);
    // Get abbreviations for AuthGroups and store null values as Not Assigned
    data.forEach(function (d) {
      d.date = new Date(d.date);
      if (d.authGroups) {
        if (d.authGroups.length > 0) {
          d.authGroups = egam.dataStash.availableAuthgroups.ids[d.authGroups[0]].edgName;
        } else {
          d.authGroups = 'Not Assigned';
        }
      } else {
        d.authGroups = 'Not Assigned';
      }
    });

    // Get min/max dates and current date
    var xMin = d3.min(data, function(d){ return Math.min(d.date); });
    var xMax = d3.max(data, function(d){ return Math.max(d.date); });
    var curDate = xMax;


    $('#authGroupExport').attr('href',
      'licenseitems/listauthgroups.csv/date/' + curDate);
    $('#licenseExport').attr('href',
      'licenseitems/list.csv/date/' + curDate);

    // Time chart grouped by date & authgroup
    var runDimension = ndx.dimension(function(d) {
      return [d.authGroups, d.date];
    });
    // Get counts
    var runGroup = runDimension.group().reduceCount();

    // Slider grouped by date
    var dateDimension = ndx.dimension(function(d) {
      return d['date'];
    });
    var dateGroup = dateDimension.group();

    // Counts per authGroup
    var authGroups = ndx.dimension(function(d) {
      return d.authGroups;
    });
    // For authgroups use reductio to create an exception for selected date.
    // This allows us to get counts of authgroups on this date without affecting
    // the time chart.
    var authGroupsGroup = reductio()
      .exception(function(d) { return +d.date; })
      .exceptionCount(true)
      (authGroups.group());

    // Time chart

    // Function to add vertical reference line to time chart for selected time
    var updateReferenceLine = function(chart, xVal) {
      // From y=0 to 60
      var left_y = 0, right_y = 60;
      // Set it at selected value on x-axis
      var extra_data = [{x: chart.x()(xVal), y: chart.y()(left_y)},
        {x: chart.x()(xVal), y: chart.y()(right_y)}];
      // Calculate line
      var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate('linear');
      // Select chart
      var chartBody = chart.select('g.chart-body');
      // Append data
      var path = chartBody.selectAll('path.extra').data([extra_data]);
      // Add path with red stroke
      path.enter().append('path').attr({
        class: 'extra',
        stroke: 'red',
        id: 'extra-line'
      });
      // Draw line
      path.attr('d', line);
    };

    timeChart
      .width(600)
      .height(400)
      .margins({top: 20, right: 90, bottom: 20, left: 20})
      // This is a series chart, which is basically multiple line charts stacked
      // together.
      .chart(function(c) { return dc.lineChart(c).interpolate('basis'); })
      .x(d3.time.scale().domain([xMin, xMax]))
      .brushOn(false)
      .clipPadding(10)
      .elasticY(true)
      .dimension(runDimension)
      .group(runGroup)
      // AuthGroup sets the series
      .seriesAccessor(function(d) {return d.key[0];})
      // Key is date
      .keyAccessor(function(d) {return +d.key[1];})
      // Value is count by date/group
      .valueAccessor(function(d) {return +d.value;})
      .colors(d3.scale.category20())
      .on('renderlet', function(chart) {
        // On chart render, add reference line
        updateReferenceLine(chart, curDate);
      });


    // AuthGroups chart
    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([0, 0])
      .html(function (d) {
        return '';
      });

    // Get value (count) of selected authGroup at current date
    var authGroupValue = function(d) {
      // Just get rows for the current date
      var val = d.value.values.filter(function(e) {
        return +e[0] == curDate;
      });
      // If a count exists, return it
      if (val[0]) {
        val = val[0][1];
      } else {
        // Otherwise return 0 (e.g. no AuthGroup for this date)
        val = 0;
      }
      return val;
    };

    // Row chart
    authGroupsChart
      .width(300)
      .height(400)
      .margins({top: 20, left: 10, right: 10, bottom: 20})
      .group(authGroupsGroup)
      .dimension(authGroups)
      .label(function(d) { return d.key; })
      // Title sets the row text
      .title(authGroupValue)
      .elasticX(true)
      .colors(d3.scale.category20())
      .valueAccessor(authGroupValue)
      .xAxis().ticks(4);

    // Get a count of all licenses for the current date
    var authGroupMatches = function() {
      var total = 0;
      authGroupsChart.group().all().forEach(function(group) {
        var match = group.value.values.filter(function(e) {
          return +e[0] == curDate;
        });
        if (match[0]) {
          total += match[0][1];
        } else {
          total += 0;
        }
      });
      return total;
    };

    //#### Data Count
    licenseCount /* dc.dataCount('.dc-data-count', 'chartGroup'); */
      .dimension({size: authGroupMatches})
      .group({value: function() {
        var authGroupAll = reductio()
          .groupAll(function(r) {
            if (+r.date == curDate) {
              return [r];
            }
            return [];
          })
          .count(true)
          (ndx.groupAll());
        var total = authGroupMatches();
        return total < authGroupAll.value().length ?
          total : authGroupAll.value().length;
      } })
      .html({
        some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
        ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'>Reset All</a>',
        all: '<strong>%filter-count</strong> total licenses provisioned on this date.'
      });

    //#### Data Table
    var dataDim = ndx.dimension(function(d) {
      return d.username;
    });
    var datatable = $("#data-table").DataTable({
      "bPaginate": true,
      "bLengthChange": false,
      "bFilter": false,
      "bSort": true,
      "bInfo": false,
      "bAutoWidth": false,
      "bDeferRender": true,
      "aaData": dataDim.top(Infinity).filter(function(d) {
        return +d.date == curDate;
      }),
      "pageLength": 25,
      "bDestroy": true,
      "order": [[ 1, 'asc' ], [ 0, 'asc' ]],
      "aoColumns": [
        { "mData": "username", "sDefaultContent": ""},
        { "mData": "authGroups", "sDefaultContent": ""},
        { "mData": "lastLogin",
          "sDefaultContent": " ",
          "render": function(data) {
            return new Date(data);
          }
        }
      ]
    });

    function RefreshTable() {
      dc.events.trigger(function () {
        alldata = dataDim.top(Infinity).filter(function(d) {
          return +d.date == curDate;
        });
        datatable.clear();
        datatable.rows.add(alldata);
        datatable.draw();
      });
    }

    for (var i = 0; i < dc.chartRegistry.list().length; i++) {
      var chartI = dc.chartRegistry.list()[i];
      chartI.on("filtered", RefreshTable);
    }

    // Time slider

    // Get a list of all dates in the dataset for the slider values
    var validDates = dateGroup.all().map(function(d) {
      return d.key;
    });
    // Object for storing dates as percentage of slider
    var sliderRange = {};
    // Loop through all dates and calculate the percentage from start to finish
    validDates.forEach(function(d) {
      var pct = (d - xMin)/(xMax - xMin);
      if (pct == 0) {
        sliderRange['min'] =  +d;
      } else if (pct == 1) {
        sliderRange['max'] = +d;
      } else {
        sliderRange[(pct*100) + '%'] = +d;
      }
    });

    // Get the div for the slider
    var skipSlider = $('#licenseslider')[0];
    // Create a noUiSlider using the dates as range and final date as current
    noUiSlider.create(skipSlider, {
      range: sliderRange,
      snap: true,
      start: xMax
    });
    // Get date label div
    var dateValues = [
      $('#event-start')[0]
    ];
    // On slider update, update label and move reference line
    skipSlider.noUiSlider.on('update', function(values, handle) {
      dateValues[handle].innerHTML = new Date(+values[handle]);
      if (timeChart.y()) {
        curDate = values[handle];
        updateReferenceLine(timeChart, curDate);
      }
    });
    // When slider is done moving, update charts
    skipSlider.noUiSlider.on('set', function( values, handle ) {
      curDate = values[handle];

      $('#authGroupExport').attr('href',
        'licenseitems/listauthgroups.csv/date/' + curDate);
      $('#licenseExport').attr('href',
        'licenseitems/list.csv/date/' + curDate);

      RefreshTable();

      authGroupsGroup = reductio()
        .exception(function(d) { return +d.date; })
        .exceptionCount(true)
        (authGroups.group());
      authGroupsChart
        .group(authGroupsGroup);

      licenseCount
        .dimension({size: authGroupMatches})
        .group({value: function() {
          var authGroupAll = reductio()
            .groupAll(function(r) {
              if (+r.date == curDate) {
                return [r];
              }
              return [];
            })
            .count(true)
            (ndx.groupAll());
          var total = authGroupMatches();
          return total < authGroupAll.value().length ?
            total : authGroupAll.value().length;
        } });

      customRenderAll();
    });

    var customRenderAll = function() {
      //simply call `.renderAll()` to render all charts on the page
      dc.renderAll();

      d3.selectAll("g.row").call(tip)
        .on('mouseover', function() {
          var selAuthGroup = this.children[1].innerHTML;
          timeChart.legendables().forEach(function(legItem) {
            if (legItem.name == selAuthGroup) {
              timeChart.legendHighlight(legItem);
            }
          });
          tip.show;
        })
        .on('mouseout', function() {
          timeChart.legendReset();
          tip.hide;
        });

    };

    window.customRenderAll = customRenderAll;

    customRenderAll();

  });


}
