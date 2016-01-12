//>>built
require({cache:{"url:esri/dijit/analysis/templates/CreditEstimator.html":'\x3cdiv class\x3d"esriAnalysis esriSimpleForm"\x3e\r\n  \x3ctable class\x3d"esriFormTable"  data-dojo-attach-point\x3d"_table"  style\x3d"border-collapse:collapse;border-spacing:5px;"\x3e\r\n     \x3c!--\x3ctr\x3e\r\n      \x3ctd\x3e\r\n        \x3clabel class\x3d"esriFloatLeading"\x3e${i18n.analysisLayersLabel}\x3c/label\x3e\r\n      \x3c/td\x3e\r\n      \x3ctd\x3e\r\n      \x3c/td\x3e\r\n    \x3c/tr\x3e--\x3e\r\n     \x3ctr\x3e\r\n      \x3ctd\x3e\r\n        \x3clabel class\x3d"esriFloatLeading"\x3e${i18n.totalRecordsLabel}\x3c/label\x3e\r\n      \x3c/td\x3e\r\n      \x3ctd data-dojo-attach-point\x3d"_totalRecordsNode"\x3e\r\n      \x3c/td\x3e\r\n    \x3c/tr\x3e\r\n     \x3c!--\x3ctr\x3e\r\n      \x3ctd\x3e\r\n        \x3clabel class\x3d"esriFloatLeading"\x3e${i18n.creditsAvailLabel}\x3c/label\x3e\r\n      \x3c/td\x3e\r\n      \x3ctd\x3e\r\n      \x3c/td\x3e\r\n    \x3c/tr\x3e--\x3e\r\n     \x3ctr\x3e\r\n      \x3ctd\x3e\r\n        \x3clabel class\x3d"esriFloatLeading"\x3e${i18n.creditsReqLabel}\x3c/label\x3e\r\n      \x3c/td\x3e\r\n      \x3ctd data-dojo-attach-point\x3d"_creditsReqNode"\x3e\r\n      \x3c/td\x3e\r\n    \x3c/tr\x3e\r\n  \x3c/table\x3e\r\n  \x3cdiv data-dojo-attach-point\x3d"_messageDiv"\x3e\x3c/div\x3e\r\n\x3c/div\x3e\r\n'}});
define("esri/dijit/analysis/CreditEstimator","require dojo/_base/declare dojo/_base/lang dojo/_base/connect dojo/_base/event dojo/_base/kernel dojo/has dojo/dom-construct dojo/dom-class dojo/dom-attr dojo/dom-style dojo/string dojo/number dijit/_WidgetBase dijit/_TemplatedMixin dijit/_OnDijitClickMixin dijit/_FocusMixin ../../kernel ../../lang dojo/i18n!../../nls/jsapi dojo/text!./templates/CreditEstimator.html".split(" "),function(e,m,d,w,x,g,n,y,z,b,h,p,k,q,r,s,t,u,l,f,v){e=m([q,r,s,t],{declaredClass:"esri.dijit.analysis.CreditEstimator",
i18n:null,templateString:v,postMixInProperties:function(){this.inherited(arguments);this.i18n={};d.mixin(this.i18n,f.common);d.mixin(this.i18n,f.analysisMsgCodes);d.mixin(this.i18n,f.creditEstimator)},postCreate:function(){this.inherited(arguments)},_setContentAttr:function(a){var c="";a.code&&!a.messageCode&&(a.messageCode=a.code);a.messageCode?(c=l.isDefined(this.i18n[a.messageCode])?this.i18n[a.messageCode]:a.message,c=l.isDefined(a.params)?p.substitute(c,a.params):c,b.set(this._messageDiv,"display",
"block"),b.set(this._messageDiv,"innerHTML",c),h.set(this._table,"display","none")):(h.set(this._table,"display","table"),b.set(this._messageDiv,"display","none"),b.set(this._messageDiv,"innerHTML",""),b.set(this._totalRecordsNode,"innerHTML",k.format(a.totalRecords,{locale:g.locale})),b.set(this._creditsReqNode,"innerHTML",k.format(a.cost,{locale:g.locale})))}});n("extend-esri")&&d.setObject("dijit.analysis.CreditEstimator",e,u);return e});