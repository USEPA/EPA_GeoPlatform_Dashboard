// Expose dashboard especially helpful for debugging
if (typeof egam == 'undefined') {
  var egam = {};
}
if (typeof egam.pages == 'undefined') {
  egam.pages = {};
}
if (typeof egam.models == 'undefined') {
  egam.models = {};
}
//Place to stash utility functions
if (typeof egam.utilities == 'undefined') {
  egam.utilities = {};
}
//Place for shared instances of controls/models
if (typeof egam.shared == 'undefined') {
  egam.shared = {};
}

//Place for mustache templates
if (typeof egam.templates == 'undefined') {
  egam.templates = [
    'globalNavigationBar',
    'helpModal',
    'gpoItemsPage',
    'gpoItemsModal',
    'checkListModal',
    'gpoCheckListDetailsModal',
    'reconciliationModal',
    'edgModal',
    'emailModal',
    'metricsView',
    'environmentView',
    'userMgmtView',
    'gpoUsersModal',
    'edgItemsPage',
    'edgItemsModal',
    'gpoCreateUserModal'
  ];
}


//For now i'm using .(dot) namespacing categorized by model, utility and control
//classes. Most classes are models but reusable ones like Table class are
//controls. When AMD is implemented we won't need so much .(dot) namespacing.
//Different categories will be in directories and each class in own file.

//Note the acutal instance of the page models are in egam.pages

//Place to stash the edgItems models for now
egam.models.edgItems = {};

//Place to store and save general data retrieved from REST endpoints
egam.dataStash = {};

// egam.gpoUsers = {
//   isLoaded: false,
// };

egam.templates.load = function(divID) {
  var deferred = $.Deferred();
  var templateFile = 'templates/main_page/' + divID + '.mst';
  //If in production just use single template file.
  //Set useSingleTemplateFile='path to production single template file'
  if (egam.templates.useSingleTemplateFile) {
    templateFile = egam.templates.useSingleTemplateFile;
  }
  //Don't reload if already in cache
  if (!(templateFile in egam.templates.cache)) {
    $.get(templateFile, function(template) {
      egam.templates.cache[templateFile] = $(template).filter('#' + divID).html();
      render();
      deferred.resolve();
    });
  } else {
    render();
    deferred.resolve();
  }

  function render() {
    $('#' + divID).append(Mustache.render(egam.templates.cache[templateFile], {}));
  }


  return deferred.promise();
};

egam.templates.loadArray = function() {
  var deferred = $.Deferred();
  this.forEach(function(divID) {
    egam.templates.load(divID).then(function() {
      if (divID == egam.templates[egam.templates.length - 1]) {
        deferred.resolve();
      }
    });
  });
  return deferred.promise();
};

egam.templates.cache = {};

$(document).ready(function() {

  //Load templates
  egam.templates.loadArray().then(function() {
    // Wait until templates are loaded before doing the following:
    // Click event for Help Modal
    $('#egamHelp').on('click', function(e) {
      $('#helpModal').modal('show');
    });

    // Add tooltips
    var options = {delay: { show: 500, hide: 100 }};
    $('[data-toggle="tooltip"]').tooltip(options);

    ko.bindingHandlers['wysiwyg'].defaults = {
      plugins: [ 'link textcolor colorpicker' ],
      toolbar: 'bold italic underline forecolor backcolor | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'numlist bullist indent outdent | link image | undo redo | ' +
      'fontsizeselect ',
      menubar: false,
      statusbar: false,
      toolbar_items_size: 'small',
      body_class: 'form-group has-success form-control',
    };

    // Load the GPHE table
    $.getScript('js/gphedata.js')
      .done(function(script, textStatus) {
        $('#environmentTable').DataTable({
          data: GPHEdata,
          columns: [
            { title: 'Folder'},
            { title: 'Service Name'},
            { title: 'Service Type'},
            { title: 'Service Description'},
          ],
        });
      });
  });

  $(document).on('click', '.nav li', function(e) {
    $('.nav-sidebar li').removeClass('active');
    $(this).addClass('active');
    // Hide loading msg
    $('div#loadingMsg').addClass('hidden');
    var view = $(this).find(':first').attr('id');
    $('#' + view + 'View').collapse('show');
    $('.view').not(document.getElementById(view)).collapse('hide');
    if (e.target.hash == '#edgView') {
      loadEDGitemsPage();
    } else if (e.target.hash == '#userMgmtView') {
      // Only load user table the first time user click on userMgmtView
      populateUserMngntTable();
      // if (!egam.gpoUsers.isLoaded) {
      //   populateUserMngntTable();
      //   egam.gpoUsers.isLoaded = true;
      // }
    } else if (e.target.hash == '#metricsView') {
      loadDC();
    }
  });


});


function populateUserMngntTable() {

  if (!egam.pages.gpoUsers) {
    //Create the new PageModel instance
    egam.pages.gpoUsers = new egam.models.gpoUsers.PageModelClass();
    egam.pages.gpoUsers.init();
    console.log('gpoUsers Page Model created: ' + new Date());
  }

  //egam.pages.gpoUsers = new egam.models.gpoUsers.PageModelClass();
  //console.log('GPOusers Page Model created: ' + new Date());

}


//This is basically generic way to hit endopint get dataset and store it
//Example datasets are available authgroups and available tags
egam.utilities.getDataStash = function(name,endpoint,data,type) {
  var self = this;
  var defer = $.Deferred();

  type = type || 'GET';
  data = data || null;
  //If already got avail tags just return don't ajax them again
  if (egam.dataStash[name]) {
    defer.resolve(egam.dataStash[name]);
    return defer;
  }

  $.ajax({
    url: endpoint,
    data: data,
    type: type,
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      if (data.errors > 0) {
        defer.reject(data.errors);
      }

      egam.dataStash[name] = data;
      defer.resolve(data);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      defer.reject('Error getting Data Stash with status ' +
        textStatus + ': ' + errorThrown);
      console.error('ERRORS: ' + errorThrown);
    },
  });

  return defer;
};

egam.utilities.queryEndpoint = function(endpoint,query,projection) {
  var self = this;
  var defer = $.Deferred();

  var data = {
    query:JSON.stringify(query),
    projection:JSON.stringify(projection)
  };

  $.ajax({
    url: endpoint,
    data: data,
    type: 'POST',
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      if (data.errors > 0) {
        defer.reject(data.errors);
      }
      defer.resolve(data);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      defer.reject('Error getting Data Stash with status ' +
        textStatus + ': ' + errorThrown);
      console.error('ERRORS: ' + errorThrown);
    }
  });

  return defer;
};

egam.utilities.loadSharedControl = function(name,constructor,args) {
  if (egam.shared[name]) {
    return egam.shared[name];
  }else {
    args.unshift(null);
    var factoryFunction = constructor.bind.apply(constructor, args);
    return new factoryFunction();
  }
};

egam.utilities.formatDate = function(dateTime) {
  if (!dateTime) {
    return null;
  }
  var monthNames = [
    'Jan', 'Feb', 'Mar',
    'Apr', 'May', 'Jun', 'Jul',
    'Aug', 'Sep', 'Oct',
    'Nov', 'Dec'
  ];

  var modDate = dateTime;
  if (typeof modDate != 'object') {
    modDate = new Date(dateTime);
  }
  return monthNames[modDate.getMonth()] + ' ' +
    modDate.getDate() + ', ' + modDate.getFullYear();
};


function loadEDGitemsPage() {
  if (!egam.pages.edgItems) {
    //Create the new PageModel instance
    egam.pages.edgItems = new egam.models.edgItems.PageModelClass();
    console.log('EDGitems Page Model created: ' + new Date());

    //Basically initialize the gpoItems page because that is the first page we
    //want to see on login

    egam.pages.edgItems.init()
      .then(function() {
        egam.models.edgItems.MetricsModel(egam.pages.edgItems.table.data);
        return true;
      })
      .fail(function(err) {
        console.error(err);
      });
  }
}
