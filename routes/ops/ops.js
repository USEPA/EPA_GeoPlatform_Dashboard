var gpdashboard_ops = {};

gpdashboard_ops.deploy = {
  start: function () {
   return gpdashboard_ops.utilities.hitEndpoint('deploy/start')
     .then(function (out) {
       console.log(out);
       var template = $('#template_deploy_' + out.status).html() || $('#template_deploy_error').html();
       
       //hasErrors:out.stderr.length>0
       
       var data = {date:new Date(),response:out};
       gpdashboard_ops.utilities.loadResponse('#results',template,data);
     })
  }
};

gpdashboard_ops.utilities = {};

gpdashboard_ops.utilities.hitEndpoint = function(endpoint,data,type) {
  var self = this;
  var defer = $.Deferred();

  if (!type) type = 'GET';

  $.ajax({
    url: endpoint,
    data: data,
    type: type,
    dataType: 'json',
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
