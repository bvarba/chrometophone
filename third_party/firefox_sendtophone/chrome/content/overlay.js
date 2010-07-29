var sendtophone = {
	baseUrl : '',
	req : null,

	init: function( prefs )
	{
		// Each app will implement its specific initialization
	},

  onLoad: function()
	{
    sendtophone.strings = document.getElementById("sendtophone-strings");

		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
										.getService(Components.interfaces.nsIPrefService)
										.getBranch("extensions.sendtophone.") ;
		// Allow the people to use their own server if they prefer to not trust this server
		sendtophone.baseUrl = prefs.getCharPref( "appUrl" ) ;

		sendtophone.init( prefs );
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
			var max_length = 256;
			if (selection.length > max_length)
				selection = selection.substring(0, max_length);

			this.sendToPhone(title, url, selection);
/*
    }
		else
		{
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
																		.getService(Components.interfaces.nsIPromptService);
	    promptService.alert(window, this.strings.getString("SendToPhoneTitle"),
                                this.strings.getString("InvalidScheme"));
    }
*/
  },

	popupNotification: function(title, text)
	{
		var image = "chrome://sendtophone/skin/icon.png";
		try {
			Components.classes['@mozilla.org/alerts-service;1']
								.getService(Components.interfaces.nsIAlertsService)
								.showAlertNotification(image, title, text, false, '', null);
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

	sendToPhone: function(title, url, selection)
	{
		if (!this.req)
			this.req = new XMLHttpRequest();

		var req = this.req;

		var sendUrl = this.baseUrl + '?title=' + encodeURIComponent(title) +
				'&url=' + encodeURIComponent(url) + '&sel=' + encodeURIComponent(selection);
		req.open('GET', sendUrl, true);
	  req.setRequestHeader('X-Extension', 'true');  // XSRF protector

		req.onreadystatechange = function()
		{
			var me = sendtophone;
			if (this.readyState == 4) {
				if (req.status == 200) {
					if (req.responseText.substring(0, 2) == 'OK') {
						me.popupNotification(me.strings.getString("SendToPhoneTitle"), me.strings.getString("InfoSent"));
					} else {  // most likely login, handle in new tab
						me.popupNotification(me.strings.getString("SendToPhoneTitle"),
							me.strings.getString("LoginRequired") );

						var tab = gBrowser.addTab(sendUrl);
						gBrowser.selectedTab = tab;
					}
				} else {
					me.popupNotification(me.strings.getString("SendToPhoneTitle"),
						me.strings.getString("ErrorOnSend") + '\r\n' + req.responseText);
				}
			}
		};

		req.send(null);
	}

};

window.addEventListener("load", sendtophone.onLoad, false);
