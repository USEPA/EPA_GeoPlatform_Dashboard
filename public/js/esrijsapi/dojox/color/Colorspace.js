//>>built
define("dojox/color/Colorspace",["./_base","dojo/_base/lang","dojox/math/matrix"],function(d,r,n){d.Colorspace=new function(){var h=this,k={2:{E:{x:1/3,y:1/3,t:5400},D50:{x:0.34567,y:0.3585,t:5E3},D55:{x:0.33242,y:0.34743,t:5500},D65:{x:0.31271,y:0.32902,t:6500},D75:{x:0.29902,y:0.31485,t:7500},A:{x:0.44757,y:0.40745,t:2856},B:{x:0.34842,y:0.35161,t:4874},C:{x:0.31006,y:0.31616,t:6774},9300:{x:0.2848,y:0.2932,t:9300},F2:{x:0.37207,y:0.37512,t:4200},F7:{x:0.31285,y:0.32918,t:6500},F11:{x:0.38054,y:0.37691,
t:4E3}},10:{E:{x:1/3,y:1/3,t:5400},D50:{x:0.34773,y:0.35952,t:5E3},D55:{x:0.33411,y:0.34877,t:5500},D65:{x:0.31382,y:0.331,t:6500},D75:{x:0.29968,y:0.3174,t:7500},A:{x:0.45117,y:0.40594,t:2856},B:{x:0.3498,y:0.3527,t:4874},C:{x:0.31039,y:0.31905,t:6774},F2:{x:0.37928,y:0.36723,t:4200},F7:{x:0.31565,y:0.32951,t:6500},F11:{x:0.38543,y:0.3711,t:4E3}}},g={"Adobe RGB 98":[2.2,"D65",0.64,0.33,0.297361,0.21,0.71,0.627355,0.15,0.06,0.075285],"Apple RGB":[1.8,"D65",0.625,0.34,0.244634,0.28,0.595,0.672034,
0.155,0.07,0.083332],"Best RGB":[2.2,"D50",0.7347,0.2653,0.228457,0.215,0.775,0.737352,0.13,0.035,0.034191],"Beta RGB":[2.2,"D50",0.6888,0.3112,0.303273,0.1986,0.7551,0.663786,0.1265,0.0352,0.032941],"Bruce RGB":[2.2,"D65",0.64,0.33,0.240995,0.28,0.65,0.683554,0.15,0.06,0.075452],"CIE RGB":[2.2,"E",0.735,0.265,0.176204,0.274,0.717,0.812985,0.167,0.009,0.010811],"ColorMatch RGB":[1.8,"D50",0.63,0.34,0.274884,0.295,0.605,0.658132,0.15,0.075,0.066985],"DON RGB 4":[2.2,"D50",0.696,0.3,0.27835,0.215,0.765,
0.68797,0.13,0.035,0.03368],"ECI RGB":[1.8,"D50",0.67,0.33,0.32025,0.21,0.71,0.602071,0.14,0.08,0.077679],"EktaSpace PS5":[2.2,"D50",0.695,0.305,0.260629,0.26,0.7,0.734946,0.11,0.005,0.004425],"NTSC RGB":[2.2,"C",0.67,0.33,0.298839,0.21,0.71,0.586811,0.14,0.08,0.11435],"PAL/SECAM RGB":[2.2,"D65",0.64,0.33,0.222021,0.29,0.6,0.706645,0.15,0.06,0.071334],"Pro Photo RGB":[1.8,"D50",0.7347,0.2653,0.28804,0.1596,0.8404,0.711874,0.0366,1E-4,8.6E-5],"SMPTE/C RGB":[2.2,"D65",0.63,0.34,0.212395,0.31,0.595,
0.701049,0.155,0.07,0.086556],sRGB:[2.2,"D65",0.64,0.33,0.212656,0.3,0.6,0.715158,0.15,0.06,0.072186],"Wide Gamut RGB":[2.2,"D50",0.735,0.265,0.258187,0.115,0.826,0.724938,0.157,0.018,0.016875]},e={"XYZ scaling":{ma:[[1,0,0],[0,1,0],[0,0,1]],mai:[[1,0,0],[0,1,0],[0,0,1]]},Bradford:{ma:[[0.8951,-0.7502,0.0389],[0.2664,1.7135,-0.0685],[-0.1614,0.0367,1.0296]],mai:[[0.986993,0.432305,-0.008529],[-0.147054,0.51836,0.040043],[0.159963,0.049291,0.968487]]},"Von Kries":{ma:[[0.40024,-0.2263,0],[0.7076,1.16532,
0],[-0.08081,0.0457,0.91822]],mai:[[1.859936,0.361191,0],[-1.129382,0.638812,0],[0.219897,-6E-6,1.089064]]}},c={XYZ:{xyY:function(a,b){b=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:!0},b||{});var c=h.whitepoint(b.whitepoint,b.observer),d=a.X+a.Y+a.Z;if(0==d)var f=c.x,c=c.y;else f=a.X/d,c=a.Y/d;return{x:f,y:c,Y:a.Y}},Lab:function(a,b){b=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:!0},b||{});var c=h.kappa(b.useApproximation),d=h.epsilon(b.useApproximation),f=h.whitepoint(b.whitepoint,
b.observer),p=a.X/f.x,e=a.Y/f.y,f=a.z/f.z,p=p>d?Math.pow(p,1/3):(c*p+16)/116,e=e>d?Math.pow(e,1/3):(c*e+16)/116,c=f>d?Math.pow(f,1/3):(c*f+16)/116;return{L:116*e-16,a:500*(p-e),b:200*(e-c)}},Luv:function(a,b){b=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:!0},b||{});var c=h.kappa(b.useApproximation),d=h.epsilon(b.useApproximation),f=h.whitepoint(b.whitepoint,b.observer),p=4*a.X/(a.X+15*a.Y+3*a.Z),e=9*a.Y/(a.X+15*a.Y+3*a.Z),g=4*f.x/(f.x+15*f.y+3*f.z),k=9*f.y/(f.x+15*f.y+3*f.z),f=a.Y/
f.y,c=f>d?116*Math.pow(f,1/3)-16:c*f;return{L:c,u:13*c*(p-g),v:13*c*(e-k)}}},xyY:{XYZ:function(a){if(0==a.y){var b=0,c=0;a=0}else b=a.x*a.Y/a.y,c=a.Y,a=(1-a.x-a.y)*a.Y/a.y;return{X:b,Y:c,Z:a}}},Lab:{XYZ:function(a,b){b=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:!0},b||{});var c=b.useApproximation,d=h.kappa(c),c=h.epsilon(c),f=h.whitepoint(b.whitepoint,b.observer),e=a.L>d*c?Math.pow((a.L+16)/116,3):a.L/d,g=e>c?(a.L+16)/116:(d*e+16)/116,k=a.a/500+g,g=g-a.b/200,l=Math.pow(k,3),m=Math.pow(g,
3);return{X:(l>c?l:(116*k-16)/d)*f.x,Y:e*f.y,Z:(m>c?m:(116*g-16)/d)*f.z}},LCHab:function(a){var b=a.L,c=Math.pow(a.a*a.a+a.b*a.b,0.5);a=Math.atan(a.b,a.a)*(180/Math.PI);0>a&&(a+=360);360>a&&(a-=360);return{L:b,C:c,H:a}}},LCHab:{Lab:function(a){var b=a.L,c=a.C/Math.pow(Math.pow(Math.tan(a.H*(Math.PI/180)),2)+1,0.5);90<lchH&&270>a.H&&(c=-c);var d=Math.pow(Math.pow(a.C,2)-Math.pow(c,2),0.5);180<a.H&&(d=-d);return{L:b,a:c,b:d}}},Luv:{XYZ:function(a,b){b=dojo.mixin({whitepoint:"D65",observer:"10",useApproximation:!0},
b||{});var c=b.useApproximation,d=h.kappa(c),f=h.epsilon(c),e=h.whitepoint(b.whitepoint,b.observer),c=4*e.x/(e.x+15*e.y+3*e.z),e=9*e.y/(e.x+15*e.y+3*e.z),d=a.L>d*f?Math.pow((a.L+16)/116,3):a.L/d,f=1/3*(52*a.L/(a.u+13*a.L*c)-1),c=-5*d,e=(d*(39*a.L/(a.v+13*a.L*e)-5)-c)/(f- -(1/3));return{X:e,Y:d,Z:e*f+c}},LCHuv:function(a){var b=a.L,c=Math.pow(a.u*a.u+a.v*a*v,0.5);a=Math.atan(a.v,a.u)*(180/Math.PI);0>a&&(a+=360);360<a&&(a-=360);return{L:b,C:c,H:a}}},LCHuv:{Luv:function(a){var b=a.L,c=a.C/Math.pow(Math.pow(Math.tan(a.H*
(Math.PI/180)),2)+1,0.5),d=Math.pow(a.C*a.C-c*c,0.5);90<a.H&&270<a.H&&(c*=-1);180<a.H&&(d*=-1);return{L:b,u:c,v:d}}}},l={CMY:{CMYK:function(a,b){return d.fromCmy(a).toCmyk()},HSL:function(a,b){return d.fromCmy(a).toHsl()},HSV:function(a,b){return d.fromCmy(a).toHsv()},Lab:function(a,b){return c.XYZ.Lab(d.fromCmy(a).toXYZ(b))},LCHab:function(a,b){return c.Lab.LCHab(l.CMY.Lab(a))},LCHuv:function(a,b){return c.LCHuv.Luv(c.Luv.XYZ(d.fromCmy(a).toXYZ(b)))},Luv:function(a,b){return c.Luv.XYZ(d.fromCmy(a).toXYZ(b))},
RGB:function(a,b){return d.fromCmy(a)},XYZ:function(a,b){return d.fromCmy(a).toXYZ(b)},xyY:function(a,b){return c.XYZ.xyY(d.fromCmy(a).toXYZ(b))}},CMYK:{CMY:function(a,b){return d.fromCmyk(a).toCmy()},HSL:function(a,b){return d.fromCmyk(a).toHsl()},HSV:function(a,b){return d.fromCmyk(a).toHsv()},Lab:function(a,b){return c.XYZ.Lab(d.fromCmyk(a).toXYZ(b))},LCHab:function(a,b){return c.Lab.LCHab(l.CMYK.Lab(a))},LCHuv:function(a,b){return c.LCHuv.Luv(c.Luv.XYZ(d.fromCmyk(a).toXYZ(b)))},Luv:function(a,
b){return c.Luv.XYZ(d.fromCmyk(a).toXYZ(b))},RGB:function(a,b){return d.fromCmyk(a)},XYZ:function(a,b){return d.fromCmyk(a).toXYZ(b)},xyY:function(a,b){return c.XYZ.xyY(d.fromCmyk(a).toXYZ(b))}},HSL:{CMY:function(a,b){return d.fromHsl(a).toCmy()},CMYK:function(a,b){return d.fromHsl(a).toCmyk()},HSV:function(a,b){return d.fromHsl(a).toHsv()},Lab:function(a,b){return c.XYZ.Lab(d.fromHsl(a).toXYZ(b))},LCHab:function(a,b){return c.Lab.LCHab(l.CMYK.Lab(a))},LCHuv:function(a,b){return c.LCHuv.Luv(c.Luv.XYZ(d.fromHsl(a).toXYZ(b)))},
Luv:function(a,b){return c.Luv.XYZ(d.fromHsl(a).toXYZ(b))},RGB:function(a,b){return d.fromHsl(a)},XYZ:function(a,b){return d.fromHsl(a).toXYZ(b)},xyY:function(a,b){return c.XYZ.xyY(d.fromHsl(a).toXYZ(b))}},HSV:{CMY:function(a,b){return d.fromHsv(a).toCmy()},CMYK:function(a,b){return d.fromHsv(a).toCmyk()},HSL:function(a,b){return d.fromHsv(a).toHsl()},Lab:function(a,b){return c.XYZ.Lab(d.fromHsv(a).toXYZ(b))},LCHab:function(a,b){return c.Lab.LCHab(l.CMYK.Lab(a))},LCHuv:function(a,b){return c.LCHuv.Luv(c.Luv.XYZ(d.fromHsv(a).toXYZ(b)))},
Luv:function(a,b){return c.Luv.XYZ(d.fromHsv(a).toXYZ(b))},RGB:function(a,b){return d.fromHsv(a)},XYZ:function(a,b){return d.fromHsv(a).toXYZ(b)},xyY:function(a,b){return c.XYZ.xyY(d.fromHsv(a).toXYZ(b))}},Lab:{CMY:function(a,b){return d.fromXYZ(c.Lab.XYZ(a,b)).toCmy()},CMYK:function(a,b){return d.fromXYZ(c.Lab.XYZ(a,b)).toCmyk()},HSL:function(a,b){return d.fromXYZ(c.Lab.XYZ(a,b)).toHsl()},HSV:function(a,b){return d.fromXYZ(c.Lab.XYZ(a,b)).toHsv()},LCHab:function(a,b){return c.Lab.LCHab(a,b)},LCHuv:function(a,
b){return c.Luv.LCHuv(c.Lab.XYZ(a,b),b)},Luv:function(a,b){return c.XYZ.Luv(c.Lab.XYZ(a,b),b)},RGB:function(a,b){return d.fromXYZ(c.Lab.XYZ(a,b))},XYZ:function(a,b){return c.Lab.XYZ(a,b)},xyY:function(a,b){return c.XYZ.xyY(c.Lab.XYZ(a,b),b)}},LCHab:{CMY:function(a,b){return d.fromXYZ(c.Lab.XYZ(c.LCHab.Lab(a),b),b).toCmy()},CMYK:function(a,b){return d.fromXYZ(c.Lab.XYZ(c.LCHab.Lab(a),b),b).toCmyk()},HSL:function(a,b){return d.fromXYZ(c.Lab.XYZ(c.LCHab.Lab(a),b),b).toHsl()},HSV:function(a,b){return d.fromXYZ(c.Lab.XYZ(c.LCHab.Lab(a),
b),b).toHsv()},Lab:function(a,b){return c.Lab.LCHab(a,b)},LCHuv:function(a,b){return c.Luv.LCHuv(c.XYZ.Luv(c.Lab.XYZ(c.LCHab.Lab(a),b),b),b)},Luv:function(a,b){return c.XYZ.Luv(c.Lab.XYZ(c.LCHab.Lab(a),b),b)},RGB:function(a,b){return d.fromXYZ(c.Lab.XYZ(c.LCHab.Lab(a),b),b)},XYZ:function(a,b){return c.Lab.XYZ(c.LCHab.Lab(a,b),b)},xyY:function(a,b){return c.XYZ.xyY(c.Lab.XYZ(c.LCHab.Lab(a),b),b)}},LCHuv:{CMY:function(a,b){return d.fromXYZ(c.Luv.XYZ(c.LCHuv.Luv(a),b),b).toCmy()},CMYK:function(a,b){return d.fromXYZ(c.Luv.XYZ(c.LCHuv.Luv(a),
b),b).toCmyk()},HSL:function(a,b){return d.fromXYZ(c.Luv.XYZ(c.LCHuv.Luv(a),b),b).toHsl()},HSV:function(a,b){return d.fromXYZ(c.Luv.XYZ(c.LCHuv.Luv(a),b),b).toHsv()},Lab:function(a,b){return c.XYZ.Lab(c.Luv.XYZ(c.LCHuv.Luv(a),b),b)},LCHab:function(a,b){return c.Lab.LCHab(c.XYZ.Lab(c.Luv.XYZ(c.LCHuv.Luv(a),b),b),b)},Luv:function(a,b){return c.LCHuv.Luv(a,b)},RGB:function(a,b){return d.fromXYZ(c.Luv.XYZ(c.LCHuv.Luv(a),b),b)},XYZ:function(a,b){return c.Luv.XYZ(c.LCHuv.Luv(a),b)},xyY:function(a,b){return c.XYZ.xyY(c.Luv.XYZ(c.LCHuv.Luv(a),
b),b)}},Luv:{CMY:function(a,b){return d.fromXYZ(c.Luv.XYZ(a,b),b).toCmy()},CMYK:function(a,b){return d.fromXYZ(c.Luv.XYZ(a,b),b).toCmyk()},HSL:function(a,b){return d.fromXYZ(c.Luv.XYZ(a,b),b).toHsl()},HSV:function(a,b){return d.fromXYZ(c.Luv.XYZ(a,b),b).toHsv()},Lab:function(a,b){return c.XYZ.Lab(c.Luv.XYZ(a,b),b)},LCHab:function(a,b){return c.Lab.LCHab(c.XYZ.Lab(c.Luv.XYZ(a,b),b),b)},LCHuv:function(a,b){return c.Luv.LCHuv(a,b)},RGB:function(a,b){return d.fromXYZ(c.Luv.XYZ(a,b),b)},XYZ:function(a,
b){return c.Luv.XYZ(a,b)},xyY:function(a,b){return c.XYZ.xyY(c.Luv.XYZ(a,b),b)}},RGB:{CMY:function(a,b){return a.toCmy()},CMYK:function(a,b){return a.toCmyk()},HSL:function(a,b){return a.toHsl()},HSV:function(a,b){return a.toHsv()},Lab:function(a,b){return c.XYZ.Lab(a.toXYZ(b),b)},LCHab:function(a,b){return c.LCHab.Lab(c.XYZ.Lab(a.toXYZ(b),b),b)},LCHuv:function(a,b){return c.LCHuv.Luv(c.XYZ.Luv(a.toXYZ(b),b),b)},Luv:function(a,b){return c.XYZ.Luv(a.toXYZ(b),b)},XYZ:function(a,b){return a.toXYZ(b)},
xyY:function(a,b){return c.XYZ.xyY(a.toXYZ(b),b)}},XYZ:{CMY:function(a,b){return d.fromXYZ(a,b).toCmy()},CMYK:function(a,b){return d.fromXYZ(a,b).toCmyk()},HSL:function(a,b){return d.fromXYZ(a,b).toHsl()},HSV:function(a,b){return d.fromXYZ(a,b).toHsv()},Lab:function(a,b){return c.XYZ.Lab(a,b)},LCHab:function(a,b){return c.Lab.LCHab(c.XYZ.Lab(a,b),b)},LCHuv:function(a,b){return c.Luv.LCHuv(c.XYZ.Luv(a,b),b)},Luv:function(a,b){return c.XYZ.Luv(a,b)},RGB:function(a,b){return d.fromXYZ(a,b)},xyY:function(a,
b){return c.XYZ.xyY(d.fromXYZ(a,b),b)}},xyY:{CMY:function(a,b){return d.fromXYZ(c.xyY.XYZ(a,b),b).toCmy()},CMYK:function(a,b){return d.fromXYZ(c.xyY.XYZ(a,b),b).toCmyk()},HSL:function(a,b){return d.fromXYZ(c.xyY.XYZ(a,b),b).toHsl()},HSV:function(a,b){return d.fromXYZ(c.xyY.XYZ(a,b),b).toHsv()},Lab:function(a,b){return c.Lab.XYZ(c.xyY.XYZ(a,b),b)},LCHab:function(a,b){return c.LCHab.Lab(c.Lab.XYZ(c.xyY.XYZ(a,b),b),b)},LCHuv:function(a,b){return c.LCHuv.Luv(c.Luv.XYZ(c.xyY.XYZ(a,b),b),b)},Luv:function(a,
b){return c.Luv.XYZ(c.xyY.XYZ(a,b),b)},RGB:function(a,b){return d.fromXYZ(c.xyY.XYZ(a,b),b)},XYZ:function(a,b){return c.xyY.XYZ(a,b)}}};this.whitepoint=function(a,b){b=b||"10";var c=0,d=0,e=0;k[b]&&k[b][a]?(c=k[b][a].x,d=k[b][a].y,e=k[b][a].t):console.warn("dojox.color.Colorspace::whitepoint: either the observer or the whitepoint name was not found. ",b,a);return this.convert({x:c,y:d,z:1-c-d,t:e,Y:1},"xyY","XYZ")};this.tempToWhitepoint=function(a){if(4E3>a)return console.warn("dojox.color.Colorspace::tempToWhitepoint: can't find a white point for temperatures less than 4000K. (Passed ",
a,")."),{x:0,y:0};if(25E3<a)return console.warn("dojox.color.Colorspace::tempToWhitepoint: can't find a white point for temperatures greater than 25000K. (Passed ",a,")."),{x:0,y:0};var b=a*a,c=b*a,d=Math.pow(10,9),e=Math.pow(10,6),g=Math.pow(10,3);a=7E3>=a?-4.607*d/c+2.9678*e/b+0.09911*g/a+0.2444063:-2.0064*d/c+1.9018*e/b+0.24748*g/a+0.23704;return{x:a,y:-3*a*a+2.87*a-0.275}};this.primaries=function(a){a=dojo.mixin({profile:"sRGB",whitepoint:"D65",observer:"10",adaptor:"Bradford"},a||{});var b=[];
g[a.profile]?b=g[a.profile].slice(0):console.warn("dojox.color.Colorspace::primaries: the passed profile was not found.  ","Available profiles include: ",g,".  The profile passed was ",a.profile);b={name:a.profile,gamma:b[0],whitepoint:b[1],xr:b[2],yr:b[3],Yr:b[4],xg:b[5],yg:b[6],Yg:b[7],xb:b[8],yb:b[9],Yb:b[10]};if(a.whitepoint!=b.whitepoint)var c=this.convert(this.adapt({color:this.convert({x:xr,y:yr,Y:Yr},"xyY","XYZ"),adaptor:a.adaptor,source:b.whitepoint,destination:a.whitepoint}),"XYZ","xyY"),
d=this.convert(this.adapt({color:this.convert({x:xg,y:yg,Y:Yg},"xyY","XYZ"),adaptor:a.adaptor,source:b.whitepoint,destination:a.whitepoint}),"XYZ","xyY"),e=this.convert(this.adapt({color:this.convert({x:xb,y:yb,Y:Yb},"xyY","XYZ"),adaptor:a.adaptor,source:b.whitepoint,destination:a.whitepoint}),"XYZ","xyY"),b=dojo.mixin(b,{xr:c.x,yr:c.y,Yr:c.Y,xg:d.x,yg:d.y,Yg:d.Y,xb:e.x,yb:e.y,Yb:e.Y,whitepoint:a.whitepoint});return dojo.mixin(b,{zr:1-b.xr-b.yr,zg:1-b.xg-b.yg,zb:1-b.xb-b.yb})};this.adapt=function(a){(!a.color||
!a.source)&&console.error("dojox.color.Colorspace::adapt: color and source arguments are required. ",a);a=dojo.mixin({adaptor:"Bradford",destination:"D65"},a);var b=this.whitepoint(a.source),c=this.whitepoint(a.destination);if(e[a.adaptor])var d=e[a.adaptor].ma,f=e[a.adaptor].mai;else console.warn("dojox.color.Colorspace::adapt: the passed adaptor '",a.adaptor,"' was not found.");b=n.multiply([[b.x,b.y,b.z]],d);c=n.multiply([[c.x,c.y,c.z]],d);d=n.multiply(n.multiply(d,[[c[0][0]/b[0][0],0,0],[0,c[0][1]/
b[0][1],0],[0,0,c[0][2]/b[0][2]]]),f);a=n.multiply([[a.color.X,a.color.Y,a.color.Z]],d)[0];return{X:a[0],Y:a[1],Z:a[2]}};this.matrix=function(a,b){var c=this.whitepoint(b.whitepoint),d=b.xr/b.yr,e=(1-b.xr-b.yr)/b.yr,g=b.xg/b.yg,h=(1-b.xg-b.yg)/b.yg,k=b.xb/b.yb,l=(1-b.xb-b.yb)/b.yb,m=n.multiply([[c.X,c.Y,c.Z]],n.inverse([[d,1,e],[g,1,h],[k,1,l]])),c=m[0][0],q=m[0][1],m=m[0][2],d=[[c*d,1*c,c*e],[q*g,1*q,q*h],[m*k,1*m,m*l]];return"RGB"==a?n.inverse(d):d};this.epsilon=function(a){return a||"undefined"==
typeof a?0.008856:216/24289};this.kappa=function(a){return a||"undefined"==typeof a?903.3:24389/27};this.convert=function(a,b,c,d){if(l[b]&&l[b][c])return l[b][c](a,d);console.warn("dojox.color.Colorspace::convert: Can't convert ",a," from ",b," to ",c,".")}};dojo.mixin(d,{fromXYZ:function(h,k){k=k||{};var g=d.Colorspace.primaries(k),e=d.Colorspace.matrix("RGB",g),c=dojox.math.matrix.multiply([[h.X,h.Y,h.Z]],e),l=c[0][0],e=c[0][1],c=c[0][2];"sRGB"==g.profile?(l=0.0031308<l?1.055*Math.pow(l,1/2.4)-
0.055:12.92*l,e=0.0031308<e?1.055*Math.pow(e,1/2.4)-0.055:12.92*e,g=0.0031308<c?1.055*Math.pow(c,1/2.4)-0.055:12.92*c):(l=Math.pow(l,1/g.gamma),e=Math.pow(e,1/g.gamma),g=Math.pow(c,1/g.gamma));return new d.Color({r:Math.floor(255*l),g:Math.floor(255*e),b:Math.floor(255*g)})}});dojo.extend(d.Color,{toXYZ:function(h){h=h||{};var k=d.Colorspace.primaries(h);h=d.Colorspace.matrix("XYZ",k);var g=this.r/255,e=this.g/255,c=this.b/255;"sRGB"==k.profile?(g=0.04045<g?Math.pow((g+0.055)/1.055,2.4):g/12.92,e=
0.04045<e?Math.pow((e+0.055)/1.055,2.4):e/12.92,k=0.04045<c?Math.pow((c+0.055)/1.055,2.4):c/12.92):(g=Math.pow(g,k.gamma),e=Math.pow(e,k.gamma),k=Math.pow(c,k.gamma));h=n([[g,e,k]],h);return{X:h[0][0],Y:h[0][1],Z:h[0][2]}}});return d.Colorspace});