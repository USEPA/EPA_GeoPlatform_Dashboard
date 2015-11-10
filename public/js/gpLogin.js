require([
  "esri/arcgis/Portal", "esri/arcgis/OAuthInfo", "esri/IdentityManager",
  "dojo/dom-style", "dojo/dom-attr", "dojo/dom", "dojo/on", "dojo/_base/array",
  "dojo/domReady!"
], function(arcgisPortal, OAuthInfo, esriId,domStyle, domAttr, dom, on, arrayUtils) {
  var info = new OAuthInfo({
    appId: "CXkB0iPulNZP9xQo",
    portalUrl: "http://epa.maps.arcgis.com",
    //authNamespace to prevent the user's signed in state from being shared
    //with other apps on the same domain with the same authNamespace value.
    //authNamespace: "portal_oauth_popup",
    popup: true
  });
  esriId.registerOAuthInfos([info]);

  esriId.checkSignInStatus(info.portalUrl + "/sharing").then(
    function() {
      displayItems();
    }
  ).otherwise(
    function() {
      // Anonymous view
      //todo: Move to CSS (visible and hidden classes)
      domStyle.set("anonymousPanel", "display", "block");
      domStyle.set("personalizedPanel", "display", "none");
    }
  );

  on(dom.byId("sign-in"), "click", function() {
    console.log("click", arguments);
    // user will be shown the OAuth Sign In page
    esriId.getCredential(info.portalUrl + "/sharing", {
      oAuthPopupConfirmation: false
    }).then(function() {
      displayItems();
    });
  });

  on(dom.byId("sign-out"), "click", function() {
    esriId.destroyCredentials();
    //log out of the express server
    $.get('/logout', function() {
      window.location.reload();
    }).fail(
      function() {
        console.log("Error occurred while signing out.");
      }
    );
  });

  function displayItems() {
    new arcgisPortal.Portal(info.portalUrl).signIn().then(
      function(portalUser) {
        //after sign in also login to backend using the token and username
        $.post('/login', {
          username: portalUser.username,
          token: portalUser.credential.token
        }, function(response) {
          if (response.error) {
            alert("Error logging in to Server: " + response.error.message);
            console.error();
            return;
          }

          console.log("Signed in to the portal: ", portalUser);

          //todo: Move to CSS
          domStyle.set("anonymousPanel", "display", "none");
          domStyle.set("personalizedPanel", "display", "block");
          domStyle.set("mainWindow", "display", "block");

          //Is User Admin or lower
          if (portalUser.role == "org_admin") {
            domAttr.set("userId", "innerHTML", "<a>Welcome " + portalUser.fullName + " (GPO Administrator)</a>");
            //todo: Move to CSS
            domStyle.set("userId", "display", "block");
            //$("#userId").append("(GPO Administrator)" + "</a>");
            //for now site is the same for both but in furture
            //call function to set up page for Admin
            queryPortal(portalUser);
          } else {
            domAttr.set("userId", "innerHTML", "<a>Welcome " + portalUser.fullName + " (Non-Administrator)</a>");
            //todo: Move to CSS
            domStyle.set("userId", "display", "block");
            queryPortal(portalUser);
          }

        });
      }
    ).otherwise(
      function(error) {
        console.log("Error occurred while signing in: ", error);
      }
    );
  }

  function queryPortal(portalUser) {
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

    //Display number of groups User has access to
    portalUser.getGroups().then(function(groups) {
      var htmlFragment = "";
      htmlFragment = "<a >" + groups.length + "</a>";
      dom.byId("agoGroups").innerHTML = htmlFragment;

    });

    //Query Mongo db
    //and populate user table in the user view
    //Update in sprint4 to be dynamically changed via UI
    populateUserTables({
      access: 'public'
    }, portalUser.credential.token);

  }

  function createGallery(items) {
    var htmlFragment = "";
    htmlFragment = "<a >" + items.results.length + "</a>";
    dom.byId("agoItems").innerHTML = htmlFragment;
  }

});