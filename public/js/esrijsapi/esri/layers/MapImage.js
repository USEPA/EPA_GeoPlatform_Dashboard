//>>built
define("esri/layers/MapImage","dojo/_base/declare dojo/_base/lang dojo/dom-style dojo/has ../kernel ../domUtils ../geometry/Extent".split(" "),function(b,d,f,g,h,e,k){b=b(null,{declaredClass:"esri.layers.MapImage",constructor:function(a){d.mixin(this,a);this.extent=new k(this.extent)},visible:!0,opacity:1,getLayer:function(){return this._layer},getNode:function(){return this._node},show:function(){if(!this.visible){this.visible=!0;var a=this._node,c=this._layer,b;if(a){if(b=c&&c._div)c.suspended||
c._setPos(a,b._left,b._top),(c._active||b).appendChild(a);e.show(a)}}},hide:function(){if(this.visible){this.visible=!1;var a=this._node;a&&(e.hide(a),a.parentNode&&a.parentNode.removeChild(a))}},setOpacity:function(a){var b=this._node;this.opacity=a;b&&f.set(b,"opacity",a)}});g("extend-esri")&&d.setObject("layers.MapImage",b,h);return b});