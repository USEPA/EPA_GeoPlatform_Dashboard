//>>built
define("dgrid/List","dojo/_base/kernel dojo/_base/declare dojo/dom dojo/on dojo/has ./util/misc dojo/has!touch?./TouchScroll xstyle/has-class put-selector/put dojo/_base/sniff xstyle/css!./css/dgrid.css".split(" "),function(w,y,E,r,e,q,F,G,d){function z(a,b){d(document.body,a,".dgrid-scrollbar-measure");var c=a["offset"+b]-a["client"+b];a.className="";document.body.removeChild(a);return c}function u(a){var b=a?"."+a.replace(A,"."):"";this._class&&(b="!"+this._class.replace(A,"!")+b);d(this.domNode,
b);this._class=a}function B(){return this._class}function C(){return{x:this.bodyNode.scrollLeft,y:this.bodyNode.scrollTop}}function D(a){"undefined"!==typeof a.x&&(this.bodyNode.scrollLeft=a.x);"undefined"!==typeof a.y&&(this.bodyNode.scrollTop=a.y)}G("mozilla","opera","webkit","ie","ie-6","ie-6-7","quirks","no-quirks","touch");var h,t;e.add("dom-scrollbar-width",function(a,b,c){return z(c,"Width")});e.add("dom-scrollbar-height",function(a,b,c){return z(c,"Height")});e.add("dom-rtl-scrollbar-left",
function(a,b,c){a=d("div");d(document.body,c,".dgrid-scrollbar-measure[dir\x3drtl]");d(c,a);b=!!e("ie")||!!e("trident")||a.offsetLeft>=e("dom-scrollbar-width");c.className="";document.body.removeChild(c);d(a,"!");c.removeAttribute("dir");return b});var H=0,A=/ +/g,I=7>e("ie")&&!e("quirks")?function(){var a,b,c;if(this._started&&(a=document.documentElement,b=a.clientWidth,a=a.clientHeight,c=this._prevWinDims||[],c[0]!==b||c[1]!==a))this.resize(),this._prevWinDims=[b,a]}:function(){this._started&&this.resize()};
return y("dgrid.List",e("touch")?F:null,{tabableHeader:!1,showHeader:!1,showFooter:!1,maintainOddEven:!0,cleanAddedRules:!0,useTouchScroll:null,addUiClasses:!0,shouldObserveStore:!0,cleanEmptyObservers:!0,highlightDuration:250,postscript:function(a,b){var c=this;(this._Row=function(a,b,c){this.id=a;this.data=b;this.element=c}).prototype.remove=function(){c.removeRow(this.element)};b&&(this.srcNodeRef=b=b.nodeType?b:document.getElementById(b));this.create(a,b)},listType:"list",create:function(a,b){var c=
this.domNode=b||d("div"),k;a?(this.params=a,y.safeMixin(this,a),k=a["class"]||a.className||c.className,this._sort=a.sort||[],delete this.sort):this._sort=[];this.observers=[];this._numObservers=0;this._listeners=[];this._rowIdToObject={};this.postMixInProperties&&this.postMixInProperties();this.id=c.id=c.id||this.id||"dgrid_"+H++;null===this.useTouchScroll&&(this.useTouchScroll=!e("dom-scrollbar-width"));this.buildRendering();k&&u.call(this,k);this.postCreate();delete this.srcNodeRef;this.domNode.offsetHeight&&
this.startup()},buildRendering:function(){var a=this.domNode,b=this.addUiClasses,c=this,k,p,f,g;g=this.isRTL="rtl"==(document.body.dir||document.documentElement.dir||document.body.style.direction).toLowerCase();a.className="";d(a,"[role\x3dgrid].dgrid.dgrid-"+this.listType+(b?".ui-widget":""));k=this.headerNode=d(a,"div.dgrid-header.dgrid-header-row"+(b?".ui-widget-header":"")+(this.showHeader?"":".dgrid-header-hidden"));(e("quirks")||8>e("ie"))&&d(a,"div.dgrid-spacer");p=this.bodyNode=d(a,"div.dgrid-scroller");
e("ff")&&(p.tabIndex=-1);this.headerScrollNode=d(a,"div.dgrid-header.dgrid-header-scroll.dgrid-scrollbar-width"+(b?".ui-widget-header":""));f=this.footerNode=d("div.dgrid-footer"+(this.showFooter?"":".dgrid-footer-hidden"));d(a,f);g&&(a.className+=" dgrid-rtl"+(e("dom-rtl-scrollbar-left")?" dgrid-rtl-swap":""));r(p,"scroll",function(b){c.showHeader&&(k.scrollLeft=b.scrollLeft||p.scrollLeft);b.stopPropagation();r.emit(a,"scroll",{scrollTarget:p})});this.configStructure();this.renderHeader();this.contentNode=
this.touchNode=d(this.bodyNode,"div.dgrid-content"+(b?".ui-widget-content":""));this._listeners.push(this._resizeHandle=r(window,"resize",q.throttleDelayed(I,this)))},postCreate:e("touch")?function(){this.useTouchScroll&&this.inherited(arguments)}:function(){},startup:function(){this._started||(this.inherited(arguments),this._started=!0,this.resize(),this.set("sort",this._sort))},configStructure:function(){},resize:function(){var a=this.bodyNode,b=this.headerNode,c=this.footerNode,k=b.offsetHeight,
p=this.showFooter?c.offsetHeight:0,f=e("quirks")||7>e("ie");this.headerScrollNode.style.height=a.style.marginTop=k+"px";a.style.marginBottom=p+"px";f&&(a.style.height="",a.style.height=Math.max(this.domNode.offsetHeight-k-p,0)+"px",p&&(c.style.bottom="1px",setTimeout(function(){c.style.bottom=""},0)));h||(h=e("dom-scrollbar-width"),t=e("dom-scrollbar-height"),e("ie")&&(h++,t++),q.addCssRule(".dgrid-scrollbar-width","width: "+h+"px"),q.addCssRule(".dgrid-scrollbar-height","height: "+t+"px"),17!=h&&
!f&&(q.addCssRule(".dgrid-header-row","right: "+h+"px"),q.addCssRule(".dgrid-rtl-swap .dgrid-header-row","left: "+h+"px")));f&&(b.style.width=a.clientWidth+"px",setTimeout(function(){b.scrollLeft=a.scrollLeft},0))},addCssRule:function(a,b){var c=q.addCssRule(a,b);this.cleanAddedRules&&this._listeners.push(c);return c},on:function(a,b){return r(this.domNode,a,b)},cleanup:function(){var a=this.observers,b;for(b in this._rowIdToObject)if(this._rowIdToObject[b]!=this.columns){var c=document.getElementById(b);
c&&this.removeRow(c,!0)}for(b=0;b<a.length;b++)(c=a[b])&&c.cancel();this.observers=[];this._numObservers=0;this.preload=null},destroy:function(){if(this._listeners){for(var a=this._listeners.length;a--;)this._listeners[a].remove();delete this._listeners}this._started=!1;this.cleanup();d(this.domNode,"!");this.useTouchScroll&&this.inherited(arguments)},refresh:function(){this.cleanup();this._rowIdToObject={};this._autoId=0;this.contentNode.innerHTML="";this.scrollTo({x:0,y:0})},newRow:function(a,b,
c,k,p){if(b){var f=this.insertRow(a,b,c,k,p);d(f,".dgrid-highlight"+(this.addUiClasses?".ui-state-highlight":""));setTimeout(function(){d(f,"!dgrid-highlight!ui-state-highlight")},this.highlightDuration);return f}},adjustRowIndices:function(a){var b=a.rowIndex;if(-1<b){do-1<a.rowIndex&&(this.maintainOddEven&&-1<(a.className+" ").indexOf("dgrid-row ")&&d(a,"."+(1==b%2?"dgrid-row-odd":"dgrid-row-even")+"!"+(0==b%2?"dgrid-row-odd":"dgrid-row-even")),a.rowIndex=b++);while((a=a.nextSibling)&&a.rowIndex!=
b)}},renderArray:function(a,b,c){function k(){var b=arguments;if(-1<s)for(var f=0;f<b.length;f++){var d=b[f],e=n[d?0:n.length-1];if(e=e&&p(e)){var k=e[d?"previousSibling":"nextSibling"];k&&(k=m.row(k));k&&k.element!=e&&(d=d?"unshift":"push",a[d](k.data),n[d](k.element),c.count++)}}}function p(a){return!E.isDescendant(a,m.domNode)&&document.getElementById(a.id)?m.row(a.id.slice(m.id.length+5)).element:a}function f(a){v=m.insertRow(a,u,null,e++,c);v.observerIndex=s;return v}function d(a){t=a.slice(0);
(q=b?b.parentNode:m.contentNode)&&q.parentNode&&(q!==m.contentNode||a.length)?(q.insertBefore(u,b||null),(v=a[a.length-1])&&m.adjustRowIndices(v)):h[s]&&m.cleanEmptyObservers&&"undefined"!==typeof s&&(h[s].cancel(),h[s]=0,m._numObservers--);n=a;r&&(r.rows=n)}c=c||{};var m=this,e=c.start||0,h=this.observers,n,q,s;b||(this._lastCollection=a);if(a.observe&&this.shouldObserveStore){m._numObservers++;var r=a.observe(function(d,f,e){var g,h,l;-1<f&&n[f]&&(g=n.splice(f,1)[0],g.parentNode==q&&((h=g.nextSibling)&&
f!=e&&h.rowIndex--,m.removeRow(g)),c.count--,m._processScroll&&m._processScroll());if(-1<e){if(n.length)if(0===e)l=(l=n[e])&&p(l);else{if(l=n[e-1])l=p(l),l=(l.connected||l).nextSibling}else l=m._getFirstRowSibling&&m._getFirstRowSibling(q);g&&(l&&g.id===l.id)&&(l=(l.connected||l).nextSibling);l&&!l.parentNode&&(l=document.getElementById(l.id));g=b&&b.parentNode||l&&l.parentNode||m.contentNode;if(g=m.newRow(d,g,l,c.start+e,c))if(g.observerIndex=s,n.splice(e,0,g),!h||e<f)h=g.previousSibling,h=!h||h.rowIndex+
1==g.rowIndex||0==g.rowIndex?g:h;c.count++}0===f?k(1,1):f===a.length-(-1===e?0:1)&&k(0,0);f!=e&&h&&m.adjustRowIndices(h);m._onNotification(n,d,f,e)},!0);s=h.push(r)-1}var u=document.createDocumentFragment(),v,t;if(a.map){if(n=a.map(f,console.error),n.then)return a.then(function(b){a=b;return n.then(function(a){d(a);k(1,1,0,0);return t})})}else{n=[];for(var x=0,w=a.length;x<w;x++)n[x]=f(a[x])}d(n);k(1,1,0,0);return t},_onNotification:function(a,b,c,e){},renderHeader:function(){},_autoId:0,insertRow:function(a,
b,c,e,d){var f=d.parentId,f=this.id+"-row-"+(f?f+"-":"")+(this.store&&this.store.getIdentity?this.store.getIdentity(a):this._autoId++),g=document.getElementById(f),h=g&&g.previousSibling;g&&(g===c&&(c=(c.connected||c).nextSibling),this.removeRow(g));g=this.renderRow(a,d);g.className=(g.className||"")+" dgrid-row "+(1==e%2?"dgrid-row-odd":"dgrid-row-even")+(this.addUiClasses?" ui-state-default":"");this._rowIdToObject[g.id=f]=a;b.insertBefore(g,c||null);h&&this.adjustRowIndices(h);g.rowIndex=e;return g},
renderRow:function(a,b){return d("div",""+a)},removeRow:function(a,b){a=a.element||a;delete this._rowIdToObject[a.id];b||d(a,"!")},row:function(a){var b;if(a instanceof this._Row)return a;a.target&&a.target.nodeType&&(a=a.target);if(a.nodeType){do{var c=a.id;if(b=this._rowIdToObject[c])return new this._Row(c.substring(this.id.length+5),b,a);a=a.parentNode}while(a&&a!=this.domNode)}else return"object"==typeof a?b=this.store.getIdentity(a):(b=a,a=this._rowIdToObject[this.id+"-row-"+b]),new this._Row(b,
a,document.getElementById(this.id+"-row-"+b))},cell:function(a){return{row:this.row(a)}},_move:function(a,b,c,e){var d,f;f=d=a.element;b=b||1;do if(a=d[0>b?"previousSibling":"nextSibling"]){do if((d=a)&&-1<(d.className+" ").indexOf(c+" ")){f=d;b+=0>b?1:-1;break}while(a=(!e||!d.hidden)&&d[0>b?"lastChild":"firstChild"])}else if(d=d.parentNode,!d||d===this.bodyNode||d===this.headerNode)break;while(b);return f},up:function(a,b,c){a.element||(a=this.row(a));return this.row(this._move(a,-(b||1),"dgrid-row",
c))},down:function(a,b,c){a.element||(a=this.row(a));return this.row(this._move(a,b||1,"dgrid-row",c))},scrollTo:e("touch")?function(a){return this.useTouchScroll?this.inherited(arguments):D.call(this,a)}:D,getScrollPosition:e("touch")?function(){return this.useTouchScroll?this.inherited(arguments):C.call(this)}:C,get:function(a){var b="_get"+a.charAt(0).toUpperCase()+a.slice(1);return"function"===typeof this[b]?this[b].apply(this,[].slice.call(arguments,1)):this[a]},set:function(a,b){if("object"===
typeof a)for(var c in a)this.set(c,a[c]);else c="_set"+a.charAt(0).toUpperCase()+a.slice(1),"function"===typeof this[c]?this[c].apply(this,[].slice.call(arguments,1)):this[a]=b;return this},_getClass:B,_setClass:u,_getClassName:B,_setClassName:u,_setSort:function(a,b){this._sort="string"!=typeof a?a:[{attribute:a,descending:b}];this.refresh();this._lastCollection&&(a.length&&("string"!=typeof a&&(b=a[0].descending,a=a[0].attribute),this._lastCollection.sort(function(c,d){var e=c[a],f=d[a];void 0===
e&&(e="");void 0===f&&(f="");return e==f?0:e>f==!b?1:-1})),this.renderArray(this._lastCollection))},sort:function(a,b){w.deprecated("sort(...)",'use set("sort", ...) instead',"dgrid 0.4");this.set("sort",a,b)},_getSort:function(){return this._sort},_setShowHeader:function(a){var b=this.headerNode;this.showHeader=a;d(b,(a?"!":".")+"dgrid-header-hidden");this.renderHeader();this.resize();a&&(b.scrollLeft=this.getScrollPosition().x)},setShowHeader:function(a){w.deprecated("setShowHeader(...)",'use set("showHeader", ...) instead',
"dgrid 0.4");this.set("showHeader",a)},_setShowFooter:function(a){this.showFooter=a;d(this.footerNode,(a?"!":".")+"dgrid-footer-hidden");this.resize()}})});