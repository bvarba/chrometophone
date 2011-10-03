// https://developer.mozilla.org/en/JavaScript_code_modules/Using_JavaScript_code_modules
var EXPORTED_SYMBOLS = ["OAuthFactory"];

const Cc = Components.classes;
const Ci = Components.interfaces;

// For use while debugging
function toConsole(text)
{
	Cc["@mozilla.org/consoleservice;1"]
		.getService(Ci.nsIConsoleService)
		.logStringMessage( text );
}

function openTab(url, successUrl, callback, referenceObject)
{
	var gBrowser = Cc["@mozilla.org/appshell/window-mediator;1"]
		.getService(Ci.nsIWindowMediator)
		.getMostRecentWindow("navigator:browser")
		.gBrowser;

	var lastTabIndex = gBrowser.tabContainer.selectedIndex;
	var tab = gBrowser.addTab(url);
	gBrowser.selectedTab = tab;

	if (successUrl && callback)
	{
		var c2pTab = gBrowser.getBrowserForTab(tab);

		// Use nsIWebProgressListener to avoid problems with other extensions that might alter the load of images
		referenceObject.LocationListener =
		{
			QueryInterface : function(aIID){
				if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
					aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
					aIID.equals(Components.interfaces.nsISupports) )
					return this;

				throw Components.results.NS_NOINTERFACE;
			},

			onLocationChange : function(aProgress, aRequest, originalURI)
			{
				var currentUrl = originalURI.spec;

				if ( successUrl==currentUrl.substr(0, successUrl.length) )
				{
					c2pTab.removeProgressListener( referenceObject.LocationListener );
					delete referenceObject.LocationListener;

					callback( currentUrl );

					// Close tab
					gBrowser.removeTab(tab);
					// ReFocus on tab being sent
					gBrowser.selectedTab = gBrowser.tabContainer.childNodes[lastTabIndex];
				}
			},

			onStateChange : function(aProgress,aRequest,flag,status){},
			onProgressChange : function(aRequest,c,d,e,f){},
			onStatusChange : function(aRequest,c,d){},
			onSecurityChange : function(aRequest,c){}
		};

		// Add listener for callback URL
		c2pTab.addProgressListener( referenceObject.LocationListener );
	}
}


/**
 * Based on Chrome's ChromeExOAuth
 * Removed some unused code (as I haven't tested it) and adjusted to work without "background pages"
 * Converted into a Javascript Module
 *
 * Copyright (c) 2010 The Chromium Authors. All rights reserved.  Use of this
 * source code is governed by a BSD-style license that can be found in the
 * LICENSE file.
 */

/**
 * Initializes the OAuth helper from the background page.  You must call this
 * before attempting to make any OAuth calls.
 * @param {Object} oauth_config Configuration parameters in a JavaScript object.
 *     The following parameters are recognized:
 *         "request_url" {String} OAuth request token URL.
 *         "authorize_url" {String} OAuth authorize token URL.
 *         "access_url" {String} OAuth access token URL.
 *         "consumer_key" {String} OAuth consumer key.
 *         "consumer_secret" {String} OAuth consumer secret.
 *         "scope" {String} OAuth access scope.
 *         "app_name" {String} Application name.
 *         "auth_params" {Object} Additional parameters to pass to the
 *             Authorization token URL.  For an example, 'hd', 'hl', 'btmpl':
 *             http://code.google.com/apis/accounts/docs/OAuth_ref.html#GetAuth
 * @return {ChromeExOAuth} An initialized ChromeExOAuth object.
 */
var OAuthFactory = {
	init : function(oauth_config, preferences)
	{
		var chromeExOAuth = new ChromeExOAuth(
				oauth_config['request_url'],
				oauth_config['authorize_url'],
				oauth_config['access_url'],
				oauth_config['consumer_key'],
				oauth_config['consumer_secret'],
				oauth_config['scope'],
				{
					'app_name' : oauth_config['app_name'],
					'auth_params' : oauth_config['auth_params'],
					'callback_page' : oauth_config['callback_page']
				}
			);

		chromeExOAuth.RequestingAccess = false;

		/*
		LocalStorage isn't working for extensions
		Use the preferences system with a branch for each account
		*/
		chromeExOAuth.setPreferencesBranch(preferences);

		return chromeExOAuth;
	}
};

ChromeExOAuth.prototype.setPreferencesBranch = function( branch ) {
		this.prefs = Cc["@mozilla.org/preferences-service;1"]
						.getService(Ci.nsIPrefService)
						.getBranch(branch) ;
};

/**
 * Constructor - no need to invoke directly, call initBackgroundPage instead.
 * @constructor
 * @param {String} url_request_token The OAuth request token URL.
 * @param {String} url_auth_token The OAuth authorize token URL.
 * @param {String} url_access_token The OAuth access token URL.
 * @param {String} consumer_key The OAuth consumer key.
 * @param {String} consumer_secret The OAuth consumer secret.
 * @param {String} oauth_scope The OAuth scope parameter.
 * @param {Object} opt_args Optional arguments.  Recognized parameters:
 *     "app_name" {String} Name of the current application
 *     "callback_page" {String} If you renamed chrome_ex_oauth.html, the name
 *          this file was renamed to.
 */
function ChromeExOAuth(url_request_token, url_auth_token, url_access_token,
                       consumer_key, consumer_secret, oauth_scope, opt_args) {
  this.url_request_token = url_request_token;
  this.url_auth_token = url_auth_token;
  this.url_access_token = url_access_token;
  this.consumer_key = consumer_key;
  this.consumer_secret = consumer_secret;
  this.oauth_scope = oauth_scope;
  this.app_name = opt_args && opt_args['app_name'] ||
      "ChromeExOAuth Library";
  this.key_token = "oauth_token";
  this.key_token_secret = "oauth_token_secret";
  this.callback_page = opt_args && opt_args['callback_page'] ||
      "chrome_ex_oauth.html";
  this.auth_params = {};
  if (opt_args && opt_args['auth_params']) {
    for (key in opt_args['auth_params']) {
      if (opt_args['auth_params'].hasOwnProperty(key)) {
        this.auth_params[key] = opt_args['auth_params'][key];
      }
    }
  }
}

/*******************************************************************************
 * PUBLIC API METHODS
 * Call these from your background page.
 ******************************************************************************/

/**
 * Clears any OAuth tokens stored for this configuration.  Effectively a
 * "logout" of the configured OAuth API.
 */
ChromeExOAuth.prototype.clearTokens = function() {
	try	{ this.prefs.clearUserPref(this.key_token);	} catch (e)	{}
	try	{ this.prefs.clearUserPref(this.key_token_secret);	} catch (e)	{}
};

/**
 * Returns whether a token is currently stored for this configuration.
 * Effectively a check to see whether the current user is "logged in" to
 * the configured OAuth API.
 * @return {Boolean} True if an access token exists.
 */
ChromeExOAuth.prototype.hasToken = function() {
  return !!this.getToken();
};

/**
 * Makes an OAuth-signed HTTP request with the currently authorized tokens.
 * @param {String} url The URL to send the request to.  Querystring parameters
 *     should be omitted.
 * @param {Function} callback A function to be called once the request is
 *     completed.  This callback will be passed the following arguments:
 *         responseText {String} The text response.
 *         xhr {XMLHttpRequest} The XMLHttpRequest object which was used to
 *             send the request.  Useful if you need to check response status
 *             code, etc.
 * @param {Object} opt_params Additional parameters to configure the request.
 *     The following parameters are accepted:
 *         "method" {String} The HTTP method to use.  Defaults to "GET".
 *         "body" {String} A request body to send.  Defaults to null.
 *         "parameters" {Object} Query parameters to include in the request.
 *         "headers" {Object} Additional headers to include in the request.
 */
ChromeExOAuth.prototype.sendSignedRequest = function(url, callback,
                                                     opt_params) {
  var method = opt_params && opt_params['method'] || 'GET';
  var body = opt_params && opt_params['body'] || null;
  var params = opt_params && opt_params['parameters'] || {};
  var headers = opt_params && opt_params['headers'] || {};

  var signedUrl = this.signURL(url, method, params);

  ChromeExOAuth.sendRequest(method, signedUrl, headers, body, function (xhr) {
    if (xhr.readyState == 4) {
      callback(xhr.responseText, xhr);
    }
  });
};

/**
 * Adds the required OAuth parameters to the given url and returns the
 * result.  Useful if you need a signed url but don't want to make an XHR
 * request.
 * @param {String} method The http method to use.
 * @param {String} url The base url of the resource you are querying.
 * @param {Object} opt_params Query parameters to include in the request.
 * @return {String} The base url plus any query params plus any OAuth params.
 */
ChromeExOAuth.prototype.signURL = function(url, method, opt_params) {
  var token = this.getToken();
  var secret = this.getTokenSecret();
  if (!token || !secret) {
    throw new Error("No oauth token or token secret");
  }

  var params = opt_params || {};

  var result = OAuthSimple().sign({
    action : method,
    path : url,
    parameters : params,
    signatures: {
      consumer_key : this.consumer_key,
      shared_secret : this.consumer_secret,
      oauth_secret : secret,
      oauth_token: token
    }
  });

  return result.signed_url;
};

/**
 * Generates the Authorization header based on the oauth parameters.
 * @param {String} url The base url of the resource you are querying.
 * @param {Object} opt_params Query parameters to include in the request.
 * @return {String} An Authorization header containing the oauth_* params.
 */
ChromeExOAuth.prototype.getAuthorizationHeader = function(url, method,
                                                          opt_params) {
  var token = this.getToken();
  var secret = this.getTokenSecret();
  if (!token || !secret) {
    throw new Error("No oauth token or token secret");
  }

  var params = opt_params || {};

  return OAuthSimple().getHeaderString({
    action: method,
    path : url,
    parameters : params,
    signatures: {
      consumer_key : this.consumer_key,
      shared_secret : this.consumer_secret,
      oauth_secret : secret,
      oauth_token: token
    }
  });
};

/*******************************************************************************
 * PRIVATE API METHODS
 * Used by the library.  There should be no need to call these methods directly.
 ******************************************************************************/

/**
 * Creates a new ChromeExOAuth object from the supplied configuration object.
 * @param {Object} oauth_config Configuration parameters in a JavaScript object.
 *     The following parameters are recognized:
 *         "request_url" {String} OAuth request token URL.
 *         "authorize_url" {String} OAuth authorize token URL.
 *         "access_url" {String} OAuth access token URL.
 *         "consumer_key" {String} OAuth consumer key.
 *         "consumer_secret" {String} OAuth consumer secret.
 *         "scope" {String} OAuth access scope.
 *         "app_name" {String} Application name.
 *         "auth_params" {Object} Additional parameters to pass to the
 *             Authorization token URL.  For an example, 'hd', 'hl', 'btmpl':
 *             http://code.google.com/apis/accounts/docs/OAuth_ref.html#GetAuth
 * @return {ChromeExOAuth} An initialized ChromeExOAuth object.
 */


/**
 * Sends an HTTP request.  Convenience wrapper for XMLHttpRequest calls.
 * @param {String} method The HTTP method to use.
 * @param {String} url The URL to send the request to.
 * @param {Object} headers Optional request headers in key/value format.
 * @param {String} body Optional body content.
 * @param {Function} callback Function to call when the XMLHttpRequest's
 *     ready state changes.  See documentation for XMLHttpRequest's
 *     onreadystatechange handler for more information.
 */
ChromeExOAuth.sendRequest = function(method, url, headers, body, callback) {
//  var xhr = new XMLHttpRequest();
	var xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
					.createInstance(Ci.nsIXMLHttpRequest);

  xhr.onreadystatechange = function(data) {
    callback(xhr, data, url);
  };
  xhr.open(method, url, true);
  if (headers) {
    for (var header in headers) {
      if (headers.hasOwnProperty(header)) {
        xhr.setRequestHeader(header, headers[header]);
      }
    }
  }

  xhr.send(body);
};

/**
 * Decodes a URL-encoded string into key/value pairs.
 * @param {String} encoded An URL-encoded string.
 * @return {Object} An object representing the decoded key/value pairs found
 *     in the encoded string.
 */
ChromeExOAuth.formDecode = function(encoded) {
  var params = encoded.split("&");
  var decoded = {};
  for (var i = 0, param; param = params[i]; i++) {
    var keyval = param.split("=");
    if (keyval.length == 2) {
      var key = ChromeExOAuth.fromRfc3986(keyval[0]);
      var val = ChromeExOAuth.fromRfc3986(keyval[1]);
      decoded[key] = val;
    }
  }
  return decoded;
};

/**
 * Returns the current window's querystring decoded into key/value pairs.
 * @return {Object} A object representing any key/value pairs found in the
 *     current window's querystring.
 */
ChromeExOAuth.getQueryStringParams = function( href ) {
  var urlparts = href.split("?");
  if (urlparts.length >= 2) {
    var querystring = urlparts.slice(1).join("?");
    return ChromeExOAuth.formDecode(querystring);
  }
  return {};
};

/**
 * Binds a function call to a specific object.  This function will also take
 * a variable number of additional arguments which will be prepended to the
 * arguments passed to the bound function when it is called.
 * @param {Function} func The function to bind.
 * @param {Object} obj The object to bind to the function's "this".
 * @return {Function} A closure that will call the bound function.
 */
ChromeExOAuth.bind = function(func, obj) {
  var newargs = Array.prototype.slice.call(arguments).slice(2);
  return function() {
    var combinedargs = newargs.concat(Array.prototype.slice.call(arguments));
    func.apply(obj, combinedargs);
  };
};

/**
 * Encodes a value according to the RFC3986 specification.
 * @param {String} val The string to encode.
 */
ChromeExOAuth.toRfc3986 = function(val){
   return encodeURIComponent(val)
       .replace(/\!/g, "%21")
       .replace(/\*/g, "%2A")
       .replace(/'/g, "%27")
       .replace(/\(/g, "%28")
       .replace(/\)/g, "%29");
};

/**
 * Decodes a string that has been encoded according to RFC3986.
 * @param {String} val The string to decode.
 */
ChromeExOAuth.fromRfc3986 = function(val){
  var tmp = val
      .replace(/%21/g, "!")
      .replace(/%2A/g, "*")
      .replace(/%27/g, "'")
      .replace(/%28/g, "(")
      .replace(/%29/g, ")");
   return decodeURIComponent(tmp);
};

/**
 * Adds a key/value parameter to the supplied URL.
 * @param {String} url An URL which may or may not contain querystring values.
 * @param {String} key A key
 * @param {String} value A value
 * @return {String} The URL with URL-encoded versions of the key and value
 *     appended, prefixing them with "&" or "?" as needed.
 */
ChromeExOAuth.addURLParam = function(url, key, value) {
  var sep = (url.indexOf('?') >= 0) ? "&" : "?";
  return url + sep +
         ChromeExOAuth.toRfc3986(key) + "=" + ChromeExOAuth.toRfc3986(value);
};

/**
 * Stores an OAuth token for the configured scope.
 * @param {String} token The token to store.
 */
ChromeExOAuth.prototype.setToken = function(token) {
  this.prefs.setCharPref(this.key_token, token);
};

/**
 * Retrieves any stored token for the configured scope.
 * @return {String} The stored token.
 */
ChromeExOAuth.prototype.getToken = function() {
	if (!this.prefs.prefHasUserValue(this.key_token))
		return "";
	return this.prefs.getCharPref(this.key_token);
};

/**
 * Stores an OAuth token secret for the configured scope.
 * @param {String} secret The secret to store.
 */
ChromeExOAuth.prototype.setTokenSecret = function(secret) {
  this.prefs.setCharPref(this.key_token_secret, secret);
};

/**
 * Retrieves any stored secret for the configured scope.
 * @return {String} The stored secret.
 */
ChromeExOAuth.prototype.getTokenSecret = function() {
	if (!this.prefs.prefHasUserValue(this.key_token_secret))
		return "";
  return this.prefs.getCharPref(this.key_token_secret);
};

/**
 * Starts an OAuth authorization flow.
 * If this method detects that a redirect has finished, it grabs the
 * appropriate OAuth parameters from the URL and attempts to retrieve an
 * access token.  If no token exists and no redirect has happened, then
 * an access token is requested and the page is ultimately redirected.
 * @param {Function} callback The function to call once the flow has finished.
 *     This callback will be passed the following arguments:
 *         token {String} The OAuth access token.
 *         secret {String} The OAuth access token secret.
 */
ChromeExOAuth.prototype.initOAuthFlow = function(callback) {

	// Clear any existing credentials as they have failed
	this.clearTokens();

	var request_params = {
		'url_callback_param' : 'chromeexoauthcallback',
		'url_callback': this.callback_page
	};
	var self = this;
	this.getRequestToken(function(url, error) {
		if (error)
		{
			callback(null, null, error);
			return;
		}
		openTab( url, request_params.url_callback, function( url )
			{
				var params = ChromeExOAuth.getQueryStringParams( url );
				if (params['chromeexoauthcallback'] == 'true')
				{
				  var oauth_token = params['oauth_token'];
				  var oauth_verifier = params['oauth_verifier'];
				  self.getAccessToken(oauth_token, oauth_verifier, callback);
				}
				else
					throw ('No chromeexoauthcallback parameter returned. ' + url);
			}, this);
		}, request_params);

};

/**
 * Requests an OAuth request token.
 * @param {Function} callback Function to call once the authorize URL is
 *     calculated.  This callback will be passed the following arguments:
 *         url {String} The URL the user must be redirected to in order to
 *             approve the token.
 * @param {Object} opt_args Optional arguments.  The following parameters
 *     are accepted:
 *         "url_callback" {String} The URL the OAuth provider will redirect to.
 *         "url_callback_param" {String} A parameter to include in the callback
 *             URL in order to indicate to this library that a redirect has
 *             taken place.
 */
ChromeExOAuth.prototype.getRequestToken = function(callback, opt_args) {
	if (typeof callback !== "function") {
	throw new Error("Specified callback must be a function.");
	}
	var url = opt_args && opt_args['url_callback'] || 'http://www.mozilla.com';

	var url_param = opt_args && opt_args['url_callback_param'] ||
				  "chromeexoauthcallback";
	var url_callback = ChromeExOAuth.addURLParam(url, url_param, "true");

	var result = OAuthSimple().sign(
		{
			path : this.url_request_token,
			parameters: {
			  "xoauth_displayname" : this.app_name,
			  "scope" : this.oauth_scope,
			  "oauth_callback" : url_callback
			},
			signatures: {
			  consumer_key : this.consumer_key,
			  shared_secret : this.consumer_secret
			}
		});
	var onToken = ChromeExOAuth.bind(this.onRequestToken, this, callback);
	ChromeExOAuth.sendRequest("GET", result.signed_url, null, null, onToken);
};

/**
 * Called when a request token has been returned.  Stores the request token
 * secret for later use and sends the authorization url to the supplied
 * callback (for redirecting the user).
 * @param {Function} callback Function to call once the authorize URL is
 *     calculated.  This callback will be passed the following arguments:
 *         url {String} The URL the user must be redirected to in order to
 *             approve the token.
 * @param {XMLHttpRequest} xhr The XMLHttpRequest object used to fetch the
 *     request token.
 *	requestUrl: requested URL (to log errors better)
 */
ChromeExOAuth.prototype.onRequestToken = function(callback, xhr, data, requestUrl) {
  if (xhr.readyState == 4) {
    if (xhr.status == 200) {
      var params = ChromeExOAuth.formDecode(xhr.responseText);
      var token = params['oauth_token'];
      this.setTokenSecret(params['oauth_token_secret']);
      var url = ChromeExOAuth.addURLParam(this.url_auth_token,
                                          "oauth_token", token);
      for (var key in this.auth_params) {
        if (this.auth_params.hasOwnProperty(key)) {
          url = ChromeExOAuth.addURLParam(url, key, this.auth_params[key]);
        }
      }
      callback(url);
    } else {
//      throw new Error("Fetching request token failed. Status " + xhr.status);
		toConsole("OAuth Request token response: " + xhr.responseText);
		toConsole("OAuth Request token url: " +requestUrl);
		callback(null, "Fetching request token failed. Status " + xhr.status);
    }
  }
};

/**
 * Requests an OAuth access token.
 * @param {String} oauth_token The OAuth request token.
 * @param {String} oauth_verifier The OAuth token verifier.
 * @param {Function} callback The function to call once the token is obtained.
 *     This callback will be passed the following arguments:
 *         token {String} The OAuth access token.
 *         secret {String} The OAuth access token secret.
 */
ChromeExOAuth.prototype.getAccessToken = function(oauth_token, oauth_verifier,
                                                  callback) {
  if (typeof callback !== "function") {
    throw new Error("Specified callback must be a function.");
  }

  if (this.RequestingAccess == false) {
	this.RequestingAccess = true;

    var result = OAuthSimple().sign({
      path : this.url_access_token,
      parameters: {
        "oauth_token" : oauth_token,
        "oauth_verifier" : oauth_verifier
      },
      signatures: {
        consumer_key : this.consumer_key,
        shared_secret : this.consumer_secret,
        oauth_secret : this.getTokenSecret(this.oauth_scope)
      }
    });

    var onToken = ChromeExOAuth.bind(this.onAccessToken, this, callback);
    ChromeExOAuth.sendRequest("GET", result.signed_url, null, null, onToken);
  }
};

/**
 * Called when an access token has been returned.  Stores the access token and
 * access token secret for later use and sends them to the supplied callback.
 * @param {Function} callback The function to call once the token is obtained.
 *     This callback will be passed the following arguments:
 *         token {String} The OAuth access token.
 *         secret {String} The OAuth access token secret.
 * @param {XMLHttpRequest} xhr The XMLHttpRequest object used to fetch the
 *     access token.
 */
ChromeExOAuth.prototype.onAccessToken = function(callback, xhr) {
  if (xhr.readyState == 4) {
    if (xhr.status == 200) {
      var params = ChromeExOAuth.formDecode(xhr.responseText);
      var token = params["oauth_token"];
      var secret = params["oauth_token_secret"];
      this.setToken(token);
      this.setTokenSecret(secret);
      this.RequestingAccess = false;
      callback(token, secret);
    } else {
      this.RequestingAccess = false;
      throw new Error("Fetching access token failed with status " + xhr.status);
    }
  }
};


// ---------------------------------------------------------------------------- //
// ---------------------------------------------------------------------------- //
// ---------------------------------------------------------------------------- //
// ---------------------------------------------------------------------------- //


/* OAuthSimple
  * A simpler version of OAuth
  *
  * author:     jr conlin
  * mail:       src@anticipatr.com
  * copyright:  unitedHeroes.net
  * version:    1.2
  * url:        http://unitedHeroes.net/OAuthSimple
  *
  * Copyright (c) 2010, unitedHeroes.net
  * All rights reserved.
  *
  * Redistribution and use in source and binary forms, with or without
  * modification, are permitted provided that the following conditions are met:
  *     * Redistributions of source code must retain the above copyright
  *       notice, this list of conditions and the following disclaimer.
  *     * Redistributions in binary form must reproduce the above copyright
  *       notice, this list of conditions and the following disclaimer in the
  *       documentation and/or other materials provided with the distribution.
  *     * Neither the name of the unitedHeroes.net nor the
  *       names of its contributors may be used to endorse or promote products
  *       derived from this software without specific prior written permission.
  *
  * THIS SOFTWARE IS PROVIDED BY UNITEDHEROES.NET ''AS IS'' AND ANY
  * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
  * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
  * DISCLAIMED. IN NO EVENT SHALL UNITEDHEROES.NET BE LIABLE FOR ANY
  * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var OAuthSimple;

if (OAuthSimple === undefined)
{
    /* Simple OAuth
     *
     * This class only builds the OAuth elements, it does not do the actual
     * transmission or reception of the tokens. It does not validate elements
     * of the token. It is for client use only.
     *
     * api_key is the API key, also known as the OAuth consumer key
     * shared_secret is the shared secret (duh).
     *
     * Both the api_key and shared_secret are generally provided by the site
     * offering OAuth services. You need to specify them at object creation
     * because nobody <explative>ing uses OAuth without that minimal set of
     * signatures.
     *
     * If you want to use the higher order security that comes from the
     * OAuth token (sorry, I don't provide the functions to fetch that because
     * sites aren't horribly consistent about how they offer that), you need to
     * pass those in either with .signatures() or as an argument to the
     * .sign() or .getHeaderString() functions.
     *
     * Example:
       <code>
        var oauthObject = OAuthSimple().sign({path:'http://example.com/rest/',
                                              parameters: 'foo=bar&gorp=banana',
                                              signatures:{
                                                api_key:'12345abcd',
                                                shared_secret:'xyz-5309'
                                             }});
        document.getElementById('someLink').href=oauthObject.signed_url;
       </code>
     *
     * that will sign as a "GET" using "SHA1-MAC" the url. If you need more than
     * that, read on, McDuff.
     */

    /** OAuthSimple creator
     *
     * Create an instance of OAuthSimple
     *
     * @param api_key {string}       The API Key (sometimes referred to as the consumer key) This value is usually supplied by the site you wish to use.
     * @param shared_secret (string) The shared secret. This value is also usually provided by the site you wish to use.
     */
    OAuthSimple = function (consumer_key,shared_secret)
    {
/*        if (api_key == undefined)
            throw("Missing argument: api_key (oauth_consumer_key) for OAuthSimple. This is usually provided by the hosting site.");
        if (shared_secret == undefined)
            throw("Missing argument: shared_secret (shared secret) for OAuthSimple. This is usually provided by the hosting site.");
*/      var self = {};
        self._secrets={};


        // General configuration options.
        if (consumer_key !== undefined) {
            self._secrets['consumer_key'] = consumer_key;
            }
        if (shared_secret !== undefined) {
            self._secrets['shared_secret'] = shared_secret;
            }
        self._default_signature_method= "HMAC-SHA1";
        self._action = "GET";
        self._nonce_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        self._parameters={};


        self.reset = function() {
            this._parameters={};
            this._path=undefined;
            this.sbs=undefined;
            return this;
        };

        /** set the parameters either from a hash or a string
         *
         * @param {string,object} List of parameters for the call, this can either be a URI string (e.g. "foo=bar&gorp=banana" or an object/hash)
         */
        self.setParameters = function (parameters) {
            if (parameters === undefined) {
                parameters = {};
                }
            if (typeof(parameters) == 'string') {
                parameters=this._parseParameterString(parameters);
                }
            this._parameters = this._merge(parameters,this._parameters);
            if (this._parameters['oauth_nonce'] === undefined) {
                this._getNonce();
                }
            if (this._parameters['oauth_timestamp'] === undefined) {
                this._getTimestamp();
                }
            if (this._parameters['oauth_method'] === undefined) {
                this.setSignatureMethod();
                }
            if (this._parameters['oauth_consumer_key'] === undefined) {
                this._getApiKey();
                }
            if(this._parameters['oauth_token'] === undefined) {
                this._getAccessToken();
                }
            if(this._parameters['oauth_version'] === undefined) {
                this._parameters['oauth_version']='1.0';
                }

            return this;
        };

        /** convienence method for setParameters
         *
         * @param parameters {string,object} See .setParameters
         */
        self.setQueryString = function (parameters) {
            return this.setParameters(parameters);
        };

        /** Set the target URL (does not include the parameters)
         *
         * @param path {string} the fully qualified URI (excluding query arguments) (e.g "http://example.org/foo")
         */
        self.setURL = function (path) {
            if (path == '') {
                throw ('No path specified for OAuthSimple.setURL');
                }
            this._path = path;
            return this;
        };

        /** convienence method for setURL
         *
         * @param path {string} see .setURL
         */
        self.setPath = function(path){
            return this.setURL(path);
        };

        /** set the "action" for the url, (e.g. GET,POST, DELETE, etc.)
         *
         * @param action {string} HTTP Action word.
         */
        self.setAction = function(action) {
            if (action === undefined) {
                action="GET";
                }
            action = action.toUpperCase();
            if (action.match('[^A-Z]')) {
                throw ('Invalid action specified for OAuthSimple.setAction');
                }
            this._action = action;
            return this;
        };

        /** set the signatures (as well as validate the ones you have)
         *
         * @param signatures {object} object/hash of the token/signature pairs {api_key:, shared_secret:, oauth_token: oauth_secret:}
         */
        self.signatures = function(signatures) {
            if (signatures)
            {
                this._secrets = this._merge(signatures,this._secrets);
            }
            // Aliases
            if (this._secrets['api_key']) {
                this._secrets.consumer_key = this._secrets.api_key;
                }
            if (this._secrets['access_token']) {
                this._secrets.oauth_token = this._secrets.access_token;
                }
            if (this._secrets['access_secret']) {
                this._secrets.oauth_secret = this._secrets.access_secret;
                }
            if (this._secrets['oauth_token_secret']) {
                this._secrets.oauth_secret = this._secrets.oauth_token_secret;
                }
            // Gauntlet
            if (this._secrets.consumer_key === undefined) {
                throw('Missing required consumer_key in OAuthSimple.signatures');
                }
            if (this._secrets.shared_secret === undefined) {
                throw('Missing required shared_secret in OAuthSimple.signatures');
                }
            if ((this._secrets.oauth_token !== undefined) && (this._secrets.oauth_secret === undefined)) {
                throw('Missing oauth_secret for supplied oauth_token in OAuthSimple.signatures');
                }
            return this;
        };

        self.setTokensAndSecrets = function(signatures) {
            return this.signatures(signatures);
        };

        /** set the signature method (currently only Plaintext or SHA-MAC1)
         *
         * @param method {string} Method of signing the transaction (only PLAINTEXT and SHA-MAC1 allowed for now)
         */
        self.setSignatureMethod = function(method) {
            if (method === undefined) {
                method = this._default_signature_method;
                }
            //TODO: accept things other than PlainText or SHA-MAC1
            if (method.toUpperCase().match(/(PLAINTEXT|HMAC-SHA1)/) === undefined) {
                throw ('Unknown signing method specified for OAuthSimple.setSignatureMethod');
                }
            this._parameters['oauth_signature_method']= method.toUpperCase();
            return this;
        };

        /** sign the request
         *
         * note: all arguments are optional, provided you've set them using the
         * other helper functions.
         *
         * @param args {object} hash of arguments for the call
         *                   {action:, path:, parameters:, method:, signatures:}
         *                   all arguments are optional.
         */
        self.sign = function (args) {
            if (args === undefined) {
                args = {};
                }
            // Set any given parameters
            if(args['action'] !== undefined) {
                this.setAction(args['action']);
                }
            if (args['path'] !== undefined) {
                this.setPath(args['path']);
                }
            if (args['method'] !== undefined) {
                this.setSignatureMethod(args['method']);
                }
            this.signatures(args['signatures']);
            this.setParameters(args['parameters']);
            // check the parameters
            var normParams = this._normalizedParameters();
            this._parameters['oauth_signature']=this._generateSignature(normParams);
            return {
                parameters: this._parameters,
                signature: this._oauthEscape(this._parameters['oauth_signature']),
                signed_url: this._path + '?' + this._normalizedParameters(),
                header: this.getHeaderString()
            };
        };

        /** Return a formatted "header" string
         *
         * NOTE: This doesn't set the "Authorization: " prefix, which is required.
         * I don't set it because various set header functions prefer different
         * ways to do that.
         *
         * @param args {object} see .sign
         */
        self.getHeaderString = function(args) {
            if (this._parameters['oauth_signature'] === undefined) {
                this.sign(args);
                }

            var j,pName,pLength,result = 'OAuth ';
            for (pName in this._parameters)
            {
                if (pName.match(/^oauth/) === undefined) {
                    continue;
                    }
                if ((this._parameters[pName]) instanceof Array)
                {
                    pLength = this._parameters[pName].length;
                    for (j=0;j<pLength;j++)
                    {
                        result += pName +'="'+this._oauthEscape(this._parameters[pName][j])+'" ';
                    }
                }
                else
                {
                    result += pName + '="'+this._oauthEscape(this._parameters[pName])+'" ';
                }
            }
            return result;
        };

        // Start Private Methods.

        /** convert the parameter string into a hash of objects.
         *
         */
        self._parseParameterString = function(paramString){
            var elements = paramString.split('&'),
                result={},
                element;
            for(element=elements.shift();element;element=elements.shift())
            {
                var keyToken=element.split('='),
                    value='';
                if (keyToken[1]) {
                    value=decodeURIComponent(keyToken[1]);
                    }
                if(result[keyToken[0]]){
                    if (!(result[keyToken[0]] instanceof Array))
                    {
                        result[keyToken[0]] = Array(result[keyToken[0]],value);
                    }
                    else
                    {
                        result[keyToken[0]].push(value);
                    }
                }
                else
                {
                    result[keyToken[0]]=value;
                }
            }
            return result;
        };

        self._oauthEscape = function(string) {
            if (string === undefined) {
                return "";
                }
            if (string instanceof Array)
            {
                throw('Array passed to _oauthEscape');
            }
            return encodeURIComponent(string).replace(/\!/g, "%21").
            replace(/\*/g, "%2A").
            replace(/'/g, "%27").
            replace(/\(/g, "%28").
            replace(/\)/g, "%29");
        };

        self._getNonce = function (length) {
            if (length === undefined) {
                length=5;
                }
            var result = "",
                i=0,
                rnum,
                cLength = this._nonce_chars.length;
            for (;i<length;i++) {
                rnum = Math.floor(Math.random()*cLength);
                result += this._nonce_chars.substring(rnum,rnum+1);
            }
            return this._parameters['oauth_nonce']=result;
        };

        self._getApiKey = function() {
            if (this._secrets.consumer_key === undefined) {
                throw('No consumer_key set for OAuthSimple.');
                }
            return this._parameters['oauth_consumer_key']=this._secrets.consumer_key;
        };

        self._getAccessToken = function() {
            if (this._secrets['oauth_secret'] === undefined) {
                return '';
                }
            if (this._secrets['oauth_token'] === undefined) {
                throw('No oauth_token (access_token) set for OAuthSimple.');
                }
            return this._parameters['oauth_token'] = this._secrets.oauth_token;
        };

        self._getTimestamp = function() {
            var ts = Math.floor((new Date()).getTime()/1000);
            return this._parameters['oauth_timestamp'] = ts;
        };

        self.b64_hmac_sha1 = function(k,d,_p,_z){
        // heavily optimized and compressed version of http://pajhome.org.uk/crypt/md5/sha1.js
        // _p = b64pad, _z = character size; not used here but I left them available just in case
        if(!_p){_p='=';}if(!_z){_z=8;}function _f(t,b,c,d){if(t<20){return(b&c)|((~b)&d);}if(t<40){return b^c^d;}if(t<60){return(b&c)|(b&d)|(c&d);}return b^c^d;}function _k(t){return(t<20)?1518500249:(t<40)?1859775393:(t<60)?-1894007588:-899497514;}function _s(x,y){var l=(x&0xFFFF)+(y&0xFFFF),m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xFFFF);}function _r(n,c){return(n<<c)|(n>>>(32-c));}function _c(x,l){x[l>>5]|=0x80<<(24-l%32);x[((l+64>>9)<<4)+15]=l;var w=[80],a=1732584193,b=-271733879,c=-1732584194,d=271733878,e=-1009589776;for(var i=0;i<x.length;i+=16){var o=a,p=b,q=c,r=d,s=e;for(var j=0;j<80;j++){if(j<16){w[j]=x[i+j];}else{w[j]=_r(w[j-3]^w[j-8]^w[j-14]^w[j-16],1);}var t=_s(_s(_r(a,5),_f(j,b,c,d)),_s(_s(e,w[j]),_k(j)));e=d;d=c;c=_r(b,30);b=a;a=t;}a=_s(a,o);b=_s(b,p);c=_s(c,q);d=_s(d,r);e=_s(e,s);}return[a,b,c,d,e];}function _b(s){var b=[],m=(1<<_z)-1;for(var i=0;i<s.length*_z;i+=_z){b[i>>5]|=(s.charCodeAt(i/8)&m)<<(32-_z-i%32);}return b;}function _h(k,d){var b=_b(k);if(b.length>16){b=_c(b,k.length*_z);}var p=[16],o=[16];for(var i=0;i<16;i++){p[i]=b[i]^0x36363636;o[i]=b[i]^0x5C5C5C5C;}var h=_c(p.concat(_b(d)),512+d.length*_z);return _c(o.concat(h),512+160);}function _n(b){var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",s='';for(var i=0;i<b.length*4;i+=3){var r=(((b[i>>2]>>8*(3-i%4))&0xFF)<<16)|(((b[i+1>>2]>>8*(3-(i+1)%4))&0xFF)<<8)|((b[i+2>>2]>>8*(3-(i+2)%4))&0xFF);for(var j=0;j<4;j++){if(i*8+j*6>b.length*32){s+=_p;}else{s+=t.charAt((r>>6*(3-j))&0x3F);}}}return s;}function _x(k,d){return _n(_h(k,d));}return _x(k,d);
        };


        self._normalizedParameters = function() {
            var elements = new Array(),
                paramNames = [],
                i=0,
                ra =0,
				pLen;
            for (var paramName in this._parameters)
            {
                if (ra++ > 1000) {
                    throw('runaway 1');
                    }
                paramNames.unshift(paramName);
            }
            paramNames = paramNames.sort();
            pLen = paramNames.length;
            for (;i<pLen; i++)
            {
                paramName=paramNames[i];
                //skip secrets.
                if (paramName.match(/\w+_secret/)) {
                    continue;
                    }
                if (this._parameters[paramName] instanceof Array)
                {
                    var sorted = this._parameters[paramName].sort(),
                        spLen = sorted.length,
                        j=0;
                    for (;j<spLen;j++){
                        if (ra++ > 1000) {
                            throw('runaway 1');
                            }
                        elements.push(this._oauthEscape(paramName) + '=' +
                                  this._oauthEscape(sorted[j]));
                    }
                    continue;
                }
                elements.push(this._oauthEscape(paramName) + '=' +
                              this._oauthEscape(this._parameters[paramName]));
            }
            return elements.join('&');
        };

        self._generateSignature = function() {

            var secretKey = this._oauthEscape(this._secrets.shared_secret)+'&'+
                this._oauthEscape(this._secrets.oauth_secret);
            if (this._parameters['oauth_signature_method'] == 'PLAINTEXT')
            {
                return secretKey;
            }
            if (this._parameters['oauth_signature_method'] == 'HMAC-SHA1')
            {
                var sigString = this._oauthEscape(this._action)+'&'+this._oauthEscape(this._path)+'&'+this._oauthEscape(this._normalizedParameters());
                return this.b64_hmac_sha1(secretKey,sigString);
            }
            return null;
        };

        self._merge = function(source,target) {
            if (source == undefined)
                source = {};
            if (target == undefined)
                target = {};
            for (var key in source) {
                target[key] = source[key];
            }
            return target;
        };

    return self;
    };
}
