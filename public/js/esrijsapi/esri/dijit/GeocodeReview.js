//>>built
require({cache:{"url:esri/dijit/GeocodeReview/templates/Review.html":'\x3cdiv style\x3d"width:100%; height:100%;"\x3e\r\n  \x3cdiv class\x3d"${baseClass}" data-dojo-attach-point\x3d"BorderContainerNode"  data-dojo-type\x3d"dijit.layout.BorderContainer" gutters\x3d"false"\x3e\r\n    \x3cdiv id\x3d"${headerID}" class\x3d"esriControllerContainer" data-dojo-type\x3d"dijit/layout/ContentPane" data-dojo-props\x3d"region: \'top\'"\x3e\r\n      \x3cdiv data-dojo-attach-point\x3d"StackControllerNode" data-dojo-type\x3d"dijit.layout.StackController" data-dojo-props\x3d"containerId:\'${stackContainerID}\'"\x3e\x3c/div\x3e\r\n      \x3cdiv class\x3d"learnMoreDiv"\x3e\x3cspan\x3e\x3ca href\x3d"#"\x3e${i18n.common.learnMore}\x3c/a\x3e\x3c/span\x3e\x3c/div\x3e\r\n    \x3c/div\x3e\r\n    \x3cdiv class\x3d"StackContainerNode" id\x3d"${stackContainerID}" data-dojo-props\x3d"region: \'center\'" data-dojo-attach-point\x3d"StackContainerNode" data-dojo-type\x3d"dijit/layout/StackContainer"  data-dojo-id\x3d"StackContainerNode" style\x3d"width:100%; height:100%;"\x3e\r\n      \x3cdiv data-dojo-attach-point\x3d"_tab1Node" data-dojo-type\x3d"dijit/layout/ContentPane" name\x3d"Unmatched" title\x3d"${unmatchedUC}"\x3e\r\n        \x3cdiv class\x3d"esriGeocodeGrid" data-dojo-attach-point\x3d"_grid1Node"\x3e\x3c/div\x3e\r\n      \x3c/div\x3e\r\n      \x3cdiv  data-dojo-attach-point\x3d"_tab2Node"  data-dojo-type\x3d"dijit/layout/ContentPane" name\x3d"Matched" title\x3d"${matchedUC}"\x3e\r\n        \x3cdiv class\x3d"esriGeocodeGrid" data-dojo-attach-point\x3d"_grid2Node"\x3e\x3c/div\x3e\r\n      \x3c/div\x3e\r\n      \x3cdiv  data-dojo-attach-point\x3d"_tab3Node"  data-dojo-type\x3d"dijit/layout/ContentPane" name\x3d"Reviewed" title\x3d"${reviewedUC}"\x3e\r\n        \x3cdiv class\x3d"esriGeocodeGrid" data-dojo-attach-point\x3d"_grid3Node"\x3e\x3c/div\x3e\r\n      \x3c/div\x3e\r\n    \x3c/div\x3e\r\n  \x3c/div\x3e\r\n\x3c/div\x3e\r\n\r\n'}});
define("esri/dijit/GeocodeReview","require dojo/on dojo/Evented dojo/has dojo/_base/declare dojo/_base/lang dojo/_base/Deferred dojo/_base/array dojo/text!./GeocodeReview/templates/Review.html dojo/i18n!../nls/jsapi dojo/store/Memory dojo/string dojo/dom dojo/dom-style dijit/_WidgetBase dijit/_OnDijitClickMixin dijit/_TemplatedMixin dijit/_WidgetsInTemplateMixin dgrid/OnDemandGrid dgrid/Selection dgrid/Keyboard dgrid/editor dgrid/extensions/DijitRegistry dgrid/extensions/ColumnHider ../graphic ../geometry/Extent ../geometry/Point ../geometry/webMercatorUtils ../symbols/PictureMarkerSymbol ../tasks/query ../layers/FeatureLayer ../layers/GraphicsLayer ../request ../arcgis/utils ../kernel".split(" "),
function(l,h,m,B,r,f,C,u,D,g,k,n,E,s,F,G,H,I,J,K,L,v,M,N,p,w,O,x,t,y,q,P,z,A,Q){m=r([F,G,H,I,m],{baseClass:"esriReviewContainer",loaded:!1,templateString:D,widgetsInTemplate:!0,i18n:g,constructor:function(a,b){r.safeMixin(this,a);this.StandardGrid=r([M,J,K,L,v,N]);this._defineGridStores();this._defineColumns();this.stackContainerID=b+"_StackContainerNode";this.headerID=b+"_HeaderNode";this.unmatchedUC=g.widgets.geocodeReview.unmatchedUC;this.matchedUC=g.widgets.geocodeReview.matchedUC;this.reviewedUC=
g.widgets.geocodeReview.reviewedUC;this.suggestionGraphic||(this.suggestionGraphic=new t(l.toUrl("./GeocodeReview/images/EsriBluePinCircle26.png"),26,26),this.suggestionGraphic.setOffset(0,12));this.matchGraphic||(this.matchGraphic=new t(l.toUrl("./GeocodeReview/images/EsriGreenPinCircle26.png"),26,26),this.matchGraphic.setOffset(0,12));this.highlightGraphic||(this.highlightGraphic=new t(l.toUrl("./GeocodeReview/images/EsriYellowPinCircle26.png"),26,26),this.highlightGraphic.setOffset(0,12));this._keywordMap=
{};this._keywordArray=[];this._arcgisUrl=f.getObject("esri.arcgis.utils.arcgisUrl");this._singleLineInput=!0},postCreate:function(){this.inherited(arguments);this._generateGrids();this.graphicsLayer=new P;this.map.addLayer(this.graphicsLayer);this._listenerHandles=[this.StackControllerNode.on("selectChild",f.hitch(this,function(){this.clearGridSelection();this.StackContainerNode.selectedChildWidget&&(this.currentTab=this.StackContainerNode.selectedChildWidget,this.currentTabId=this.StackContainerNode.selectedChildWidget.id);
this.resize();this.graphicsLayer.clear();this.emit("tab-change",{});this.geocodeMatch&&this.geocodeMatch.reset()})),h(this.map,"resize",f.hitch(this,function(){this.resize()})),h(window,"resize",f.hitch(this,function(){this.resize()})),h(this._gridUnmatchedRef,"dgrid-select",f.hitch(this,function(a){a.rows[0].data.oid?(this.currentSelectedRow=this._unmatchedStore.get(a.rows[0].data.oid),this._selectGridRowEvent(a.rows[0].data.oid,this.currentSelectedRow)):(this.currentSelectedRow=this._unmatchedStore.get(a.rows[0].data[this._tableLayer.objectIdField]),
this._selectGridRowEvent(a.rows[0].data[this._tableLayer.objectIdField],this._unmatchedStore.get(a.rows[0].data[this._tableLayer.objectIdField])))})),h(this._gridMatchedRef,"dgrid-select",f.hitch(this,function(a){this.currentSelectedRow=this._matchedStore.get(a.rows[0].data[this._featureLayer.objectIdField]);this._selectGridRowEvent(a.rows[0].data[this._featureLayer.objectIdField],this._matchedStore.get(a.rows[0].data[this._featureLayer.objectIdField]))})),h(this._gridReviewedRef,"dgrid-select",f.hitch(this,
function(a){this.currentSelectedRow=this._reviewedStore.get(a.rows[0].data.id);this._drawReviewedRow(a.rows[0].data)})),h(this._gridMatchedRef,"dgrid-datachange",f.hitch(this,function(a){var b=null,c,d=a.cell.row.data;this._matchedStore.get(a.cell.row.id).updated=!0;this._matchedStore.get(a.cell.row.id)[a.cell.column.field]=a.value;this._matchedStore.get(a.cell.row.id).location&&(b=this._matchedStore.get(a.cell.row.id).location);c=this._singleLineInput?{id:d[this._featureLayer.objectIdField],address:d[this._keywordMap.Address],
location:b,featureType:d.featureType,reviewed:d.reviewed,updated:!0,sourceCountry:this._sourceCountry}:{id:d[this._featureLayer.objectIdField],address:this._formatLocatorOptions(d),location:b,featureType:d.featureType,reviewed:d.reviewed,updated:!0,sourceCountry:this._sourceCountry};this.emit("row-datachange",{newAddress:a.value,oldAddress:a.oldValue,location:b,rowData:d,returnData:c});this.geocodeMatch&&this.geocodeMatch.geocodeAddress(c);this._applyAddressEdits(this._matchedStore.get(a.cell.row.id))})),
h(this._gridUnmatchedRef,"dgrid-datachange",f.hitch(this,function(a){var b=null,c,d=a.cell.row.data;this._unmatchedStore.get(a.cell.row.id).updated=!0;this._unmatchedStore.get(a.cell.row.id)[a.cell.column.field]=a.value;this._unmatchedStore.get(a.cell.row.id).location&&(b=this._unmatchedStore.get(a.cell.row.id).location);c=this._singleLineInput?{id:d[this._tableLayer.objectIdField],address:d[this._keywordMap.Address],location:b,featureType:d.featureType,reviewed:d.reviewed,updated:!0,sourceCountry:this._sourceCountry}:
{id:d[this._tableLayer.objectIdField],address:this._formatLocatorOptions(d),location:b,featureType:d.featureType,reviewed:d.reviewed,updated:!0,sourceCountry:this._sourceCountry};this.emit("row-datachange",{newAddress:a.value,oldAddress:a.oldValue,location:b,rowData:d,returnData:c});this.geocodeMatch&&this.geocodeMatch.geocodeAddress(c);this._applyAddressEdits(this._unmatchedStore.get(a.cell.row.id))}))];this.geocodeMatch&&this._listenerHandles.push(this._geocodeMatchHandler())},startup:function(){this.inherited(arguments);
this.domNode&&this.map&&(this.map.loaded?this._init():h(this.map,"load",f.hitch(this,function(){this._init()})))},matchFeature:function(a){var b;b=this.currentSelectedRow;b.updated=!0;b.reviewed=!0;b.oid=b[this._unmatchedStore.idProperty];b.location=a.newLocation;this._applyEdits(b);0<this._reviewedStore.query({featureID:a.featureID,featureType:a.featureType}).total?(b=this._reviewedStore.query({featureID:a.featureID,featureType:a.featureType})[0],b.newLocation=a.newLocation):this._reviewedArray.push({id:this._reviewedArray.length,
featureID:a.featureID,address:a.address,oldLocation:a.oldLocation,newLocation:a.newLocation,featureType:a.featureType});this._reviewedStore=new k({data:this._reviewedArray,idProperty:"id"});this._gridReviewedRef.set("store",this._reviewedStore);this._updateTabText();this.refreshGrids();this.emit("match",{id:this._reviewedArray.length,featureID:a.featureID,address:a.address,oldLocation:a.oldLocation,newLocation:a.newLocation,featureType:a.featureType})},clearGridSelection:function(){this._gridUnmatchedRef.clearSelection();
this._gridMatchedRef.clearSelection();this._gridReviewedRef.clearSelection()},refreshGrids:function(){this._gridUnmatchedRef.refresh();this._gridMatchedRef.refresh();this._gridReviewedRef.refresh()},resizeGrids:function(){this._gridUnmatchedRef.resize();this._gridMatchedRef.resize();this._gridReviewedRef.resize()},destroy:function(){u.forEach(this._listenerHandles,function(a){a.remove()});this.map&&(this.map.infoWindow.clearFeatures(),this.map.infoWindow.hide(),this.map.removeLayer(this.graphicsLayer));
this.map=this.graphicsLayer=null;this.inherited(arguments)},_init:function(){this.loaded=!0;this.emit("load",{});this.resize();A.arcgisUrl=this._arcgisUrl;A.getItem(this.itemId).then(f.hitch(this,function(a){var b=a.item.url||a.item.item;a.item.typeKeywords[6]&&this._getPublishParams().then(f.hitch(this,function(){this._getDataFromFeatureService(b)}))}),function(a){})},_applyEdits:function(a){var b=new p;b.attributes=a;"unmatched"===a.featureType&&this._featureLayer&&this._tableLayer?(this._tableLayer.applyEdits(null,
null,[b]).then(function(a,b,e){}),b.geometry=a.location,this._featureLayer.applyEdits([b],null,null).then(function(a,b,e){})):"matched"===a.featureType&&this._featureLayer&&(b.geometry=a.location,this._featureLayer.applyEdits(null,[b],null).then(function(a,b,e){}))},resize:function(){var a=s.get(this.domNode,"height"),b=s.get(E.byId(this.headerID),"height");s.set(this.StackContainerNode.domNode,"height",a-b+"px");this.StackContainerNode.resize();this.resizeGrids();this._tab1Node.resize();this._tab2Node.resize();
this._tab3Node.resize()},_applyAddressEdits:function(a){var b=new p;b.attributes=a;"unmatched"===a.featureType?this._tableLayer.applyEdits(null,[b],null).then(function(a,b,e){}):this._featureLayer.applyEdits(null,[b],null).then(function(a,b,e){})},_selectGridRowEvent:function(a,b){var c;c=this._singleLineInput?{id:a,address:b[this._keywordMap.Address],location:b.location,featureType:b.featureType,reviewed:b.reviewed,updated:b.updated,sourceCountry:this._sourceCountry}:{id:a,address:this._formatLocatorOptions(b),
location:b.location,featureType:b.featureType,reviewed:b.reviewed,updated:b.updated,sourceCountry:this._sourceCountry};this.emit("row-select",c);this.geocodeMatch&&this.geocodeMatch.geocodeAddress(c)},_calcGraphicsExtent:function(a){var b=a[0].geometry,c=b.getExtent(),d,e,f=a.length;null===c&&(c=new w(b.x,b.y,b.x,b.y,b.spatialReference));for(e=1;e<f;e++)b=a[e].geometry,d=b.getExtent(),null===d&&(d=new w(b.x,b.y,b.x,b.y,b.spatialReference)),c=c.union(d);return c},_drawReviewedRow:function(a){this.graphicsLayer.clear();
var b=a.newLocation,c=new p(b,this.matchGraphic),d;a.oldLocation?(a=a.oldLocation,a=new p(a,this.highlightGraphic),d=[a,c],a=this._calcGraphicsExtent(d),this.map.setExtent(a,!0).then(f.hitch(this,function(){var a;for(a=0;a<d.length;a++)this.graphicsLayer.add(d[a])}))):this.map.centerAt(b).then(f.hitch(this,function(){this.graphicsLayer.add(c)}))},_getPublishParams:function(){var a=new C;z({url:this._arcgisUrl+"/"+this.itemId+"/info/publishParameters.json",content:{f:"json"},handleAs:"json",callbackParamName:"callback",
load:f.hitch(this,function(b){this._pubParams=b;var c,d,e=b.layerInfo.publishFieldMap||!1;Object.keys||(Object.keys=function(a){var b=[],c;for(c in a)a.hasOwnProperty(c)&&b.push(c);return b});if(1===Object.keys(b.addressFields).length){for(c in b.addressFields)b.addressFields.hasOwnProperty(c)&&(e&&e.hasOwnProperty(b.addressFields[c])?(this._keywordMap.Address=e[b.addressFields[c]],this._keywordArray.push(e[b.addressFields[c]])):(this._keywordMap.Address=b.addressFields[c],this._keywordArray.push(b.addressFields[c])));
this._singleLineInput=!0}else for(d in this._singleLineInput=!1,b.addressFields)b.addressFields.hasOwnProperty(d)&&(e&&e.hasOwnProperty(b.addressFields[d])?(this._keywordMap[d]=e[b.addressFields[d]],this._keywordArray.push(e[b.addressFields[d]])):(this._keywordMap[d]=b.addressFields[d],this._keywordArray.push(b.addressFields[d])));b.sourceCountry&&!this._keywordMap.CountryCode&&("world"!==b.sourceCountry.toLowerCase()&&"wo"!==b.sourceCountry.toLowerCase())&&(this._sourceCountry=b.sourceCountry);b.geocodeServiceUrl?
(this._locatorURL=b.geocodeServiceUrl,this.geocodeMatch&&this.geocodeMatch.updateLocatorURL(this._locatorURL)):this.geocoder&&this.geocodeMatch&&this.geocodeMatch.updateLocatorURL(this.geocoder);a.resolve(!0)})});return a.promise},_formatLocatorOptions:function(a){var b=[],c;for(c in this._keywordMap)this._keywordMap.hasOwnProperty(c)&&("undefined"!==a[this._keywordMap[c]]?b[c]=a[this._keywordMap[c]]:(this._keywordMap[c].toLowerCase(),b[c]=a[this._keywordMap[c].toLowerCase()]));return b},_getDataFromFeatureService:function(a){var b=
a+"/0",c=a+"/1";z({url:a,content:{f:"json"},handleAs:"json",callbackParamName:"callback",load:f.hitch(this,function(a){this._fsData=a;0!==a.layers.length?(this._featureLayer=new q(b,{mode:q.MODE_SELECTION,outFields:["*"]}),this._featureLayer.userIsAdmin=!0,this._listenerHandles.push(this._layerLoad())):this._featureLayer=!1;0!==a.tables.length?(this._tableLayer=new q(c,{mode:q.MODE_SELECTION,outFields:["*"]}),this._tableLayer.userIsAdmin=!0,this._listenerHandles.push(this._tableLoad())):(this._tableLayer=
!1,this.StackContainerNode.removeChild(this.StackContainerNode.getChildren()[0]))})});this.resize()},_geocodeMatchHandler:function(){return this.geocodeMatch.on("match",f.hitch(this,function(a){this.matchFeature(a)}))},_layerLoad:function(){return h(this._featureLayer,"load",f.hitch(this,function(){this._queryFeatureLayer()}))},_tableLoad:function(){return h(this._tableLayer,"load",f.hitch(this,function(){this._queryTableLayer()}))},_queryFeatureLayer:function(){var a,b,c,d=[],e=new y;e.where="1 \x3d 1";
this._featureLayer.queryFeatures(e).then(f.hitch(this,function(e){for(a=0;a<e.features.length;a++)e.features[a].attributes.updated=!1,e.features[a].attributes.reviewed=!1,e.features[a].attributes.featureType="matched",c=e.features[a].attributes,b=new O(e.features[a].geometry.getLongitude(),e.features[a].geometry.getLatitude()),c.location=b,d.push(c);this._test_idKeyword=this._featureLayer.objectIdField;this._gridMatchedRef.set("columns",this._updateColumns(e));this._matchedStore=new k({data:d,idProperty:this._featureLayer.objectIdField});
this._gridMatchedRef.set("store",this._matchedStore);this._updateTabText()}))},_queryTableLayer:function(){var a,b,c=[],d=new y;d.where="1 \x3d 1";this._tableLayer.queryFeatures(d).then(f.hitch(this,function(d){if(0!==d.features.length){for(a=0;a<d.features.length;a++)d.features[a].attributes.updated=!1,d.features[a].attributes.reviewed=!1,d.features[a].attributes.featureType="unmatched",b=d.features[a].attributes,c.push(b);this._gridUnmatchedRef.set("columns",this._updateColumns(d));this._unmatchedStore=
new k({data:c,idProperty:this._tableLayer.objectIdField});this._gridUnmatchedRef.set("store",this._unmatchedStore);this._updateTabText()}else this._tableLayer=!1,delete this._fsData.tables[0],this.StackContainerNode.removeChild(this.StackContainerNode.getChildren()[0])}))},_updateTabText:function(){this._unmatchedStore.query({reviewed:!1}).total===this._unmatchedStore.data.length?this._tab1Node.set("title",n.substitute(g.widgets.geocodeReview.unmatchedTotal,{count:this._unmatchedStore.data.length})):
this._tab1Node.set("title",n.substitute(g.widgets.geocodeReview.unmatchedRemaining,{count1:this._unmatchedStore.query({reviewed:!1}).total,count2:this._unmatchedStore.data.length}));this._tab2Node.set("title",n.substitute(g.widgets.geocodeReview.matchedTotal,{count:this._matchedStore.data.length}));this._tab3Node.set("title",n.substitute(g.widgets.geocodeReview.reviewedTotal,{count:this._reviewedStore.data.length}))},_generateGrids:function(){this._generateUnmatchedGrid();this._generateMatchedGrid();
this._generateReviewedGrid()},_generateUnmatchedGrid:function(){this._gridUnmatchedRef=new this.StandardGrid({store:this._unmatchedStore,columns:this._unmatchedColumns,noDataMessage:g.widgets.geocodeReview.review.noDataMsg1,selectionMode:"extended",allowSelectAll:!1,cellNavigation:!1},this._grid1Node);this._gridUnmatchedRef.startup();this._gridUnmatchedRef.resize()},_generateMatchedGrid:function(){this._gridMatchedRef=new this.StandardGrid({store:this._matchedStore,columns:this._matchedColumns,noDataMessage:g.widgets.geocodeReview.review.noDataMsg2,
selectionMode:"extended",allowSelectAll:!1,cellNavigation:!1},this._grid2Node);this._gridMatchedRef.startup();this._gridMatchedRef.resize()},_generateReviewedGrid:function(){this._gridReviewedRef=new this.StandardGrid({store:this._reviewedStore,columns:this._reviewedColumns,noDataMessage:g.widgets.geocodeReview.review.noDataMsg3,selectionMode:"extended",allowSelectAll:!1,cellNavigation:!1},this._grid3Node);this._gridReviewedRef.startup();this._gridReviewedRef.resize()},_defineColumns:function(){this._unmatchedColumns=
[];this._matchedColumns=[];this._reviewedColumns=[{label:g.widgets.geocodeReview.idProperty,field:"id",hidden:!0},{label:g.widgets.geocodeReview.review.columnSelectedAddress,field:"address",formatter:f.hitch(this,function(a){return"\x3cimg src\x3d'"+l.toUrl("./GeocodeReview/images/EsriGreenPinCircle26.png")+"' /\x3e"+a}),get:f.hitch(this,function(a){var b="",b="",c;if("object"===typeof a.address)for(c in a.address)a.address.hasOwnProperty(c)&&null!==a.address[c]&&"Loc_name"!==c&&(b+=a.address[c]+
" ");else b=a.address;return b})},{label:g.widgets.geocodeReview.review.columnOriginalLocation,field:"oldLocation",formatter:function(a){return a},get:f.hitch(this,function(a){var b;a.oldLocation&&(b=x.webMercatorToGeographic(a.oldLocation));return a.oldLocation?"X: "+b.x+"\x3cbr /\x3eY: "+b.y:"None"})},{label:g.widgets.geocodeReview.review.columnSelectedLocation,field:"newLocation",formatter:function(a){return a},get:f.hitch(this,function(a){a=x.webMercatorToGeographic(a.newLocation);return"X: "+
a.x+"\x3cbr /\x3eY: "+a.y})},{label:"Type",field:"featureType",hidden:!0}]},_updateColumns:function(a){var b,c,d=[];if(a&&a.fields){for(b=0;b<a.fields.length;b++)c=this._keywordMap.Address&&a.fields[b].name===this._keywordMap.Address||this._keywordMap.Address&&a.fields[b].name===this._keywordMap.Address.toLowerCase()||-1!==u.indexOf(this._keywordArray,a.fields[b].name)?new v({label:a.fields[b].alias||a.fields[b].name,field:a.fields[b].name,editor:"text",editOn:"dblclick",autoSave:!0}):{label:a.fields[b].alias||
a.fields[b].name,field:a.fields[b].name,hidden:!0},a.fields[b].name===this._featureLayer.objectIdField?d.splice(0,0,{label:a.fields[b].name,field:a.fields[b].alias,hidden:!0}):d.push(c);d.push({label:g.widgets.geocodeReview.reviewedUC,field:"reviewed",formatter:function(a){return a},get:f.hitch(this,function(a){return a.reviewed?"\x3cimg src\x3d'"+l.toUrl("./GeocodeReview/images/save.png")+"' /\x3e":""})})}return d},_defineGridStores:function(){this._unmatchedStore=new k({data:"",idProperty:this._idProperty});
this._matchedStore=new k({data:"",idProperty:this._idProperty});this._reviewedArray=[];this._reviewedStore=new k({data:this._reviewedArray,idProperty:this._idProperty})}});B("extend-esri")&&f.setObject("dijit.GeocodeReview",m,Q);return m});