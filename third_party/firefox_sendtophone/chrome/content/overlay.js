var sendtophone = {
	baseUrl : '',
	req : null,
	apiVersion : 3,
	loggedInUrl : "chrome://sendtophone/loggedIn",
	loggedOutUrl : "chrome://sendtophone/loggedOut",
	apkUrl : "http://code.google.com/p/chrometophone/downloads/detail?name=chrometophone-android.apk&can=2",

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
						if (redirectUrl == sendtophone.loggedInUrl)
						{
							sendtophone.loginSuccessful();
							return;
						}
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
			this.openLoginWindow();
			return;
/*
			this.popupNotification(this.strings.getString("LoginRequired") );

			var tab = gBrowser.addTab( this.logInUrl );
			gBrowser.selectedTab = tab;
			var c2pTab = gBrowser.getBrowserForTab(tab);
			c2pTab.addEventListener("load", function () {
				if(this.magicUrl==c2pTab.currentURI.spec){
					c2pTab.contentDocument.location = "data:text/html;base64,PGh0bWw+PGhlYWQ+PHRpdGxlPlNlbmQgdG8gUGhvbmUgRXh0ZW5zaW9uPC90aXRsZT48c3R5bGUgdHlwZT0idGV4dC9jc3MiPg0KYm9keSB7bWluLXdpZHRoOiAzMjBweDtvdmVyZmxvdy14OiBoaWRkZW47Zm9udC1mYW1pbHk6IHZlcmRhbmE7Zm9udC1zaXplOiAxMnB4O2NvbG9yOiBibGFjazsgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7fTwvc3R5bGU+PC9oZWFkPjxib2R5PjxoMT48aW1nIHNyYz0iaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9tZXRvcGhvbmUvbG9nbz9jY3Q9MTI3NTk0MTQ2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiB2YWxpZ249ImJvdHRvbSI+U2VuZCB0byBQaG9uZSBFeHRlbnNpb248L2gxPjxoMj5TaWduZWQgSW48L2gyPjxwPkNvbmdyYXR1bGF0aW9ucy4gWW91IGFyZSBub3cgc2lnbmVkIGluIHRvIFNlbmQgdG8gUGhvbmUuPC9wPjxwPlBsZWFzZSBjbG9zZSB0aGlzIHRhYiwgdGhlbiBhdHRlbXB0IHRvIHNlbmQgeW91ciBtYWlsIGFnYWluLjwvcD48ZGl2IGFsaWduPSJjZW50ZXIiPjxicj4mY29weTsyMDEwIC0gPGEgaHJlZj0iaHR0cHM6Ly9hZGRvbnMubW96aWxsYS5vcmcvZW4tVVMvZmlyZWZveC9hZGRvbi8xNjE5NDEvIj5BYm91dCBTZW5kIHRvIFBob25lPC9hPjwvZGl2PjwvYm9keT48L2h0bWw+";
				}
			}, true);
			return;
*/
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
		this.processXHR(this.logOutUrl, 'GET', null, function(req)
			{
				// This will be called only if there's a problem
				this.alert(this.strings.getString("LogoutError") + '\r\n' + req.responseText );
			});
	},

	logoutSuccessful: function()
	{
		this.popupNotification(this.strings.getString("LogoutSuccessful"));
	},
/**
 * Opens the login window and stores a reference to it
 *
 */
	openLoginWindow: function() {
    this.login_window = window.openDialog("chrome://sendtophone/content/login.xul", "_blank", "chrome,resizable=no,dependent=yes");
	},

/**
 * Called by the login window
 *
 * @param aUserName - the username
 * @param aPassword - the password
 */
	initLogin: function(aUserName, aPassword)
	{
		this.user_name = aUserName;
		this.password = aPassword;

		this.login_window.setStatus(1);
		this.startLoginProcess();
	},

	startLoginProcess: function()
	{
		this.processXHR(this.logInUrl, 'GET', null, this.processLoginStart);
	},

	processLoginStart: function(req)
	{
		var body = this.HTMLParser(req.responseText);
		var form = body.getElementsByTagName('form')[0];
		if (form && form.id=='gaia_loginform')
		{
			var query='';
			var items = form.elements;
			for (var i=0; i<items.length; i++)
			{
				var value='';
				var input=items[i];
				if (input.type=='hidden')
					value=input.value;
				else
				{
					switch (input.name)
					{
						case 'Email':
							value = this.user_name;
							break;
						case 'Passwd':
							value = this.password;
							break;
						case 'PersistentCookie':
//								if (persistent)
								value = input.value;
							break;
						case 'signIn':
							value = input.value;
							break;
						default:
							value = input.value;
							break;
					}
				}
				query += '&' + input.name + '=' + encodeURIComponent(value);
			}

			this.processXHR(form.action, 'POST', query, function(req)
				{
					// This will be called if the login fails
					// Different status? 3 vs 4
					this.login_window.setStatus(4);
				});
			return;
		}

		this.alert(this.strings.getString("ErrorOnSend") + '\r\n' + req.responseText );
	},

	loginSuccessful: function()
	{
//		this.popupNotification( this.strings.getString("LoggingStatusLoggedIn") );

		// Save user and close login window
		this.login_window.setStatus(2);

		this.login_window.close();
		delete this.login_window;

		// Send pending message
		this.processXHR(this.sendUrl, 'POST', this.pendingMessage, this.processSentData);
	},

	// https://developer.mozilla.org/en/Code_snippets/HTML_to_DOM#Safely_parsing_simple_HTML.c2.a0to_DOM
	HTMLParser: function(aHTMLString){
		var html = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html", null),
			body = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
		html.documentElement.appendChild(body);

		body.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
			.getService(Components.interfaces.nsIScriptableUnescapeHTML)
			.parseFragment(aHTMLString, false, null, body));

		return body;
	}
};

window.addEventListener("load", sendtophone.onLoad, false);
