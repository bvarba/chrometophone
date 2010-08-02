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


// Core functions
Components.utils.import("resource://sendtophone/sendtophone.js");
// Protocol handlers
Components.utils.import("resource://sendtophone/protocolHandlers.js");

var sendtophone = {

	init: function()
	{
		// Each app will implement its specific initialization
	},

	onLoad: function()
	{
		var me = sendtophone;

 		me.strings = document.getElementById("sendtophone-strings");

		me.prefs = Components.classes["@mozilla.org/preferences-service;1"]
										.getService(Ci.nsIPrefService)
										.getBranch("extensions.sendtophone.") ;

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
				if (gContextMenu.onTextInput)
				{
					var input = gContextMenu.target;
					selection = input.value.substring(input.selectionStart, input.selectionEnd);
				}
				else
					selection = content.getSelection().toString();
				break;
			case 'page':
			default:
				var info = this.getInfo();
				title = info.title;
				url = info.url;
				selection = info.selection;
				break;
		}

		if ((/^(https?|market|tel|sms|ftp):/i).test( url ))
		{
			var max_length = 1024;
			if (selection.length > max_length)
				selection = selection.substring(0, max_length);

			sendtophoneCore.send(title, url, selection);
		}
		else
		{
			this.alert(this.strings.getString("InvalidScheme"));
		}

	},

	// Shows a message in a modal alert
	alert: function(text)
	{
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
							.getService(Ci.nsIPromptService);
		promptService.alert(window, this.strings.getString("SendToPhoneTitle"),
			text);
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

		if (this.isMapsURL(href))
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

	isMapsURL: function(url)
	{
		return url.match("http://maps\\.google\\.[a-z]{2,3}(\\.[a-z]{2})?[/?].*") ||	url.match("http://www\\.google\\.[a-z]{2,3}(\\.[a-z]{2})?/maps.*");
	},

	initPopup: function()
	{
		// returning true will make the popup show
		return true;
	},

	logout: function()
	{
		sendtophoneCore.logout();
	}

};

window.addEventListener("load", sendtophone.onLoad, false);
