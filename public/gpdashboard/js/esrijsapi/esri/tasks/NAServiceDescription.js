//>>built
define("esri/tasks/NAServiceDescription",["dojo/_base/declare","dojo/json","dojo/Deferred","../request"],function(h,m,n,f){return h(null,{declaredClass:"esri.tasks._NAServiceDescription",getServiceDescription:function(k,h){var e=new n;if(this._url&&this._url.orig){var d=this._url.orig,p=(this._url.path.match(/\/solve$/)||[]).length?"Route":(this._url.path.match(/\/solveClosestFacility$/)||[]).length?"ClosestFacility":"ServiceAreas",b,l=function(c){f({url:c+("/"===c[c.length-1]?"":"/")+"GetTravelModes/execute",
content:{f:"json",serviceName:p},callbackParamName:"callback"}).then(function(a){var c=[],d=null;if(a&&a.results&&a.results.length)for(var g=0;g<a.results.length;g++)if("supportedTravelModes"===a.results[g].paramName){if(a.results[g].value&&a.results[g].value.features)for(var f=0;f<a.results[g].value.features.length;f++)if(a.results[g].value.features[f].attributes){var h=m.parse(a.results[g].value.features[f].attributes.TravelMode);c.push(h)}}else"defaultTravelMode"===a.results[g].paramName&&(d=a.results[g].value);
b.supportedTravelModes=c;b.defaultTravelMode=d;e.resolve(b)},function(a){e.reject(a)})};f({url:d,content:{f:"json"},callbackParamName:"callback"}).then(function(c){b=c;b.supportedTravelModes||(b.supportedTravelModes=[]);for(c=0;c<b.supportedTravelModes.length;c++)b.supportedTravelModes[c].id||(b.supportedTravelModes[c].id=b.supportedTravelModes[c].itemId);h?e.resolve(b):k?l(k):10.4<=b.currentVersion?f({url:d+("/"===d[d.length-1]?"":"/")+"retrieveTravelModes",content:{f:"json"},callbackParamName:"callback"}).then(function(a){b.supportedTravelModes=
a.supportedTravelModes;b.defaultTravelMode=a.defaultTravelMode;e.resolve(b)},function(a){e.reject(a)}):f({url:d.substring(0,d.indexOf("/rest/")+6)+"info",content:{f:"json"},callbackParamName:"callback"}).then(function(a){a.owningSystemUrl?(d=a.owningSystemUrl,f({url:d+("/"===d[d.length-1]?"":"/")+"sharing/portals/self",content:{f:"json"},callbackParamName:"callback"}).then(function(a){a&&a.helperServices&&a.helperServices.routingUtilities&&a.helperServices.routingUtilities.url?l(a.helperServices.routingUtilities.url):
e.resolve(b)},function(a){e.reject(a)})):e.resolve(b)},function(a){e.reject(a)})},function(b){e.reject(b)})}else e.reject("NA Task has no URL specified.");return e.promise}})});