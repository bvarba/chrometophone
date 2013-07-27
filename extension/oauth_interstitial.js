window.onload = function() {
    // We may be called directly, as options, or as result of a
    // redirect from OAuth1 flow
    var params = ChromeExOAuth.getQueryStringParams();
    if (params['chromeexoauthcallback'] == 'true') {
      // End of the oauth request flow, get access token
      oauth.initOAuthFlow(function(token, secret) {
        chrome.extension.getBackgroundPage().initializeBrowserChannel();
        window.location = 'help.html#just_signed_in';
      });
    } else {
      oauth.initOAuthFlow(function(token, secret) {
        chrome.extension.getBackgroundPage().initializeBrowserChannel();
      });
    }
  };
