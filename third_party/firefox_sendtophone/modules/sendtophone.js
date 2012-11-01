/*
    Copyright 2010 Alfonso Martínez de Lizarrondo & Patrick O'Reilly

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
"use strict";

// https://developer.mozilla.org/en/JavaScript_code_modules/Using_JavaScript_code_modules
var EXPORTED_SYMBOLS = ["sendtophoneCore"];

const Cc = Components.classes;
const Ci = Components.interfaces;

var sendtophoneCore = {
	req : null,
	apiVersion : 6,
	apkUrl : "http://code.google.com/p/chrometophone/wiki/AndroidApp",
	returnOAuthUrl : "https://code.google.com/p/chrometophone/logo",

	init: function()
	{
		this.strings = Cc["@mozilla.org/intl/stringbundle;1"]
						.getService(Ci.nsIStringBundleService)
						.createBundle("chrome://sendtophone/locale/overlay.properties");

		this.prefs = Cc["@mozilla.org/preferences-service;1"]
						.getService(Ci.nsIPrefService)
						.getBranch("extensions.sendtophone.") ;

		// Allow the people to use their own server if they prefer to not trust this server
		var baseUrl = this.prefs.getCharPref( "appUrl" ) ;

		this.deviceRegistrationId = this.prefs.getCharPref('deviceRegistrationId');
		if (!this.deviceRegistrationId) {
		  this.deviceRegistrationId = (Math.random() + '').substring(3);
		  this.prefs.setCharPref('deviceRegistrationId', this.deviceRegistrationId);
		}

		this.sendUrl = baseUrl + '/send';
		/* p2c */
//		this.registerUrl =  baseUrl + '/register?ver=' + this.apiVersion;

		if (typeof OAuthFactory == "undefined")
			Components.utils.import("resource://sendtophone/OAuth.js");

		var currentAccount = this.prefs.getCharPref('currentAccount');

		this.oauth = OAuthFactory.init({
			'request_url' : baseUrl + '/_ah/OAuthGetRequestToken',
			'authorize_url' : baseUrl + '/_ah/OAuthAuthorizeToken',
			'access_url' : baseUrl + '/_ah/OAuthGetAccessToken',
			'consumer_key' : 'anonymous',
			'consumer_secret' : 'anonymous',
			'scope' : baseUrl,
			'app_name' : 'Fox To Phone',
			'callback_page': this.returnOAuthUrl
		}, 'extensions.sendtophone.' + currentAccount + '.');
	},

	setCurrentAccount: function(account)
	{
		if (!this.prefs)
			this.init();

		this.prefs.setCharPref('currentAccount', account);
		this.oauth.setPreferencesBranch('extensions.sendtophone.' + account + '.');
	},

	getString: function(name)
	{
		return this.strings.GetStringFromName(name);
	},

	// Shows a message in a modal alert
	alert: function(text)
	{
		Cc["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Ci.nsIPromptService)
			.alert(null, this.getString("SendToPhoneTitle"), text);
	},

	// Shows a message in a growl-like notification
	popupNotification: function(text)
	{
		var title = this.getString("SendToPhoneTitle");
		var image = "chrome://sendtophone/skin/icon.png";
		try {
			// Avoid crash on Fedora 12.
			// Reported on 8th June https://addons.mozilla.org/en-US/firefox/reviews/display/161941
			var listener = {
				observe: function(subject, topic, data) {}
			};

			Cc['@mozilla.org/alerts-service;1']
					.getService(Ci.nsIAlertsService)
					.showAlertNotification(image, title, text, false, '', listener);
		} catch(e)
		{
			// prevents runtime error on platforms that don't implement nsIAlertsService
				var win = Cc['@mozilla.org/embedcomp/window-watcher;1']
										.getService(Ci.nsIWindowWatcher)
										.openWindow(null, 'chrome://global/content/alerts/alert.xul',
													'_blank', 'chrome,titlebar=no,popup=yes', null);
				win.arguments = [image, title, text, false, ''];
		}
	},

	// For use while debugging
	toConsole: function(text)
	{
		Cc["@mozilla.org/consoleservice;1"]
			.getService(Ci.nsIConsoleService)
			.logStringMessage( text );
	},

	processXHR: function(url, method, headers, data, callback, errorCallback)
	{
		var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
						.createInstance(Ci.nsIXMLHttpRequest);

		req.open(method, url, true);

		if (headers) {
			for (var header in headers) {
			  if (headers.hasOwnProperty(header)) {
				req.setRequestHeader(header, headers[header]);
			  }
			}
		}

		req.onreadystatechange = function()
		{
			// here this == req
			if (this.readyState == 4)
			{
				var body = req.responseText;
				if (req.status == 200)
				{
					// Check if the body is a html redirect
					var redirectMatch = body.match(/<meta http-equiv="refresh" content="\d;\s*url=(&#39;)?(.*)\1">/);
					if (redirectMatch)
					{
						var redirectUrl = redirectMatch[2].replace(/&amp;/g, '&');

						// Do the redirect and use the original callback
						sendtophoneCore.processXHR( redirectUrl, 'GET', null, null, callback);
					}
					else
						callback.call( sendtophoneCore, req );
				}
				else
				{
					if (errorCallback)
					{
						errorCallback.call( sendtophoneCore, req);
						return;
					}
					sendtophoneCore.alert(sendtophoneCore.getString("ErrorOnSend") + ' (status ' + req.status + ')\r\n' + body);
				}
			}
		};

		// To send correctly cookies.
		// Force the request to include cookies even though this chrome code
		// is seen as a third-party, so the server knows the user for which we are
		// requesting favorites (or anything else user-specific in the future).
		// This only works in Firefox 3.6; in Firefox 3.5 the request will instead
		// fail to send cookies if the user has disabled third-party cookies.
		try {
			req.channel.QueryInterface(Ci.nsIHttpChannelInternal).
				forceAllowThirdPartyCookie = true;
		}
		catch(ex) { /* user is using Firefox 3.5 */ }

		req.send( data );
	},

	// Main function
	// This is method that has to be called from outside this module
	// The other available method is sendFile
	send: function(title, url, selection)
	{
		if (!this.sendUrl)
			this.init();

		// Local files: upload them to a web server
		if ((/^file:/i).test(url))
		{
			var nsFile = Cc["@mozilla.org/network/io-service;1"]
				.getService(Ci.nsIIOService)
				.getProtocolHandler("file")
				.QueryInterface(Ci.nsIFileProtocolHandler)
				.getFileFromURLSpec(url);
			this.sendFile(nsFile);
			return;
		}

		if (!(/^(https?|market|tel|sms(to)?|mailto|ftp):/i).test( url ))
		{
			this.alert(this.getString("InvalidScheme"));
			return;
		}

		// Avoid USSD codes:
		if ((/^(tel|sms(to)?):.*[^\d\s\+].*/i).test( url ))
		{
			this.alert("Invalid telephone number");
			return;
		}

		var max_length = 1024;
		if (selection.length > max_length)
			selection = selection.substring(0, max_length);

		// Send the protocols that aren't currently whitelisted through a proxy server
		if (!(/^(https?):/i).test( url ))
		{
			// Rewrite the URI so it's send first to the proxy
			var proxyUrl;
			proxyUrl = this.prefs.getCharPref( "proxyUrl" );
			if (proxyUrl)
				url = proxyUrl + encodeURIComponent( url);
		}

		// Seems that the server fails with URLs larger than 990 bytes, so let's shorten it in those cases
		// http://code.google.com/p/chrometophone/issues/detail?id=315
		if (url.length>900) {
			var self = this;
			this.processXHR("https://www.googleapis.com/urlshortener/v1/url?key=AIzaSyDfmYwz1EevIW18Ifda3YeS9dVPhKsDUQo", "POST", {'Content-Type':'application/json'},
				JSON.stringify( {"longUrl": url} ), function(req) {
					var body = req.responseText,
						response = (body && body[0]=='{' && JSON.parse( body ) );
					// If OK then perform now the action
					if (response && response.kind == "urlshortener#url")
						self.send(title, response.id, selection);
					else
						this.alert( body );
				})

			return
		}

		var data = 'title=' + encodeURIComponent(title) +
				'&url=' + encodeURIComponent(url) + '&sel=' + encodeURIComponent(selection);

		if (!this.pendingMessage)
			this.pendingMessage = {title:title, url: url, selection: selection, retries: 3};
		else
		{
			this.pendingMessage.retries -= 1;
			if (this.pendingMessage.retries == 0)
			{
				delete this.pendingMessage;
				this.alert("Too many retries");
				return;
			}
		}

		if (!this.oauth.hasToken())
		{
			this.doLogin();
		}
		else
		{
			var msgType = (selection && selection.length > 0) ? 'selection' : 'page';

			var params = {
			  "title": title,
			  "url": url,
			  "sel": selection,
			  "type": msgType,
			  "deviceType":"ac2dm",
			  "debug": "1",
			  "token": sendtophoneCore.prefs.getCharPref('deviceRegistrationId')
			};

			// No longer passing device name - this may be customized
			var data = JSON.stringify(params);
			this.oauth.sendSignedRequest(this.sendUrl, this.processSentData, {
				'method': 'POST',
				'body': data,
				'headers': {
				  'X-Same-Domain': 'true',
				  'Content-Type': 'application/json'
				}
			  });
		}
	},

	// Detect if the user is logged in
	isLoggedIn: function()
	{
		if (!this.oauth)
			this.init();

		return (this.oauth.hasToken());
	},

	doLogin: function()
	{
		this.popupNotification( this.getString("LoginRequired") );
		//Open Google login page and close tab when done
		this.oauth.initOAuthFlow( function(token, secret, error) {
			var self = sendtophoneCore;
			if (error)
			{
				// Try to guess if the domain might be blocked. Not bulletprof, but friendlier that stating anything about "request token"
				if (error == "Fetching request token failed. Status 0")
				{
					var url = self.prefs.getCharPref( "appUrl" );
					// The expected response isn't hardcoded here as we don't know what are the plans.
					self.processXHR( url, "GET", null, "",
						function(req) {
							// Don't really know why the login failed.
							self.alert( error );
						},
						function(req) {
							if ( req.status == 0)
								self.alert("Unable to connect with " + url + "\r\nCheck that it isn't blocked with a firewall");
							else
								self.alert( error );
						});
				}
				else
					self.alert(error);

				return;
			}
			self.loginSuccessful();
			} );
	},

	processSentData : function(body, req)
	{
		var self = sendtophoneCore;

		if (req.status==500 && body.substr(0,27) =="ERROR (Unable to send link)"){
			sendtophoneCore.openTab( "http://www.foxtophone.com/help/error-500/" );
			return;
		}
		if (req.status != 200) {
			self.alert(sendtophoneCore.getString("ErrorOnSend") + ' (status ' + req.status + ')\r\n' + body);
			return;
		}

		if (body.substring(0, 2) == 'OK')
		{
			delete self.pendingMessage;
			self.popupNotification(self.getString("InfoSent"));
			return;
		}

		if (body.indexOf('LOGIN_REQUIRED') == 0)
		{
			self.doLogin();
			return;
		}
		if (body.indexOf('DEVICE_NOT_REGISTERED') == 0)
		{
			self.popupNotification(self.getString("DeviceNotRegistered"));

			// Open tab with apk download
			self.openTab(self.apkUrl);
			return;
		}

		self.alert(self.getString("ErrorOnSend") + '\r\n' + body);
	},

	logout: function()
	{
		if (!this.prefs)
			this.init();

		this.oauth.clearTokens();
		this.logoutSuccessful()
	},

	openTab: function(url, successUrl, callback)
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
			//Add listener for callback URL
			c2pTab.addEventListener("load", function () {
				if(successUrl==c2pTab.currentURI.spec){
					callback();

					// Close tab
					gBrowser.removeTab(tab);
					// ReFocus on tab being sent
					gBrowser.selectedTab = gBrowser.tabContainer.childNodes[lastTabIndex];
				}
			}, true);
		}
	},

	logoutSuccessful: function()
	{
		this.popupNotification(this.getString("LogoutSuccessful"));
	},

	loginSuccessful: function()
	{
		this.popupNotification( this.getString("LoginSuccessful") );

		// Send pending message
		this.send(this.pendingMessage.title, this.pendingMessage.url, this.pendingMessage.selection);
	},

	toUTF8: function(str)
	{
		var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Ci.nsIScriptableUnicodeConverter);
		converter.charset = "utf-8";
		var data = converter.ConvertFromUnicode(str);
		return data + converter.Finish();
	},

	sendFile: function( nsFile, callback )
	{
		if (!this.prefs)
			this.init();

		let uri = this.prefs.getCharPref( "fileServerUrl" );
		if (!uri)
		{
			this.alert( this.getString("FileUploadsDisabled") );
			return;
		}

		if (typeof sendtophoneUploadsManager == "undefined")
			Components.utils.import("resource://sendtophone/uploadsManager.js");

		if (nsFile.isDirectory())
		{
			// There's no progress notification while compressing, only on end.
			let progressId = sendtophoneUploadsManager.addZip(nsFile);
			// Compress the contents to a zip file
			zipFolder(nsFile, function(nsZip)
				{
					sendtophoneUploadsManager.finishedUpload( progressId );

					// Send the zip and delete it afterwards
					sendtophoneCore.sendFile(nsZip, function() { nsZip.remove(false); if (callback) callback(); } );
				}
			);
			return;
		}

		if (!nsFile.isFile())
		{
			this.alert(this.getString("InvalidFile"));
			return;
		}

		this.sendFileXHR( nsFile, callback, uri, 'upload', function(target, uploadName)
		{
			var body = target.responseXML,
				uploads;

			// FoxToPhone custom script
			if (body && (uploads = body.documentElement.getElementsByTagName("upload")) && uploads[0])
			{
				var url = uploads[0].firstChild.data;
				sendtophoneCore.send(uploadName, url, "");
				return;
			}

			// error.
			sendtophoneCore.alert(uri + "\r\n" + event.target.responseText);
		});
	},

	sendFileXHR: function( nsFile, callback, uri, formElementName, onSuccess )
	{
		let size = Math.round(nsFile.fileSize / 1024);
		let maxSize = this.prefs.getIntPref( "fileUploadMaxKb" );
		if (maxSize>0 && size>maxSize)
		{
			this.alert( this.getString("FileTooBig") );
			return;
		}

		let uploadName = nsFile.leafName;

		var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Ci.nsIXMLHttpRequest);

		// Show the progress of uploads
		sendtophoneUploadsManager.addUpload(nsFile, req);

		req.open('POST', uri, true);

		req.addEventListener("load", function(event)
		{
			// If there's a callback (to delete temporary files) we call it now
			if (callback)
				callback();

			onSuccess(event.target, uploadName);
		}, false);

		// Handle errors or aborted uploads
		req.addEventListener("error", function(evt)
		{
			sendtophoneCore.alert("Error while sending the file to the server:\r\n" + uri);

			// If there's a callback (to delete temporary files) we call it now
			if (callback)
				callback();
		}, false);

		req.addEventListener("abort", function(evt)
		{
			// Silent.

			// If there's a callback (to delete temporary files) we call it now
			if (callback)
				callback();
		}, false);

		// Enable cookies
		try {
		  req.channel.QueryInterface(Ci.nsIHttpChannelInternal).
			forceAllowThirdPartyCookie = true;
		}
		catch(ex) {}

		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
								.getService(Components.interfaces.nsIXULAppInfo);
		var majorVersion = /(\d+)\./.exec( appInfo.platformVersion )[1];

		if (majorVersion>=8)
		{
		this.toConsole("using formData")

			var formData = Components.classes["@mozilla.org/files/formdata;1"]
					.createInstance(Components.interfaces.nsIDOMFormData);

			var file = new File( nsFile );

			formData.append( formElementName, file );
			req.send( formData );
		}
		else
		{
			// Try to determine the MIME type of the file
			var mimeType = "text/plain";
			try {
				var mimeService = Cc["@mozilla.org/mime;1"]
					.getService(Ci.nsIMIMEService);
				mimeType = mimeService.getTypeFromFile(nsFile); // nsFile is an nsIFile instance
			}
			catch(e) { /* eat it; just use text/plain */ }

			// Buffer the upload file
			var inStream = Cc["@mozilla.org/network/file-input-stream;1"]
				.createInstance(Ci.nsIFileInputStream);
			inStream.init(nsFile, 1, 1, inStream.CLOSE_ON_EOF);
			var bufInStream = Cc["@mozilla.org/network/buffered-input-stream;1"]
				.createInstance(Ci.nsIBufferedInputStream);
			bufInStream.init(inStream, 4096);

			//Setup the boundary start stream
			var boundary = "--SendToPhone-------------" + Math.random().toString(16).substr(2);
			var startBoundryStream = Cc["@mozilla.org/io/string-input-stream;1"]
				.createInstance(Ci.nsIStringInputStream);
			startBoundryStream.setData("--"+boundary+"\r\n",-1);

			// Setup the boundary end stream
			var endBoundryStream = Cc["@mozilla.org/io/string-input-stream;1"]
					.createInstance(Ci.nsIStringInputStream);
			endBoundryStream.setData("\r\n\r\n--"+boundary+"--\r\n",-1);

			// Setup the mime-stream - the 'part' of a multi-part mime type
			var mimeStream = Cc["@mozilla.org/network/mime-input-stream;1"].createInstance(Ci.nsIMIMEInputStream);
			mimeStream.addContentLength = false;
			mimeStream.addHeader("Content-disposition",'form-data; charset: utf-8; name="' + formElementName + '"; filename="' + this.toUTF8(uploadName) + '"');
			mimeStream.addHeader("Content-type", mimeType);
			mimeStream.setData(bufInStream);

			// Setup a multiplex stream
			var multiStream = Cc["@mozilla.org/io/multiplex-input-stream;1"]
				.createInstance(Ci.nsIMultiplexInputStream);
			multiStream.appendStream(startBoundryStream);
			multiStream.appendStream(mimeStream);
			multiStream.appendStream(endBoundryStream);

			req.setRequestHeader("Content-length",multiStream.available());
			req.setRequestHeader("Content-type","multipart/form-data; boundary="+boundary);

			req.send(multiStream);
		}

	}
};

/* Zipping functions */
const PR_RDONLY      = 0x01;
const PR_WRONLY      = 0x02;
const PR_RDWR        = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND      = 0x10;
const PR_TRUNCATE    = 0x20;
const PR_SYNC        = 0x40;
const PR_EXCL        = 0x80;

/**
* folder is a nsFile pointing to a folder
* callback is a function that it's called after the zip is created. It has one parameter: the nsFile created
*/
function zipFolder(folder, callback)
{
	// get TMP directory
	var nsFile = Cc["@mozilla.org/file/directory_service;1"].
			getService(Ci.nsIProperties).
			get("TmpD", Ci.nsIFile);

	// Create a new file
	nsFile.append( folder.leafName  + ".zip");
	nsFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 438); // 438 (decimal) = 0666 (octal)

	var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
	var zipW = new zipWriter();

	zipW.open(nsFile, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);

	addFolderContentsToZip(zipW, folder, "");

	// We don't want to block the main thread, so the zipping is done asynchronously
	// and here we get the notification that it has finished
	var observer = {
		onStartRequest: function(request, context) {},
		onStopRequest: function(request, context, status)
		{
			zipW.close();
			// Notify that we're done. Now it must be sent and deleted afterwards
			callback(nsFile);
		}
	};

	zipW.processQueue(observer, null);
}

/**
* function to add the contents of a folder recursively
* zipW a nsIZipWriter object
* folder a nsFile object pointing to a folder
* root a string defining the relative path for this folder in the zip
*/
function addFolderContentsToZip(zipW, folder, root)
{
	var entries = folder.directoryEntries;
	while(entries.hasMoreElements())
	{
		var entry = entries.getNext();
		entry.QueryInterface(Ci.nsIFile);
		zipW.addEntryFile(root + entry.leafName, Ci.nsIZipWriter.COMPRESSION_DEFAULT, entry, true);
		if (entry.isDirectory())
			addFolderContentsToZip(zipW, entry, root + entry.leafName + "/");
	}
}
