require([
    "esri/arcgis/Portal", "esri/arcgis/OAuthInfo", "esri/IdentityManager",
    "dojo/dom-style", "dojo/dom-attr", "dojo/dom", "dojo/on", "dojo/_base/array",
    "dojo/domReady!"
  ], function (arcgisPortal, OAuthInfo, esriId,
    domStyle, domAttr, dom, on, arrayUtils){
    var info = new OAuthInfo({
      appId: "CXkB0iPulNZP9xQo",
      // Uncomment the next line and update if using your own portal
      portalUrl: "http://epa.maps.arcgis.com",
      // Uncomment the next line to prevent the user's signed in state from being shared
      // with other apps on the same domain with the same authNamespace value.
      //authNamespace: "portal_oauth_popup",
      popup: true
    });
    esriId.registerOAuthInfos([info]);

    esriId.checkSignInStatus(info.portalUrl + "/sharing").then(
      function (){
        displayItems();
      }
    ).otherwise(
      function (){
        // Anonymous view
        domStyle.set("anonymousPanel", "display", "block");
        domStyle.set("personalizedPanel", "display", "none");
      }
    );

    on(dom.byId("sign-in"), "click", function (){
      console.log("click", arguments);
      // user will be shown the OAuth Sign In page
      esriId.getCredential(info.portalUrl + "/sharing", {
          oAuthPopupConfirmation: false
        }
      ).then(function (){
          displayItems();
        });
    });

    on(dom.byId("sign-out"), "click", function (){
      esriId.destroyCredentials();
//log out of the express server
      $.get('/logout');
      window.location.reload();
    });

    function displayItems(){
      new arcgisPortal.Portal(info.portalUrl).signIn().then(
        function (portalUser){
//after sign in also login to backend using the token and username
          $.post('/login',{username:portalUser.username,token:portalUser.credential.token },function(){
//This work flow is just temporary to see if username takes. Probably should have one function that is called after signing in.
            populateTable("gpoitemtable1");
            populateTable("gpoitemtable2");
            populateTable("gpoitemtable3");

          console.log("Signed in to the portal: ", portalUser);

          //domAttr.set("userId", "innerHTML", portalUser.fullName);
          domAttr.set("userId", "innerHTML", "<a>Welcome " + portalUser.fullName + "</a>");
          domStyle.set("userId", "display", "block");
          domStyle.set("anonymousPanel", "display", "none");
          domStyle.set("personalizedPanel", "display", "block");
          domStyle.set("mainWindow", "display", "block");

          queryPortal(portalUser);
          });
        }
      ).otherwise(
        function (error){
          console.log("Error occurred while signing in: ", error);
        }
      );
    }

    function queryPortal(portalUser){
      var portal = portalUser.portal;
       
      //See list of valid item types here:  http://www.arcgis.com/apidocs/rest/index.html?itemtypes.html
      //See search reference here:  http://www.arcgis.com/apidocs/rest/index.html?searchreference.html
      var queryParams = {
        q: "owner:" + portalUser.username,
        sortField: "numViews",
        sortOrder: "desc",
        num: 100
      };

      portal.queryItems(queryParams).then(createGallery);


      portalUser.getGroups().then(function(groups){
        //alert(groups.length);
        var htmlFragment = "";
       htmlFragment = "<a >" + groups.length + "</a>";
       dom.byId("agoGroups").innerHTML = htmlFragment;

      });
      
      /*var queryParamsGroup = {
        q: "owner:Region9_EPA",
        //sortField: "numViews",
        //sortOrder: "desc",
        num: 100
      };
      portal.queryGroups(queryParamsGroup).then(searchGroups);*/
    }

    function createGallery(items){
      var htmlFragment = "";
       htmlFragment = "<a >" + items.results.length + "</a>";
       dom.byId("agoItems").innerHTML = htmlFragment;
      /*arrayUtils.forEach(items.results, function (item){
        htmlFragment += (
        "<div class=\"esri-item-container\">" +
        (
          item.thumbnailUrl ?
          "<div class=\"esri-image\" style=\"background-image:url(" + item.thumbnailUrl + ");\"></div>" :
            "<div class=\"esri-image esri-null-image\">Thumbnail not available</div>"
        ) +
        (
          item.title ?
          "<div class=\"esri-title\">" + (item.title || "") + "</div>" :
            "<div class=\"esri-title esri-null-title\">Title not available</div>"
        ) +
        "</div>"
        );
      });*/

      //dom.byId("itemGallery").innerHTML = htmlFragment;
    }

    function searchGroups(groups){
      alert(groups.results.length);
    }

  });