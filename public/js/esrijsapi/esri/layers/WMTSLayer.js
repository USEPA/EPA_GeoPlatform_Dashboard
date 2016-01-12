//>>built
define("esri/layers/WMTSLayer","dojo/_base/kernel dojo/_base/declare dojo/_base/lang dojo/_base/array dojo/sniff dojox/xml/parser ../kernel ../lang ../request ../WKIDUnitConversion ../SpatialReference ../geometry/Point ../geometry/Extent ../geometry/webMercatorUtils ./TiledMapServiceLayer ./TileInfo ./WMTSLayerInfo dojo/query".split(" "),function(h,w,x,k,y,E,F,z,G,A,B,C,D,H,I,J,K){w=w([I],{declaredClass:"esri.layers.WMTSLayer",copyright:null,extent:null,tileUrl:null,spatialReference:null,tileInfo:null,
constructor:function(a,b){this.version="1.0.0";this.tileUr=this._url=a;this.serviceMode="RESTful";this._parseCapabilities=x.hitch(this,this._parseCapabilities);this._getCapabilitiesError=x.hitch(this,this._getCapabilitiesError);b||(b={});if(b.serviceMode)if("KVP"===b.serviceMode||"RESTful"===b.serviceMode)this.serviceMode=b.serviceMode;else{console.error("WMTS mode could only be 'KVP' or 'RESTful'");return}this.layerInfo=new K;b.layerInfo&&(this.layerInfo=b.layerInfo,this._identifier=b.layerInfo.identifier,
this._tileMatrixSetId=b.layerInfo.tileMatrixSet,b.layerInfo.format&&(this.format="image/"+b.layerInfo.format),this._style=b.layerInfo.style,this.title=b.layerInfo.title,this._dimension=b.layerInfo.dimension);b.resourceInfo?(this.version=b.resourceInfo.version,b.resourceInfo.getTileUrl&&(this._url=this.tileUrl=b.resourceInfo.getTileUrl),this.copyright=b.resourceInfo.copyright,this.layerInfos=b.resourceInfo.layerInfos,this._parseResourceInfo(),this.loaded=!0,this.onLoad(this)):this._getCapabilities();
this._formatDictionary={"image/png":".png","image/png8":".png","image/png24":".png","image/png32":".png","image/jpg":".jpg","image/jpeg":".jpeg","image/gif":".gif","image/bmp":".bmp","image/tiff":".tif","image/jpgpng":"","image/jpegpng":"","image/unknown":""}},setActiveLayer:function(a){this.setVisibleLayer(a)},setVisibleLayer:function(a){this._setActiveLayer(a);this.refresh(!0)},getTileUrl:function(a,b,f){a=this._levelToLevelValue[a];a=this.resourceUrls&&0<this.resourceUrls.length?this.resourceUrls[b%
this.resourceUrls.length].template.replace(/\{Style\}/gi,this._style).replace(/\{TileMatrixSet\}/gi,this._tileMatrixSetId).replace(/\{TileMatrix\}/gi,a).replace(/\{TileRow\}/gi,b).replace(/\{TileCol\}/gi,f).replace(/\{dimensionValue\}/gi,this._dimension):this.UrlTemplate.replace(/\{level\}/gi,a).replace(/\{row\}/gi,b).replace(/\{col\}/gi,f);return a=this.addTimestampToURL(a)},getTileUrlTemplate:function(a){var b=a.identifier,f=a.tileMatrixSet,c=a.format,d=a.style,e=a.dimension;b?a=k.filter(this.layers,
function(a){return a.identifier===b})[0]:(a=this.layers[0],b=this.layers[0].identifier);if(a){if(c){if(-1===c.indexOf("image/")&&(c="image/"+c),-1===k.indexOf(a.formats,c)){console.error("The layer doesn't support the format of "+c);this.onError(Error("The layer doesn't support the format of "+c));return}}else c=a.formats[0],-1===c.indexOf("image/")&&(c="image/"+c);if(d){if(-1===k.indexOf(a.styles,d)){console.error("The layer doesn't support the style of "+d);this.onError(Error("The layer doesn't support the style of "+
d));return}}else d=a.styles[0];if(!e&&a.dimensions)e=a.dimensions[0];else if(-1===k.indexOf(a.dimensions,e)){console.error("The layer doesn't support the dimension of "+e);this.onError(Error("The layer doesn't support the dimension of "+e));return}var g;if(f){if(g=k.filter(a.tileMatrixSetInfos,function(a){return a.tileMatrixSet===f})[0],!g){console.error("The tileMatrixSetId "+f+" is not supported by the layer of "+b);this.onError(Error("The tileMatrixSetId "+f+" is not supported by the layer of "+
b));return}}else(g=k.filter(a.tileMatrixSetInfos,function(a){return"GoogleMapsCompatible"===a.tileMatrixSet})[0])||(g=a.tileMatrixSetInfos[0]),f=g.tileMatrixSet;return this._getTileUrlTemplate(b,f,c,d,e)}console.error("couldn't find the layer "+b);this.onError(Error("couldn't find the layer "+b))},_getTileUrlTemplate:function(a,b,f,c,d){var e;a||(a=this._identifier);b||(b=this._tileMatrixSetId);f||(f=this.format);!c&&""!==c&&(c=this._style);if(this.resourceUrls&&0<this.resourceUrls.length)return e=
this.resourceUrls[0].template,e.indexOf(".xxx")===e.length-4&&(e=e.slice(0,e.length-4)),e=e.replace(/\{Style\}/gi,c),e=e.replace(/\{TileMatrixSet\}/gi,b),e=e.replace(/\{TileMatrix\}/gi,"{level}"),e=e.replace(/\{TileRow\}/gi,"{row}"),e=e.replace(/\{TileCol\}/gi,"{col}"),e=e.replace(/\{dimensionValue\}/gi,d);"KVP"===this.serviceMode?e=this._url+"SERVICE\x3dWMTS\x26VERSION\x3d"+this.version+"\x26REQUEST\x3dGetTile\x26LAYER\x3d"+a+"\x26STYLE\x3d"+c+"\x26FORMAT\x3d"+f+"\x26TILEMATRIXSET\x3d"+b+"\x26TILEMATRIX\x3d{level}\x26TILEROW\x3d{row}\x26TILECOL\x3d{col}":
"RESTful"===this.serviceMode&&(d="",this._formatDictionary[f.toLowerCase()]&&(d=this._formatDictionary[f.toLowerCase()]),e=this._url+a+"/"+c+"/"+b+"/{level}/{row}/{col}"+d);return e},_parseResourceInfo:function(){var a=this.layerInfos,b;"KVP"===this.serviceMode&&(this._url+=-1<this._url.indexOf("?")?"":"?");for(b=0;b<a.length;b++)if((!this._identifier||a[b].identifier===this._identifier)&&(!this.title||a[b].title===this.title)&&(!this._tileMatrixSetId||a[b].tileMatrixSet===this._tileMatrixSetId)&&
(!this.format||"image/"+a[b].format===this.format)&&(!this._style||a[b].style===this._style)){x.mixin(this,{description:a[b].description,tileInfo:a[b].tileInfo,spatialReference:a[b].tileInfo.spatialReference,fullExtent:a[b].fullExtent,initialExtent:a[b].initialExtent,_identifier:a[b].identifier,_tileMatrixSetId:a[b].tileMatrixSet,format:"image/"+a[b].format,_style:a[b].style});break}this._setActiveLayer();this.UrlTemplate=this._getTileUrlTemplate();this._levelToLevelValue=[];k.forEach(this.tileInfo.lods,
function(a){this._levelToLevelValue[a.level]=a.levelValue?a.levelValue:a.level},this)},_getCapabilities:function(){var a;"KVP"===this.serviceMode?a=-1<this._url.indexOf("?")?this._url+"\x26request\x3dGetCapabilities\x26service\x3dWMTS\x26version\x3d"+this.version:this._url+"?request\x3dGetCapabilities\x26service\x3dWMTS\x26version\x3d"+this.version:"RESTful"===this.serviceMode&&(a=this._url+"/"+this.version+"/WMTSCapabilities.xml");G({url:a,handleAs:"text",load:this._parseCapabilities,error:this._getCapabilitiesError})},
_parseCapabilities:function(a){a=a.replace(/ows:/gi,"");a=E.parse(a);var b=h.query("Contents",a)[0];if(b){var f=h.query("OperationsMetadata",a)[0],c=h.query("[name\x3d'GetTile']",f)[0],f=this._url,c=h.query("Get",c),d;for(d=0;d<c.length;d++){var e=h.query("Constraint",c[d])[0];if(!e||this._getTagWithChildTagValue("AllowedValues","Value",this.serviceMode,e)){f=c[d].attributes[0].nodeValue;break}}-1===f.indexOf("/1.0.0/")&&"RESTful"===this.serviceMode&&(f+="/");"KVP"===this.serviceMode&&(f+=-1<f.indexOf("?")?
"":"?");this._url=f;this.copyright=this._getTagValues("Capabilities\x3eServiceIdentification\x3eAccessConstraints",a)[0];a=h.query("Layer",b);var g,s=[];this.layers=[];k.forEach(a,function(a){g=this._getTagValues("Identifier",a)[0];s.push(g);this.layers.push(this._getWMTSLayerInfo(g,a,b))},this);this._setActiveLayer();this.loaded=!0;this.onLoad(this)}else console.error("The WMTS capabilities XML is not valid"),this.onError(Error("The WMTS capabilities XML is not valid"))},_setActiveLayer:function(a){a||
(a={});a.identifier&&(this._identifier=a.identifier);a.tileMatrixSet&&(this._tileMatrixSetId=a.tileMatrixSet);a.format&&(this.format=a.format);a.style&&(this._style=a.style);a.dimension&&(this._dimension=a.dimension);if(this.layers)if(this._identifier?a=k.filter(this.layers,function(a){return a.identifier===this._identifier},this)[0]:(a=this.layers[0],this._identifier=this.layers[0].identifier),a){if(this.format){if(-1===this.format.indexOf("image/")&&(this.format="image/"+this.format),-1===k.indexOf(a.formats,
this.format)){console.error("The layer doesn't support the format of "+this.format);this.onError(Error("The layer doesn't support the format of "+this.format));return}}else this.format=a.formats[0],-1===this.format.indexOf("image/")&&(this.format="image/"+this.format);if(this._style){if(-1===k.indexOf(a.styles,this._style)){console.error("The layer doesn't support the style of "+this._style);this.onError(Error("The layer doesn't support the style of "+this._style));return}}else this._style=a.styles[0];
if(!this._dimension&&a.dimensions)this._dimension=a.dimensions[0];else if(-1===k.indexOf(a.dimensions,this._dimension)){console.error("The layer doesn't support the dimension of "+this._dimension);this.onError(Error("The layer doesn't support the dimension of "+this._dimension));return}var b;if(this._tileMatrixSetId){if(b=k.filter(a.tileMatrixSetInfos,function(a){return a.tileMatrixSet===this._tileMatrixSetId},this)[0],!b){console.error("The tileMatrixSetId "+this._tileMatrixSetId+" is not supported by the layer of "+
this._identifier);this.onError(Error("The tileMatrixSetId "+this._tileMatrixSetId+" is not supported by the layer of "+this._identifier));return}}else(b=k.filter(a.tileMatrixSetInfos,function(a){return"GoogleMapsCompatible"===a.tileMatrixSet})[0])||(b=a.tileMatrixSetInfos[0]),this._tileMatrixSetId=b.tileMatrixSet;this.description=a.description;this.title=a.title;this.spatialReference=b.tileInfo.spatialReference;this.tileInfo=b.tileInfo;this._levelToLevelValue=[];k.forEach(this.tileInfo.lods,function(a){this._levelToLevelValue[a.level]=
a.levelValue?a.levelValue:a.level},this);102100===this.spatialReference.wkid||102113===this.spatialReference.wkid?this.fullExtent=this.initialExtent=H.geographicToWebMercator(a.gcsExtent):4326===this.spatialReference.wkid?this.fullExtent=this.initialExtent=a.gcsExtent:(this.fullExtent=b.fullExtent,this.initialExtent=b.initialExtent);this.resourceUrls=a.resourceUrls;this.UrlTemplate=this._getTileUrlTemplate();this.layerInfo={identifier:this._identifier,tileMatrixSet:this._tileMatrixSetId,format:this.format,
style:this._style,fullExtent:this.fullExtent,initialExtent:this.initialExtent,tileInfo:this.tileInfo,title:this.title,description:this.description}}else console.error("couldn't find the layer "+this._identifier),this.onError(Error("couldn't find the layer "+this._identifier))},_getWMTSLayerInfo:function(a,b,f){var c=this._getTagValues("Abstract",b)[0],d=this._getTagValues("Title",b)[0],e=h.query("WGS84BoundingBox",b)[0],g=e?this._getTagValues("LowerCorner",e)[0].split(" "):["-180","-90"],s=e?this._getTagValues("UpperCorner",
e)[0].split(" "):["180","90"],e=parseFloat(g[0]),g=parseFloat(g[1]),t=parseFloat(s[0]),s=parseFloat(s[1]),e=new D(e,g,t,s,new B({wkid:4326})),s=this._getTagValues("Identifier",h.query("Style",b)[0]),u=this._getTagValues("Identifier",h.query("Dimension",b)[0]),m=this._getTagValues("Value",h.query("Dimension",b)[0])||this._getTagValues("Default",h.query("Dimension",b)[0]),g=this._getTagValues("Format",b);f=this._getLayerMatrixInfos(b,f);a={identifier:a,tileMatrixSetInfos:f,formats:g,styles:s,title:d,
description:c,gcsExtent:e,dimensions:m};b=h.query("ResourceURL",b);var r=[],l;k.forEach(b,function(a){l=a.getAttribute("template");u&&m&&(l=l.replace("{"+u+"}","{dimensionValue}"));r.push({template:l,format:a.getAttribute("format"),resourceType:a.getAttribute("resourceType")})});r&&0<r.length&&(a.resourceUrls=r);return a},_getLayerMatrixInfos:function(a,b){var f,c=[];this._allMatrixInfos||(this._allMatrixInfos=[]);var d=this._getTagValues("TileMatrixSet",a);if(d&&0!==d.length)return k.forEach(d,function(e){var d;
if(0<this._allMatrixInfos.length)for(f=0;f<this._allMatrixInfos.length;f++)if(this._allMatrixInfos[f].tileMatrixSet==e){d=this._allMatrixInfos[f];break}d||(d=this._getLayerMatrixInfo(e,a,b),this._allMatrixInfos.push(d));c.push(d)},this),c},_getLayerMatrixInfo:function(a,b,f){var c,d,e,g,k=[];b=this._getTagWithChildTagValue("TileMatrixSetLink","TileMatrixSet",a,b);var t=this._getTagValues("TileMatrix",b),u=this._getTagWithChildTagValue("TileMatrixSet","Identifier",a,f),m=this._getTagValues("SupportedCRS",
u)[0];c=parseInt(m.split(":").pop(),10);if(900913==c||3857==c)c=102100;if(-1<m.toLowerCase().indexOf("crs84")||-1<m.toLowerCase().indexOf("crs:84"))c=4326,g=!0;else if(-1<m.toLowerCase().indexOf("crs83")||-1<m.toLowerCase().indexOf("crs:83"))c=4269,g=!0;else if(-1<m.toLowerCase().indexOf("crs27")||-1<m.toLowerCase().indexOf("crs:27"))c=4267,g=!0;var r=new B({wkid:c}),l=h.query("TileMatrix",u)[0];f=parseInt(this._getTagValues("TileWidth",l)[0],10);b=parseInt(this._getTagValues("TileHeight",l)[0],10);
d=this._getTagValues("TopLeftCorner",l)[0].split(" ");var q=d[0],v=d[1];1<q.split("E").length&&(d=q.split("E"),q=d[0]*Math.pow(10,d[1]));1<v.split("E").length&&(d=v.split("E"),v=d[0]*Math.pow(10,d[1]));var q=parseFloat(q),v=parseFloat(v),w=g&&4326===c&&90===q&&-180===v;for(d=0;d<this._flippingAxisForWkids.length;d++)if(m.split(":").pop()>=this._flippingAxisForWkids[d][0]&&m.split(":").pop()<=this._flippingAxisForWkids[d][1]||4326===c&&(!g||w)){4326===c&&90<q&&(q="90");e=new C(v,q,r);break}d===this._flippingAxisForWkids.length&&
(e=new C(q,v,r));if(0===t.length){t=h.query("TileMatrix",u);for(d=0;d<t.length;d++)g=this._getLodFromTileMatrix(t[d],c,d,a),k.push(g)}else for(d=0;d<t.length;d++)g=this._getTagWithChildTagValue("TileMatrix","Identifier",t[d],u),g=this._getLodFromTileMatrix(g,c,d,a),k.push(g);c=h.query("BoundingBox",u)[0];var n,p;c&&(n=this._getTagValues("LowerCorner",c)[0].split(" "),p=this._getTagValues("UpperCorner",c)[0].split(" "));n&&1<n.length&&p&&1<p.length?(l=parseFloat(n[0]),c=parseFloat(n[1]),n=parseFloat(p[0]),
p=parseFloat(p[1])):(n=this._getTagValues("MatrixWidth",l)[0],c=this._getTagValues("MatrixHeight",l)[0],l=e.x,p=e.y,n=l+n*b*k[0].resolution,c=p-c*f*k[0].resolution);p=n=new D(l,c,n,p,r);e=new J({dpi:90.71428571428571,spatialReference:r,format:this.format,rows:f,cols:b,origin:e,lods:k});return{tileMatrixSet:a,fullExtent:p,initialExtent:n,tileInfo:e}},_getCapabilitiesError:function(a){console.error("Failed to get capabilities xml");this.onError(a)},_getLodFromTileMatrix:function(a,b,f,c){var d=this._getTagValues("Identifier",
a)[0];a=this._getTagValues("ScaleDenominator",a)[0];1<a.split("E").length?(a=a.split("E"),a=a[0]*Math.pow(10,a[1])):a=parseFloat(a);b=z.isDefined(A[b])?A.values[A[b]]:"default028mm"===c?6370997*Math.PI/180:6378137*Math.PI/180;return{level:f,levelValue:d,scale:a,resolution:7*a/25E3/b}},_getTag:function(a,b){var f=h.query(a,b);return f&&0<f.length?f[0]:null},_getTagValues:function(a,b){var f=[],c=a.split("\x3e"),d,e;d=h.query(c[0],b)[0];if(1<c.length){for(e=1;e<c.length-1;e++)d=h.query(c[e],d)[0];c=
h.query(c[c.length-1],d)}else c=h.query(c[0],b);c&&0<c.length&&k.forEach(c,function(a){9>y("ie")?f.push(a.childNodes.length?a.childNodes[0].nodeValue:""):f.push(a.textContent)});return f},_getAttributeValues:function(a,b,f){a=h.query(a,f);var c=[];a&&0<a.length&&k.forEach(a,function(a){c.push(a.getAttribute(b))});return c},_getTagWithChildTagValue:function(a,b,f,c){c=c.childNodes;var d,e;for(e=0;e<c.length;e++)if(-1<c[e].nodeName.indexOf(a)&&(9>y("ie")?z.isDefined(h.query(b,c[e])[0])&&(d=h.query(b,
c[e])[0].childNodes[0].nodeValue):z.isDefined(h.query(b,c[e])[0])&&(d=h.query(b,c[e])[0].textContent),d===f||f.split(":")&&d===f.split(":")[1]))return c[e]},_flippingAxisForWkids:[[3819,3819],[3821,3824],[3889,3889],[3906,3906],[4001,4025],[4027,4036],[4039,4047],[4052,4055],[4074,4075],[4080,4081],[4120,4176],[4178,4185],[4188,4216],[4218,4289],[4291,4304],[4306,4319],[4322,4326],[4463,4463],[4470,4470],[4475,4475],[4483,4483],[4490,4490],[4555,4558],[4600,4646],[4657,4765],[4801,4811],[4813,4821],
[4823,4824],[4901,4904],[5013,5013],[5132,5132],[5228,5229],[5233,5233],[5246,5246],[5252,5252],[5264,5264],[5324,5340],[5354,5354],[5360,5360],[5365,5365],[5370,5373],[5381,5381],[5393,5393],[5451,5451],[5464,5464],[5467,5467],[5489,5489],[5524,5524],[5527,5527],[5546,5546],[2044,2045],[2081,2083],[2085,2086],[2093,2093],[2096,2098],[2105,2132],[2169,2170],[2176,2180],[2193,2193],[2200,2200],[2206,2212],[2319,2319],[2320,2462],[2523,2549],[2551,2735],[2738,2758],[2935,2941],[2953,2953],[3006,3030],
[3034,3035],[3038,3051],[3058,3059],[3068,3068],[3114,3118],[3126,3138],[3150,3151],[3300,3301],[3328,3335],[3346,3346],[3350,3352],[3366,3366],[3389,3390],[3416,3417],[3833,3841],[3844,3850],[3854,3854],[3873,3885],[3907,3910],[4026,4026],[4037,4038],[4417,4417],[4434,4434],[4491,4554],[4839,4839],[5048,5048],[5105,5130],[5253,5259],[5269,5275],[5343,5349],[5479,5482],[5518,5519],[5520,5520],[20004,20032],[20064,20092],[21413,21423],[21473,21483],[21896,21899],[22171,22177],[22181,22187],[22191,
22197],[25884,25884],[27205,27232],[27391,27398],[27492,27492],[28402,28432],[28462,28492],[30161,30179],[30800,30800],[31251,31259],[31275,31279],[31281,31290],[31466,31700],[900913,900913]]});y("extend-esri")&&x.setObject("layers.WMTSLayer",w,F);return w});