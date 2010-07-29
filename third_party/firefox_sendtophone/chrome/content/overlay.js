var sendtophone = {
	baseUrl : '',
	req : null,

  onLoad: function()
	{
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
										.getService(Components.interfaces.nsIPrefService)
										.getBranch("extensions.sendtophone.") ;
		// Allow the people to use their own server if they prefer to not trust this server
		sendtophone.baseUrl = prefs.getCharPref( "appUrl" ) ;

		// Try to install the toolbar button, but only once
		if (!prefs.getBoolPref("installedButton"))
		{
			sendtophone.installToolbarButton();
			prefs.setBoolPref( "installedButton", true ) ;
		}
    sendtophone.strings = document.getElementById("sendtophone-strings");
  },

  onMenuItemCommand: function(e)
	{
		var info = sendtophone.getInfo();

		if (gContextMenu)
		{
			if (gContextMenu.onLink)
			{
				info.title = gContextMenu.linkText();
				info.url = gContextMenu.linkURL;
			}
			if (gContextMenu.onImage)
			{
				info.url =  gContextMenu.imageURL;
			}
		}

    if ((/https?:/i).test( info.url ))
		{
			var max_length = 256;
			if (info.selection.length > max_length)
				info.selection = info.selection.substring(0, max_length);

			this.sendToPhone(info.title, info.url, info.selection);
    }
		else
		{
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
																		.getService(Components.interfaces.nsIPromptService);
	    promptService.alert(window, this.strings.getString("SendToPhoneTitle"),
                                this.strings.getString("InvalidScheme"));
    }

  },

	popupNotification: function(title, text)
	{
		var image = "chrome://sendtophone/skin/icon.png";
		try {
			Components.classes['@mozilla.org/alerts-service;1']
								.getService(Components.interfaces.nsIAlertsService)
								.showAlertNotification(image, title, text, false, '', null)
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
    sendtophone.onMenuItemCommand(e);
  },

	getInfo: function() {
		var doc = gBrowser.contentDocument,
			win = doc.defaultView;
		return {
			"title": doc.title,
			"url": doc.location.href,
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
	},

	installToolbarButton: function()
	{
		try {
			 var firefoxnav = document.getElementById("nav-bar");
			 var curSet = firefoxnav.currentSet;
			 if (curSet.indexOf("sendtophone-toolbar-button") == -1)
			 {
				 var set;
				 // Place the button before the urlbar
				 if (curSet.indexOf("urlbar-container") != -1)
					 set = curSet.replace(/urlbar-container/, "urlbar-container,sendtophone-toolbar-button");
				 else  // at the end
					 set = curSet + ",sendtophone-toolbar-button";
				 firefoxnav.setAttribute("currentset", set);
				 firefoxnav.currentSet = set;
				 document.persist("nav-bar", "currentset");
				 // If you don't do the following call, funny things happen
				 try {
					 BrowserToolboxCustomizeDone(true);
				 }
				 catch (e) { }
			 }
		 }
		 catch(e) { }

	}
};

window.addEventListener("load", sendtophone.onLoad, false);
