//>>built
define("esri/dijit/metadata/editor/util/MessageDialog","dojo/_base/declare dojo/_base/lang dojo/dom-class dojo/dom-construct dojo/dom-style dojo/has ../../base/etc/docUtil dijit/_WidgetBase dojo/i18n!../../nls/i18nBase dijit/Dialog ./OkCancelBar ../../../../kernel".split(" "),function(a,c,g,b,m,n,h,p,t,q,r,s){a=a([p],{title:"",okLabel:null,cancelIsProminent:!1,cancelLabel:null,showOk:!0,showCancel:!0,showOkCancelBar:!0,dialog:null,messagePane:null,iconNode:null,messageNode:null,okCancelBar:null,postCreate:function(){this.inherited(arguments)},
hide:function(){this.dialog&&this.dialog.hide()},onCancelClick:function(b){},onOkClick:function(b){},show:function(a,k,e){var f=b.create("div",{});this.messagePane=b.create("div",{"class":"gxePrimaryPane gxeMessagePane"},f);this.iconNode=b.create("div",{"class":"gxeIcon"},this.messagePane);k&&g.add(this.iconNode,k);this.messageNode=b.create("div",{"class":"gxeMessageText"},this.messagePane);h.setNodeText(this.messageNode,a);e&&e.message&&(a=b.create("p",{},this.messagePane),h.setNodeText(a,e.message));
var l=this.okCancelBar=new r({okLabel:this.okLabel,cancelIsProminent:this.cancelIsProminent,cancelLabel:this.cancelLabel,showOk:this.showOk,showCancel:this.showCancel,onOkClick:c.hitch(this,function(a){this.dialog&&this.dialog.hide();this.onOkClick(a)}),onCancelClick:c.hitch(this,function(a){this.dialog&&this.dialog.hide();this.onCancelClick(a)})},b.create("div",{},f));this.showOkCancelBar||m.set(l.domNode,"display","none");var d=this.dialog=new q({"class":"gxeDialog gxePopupDialog",title:this.title,
content:f,autofocus:!1});this.isLeftToRight()||g.add(d.domNode,"gxeRtl");this.own(d.on("hide",c.hitch(this,function(){setTimeout(c.hitch(this,function(){l.destroyRecursive(!1);d.destroyRecursive(!1);this.destroyRecursive(!1)}),300)})));return d.show()}});n("extend-esri")&&c.setObject("dijit.metadata.editor.util.MessageDialog",a,s);return a});