"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;

let foxToPhonePreferences =
{
	load: function()
	{
		let fileServerUrl = document.getElementById("extensions.sendtophone.fileServerUrl").value;

		let fileserverMenuList = document.getElementById("extensionsSendToPhoneFileServer") ;

		// Remove old setting as it's no longer working
		if ( fileServerUrl == "http://min.us" )
		{
			document.getElementById("extensions.sendtophone.fileServerUrl").value = "";
			fileServerUrl = "";
		}

		switch (fileServerUrl)
		{
			case '':
				fileserverMenuList.value = fileServerUrl;
				break;

			default:
				fileserverMenuList.value = 'Custom';
				break;
		}

		fileserverMenuList.addEventListener("command", function () {
				let fileServer = fileserverMenuList.value;
				switch (fileServer)
				{
					case '':
						document.getElementById("extensions.sendtophone.fileServerUrl").value = '';
						break;

					case 'Custom':
						break;

					default:
						document.getElementById("extensions.sendtophone.fileServerUrl").value = fileServer;
						break;
				}

				document.getElementById("hboxFileServerUrl").hidden = ( fileServer != 'Custom');

				window.sizeToContent();
			}, false);

		document.getElementById("hboxFileServerUrl").hidden = ( fileserverMenuList.value != 'Custom');

		// Accounts
		var accountsList = document.getElementById("accountsList");

		// Clear all the items
		while (accountsList.getRowCount() >0)
			accountsList.removeItemAt(0);

		this.prefs = Cc["@mozilla.org/preferences-service;1"]
						.getService(Ci.nsIPrefService)
						.getBranch("extensions.sendtophone.") ;

		var accounts = this.prefs.getCharPref("accounts").split(";");

		for (var i=0; i<accounts.length ; i++)
		{
			var account = accounts[i];
			var title = this.prefs.getCharPref( account + ".title" );
			accountsList.appendItem( title, account );
		}

		window.sizeToContent();
	},

	getString: function(name)
	{
		if (!this.strings)
		{
			this.strings = Cc["@mozilla.org/intl/stringbundle;1"]
						.getService(Ci.nsIStringBundleService)
						.createBundle("chrome://sendtophone/locale/overlay.properties");
		}

		return this.strings.GetStringFromName(name);
	},

	onAccountSelected: function() {
		var accountsList = document.getElementById("accountsList"),
			count = accountsList.selectedCount;

		document.getElementById("btnRenameAccount").disabled = (count === 0);
		document.getElementById("btnRemoveAccount").disabled = ((count === 0) || (accountsList.getRowCount()==1));
	},

	addAccount: function() {
		var n=1,
			accounts = this.prefs.getCharPref("accounts"),
			accountsArray = accounts.split(";");

		while (accountsArray.indexOf("account" + n)>=0)
			n++;

		var input = {value:"Phone " + n};
		if (Cc["@mozilla.org/embedcomp/prompt-service;1"]
						.getService(Ci.nsIPromptService)
						.prompt( null, this.getString("SendToPhoneTitle"), this.getString("PhoneAccountPromptAdd"), input, null, {value: false}))
		{

			var account = "account" + n;
			this.prefs.setCharPref( account + ".title", input.value);
			this.prefs.setCharPref( "accounts", accounts + ";" + account );

			document.getElementById("accountsList").appendItem( input.value, account );

		}
	},

	renameAccount: function() {
		var accountsList = document.getElementById("accountsList");
		for (var i= accountsList.selectedItems.length-1; i>=0; i--)
		{
			var item = accountsList.selectedItems[i],
				input = {value:item.label},
				ok = Cc["@mozilla.org/embedcomp/prompt-service;1"]
						.getService(Ci.nsIPromptService)
						.prompt( null, this.getString("SendToPhoneTitle"), this.getString("PhoneAccountPromptRename"), input, null, {value: false});

			if (!ok)
				return;

			item.label = input.value;
			this.prefs.setCharPref( item.value + ".title", input.value);
		}

	},

	removeAccount: function() {
		var accountsList = document.getElementById("accountsList"),
			removedAccount = "",
			accounts = [],
			i;
		for (i = accountsList.selectedItems.length-1; i>=0; i--)
		{
			var item = accountsList.selectedItems[i],
				title = item.label;
			if (!Cc["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Ci.nsIPromptService)
				.confirm( null, this.getString("SendToPhoneTitle"), this.getString("PhoneAccountPromptRemove") + "\r\n" + title))
				return;

			removedAccount = item.value;
			accountsList.removeItemAt( accountsList.getIndexOfItem( item ) );
			this.prefs.deleteBranch( removedAccount );
		}
		for(i=0; i<accountsList.itemCount; i++)
		{
			var item = accountsList.getItemAtIndex( i );
			accounts.push( item.value );
		}
		this.prefs.setCharPref( "accounts", accounts.join(";"));
		if (this.prefs.getCharPref("currentAccount")==removedAccount)
		{
			if (typeof sendtophoneCore == "undefined")
				Components.utils.import("resource://sendtophone/sendtophone.js");

			sendtophoneCore.setCurrentAccount( accounts[0] );
		}
	}
} ;

this.addEventListener("load", function () {foxToPhonePreferences.load(); }, false);
