function loadDC() {
  var timeChart = dc.seriesChart('#time-chart');
  var authGroupsChart = dc.rowChart('#authgroups-chart');
  var licenseCount = dc.dataCount('.dc-data-count');
  var licenseTable = dc.dataTable('.dc-data-table');
  var curDate;
  egam.utilities.getDataStash('availableAuthgroups',
    'gpoitems/authGroups');

  //```javascript
  d3.json('licenseitems/list', function (data) {
    var timeFormat = d3.time.format("%Y-%m-%d");

    //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
    var ndx = crossfilter(data);
    var all = ndx.groupAll();

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

    // Counts per weekday
    var authGroups = ndx.dimension(function(d) {
      return [d.authGroups, d.date];
    });
    var authGroupsGroup = authGroups.group();

    var xMin = d3.min(data, function(d){ return Math.min(d.date); });
    var xMax = d3.max(data, function(d){ return Math.max(d.date); });
    var curDate = xMax;

    var runDimension = ndx.dimension(function(d) {return [d.authGroups, d.date]; });
    var runGroup = runDimension.group().reduceCount();

    var updateReferenceLine = function(chart, xVal) {

      var left_y = 0, right_y = 60; // use real statistics here!
      var extra_data = [{x: chart.x()(xVal), y: chart.y()(left_y)}, {x: chart.x()(xVal), y: chart.y()(right_y)}];
      var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate('linear');
      var chartBody = chart.select('g.chart-body');
      var path = chartBody.selectAll('path.extra').data([extra_data]);
      path.enter().append('path').attr({
        class: 'extra',
        stroke: 'red',
        id: 'extra-line'
      });
      path.attr('d', line);
    };

    timeChart
      .width(600)
      .height(400)
      .margins({top: 20, right: 90, bottom: 20, left: 20})
      .chart(function(c) { return dc.lineChart(c).interpolate('basis'); })
      .x(d3.time.scale()
        .domain([xMin, xMax]))
      .brushOn(false)
      .clipPadding(10)
      .elasticY(true)
      .dimension(runDimension)
      .group(runGroup)
 //     .mouseZoomable(true)
      .seriesAccessor(function(d) {return d.key[0];})
      .keyAccessor(function(d) {return +d.key[1];})
      .valueAccessor(function(d) {return +d.value;})
      //.legend(dc.legend().x(515).y(50).horizontal(0))
      .on('renderlet', function(chart) {
        updateReferenceLine(chart, curDate);
      });

    var myColors = d3.scale.category20()
      .domain(timeChart.legendables().map(function(x) {
        return x.name
      }));
    timeChart.colors(myColors);

    var dateDimension = ndx.dimension(function(d) {
      return d['date'];
    });

    var dateGroup = dateDimension.group();

    var validDates = dateGroup.all().map(function(d) {
      return d.key;
    });

    var sliderRange = {};

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

    var skipSlider = document.getElementById('licenseslider');

    noUiSlider.create(skipSlider, {
      range: sliderRange,
      snap: true,
      start: xMax
    });

    var dateValues = [
      document.getElementById('event-start'),
      document.getElementById('event-end')
    ];

    skipSlider.noUiSlider.on('update', function( values, handle ) {
      //skipSlider.innerHTML = validDates[values[handle]];
      dateValues[handle].innerHTML = new Date(+values[handle]);
      if (timeChart.y()) {
        curDate = values[handle];
        updateReferenceLine(timeChart, curDate);
      }
    });

    skipSlider.noUiSlider.on('set', function( values, handle ) {
      curDate = values[handle];
      licenseTable.group(function(d) {
        if (+d.date == curDate) {
          return 'Users'
        }
      });
      authGroupsChart
        .group(filterActionType(authGroupsGroup, curDate))
        .colors(d3.scale.category20());
      licenseCount
        .dimension({size: function() {
          return authGroupsChart.group().value();
        } });

      customRenderAll();
    });

    function filterActionType(source_group, xVal) {
      var all = source_group.all().filter(function(d) {
        return +d.key[1] == xVal;
      });
      var total = 0;
      all.forEach(function(g) {
        total += g.value;
      });
      return {
        all: function () {
          return all;
        },
        value: function() {
          return total;
        }
      };
    }

    var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([0, 0])
      .html(function (d) {
        return '';
      });

    authGroupsChart /* dc.rowChart('#day-of-week-chart', 'chartGroup') */
      .width(300)
      .height(400)
      .margins({top: 20, left: 10, right: 10, bottom: 20})
      .group(filterActionType(authGroupsGroup, curDate))
      .dimension(authGroups)
      // Assign colors to each value in the x scale domain
      .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
      .label(function (d) {
        return d.key[0];
      })
      // Title sets the row text
      .title(function (d) {
        return d.value;
      })
      .elasticX(true)
      .colors(myColors)
      .xAxis().ticks(4);


    //#### Data Count

    licenseCount /* dc.dataCount('.dc-data-count', 'chartGroup'); */
      .dimension({size: function() {
        return authGroupsChart.group().value();
      } })
      .group({value: function() {
        return authGroupsChart.group().value() < ndx.groupAll().value() ?
          authGroupsChart.group().value() : ndx.groupAll().value();
      } })
      // (_optional_) `.html` sets different html when some records or all records are selected.
      // `.html` replaces everything in the anchor with the html given using the following function.
      // `%filter-count` and `%total-count` are replaced with the values obtained.
      .html({
        some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
        ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'>Reset All</a>',
        all: '<strong>%filter-count</strong> total licenses provisioned on this date.'
      });

    //#### Data Table
    licenseTable /* dc.dataTable('.dc-data-table', 'chartGroup') */
      .dimension(ndx.dimension(function(d) {return d.username}))
      // Data table does not use crossfilter group but rather a closure
      // as a grouping function
      .group(function(d) {
        if (+d.date == curDate) {
          return 'Users'
        }
      })
      // (_optional_) max number of records to be shown, `default = 25`
      .size(Infinity)
      // There are several ways to specify the columns; see the data-table documentation.
      // This code demonstrates generating the column header automatically based on the columns.
      .columns([
        // Use the `d.date` field; capitalized automatically
        'username',
        // Use `d.open`, `d.close`
        'authGroups',
        'lastLogin'
      ])
      .showGroups(false)
      // (_optional_) sort using the given field, `default = function(d){return d;}`
      .sortBy(function (d) {
        return d.authGroups + d.username.toUpperCase();
      })
      // (_optional_) sort order, `default = d3.ascending`
      .order(d3.ascending)
      // (_optional_) custom renderlet to post-process chart using [D3](http://d3js.org)
      .on('renderlet', function (table) {
        table.selectAll('.dc-table-group').classed('info', true);
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
      $($('.dc-data-table tbody')[1]).css('display', 'none');
      console.log(ndx + authGroups + authGroupsGroup);
    };

    customRenderAll();

  });

}
