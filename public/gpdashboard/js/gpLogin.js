if (typeof egam == 'undefined') var egam = {};
require([
  'esri/arcgis/Portal', 'esri/arcgis/OAuthInfo', 'esri/IdentityManager',
  'dojo/dom-style', 'dojo/dom-attr', 'dojo/dom', 'dojo/on', 'dojo/_base/array',
  'dojo/domReady!',
], function(arcgisPortal, OAuthInfo, esriId, domStyle, domAttr, dom, on, arrayUtils) {
  var info = new OAuthInfo({
    appId: 'CXkB0iPulNZP9xQo',
    portalUrl: 'https://epa.maps.arcgis.com',
    //AuthNamespace to prevent the user's signed in state from being shared
    //with other apps on the same domain with the same authNamespace value.
    //authNamespace: "portal_oauth_popup",
    popup: false,
  });
  esriId.registerOAuthInfos([info]);

  esriId.checkSignInStatus(info.portalUrl + '/sharing').then(
    function() {
      handleSignInSuccess();
    }
  ).otherwise(
    function() {
      // Anonymous view
      $('#anonymousPanel').show();
      $('#personalizedPanel').hide();
    }
  );

  on(dom.byId('sign-in-navbar'), 'click', signIn);
  on(dom.byId('sign-in-biggreen'), 'click', signIn);

  function signIn() {
    console.log('Signing In', arguments);
    // User will be shown the OAuth Sign In page
    esriId.getCredential(info.portalUrl + '/sharing', {
      oAuthPopupConfirmation: false,
    }).then(function() {
      console.log('Signed In');
      handleSignInSuccess();
    }).otherwise(function(error) {
        console.log('Error occurred while signing in: ', error);
      })
  }

  on(dom.byId('sign-out'), 'click', function() {
    esriId.destroyCredentials();
    //Log out of the express server
    $.get('logout', function() {
      window.location.reload();
    }).fail(
      function() {
        console.log('Error occurred while signing out.');
      }
    );
  });

  function handleSignInSuccess() {

    //Now sign into AGOL/GPO and then sign into Express app
    new arcgisPortal.Portal(info.portalUrl).signIn().then(
      function(portalUser) {
        //After sign in also login to backend using the token and username
        $.post('login', {
          username: portalUser.username,
          token: portalUser.credential.token,
        }, function(response) {
          if (response.error) {
            alert('Error logging in to Server: ' + response.error.message);
            console.error();
            return;
          }

          //Show the menus and main window and sign off and hide sign on now that logged in
          $('#anonymousPanel').hide();
          $('#splashContainer').hide();
          $('#personalizedPanel').show();
          $('#sideNav').show();
          $('#mainWindow').show();

          console.log('Signed in to the portal: ', portalUser);

          //Save portalUser on application object so it can be used throughout
          egam.portalUser = portalUser;

          //Save communityUser on application object so it can be used throughout
          //communityUser has group and authGroup info
          if (egam && response.body.user) egam.communityUser = response.body.user;

          ko.applyBindings(egam, $('#globalNavigationBar')[0]);

          //Show the user name now that loggged in
          $('#userId').show();

          //Now that all the user stuff is set up load the first page which is the GPO items page for now
          loadGPOitemsPage();

        });
      }
    ).otherwise(
      function(error) {
        console.log('Error occurred while signing in: ', error);
      }
    );
  }

  function loadGPOitemsPage() {
    //Create the new PageModel instance
    egam.pages.gpoItems = new egam.models.gpoItems.PageModelClass();
    console.log('GPOitems Page Model created: ' + new Date());

    //Basically initialize the gpoItems page because that is the first page we want to see on login

    egam.pages.gpoItems.init()
      .then(function() {
        //Select only public items if admin
        if (egam.communityUser.isAdmin) {
          //uncomment this when done testing
          //          $('#dropAccess').val('public');
          //          $('#dropAccess').change();
        }
        return true;
      })
      .fail(function(err) {
        console.error(err);
      });
  }

});