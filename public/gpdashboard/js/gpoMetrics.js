function loadDC() {
  $('div#loadingMsg').removeClass('hidden');
  $('#metricsView').addClass('hidden');

  var timeChart = dc.seriesChart('#time-chart');
  var authGroupsChart = dc.rowChart('#authgroups-chart');
  var licenseCount = dc.dataCount('.dc-data-count');
  var curDate;
  var ndx;
  egam.utilities.getDataStash('availableAuthgroups',
    'gpoitems/authGroups');

  // Call the licenseitems route to get full collection of Pro licenses
  d3.json('licenseitems/list', function(data) {

    $('div#loadingMsg').addClass('hidden');
    $('#metricsView').removeClass('hidden');
    ndx = crossfilter(data);
    // Get abbreviations for AuthGroups and store null values as Not Assigned
    data.forEach(function(d) {
      d.date = new Date(d.date);
      if (d.authGroups) {
        if (d.authGroups.length > 0) {
          d.authGroups = egam.dataStash
            .availableAuthgroups.ids[d.authGroups[0]].edgName;
        } else {
          d.authGroups = 'Not Assigned';
        }
      } else {
        d.authGroups = 'Not Assigned';
      }
    });

    // Get min/max dates and current date
    var xMin = d3.min(data, function(d) { return Math.min(d.date); });
    var xMax = d3.max(data, function(d) { return Math.max(d.date); });
    curDate = xMax;

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

    // Individual licenses by username for data table
    var dataDim = ndx.dimension(function(d) {
      return d.username;
    });

    // Time chart

    // Function to add vertical reference line to time chart for selected time
    var updateReferenceLine = function(chart, xVal) {
      // From y=0 to 60
      var leftY = 0;
      var rightY = 60;
      // Set it at selected value on x-axis
      var extraData = [{x: chart.x()(xVal), y: chart.y()(leftY)},
        {x: chart.x()(xVal), y: chart.y()(rightY)}];
      // Calculate line
      var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate('linear');
      // Select chart
      var chartBody = chart.select('g.chart-body');
      // Append data
      var path = chartBody.selectAll('path.extra').data([extraData]);
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
      .html(function(d) {
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


    // Data count
    licenseCount
      // Create a custom dimension, just using the total number of licenses for
      // current date
      .dimension({size: function() {
        var total = 0;
        // Loop through all authgroups on the chart and tally the number of
        // licenses for the current date
        authGroupsChart.group().all().forEach(function(group) {
          // Just values for current date
          var match = group.value.values.filter(function(e) {
            return +e[0] == curDate;
          });
          if (match[0]) {
            total += match[0][1];
          } else {
            // If no match, means this authgroup didn't have any licenses for
            // this date, so just return 0
            total += 0;
          }
        });
        return total;
      }})
      .group({value: function() {
        // Create a reductio groupAll to get a count of selected licenses for
        // current date. Need to use reductio here instead of standard groupAll
        // since we are using reductio for the authGroups chart group.
        var authGroupAll = reductio()
          .groupAll(function(r) {
            if (+r.date == curDate) {
              return [r];
            }
            return [];
          })
          .count(true)
          (ndx.groupAll());
        return authGroupAll.value().length;
      }})
      .html({
        some: '<strong>%filter-count</strong> selected out of ' +
          '<strong>%total-count</strong> records | ' +
          '<a href=\'javascript:dc.filterAll(); customRenderAll();\'>' +
          'Reset All</a>',
        all: '<strong>%filter-count</strong> ' +
          'total licenses provisioned on this date.'
      });


    // Data table - using jquery data-table instead of dc.js datatable for
    // consistency in styling across the site
    var datatable = $('#data-table').DataTable({
      bPaginate: true,
      bLengthChange: false,
      bFilter: false,
      bSort: true,
      bInfo: false,
      bAutoWidth: false,
      bDeferRender: true,
      aaData: dataDim.top(Infinity).filter(function(d) {
        // Get full dataset of licenses for the current date
        return +d.date == curDate;
      }),
      pageLength: 25,
      bDestroy: true,
      // Order by authgroup, then username
      order: [[ 1, 'asc' ], [ 0, 'asc' ]],
      aoColumns: [
        { mData: 'username', sDefaultContent: ''},
        { mData: 'authGroups', sDefaultContent: ''},
        { mData: 'lastLogin',
          sDefaultContent: ' ',
          // Format date field as date
          render: function(data) {
            return new Date(data);
          }
        }
      ]
    });

    // Function to refresh table data (e.g. when other charts are modified)
    function RefreshTable() {
      dc.events.trigger(function() {
        alldata = dataDim.top(Infinity).filter(function(d) {
          // Get full dataset of licenses for the current date
          return +d.date == curDate;
        });
        datatable.clear();
        datatable.rows.add(alldata);
        datatable.draw();
      });
    }
    // Listen to filtering on all charts on the page and call RefreshTable
    for (var i = 0; i < dc.chartRegistry.list().length; i++) {
      var chartI = dc.chartRegistry.list()[i];
      chartI.on('filtered', RefreshTable);
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
      var pct = (d - xMin) / (xMax - xMin);
      if (pct == 0) {
        sliderRange['min'] =  +d;
      } else if (pct == 1) {
        sliderRange['max'] = +d;
      } else {
        sliderRange[(pct * 100) + '%'] = +d;
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
    skipSlider.noUiSlider.on('set', function(values, handle) {
      curDate = values[handle];
      customRenderAll();
    });

    // Custom render function to include a table update and recreating
    // mouseover events on the authgroup chart
    var customRenderAll = function() {
      // Set the CSV paths to reflect the current date
      $('#authGroupExport').attr('href',
        'licenseitems/listauthgroups.csv/date/' + curDate);
      $('#licenseExport').attr('href',
        'licenseitems/list.csv/date/' + curDate);

      // Update data table
      RefreshTable();

      // Default render call
      dc.renderAll();

      // Set authgroup chart mouseover effects (basically turning authgroup
      // chart into the time chart legend)
      d3.selectAll('g.row').call(tip)
        .on('mouseover', function() {
          // Get authgroup under cursor
          var selAuthGroup = this.children[1].innerHTML;
          // Loop through all time chart legend items
          timeChart.legendables().forEach(function(legItem) {
            if (legItem.name == selAuthGroup) {
              // For the matching legend item, call its Highlight function
              timeChart.legendHighlight(legItem);
            }
          });
          tip.show();
        })
        .on('mouseout', function() {
          // Remove effects
          timeChart.legendReset();
          tip.hide();
        });
    };
    // Export custom render function to window so can be called from onclick
    window.customRenderAll = customRenderAll;
    // Render all charts
    customRenderAll();
  });
}
