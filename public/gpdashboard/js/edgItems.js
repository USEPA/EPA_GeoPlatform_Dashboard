//Place to stash the edgItmes models for now
//Note the actual instance of the page models are in egam.pages so edgItems page
//instance is egam.pages.edgItems
//When AMD is implemented we won't need so much .(dot) namespacing for the
//model, utility and control classes. They will be in directories
egam.models.edgItems = {};



//Data here is the actual array of JSON documents that came back from the REST
//endpoint
egam.models.edgItems.PageModelClass = function() {
  var self = this;

  self.$tableElement = $('#edgItemsTable');
  self.$pageElement = $('#edgItemsPage');

  self.resultFields = {
    title: 1,
    description: 1,
    keyword: 1,
    modified: 1,
    publisher: 1,
    contactPoint: 1,
    contactPointEmail: 1,
    identifier: 1,
    accessLevel: 1,
    bureauCode: 1,
    programCode: 1,
    license: 1,
    spatial: 1,
    accrualPeriodicity: 1,
    distribution: 1,
    AuditData: 1
  };

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
  self.table = new egam.controls.Table([],
    self.$tableElement,egam.models.edgItems.RowModelClass);

  ////Set up the details control now which is part of this Model Class
  self.details = new egam.models.edgItems.DetailsModel(self);
};

//Load EDG table on initial click of EDG
egam.models.edgItems.PageModelClass.prototype.init = function() {
  var self = this;
  var defer = $.Deferred();

  //Only run init once for gpoItems page/model
  if (self.model) {
    defer.resolve();
    return defer;
  }

  //Show the loading message but hide count (doesn't work for external).
  //Hide the table.
  $('#loadingMsgTotalCount').text('');
  $('div#loadingMsg').removeClass('hidden');
  self.$pageElement.addClass('hidden');

  //Apply the bindings for the page now
  ko.applyBindings(self, self.$pageElement[0]);
  console.log('Bindings Applied: ' + new Date());


  //Now initialize the table. ie. download data and create table rows
  //the payload can be reduced if resultFields array was set
  var fields = this.resultFields || {};

  var query = {};
  var projection = {fields: fields};

  //Now that we are downloading EDG data, load it from Mongo
  return self.table.init('edgitems/list', query, projection)
  //After table is loaded we can do other stuff
    .then(function() {
      //Now stop showing loading message that page is load
      $('div#loadingMsg').addClass('hidden');
      self.$pageElement.removeClass('hidden');

      defer.resolve();
    });
};

//This is limited model which is used for the table rows. It is condensed so
//that table loads faster
egam.models.edgItems.RowModelClass = function(doc, index) {
  var self = this;
  //This is the doc

  this.doc = doc;
  //To keep track of this row when selected
  this.index = index;

};

//Model for Search EDG modal accessed from GPO details modal
egam.models.edgItems.LinkEDGModel = function(parent) {
  var self = this;
  this.$element =  $('#edgModal');
  this.$tableElement = $('#edgModalItemsTable');

  //This is the details model
  this.parent = parent;

  this.gpoDoc = null;
  this.gpoID = null;
  this.gpoTitle = null;

  this.onload = onload;
  this.bound = false;

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
  self.table = new egam.controls.Table([],
    self.$tableElement,egam.models.edgItems.RowModelClass);

};


//This will load the controls when called (eg. the Search button is clicked)
egam.models.edgItems.LinkEDGModel.prototype.load = function(gpoDoc) {
  var self = this;
  this.$element.modal('show');

  //Save the passed doc
  this.gpoDoc = gpoDoc;
  //In case non observable doc loaded unwrap it
  this.gpoDocUnWrapped = ko.utils.unwrapObservable(gpoDoc);
  this.gpoID = ko.utils.unwrapObservable(this.gpoDocUnWrapped.id);
  this.gpoTitle = ko.utils.unwrapObservable(this.gpoDocUnWrapped.title);

  //If not bound yet then apply bindings
  if (!this.bound) {
    ko.applyBindings(this,this.$element[0]);
    this.bound = true;
  }

  //Get
  var edgURLParams = {
    f: 'dcat',
    max: '100',
    searchText: 'title:\'' + this.gpoTitle + '\'',
  };
  var edgURL = 'https://edg.epa.gov/metadata/rest/find/document?' +
    $.param(edgURLParams);

  return self.table.init(edgURL, null, null, 'dataset')
};

//Re-initialize the table on user-submitted search term
egam.models.edgItems.LinkEDGModel.prototype.customSearch = function() {
  var self = this;
  //Get
  var edgURLParams = {
    f: 'dcat',
    max: '100',
    searchText: 'title:\'' + $('#edgTitleSearch').val() + '\'',
  };
  var edgURL = 'https://edg.epa.gov/metadata/rest/find/document?' +
    $.param(edgURLParams);

  return self.table.init(edgURL, null, null, 'dataset')
};

//Get reference URLs from EDG Search. Find metadata URL and open full EDG
//metadata for this record.
egam.models.edgItems.LinkEDGModel.prototype.linkRecord = function(edgURLs) {
  var self = this;
  var edgURL = '';
  //Find reference URL that matches EDG metadata directory
  edgURLs.forEach(function(url, index) {
    if (url.indexOf('edg.epa.gov/metadata/rest/document') > -1) {
      edgURL = url;
    }
  });
  if (edgURL) {
    $.ajax({
      type: 'GET',

      //Name of file you want to parse
      url: edgURL,
      dataType: 'xml',
      success: function(xml) {
        var title = $(xml).find('citation').find('title').text();

        //Need to capture different metadata styles
        if (!title) {
          title = $(xml).find('title').text();
          if (!title) {
            title = $(xml).find('gmd\\:citation')
              .find('gmd\\:CI_Citation')
              .find('gmd\\:title')
              .find('gco\\:CharacterString').text()
          }
        }
        var purpose = $(xml).find('purpose').text();
        var abstract = $(xml).find('abstract').text();

        //Need to capture different metadata styles
        if (!abstract) {
          abstract = $(xml).find('description').text();
          if (!abstract) {
            abstract = $(xml).find('gmd\\:abstract')
              .find('gco\\:CharacterString').text();
          }
        }
        var acc = $(xml).find('accconst').text();
        var usecon = $(xml).find('useconst').text();

        //Need to capture different metadata styles
        if (!usecon) {
          acc = $(xml).find('gmd\\:MD_SecurityConstraints')
            .find('gmd\\:useLimitation')
            .find('gco\\:CharacterString').text();
          usecon = $(xml).find('gmd\\:MD_LegalConstraints')
            .find('gmd\\:useLimitation')
            .find('gco\\:CharacterString').text();
        }
        var useconst = '';
        if (acc || usecon) {
          useconst = 'Access constraints: ' + acc +
            ' Use constraints: ' + usecon;
        }

        var publisher = $(xml).find('publish').text();

        //Need to capture different metadata styles
        if (!publisher) {
          var agency = $(xml).find('agencyName').text();
          var subagency = $(xml).find('subAgencyName').text();
          if (agency) {
            if (subagency) {
              publisher = agency + ', ' + subagency;
            } else {
              publisher = agency;
            }
          } else {
            publisher = $(xml).find('gmd\\:contact')
              .find('gmd\\:organisationName')
              .find('gco\\:CharacterString').text();
          }
        }
        var mydata = new FormData();
        mydata.append('updateDocs', JSON.stringify({
          id: self.gpoID,
          owner: self.owner,
          EDGdata: {
            title: title,
            purpose: purpose,
            abstract: abstract,
            useconst: useconst,
            publisher: publisher,
            url: edgURL,},
        }));
        $.ajax({
          url: 'gpoitems/update',
          type: 'POST',
          data: mydata,
          cache: false,
          dataType: 'json',

          //Don't process the files
          processData: false,

          //Set content type to false as jQuery will tell the server its a
          //query string request
          contentType: false,
          success: function(data, textStatus, jqXHR) {
            if (data.errors < 1) {
              //Success so call function to process the form
              console.log('success: ' + data);
              //Need to just add the EDG data to the selected doc.
              //If we create new doc we will lose subscriptions
              var edgDataObserv = ko.mapping.fromJS({
                title: title,
                purpose: purpose,
                abstract: abstract,
                useconst: useconst,
                publisher: publisher,
                url: edgURL,});

              //Now just set the EDGdata since it is just an object and not
              //observable itself even though members are (for now at least)
              //Note maybe I should be operating on the this.GPOdoc here to be
              //more general
              //self.parent.selected().doc().EDGdata = edgDataObserv;
              self.gpoDocUnWrapped.EDGdata = edgDataObserv;
              //If need EDG change to trigger something later could do this
              if (ko.isObservable(self.gpoDoc)) {
                self.gpoDoc(self.gpoDocUnWrapped)
              }

              self.$element.modal('hide');

              //Show reconciliation modal
              egam.pages.gpoItems.details.loadReconcile();
            } else {
              //Handle errors here
              console.error('ERRORS: ');
              console.error(data.errors);
            }
          },
          error: function(jqXHR, textStatus, errorThrown) {
            //Handle errors here
            console.log('ERRORS: ' + textStatus);

            //STOP LOADING SPINNER
          },
        });
      },
      error: function(jqXHR, textStatus, errorThrown) {
        alert('EDG metadata record could not be loaded: ' + edgURL +
          ' (' + textStatus + ')');
        console.log('EDG metadata record could not be loaded: ' + edgURL +
          ' (' + textStatus + ')');
      },
    });
  } else {
    alert('No matching URL for this record: ' + self.gpoID);
    console.log('No matching URL for this record: ' + self.gpoID);
  }
};


//Model for reconciling EDG and GPO metadata
egam.models.edgItems.ReconcilliationModel = function() {
  var self = this;
  this.$element =  $('#reconciliationModal');

  this.fields = [
    'title',
    'snippet',
    'description',
    'licenseInfo',
    'accessInformation',
  ];

  this.onload = onload;
  this.bound = false;
  this.doc = ko.observable();
  this.fullDoc = ko.observable();

};

//This willl load the reconcillation controls when called
//(eg. the reconcile button is clicked)
egam.models.edgItems.ReconcilliationModel.prototype.load = function(fullDoc) {

  this.$element.modal('show');
  //Had to do this for testing
  //$('#gpoItemsModal').modal('hide');

  this.loadCurrentFields(fullDoc);
  //If not bound yet then apply bindings
  if (!this.bound) {
    ko.applyBindings(this,this.$element[0]);
    this.bound = true;
  }
};

//This loads the current fields for item into reconcilliation model
egam.models.edgItems.ReconcilliationModel.prototype.loadCurrentFields = function(fullDoc) {
  var self = this;
  //FullDoc passed in might not be observable. If not, this should still allow
  //fullDoc() to be called.
  fullDoc = ko.utils.unwrapObservable(fullDoc);
  this.fullDoc(fullDoc);
  var docSlice = {};
  $.each(this.fields,function(index,field) {
    //UnwrapObservable in case the doc passed does not have observables for
    //fields
    docSlice[field] = ko.utils.unwrapObservable(fullDoc[field]);
  });
  this.doc(ko.mapping.fromJS(docSlice));
};

//This loads the reconciled fields into the current item for possible saving
egam.models.edgItems.ReconcilliationModel.prototype.loadReconciledFields = function() {
  var self = this;
  var fullDoc = ko.utils.unwrapObservable(this.fullDoc);

  $.each(this.fields,function(index,field) {
    //If FullDoc is observable need to pass the reconcilled field vs setting it
    if (ko.isObservable(fullDoc[field])) {
      fullDoc[field](self.doc()[field]());
    }else {
      fullDoc[field] = self.doc()[field]();
    }
  });
};

egam.models.edgItems.ReconcilliationModel.prototype.copyEDGtoGPO = function(source,destination) {
  var self = this;
  //If no destination then it is same name as source
  destination = destination || source;

  var fullDoc = ko.utils.unwrapObservable(this.fullDoc);
  var edgValue = ko.utils.unwrapObservable(fullDoc.EDGdata[source]);
  this.doc()[destination]($.trim(edgValue));
};

//Data here is the actual array of JSON documents that came back from the
//REST endpoint
egam.models.edgItems.DetailsModel = function(parent) {
  var self = this;
  self.parent = parent;

  self.$element = $('#edgItemsModal');
  this.bound = false;
  //A new observable for the selected row storing the FULL gpoItem model
  self.selected = ko.observable();
};

//On the entire table, we need to know which item is selected to use later with
//modal, etc.
egam.models.edgItems.DetailsModel.prototype.select = function(item) {
  var self = this;
  self.selected(item);
  if (!self.bound) {
    ko.applyBindings(self, self.$element[0]);
    self.bound = true;
  }
};

//Allows you to select an item based on index, usually index will be coming from
//row number
egam.models.edgItems.DetailsModel.prototype.selectIndex = function(index) {
  this.select(this.parent.table.items[index]);
};


//This will load the metrics
egam.models.edgItems.MetricsModel = function(data) {
  var self = this;
  var metricsDiv = '#edgMetrics';
  //Object for storing frequency data
  var fData = [
    {org: 'EPA', freq: {pub: 0, nonpub: 0, respub: 0}},
    {org: 'External', freq: {pub: 0, nonpub: 0, respub: 0}}
  ];
  //Assoc array for looking up access level names
  var accessLevels = {
    pub: 'public',
    nonpub: 'non-public',
    respub: 'restricted public'
  };

  //Function to determine if a record is EPA owned or not
  var getOrg = function(org) {
    var orgObj = {};
    if (org.match(/(EPA|Environmental Protection Agency)/)) {
      //Return fData row associated w/ EPA
      orgObj = $.grep(fData, function(e) { return e.org == 'EPA'; })[0];
    } else {
      //Return fData row associated w/ external agency
      orgObj = $.grep(fData, function(e) { return e.org == 'External'; })[0];
    }
    return orgObj;
  };
  //Loop through each row of EDG data
  data.forEach(function(row) {
    //Get the fData row for this EDG record's publisher
    var orgObj = getOrg(row.publisher);
    //Increment count for associated access level
    switch (row.accessLevel) {
      case 'public': {
        orgObj.freq.pub += 1;
        break;
      }
      case 'non-public': {
        orgObj.freq.nonpub += 1;
        break;
      }
      case 'restricted public': {
        orgObj.freq.respub += 1;
        break;
      }
    }
  });

  //d3 code modified from: http://bl.ocks.org/NPashaP/96447623ef4d342ee09b
  var barColor = 'steelblue';
  function segColor(c) {
    return {
      pub: '#807dba',
      nonpub: '#e08214',
      respub: '#41ab5d'}[c];
  }

  //Compute total for each org.
  fData.forEach(function(d) {
    d.total = d.freq.pub + d.freq.nonpub + d.freq.respub;
  });

  //Function to handle histogram.
  function histoGram(fD) {
    var hG = {};
    var hGDim = {t: 60, r: 0, b: 30, l: 0};
    hGDim.w = 500 - hGDim.l - hGDim.r;
    hGDim.h = 300 - hGDim.t - hGDim.b;

    //Create svg for histogram.
    var hGsvg = d3.select(metricsDiv).append('svg')
      .attr('width', hGDim.w + hGDim.l + hGDim.r)
      .attr('height', hGDim.h + hGDim.t + hGDim.b).append('g')
      .attr('transform', 'translate(' + hGDim.l + ',' + hGDim.t + ')');

    //Create function for x-axis mapping.
    var x = d3.scaleBand().rangeRound([0, hGDim.w])
      .domain(fD.map(function(d) { return d[0]; }));

    //Add x-axis to the histogram svg.
    hGsvg.append('g').attr('class', 'x axis')
      .attr('transform', 'translate(0,' + hGDim.h + ')')
      .call(d3.axisBottom(x));

    //Create function for y-axis map.
    var y = d3.scaleLinear().range([hGDim.h, 0])
      .domain([0, d3.max(fD, function(d) { return d[1]; })]);

    //Create bars for histogram to contain rectangles and freq labels.
    var bars = hGsvg.selectAll('.bar').data(fD).enter()
      .append('g').attr('class', 'bar');

    //Create the rectangles.
    bars.append('rect')
      .attr('x', function(d) { return x(d[0]); })
      .attr('y', function(d) { return y(d[1]); })
      .attr('width', x.bandwidth())
      .attr('height', function(d) { return hGDim.h - y(d[1]); })
      .attr('fill',barColor)
      .on('mouseover',mouseover)
      .on('mouseout',mouseout);

    //Create the frequency labels above the rectangles.
    bars.append('text').text(function(d) { return d3.format(',')(d[1])})
      .attr('x', function(d) { return x(d[0]) + x.bandwidth() / 2; })
      .attr('y', function(d) { return y(d[1]) - 5; })
      .attr('text-anchor', 'middle');

    //Utility function to be called on mouseover.
    function mouseover(d) {
      //Filter for selected org.
      var st = fData.filter(function(s) { return s.org == d[0];})[0];
      var nD = d3.keys(st.freq)
          .map(function(s) { return {type: s, freq: st.freq[s]};});

      //Call update functions of pie-chart and legend.
      pC.update(nD);
      leg.update(nD);
    }
    //Utility function to be called on mouseout.
    function mouseout(d) {
      //Reset the pie-chart and legend.
      pC.update(tF);
      leg.update(tF);
    }

    //Create function to update the bars. This will be used by pie-chart.
    hG.update = function(nD, color) {
      //Update the domain of the y-axis map to reflect change in frequencies.
      y.domain([0, d3.max(nD, function(d) { return d[1]; })]);

      //Attach the new data to the bars.
      var bars = hGsvg.selectAll('.bar').data(nD);

      //Transition the height and color of rectangles.
      bars.select('rect').transition().duration(500)
        .attr('y', function(d) {return y(d[1]); })
        .attr('height', function(d) { return hGDim.h - y(d[1]); })
        .attr('fill', color);

      //Transition the frequency labels location and change value.
      bars.select('text').transition().duration(500)
        .text(function(d) { return d3.format(',')(d[1])})
        .attr('y', function(d) {return y(d[1]) - 5; });
    };
    return hG;
  }

  //Function to handle pieChart.
  function pieChart(pD) {
    var pC = {};
    var pieDim = {w: 250, h: 250};
    pieDim.r = Math.min(pieDim.w, pieDim.h) / 2;

    //Create svg for pie chart.
    var piesvg = d3.select(metricsDiv).append('svg')
      .attr('width', pieDim.w).attr('height', pieDim.h).append('g')
      .attr('transform',
        'translate(' + pieDim.w / 2 + ',' + pieDim.h / 2 + ')');

    //Create function to draw the arcs of the pie slices.
    var arc = d3.arc().outerRadius(pieDim.r - 10).innerRadius(0);

    //Create a function to compute the pie slice angles.
    var pie = d3.pie().sort(null).value(function(d) { return d.freq; });

    //Draw the pie slices.
    piesvg.selectAll('path').data(pie(pD)).enter().append('path').attr('d', arc)
      .each(function(d) { this._current = d; })
      .style('fill', function(d) { return segColor(d.data.type); })
      .on('mouseover',mouseover).on('mouseout',mouseout);

    //Create function to update pie-chart. This will be used by histogram.
    pC.update = function(nD) {
      piesvg.selectAll('path').data(pie(nD)).transition().duration(500)
        .attrTween('d', arcTween);
    };
    //Utility function to be called on mouseover a pie slice.
    function mouseover(d) {
      //Call the update function of histogram with new data.
      hG.update(fData.map(function(v) {
        return [v.org,v.freq[d.data.type]];}),segColor(d.data.type));
    }
    //Utility function to be called on mouseout a pie slice.
    function mouseout(d) {
      //Call the update function of histogram with all data.
      hG.update(fData.map(function(v) {
        return [v.org,v.total];}), barColor);
    }
    //Animating the pie-slice requiring a custom function which specifies
    //how the intermediate paths should be drawn.
    function arcTween(a) {
      var i = d3.interpolate(this._current, a);
      this._current = i(0);
      return function(t) { return arc(i(t));    };
    }
    return pC;
  }

  //Function to handle legend.
  function legend(lD) {
    var leg = {};

    //Create table for legend.
    var legend = d3.select(metricsDiv).append('table').attr('class','legend');

    //Create one row per segment.
    var tr = legend.append('tbody').selectAll('tr')
      .data(lD).enter().append('tr');

    //Create the first column for each segment.
    tr.append('td').append('svg').attr('width', '16')
      .attr('height', '16').append('rect')
      .attr('width', '16').attr('height', '16')
      .attr('fill',function(d) { return segColor(d.type); });

    //Create the second column for each segment.
    tr.append('td').text(function(d) {
      return accessLevels[d.type];
    });

    //Create the third column for each segment.
    tr.append('td').attr('class','legendFreq')
      .text(function(d) { return d3.format(',')(d.freq);});

    //Create the fourth column for each segment.
    tr.append('td').attr('class','legendPerc')
      .text(function(d) { return getLegend(d,lD);});

    //Utility function to be used to update the legend.
    leg.update = function(nD) {
      //Update the data attached to the row elements.
      var l = legend.select('tbody').selectAll('tr').data(nD);

      //Update the frequencies.
      l.select('.legendFreq').text(function(d) {
        return d3.format(',')(d.freq);
      });

      //Update the percentage column.
      l.select('.legendPerc').text(function(d) {
        return getLegend(d,nD);
      });
    };

    //Utility function to compute percentage.
    function getLegend(d,aD) {
      return d3.format('%')(d.freq / d3.sum(aD.map(function(v) { return v.freq; })));
    }

    return leg;
  }

  //Calculate total frequency by segment for all orgs.
  var tF = ['pub','nonpub','respub'].map(function(d) {
    return {type: d, freq: d3.sum(fData.map(function(t) { return t.freq[d];}))};
  });

  //Calculate total frequency by org for all segment.
  var sF = fData.map(function(d) {return [d.org, d.total];});
  //Create the histogram.
  var hG = histoGram(sF);
  //Create the pie-chart.
  var pC = pieChart(tF);
  //Create the legend.
  var leg = legend(tF);
};