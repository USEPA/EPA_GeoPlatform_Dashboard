function loadDC() {
  var fluctuationChart = dc.barChart('#fluctuation-chart');
  var nasdaqCount = dc.dataCount('.dc-data-count');
  var nasdaqTable = dc.dataTable('.dc-data-table');
  //```javascript
  d3.csv('ndx.csv', function (data) {
    // Since its a csv file we need to format the data a bit.
    var dateFormat = d3.time.format('%m/%d/%Y');
    var numberFormat = d3.format('.2f');

    //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
    var ndx = crossfilter(data);
    var all = ndx.groupAll();


    data.forEach(function (d) {
      d.dd = dateFormat.parse(d.date);
      d.month = d3.time.month(d.dd); // pre-calculate month for better performance
      d.close = +d.close; // coerce to number
      d.open = +d.open;
    });

    // Dimension by full date
    var dateDimension = ndx.dimension(function (d) {
      return d.dd;
    });

    // Determine a histogram of percent changes
    var fluctuation = ndx.dimension(function (d) {
      return Math.round((d.close - d.open) / d.open * 100);
    });
    var fluctuationGroup = fluctuation.group();

    //#### Bar Chart

    // Create a bar chart and use the given css selector as anchor. You can also specify
    // an optional chart group for this chart to be scoped within. When a chart belongs
    // to a specific group then any interaction with such chart will only trigger redraw
    // on other charts within the same chart group.
    // <br>API: [Bar Chart](https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md#bar-chart)
    fluctuationChart /* dc.barChart('#volume-month-chart', 'chartGroup') */
      .width(420)
      .height(180)
      .margins({top: 10, right: 50, bottom: 30, left: 40})
      .dimension(fluctuation)
      .group(fluctuationGroup)
      .elasticY(true)
      // (_optional_) whether bar should be center to its x value. Not needed for ordinal chart, `default=false`
      .centerBar(true)
      // (_optional_) set gap between bars manually in px, `default=2`
      .gap(1)
      // (_optional_) set filter brush rounding
      .round(dc.round.floor)
      .alwaysUseRounding(true)
      .x(d3.scale.linear().domain([-25, 25]))
      .renderHorizontalGridLines(true)
      // Customize the filter displayed in the control span
      .filterPrinter(function (filters) {
        var filter = filters[0], s = '';
        s += numberFormat(filter[0]) + '% -> ' + numberFormat(filter[1]) + '%';
        return s;
      });

    // Customize axes
    fluctuationChart.xAxis().tickFormat(
      function (v) { return v + '%'; });
    fluctuationChart.yAxis().ticks(5);


    //#### Data Count

    nasdaqCount /* dc.dataCount('.dc-data-count', 'chartGroup'); */
      .dimension(ndx)
      .group(all)
      // (_optional_) `.html` sets different html when some records or all records are selected.
      // `.html` replaces everything in the anchor with the html given using the following function.
      // `%filter-count` and `%total-count` are replaced with the values obtained.
      .html({
        some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
        ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'>Reset All</a>',
        all: 'All records selected. Please click on the graph to apply filters.'
      });

    //#### Data Table
    nasdaqTable /* dc.dataTable('.dc-data-table', 'chartGroup') */
      .dimension(dateDimension)
      // Data table does not use crossfilter group but rather a closure
      // as a grouping function
      .group(function (d) {
        var format = d3.format('02d');
        return d.dd.getFullYear() + '/' + format((d.dd.getMonth() + 1));
      })
      // (_optional_) max number of records to be shown, `default = 25`
      .size(10)
      // There are several ways to specify the columns; see the data-table documentation.
      // This code demonstrates generating the column header automatically based on the columns.
      .columns([
        // Use the `d.date` field; capitalized automatically
        'date',
        // Use `d.open`, `d.close`
        'open',
        'close',
        {
          // Specify a custom format for column 'Change' by using a label with a function.
          label: 'Change',
          format: function (d) {
            return numberFormat(d.close - d.open);
          }
        },
        // Use `d.volume`
        'volume'
      ])

      // (_optional_) sort using the given field, `default = function(d){return d;}`
      .sortBy(function (d) {
        return d.dd;
      })
      // (_optional_) sort order, `default = d3.ascending`
      .order(d3.ascending)
      // (_optional_) custom renderlet to post-process chart using [D3](http://d3js.org)
      .on('renderlet', function (table) {
        table.selectAll('.dc-table-group').classed('info', true);
      });


    //simply call `.renderAll()` to render all charts on the page
    dc.renderAll();

  });

}
