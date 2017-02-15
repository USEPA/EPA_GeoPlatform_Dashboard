var gpdashboard_ops = {};

gpdashboard_ops.utilities = {};

$(document).ready(function() {
  $("#deployBranches").on("change",function () {
    $("#deployBranch").val($(this).val());
  });
  gpdashboard_ops.utilities.hitEndpoint('nodeEnv',null,null,'text')
    .then(function (out) {
      $('#emptyBranchMessageLocal').toggle(out=="local");
      $('#emptyBranchMessageStaging').toggle(out=="staging");
      $('#emptyBranchMessageProduction').toggle(out=="production");
    });
});

gpdashboard_ops.deploy = {
  start: function () {
    var branch = $("#deployBranch").val();
   return gpdashboard_ops.utilities.hitEndpoint('deploy/start?branch=' + branch)
     .then(function (out) {
       console.log(out);
       var template = $('#template_deploy_' + out.body.status).html() || $('#template_deploy_error').html();
       
       var data = {date:new Date(),response:out};
       gpdashboard_ops.utilities.loadResponse('#results',template,data);
     })
  }
};

gpdashboard_ops.branches = {
  fetch: function () {
    return gpdashboard_ops.utilities.hitEndpoint('branches/list?limit=50')
      .then(function (out) {
        $("#deployBranches").append('<option value="">Select Branch</option>');
        out.body.forEach(function (obj) {
          var name = obj.name.replace(/^origin\//,'');
          $("#deployBranches").append('<option value="' + name + '">' + name + '</option>');
        });
        $("#deployBranches").show();
      });
  }
};

gpdashboard_ops.utilities.hitEndpoint = function(endpoint,data,type,dataType) {
  var self = this;
  var defer = $.Deferred();

  if (!type) type = 'GET';
  if (!dataType) dataType = 'json';

  $.ajax({
    url: endpoint,
    data: data,
    type: type,
    dataType: dataType,
    success: function(data, textStatus, jqXHR) {
      if (data.errors && data.errors.length > 0) {
        var template = $('#template_error').html();
        gpdashboard_ops.utilities.loadResponse('#results',template,data);
        defer.reject(data.errors);
      }
      defer.resolve(data);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      defer.reject('Error calling end point with status ' +
        textStatus + ': ' + errorThrown);
      console.error('ERRORS: ' + errorThrown);
    }
  });

  return defer;
};

gpdashboard_ops.utilities.loadResponse = function(target,template,data) {

  Mustache.parse(template);
  var body = Mustache.render(template,data);

  $(target).html('');
  setTimeout(function () {
    $(target).html(body);
  },100);
};
