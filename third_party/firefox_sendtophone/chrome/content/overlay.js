var sendtophone = {
	baseUrl : '',
	req : null,
	apiVersion : 3,
	loggedInUrl : "http://code.google.com/p/chrometophone/logo?login",
	loggedOutUrl : "http://code.google.com/p/chrometophone/logo?logout",
	apkUrl : "http://code.google.com/p/chrometophone/downloads/detail?name=chrometophone-android-v1.1.apk",

	init: function()
	{
		// Each app will implement its specific initialization
	},

	onLoad: function()
	{
		var me = sendtophone;

 		me.strings = document.getElementById("sendtophone-strings");

		me.prefs = Components.classes["@mozilla.org/preferences-service;1"]
										.getService(Components.interfaces.nsIPrefService)
										.getBranch("extensions.sendtophone.") ;
		// Allow the people to use their own server if they prefer to not trust this server
		me.baseUrl = me.prefs.getCharPref( "appUrl" ) ;

		me.sendUrl = me.baseUrl + '/send?ver=' + me.apiVersion;
		me.logInUrl = me.baseUrl + '/signin?ver=' + me.apiVersion + '&extret=' + encodeURIComponent(me.loggedInUrl);
		me.logOutUrl = me.baseUrl + '/signout?ver=' + me.apiVersion + '&extret=' + encodeURIComponent(me.loggedOutUrl);

		me.init();
  },

  onMenuItemCommand: function(e, type)
	{
		var title, url, selection;
		switch(type)
		{
			case 'link':
				title = gContextMenu.linkText();
				url = gContextMenu.linkURL;
				selection = '';
				break;
			case 'image':
				title = gContextMenu.target.title || gContextMenu.target.alt;
				url = gContextMenu.imageURL;
				selection = '';
				break;
			case 'text':
				title = "Selection";
				url = 'http://www.google.com/';
				selection = content.getSelection().toString();
				break;
			case 'page':
			default:
				var info = sendtophone.getInfo();
				title = info.title;
				url = info.url;
				selection = info.selection;
				break;
		}
/*
    if ((/https?:/i).test( info.url ))
		{
*/
			var max_length = 1024;
			if (selection.length > max_length)
				selection = selection.substring(0, max_length);

			this.sendToPhone(title, url, selection);
/*
    }
		else
		{
			this.alert(this.strings.getString("InvalidScheme"));
    }
*/
  },

	// Shows a message in a modal alert
	alert: function(text)
	{
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
																		.getService(Components.interfaces.nsIPromptService);
	    promptService.alert(window, this.strings.getString("SendToPhoneTitle"),
                                text);
	},

	// Shows a message in a growl-like notification
	popupNotification: function(text)
	{
		var title = this.strings.getString("SendToPhoneTitle");
		var image = "chrome://sendtophone/skin/icon.png";
		try {
			// Avoid crash on Fedora 12.
			// Reported on 8th June https://addons.mozilla.org/en-US/firefox/reviews/display/161941
			var listener = {
				observe: function(subject, topic, data) {}
			};

			Components.classes['@mozilla.org/alerts-service;1']
								.getService(Components.interfaces.nsIAlertsService)
								.showAlertNotification(image, title, text, false, '', listener);
		} catch(e)
		{
			// prevents runtime error on platforms that don't implement nsIAlertsService
				var win = Components.classes['@mozilla.org/embedcomp/window-watcher;1']
														.getService(Components.interfaces.nsIWindowWatcher)
														.openWindow(null, 'chrome://global/content/alerts/alert.xul',
																				'_blank', 'chrome,titlebar=no,popup=yes', null);
				win.arguments = [image, title, text, false, ''];
		}
	},

  onToolbarButtonCommand: function(e) {
    // just reuse the function above.
    sendtophone.onMenuItemCommand(e, 'page');
  },

	getInfo: function() {
		var doc = gBrowser.contentDocument,
			win = doc.defaultView;
		var href = doc.location.href;
		// Is it the Google Maps page?
		if (/https?:\/\/maps\.google\..{2,3}\//.test(href))
		{
			// Then try to send the current view:
			var link = doc.getElementById('link');
			if (link && link.href)
				href = link.href;
		}
		return {
			"title": doc.title,
			"url": href,
			"selection": win.getSelection().toString()
		};
	},

	processXHR: function(url, method, data, callback)
	{
		if (!this.req)
			this.req = new XMLHttpRequest();

		var req = this.req;

		req.open(method, url, true);
	  req.setRequestHeader('X-Extension', 'true');  // XSRF protector

	  if (method=='POST')
		  req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

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
						if (redirectUrl == sendtophone.loggedOutUrl)
						{
							sendtophone.logoutSuccessful();
							return;
						}
						// Do the redirect and use the original callback
						sendtophone.processXHR( redirectUrl, 'GET', null, callback);
					}
					else
						callback.call( sendtophone, req );
				}
				else
				{
					sendtophone.alert(sendtophone.strings.getString("ErrorOnSend") + ' (status ' + req.status + ')\r\n' + body);
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

	sendToPhone: function(title, url, selection)
	{
		var data = 'title=' + encodeURIComponent(title) +
				'&url=' + encodeURIComponent(url) + '&sel=' + encodeURIComponent(selection);

		this.pendingMessage = data;
		this.processXHR(this.sendUrl, 'POST', data, this.processSentData);
	},

	processSentData : function(req)
	{
		var body = req.responseText;

		if (body.substring(0, 2) == 'OK')
		{
			delete this.pendingMessage;
			this.popupNotification(this.strings.getString("InfoSent"));
			return;
		}
		if (body.indexOf('LOGIN_REQUIRED') == 0)
		{
			var me = sendtophone;
			me.popupNotification( me.strings.getString("LoginRequired") );
			var lastTab = gBrowser.tabContainer.selectedIndex;
			var tab = gBrowser.addTab(me.baseUrl + '/signin?ver=' + me.apiVersion + '&extret=' +  encodeURIComponent(me.loggedInUrl));
			//Open Google login page
			gBrowser.selectedTab = tab;
			var c2pTab = gBrowser.getBrowserForTab(tab);
			//Add listener for callback URL
			c2pTab.addEventListener("load", function () {
				if(sendtophone.loggedInUrl==c2pTab.currentURI.spec){
					//Resend URL from that Tab
					sendtophone.loginSuccessful();
					//Close Google login
					gBrowser.removeCurrentTab();
					//ReFocus on tab being sent
					gBrowser.selectedTab = gBrowser.tabContainer.childNodes[lastTab];
				}
			}, true);
			return;
		}
		if (body.indexOf('DEVICE_NOT_REGISTERED') == 0)
		{
			this.popupNotification(this.strings.getString("DeviceNotRegistered"));

			var tab = gBrowser.addTab( this.apkUrl );
			gBrowser.selectedTab = tab;
			return;
		}

		this.alert(this.strings.getString("ErrorOnSend") + '\r\n' + body);
	},

	initPopup: function()
	{
		// returning true will make the popup show
		return true;
	},

	logout: function()
	{
		var lastTab = gBrowser.tabContainer.selectedIndex;
		var tab = gBrowser.addTab(this.logOutUrl);
		// Open Google logout page
		gBrowser.selectedTab = tab;
		var c2pTab = gBrowser.getBrowserForTab(tab);
		//Add listener for callback URL
		c2pTab.addEventListener("load", function () {
			if(sendtophone.loggedOutUrl==c2pTab.currentURI.spec){
				sendtophone.logoutSuccessful();

				// Close logout tab
				gBrowser.removeCurrentTab();
				// ReFocus on tab being sent
				gBrowser.selectedTab = gBrowser.tabContainer.childNodes[lastTab];
			}
		}, true);

/*
		// This doesn't work if third party cookies are bloqued. Why???
		this.processXHR(this.logOutUrl, 'GET', null, function(req)
			{
				// This will be called only if there's a problem
				this.alert(this.strings.getString("LogoutError") + '\r\n' + req.responseText );
			});
			*/
	},

	logoutSuccessful: function()
	{
		this.popupNotification(this.strings.getString("LogoutSuccessful"));
	},


	loginSuccessful: function()
	{
		this.popupNotification( this.strings.getString("LoginSuccessful") );

		// Send pending message
		this.processXHR(this.sendUrl, 'POST', this.pendingMessage, this.processSentData);
	}
};

window.addEventListener("load", sendtophone.onLoad, false);
