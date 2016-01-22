require([
  "esri/arcgis/Portal", "esri/arcgis/OAuthInfo", "esri/IdentityManager",
  "dojo/dom-style", "dojo/dom-attr", "dojo/dom", "dojo/on", "dojo/_base/array",
  "dojo/domReady!"
], function(arcgisPortal, OAuthInfo, esriId, domStyle, domAttr, dom, on, arrayUtils) {
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
    // Show the loading panel
    $('div#loadingMsg').removeClass('hidden');
    $('div#overviewTable').addClass('hidden');
    //todo: Move to CSS
    domStyle.set("anonymousPanel", "display", "none");
    domStyle.set("personalizedPanel", "display", "block");
    domStyle.set("mainWindow", "display", "block");

    //Now sign into AGOL/GPO and then sign into Express app
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

          //Save portalUser on application object so it can be used throughout
          if (egam) egam.portalUser = portalUser;

          //Save communityUser on application object so it can be used throughout
          //communityUser has group and authGroup info
          if (egam && response.body.user) egam.communityUser = response.body.user;

          //set up the authGroups dropdown
          egam.setAuthGroupsDropdown(egam.communityUser.ownerIDsByAuthGroup);
//set authGroups count
          $("#authGroupsCount").html("<a>" + Object.keys(egam.communityUser.ownerIDsByAuthGroup).length + "</a>");

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
      var numGroupsText = "";
      numGroupsText = "" + groups.length + "";
      dom.byId("agoGroups").innerHTML = numGroupsText;

    });

    //Query Mongo db
    //and populate user table in the user view
    //Update in sprint4 to be dynamically changed via UI

    var reducePayload = true;
    if (reducePayload) {
      egam.gpoItems.resultFields = {
        id: 1,
        title: 1,
        description: 1,
        tags: 1,
        thumbnail: 1,
        snippet: 1,
        licenseInfo: 1,
        accessInformation: 1,
        url: 1,
        AuditData: 1,
        numViews: 1,
        modified: 1,
        type: 1,
        owner: 1,
        access: 1
      };
    } else {
      fields = {};
    }

//If super user only get public items initially
    var query={};
    if (egam.communityUser.isSuperUser) {
      query={access:"public"};
      $("#dropAccess option[value='']").remove();
    }
    populateUserTables(query, {
      sort: {
        modified: -1
      },
      fields: egam.gpoItems.resultFields
    })
      .then(function() {
        // Hide the loading panel now after first page is loaded
        $('div#loadingMsg').addClass('hidden');
        $('div#overviewTable').removeClass('hidden');
        $("#loadingMsgCountContainer").addClass('hidden');
//show the authgroups drop down not that items have been loaded
        $('#dropAuthGroups').removeClass('hidden');
        $('#downloadAuthgroupsCSVall').removeClass('hidden');

        return true;
      })
      .fail(function(err) {
        console.error(err);
      });

// This was loading first page and then the rest. Will remove later
//    populateUserTables({}, {
//      limit: 10,
//      sort: {
//        modified: -1
//      },
//      fields: fields
//    }, false)
//      .then(function() {
//        // Hide the loading panel now after first page is loaded
//        $('div#loadingMsg').addClass('hidden');
//        $('div#overviewTable').removeClass('hidden');
//
//        return populateUserTables({}, {
//          skip: 10,
//          sort: {
//            modified: -1
//          },
//          fields: fields
//        }, true);
//      })
//      .fail(function(err) {
//        console.error(err);
//      });

  }

  function createGallery(items) {
    var numItemsText = "";
    numItemsText = "" + items.results.length + "";
    dom.byId("agoItems").innerHTML = numItemsText;
  }

});