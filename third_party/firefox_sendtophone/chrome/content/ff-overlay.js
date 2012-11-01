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

sendtophone.init = function()
{
	// Try to install the toolbar button, but only once
	if (!this.prefs.getBoolPref("installedButton"))
	{
		this.installToolbarButton();
		this.prefs.setBoolPref( "installedButton", true ) ;
		this.prefs.setIntPref( "latestNotice", 10202 ) ; // There's no need to show the 1.2.2 notice for new installs
	}
	else
	{
		if (this.prefs.getIntPref( "latestNotice" )<10202)
		{
			var firefoxnav = document.getElementById("nav-bar");
			var curSet = firefoxnav.currentSet;
			if (curSet.indexOf("sendtophone-toolbar-button") > -1)
			{
				// The button is on the toolbar, show upgrade notice
				sendtophoneCore.openTab( "http://www.foxtophone.com/2011/10/sorry-we-made-a-mistake/" );
			}

			this.prefs.setIntPref( "latestNotice", 10202 ) ;
		}
	}

	document.getElementById("contentAreaContextMenu").
		addEventListener("popupshowing", function (e){ sendtophone.showFirefoxContextMenu(e); }, false);

	// Hide URL bar and other chrome on the uploads window
	var prevFunc = XULBrowserWindow.hideChromeForLocation;

	XULBrowserWindow.hideChromeForLocation = function(aLocation) {
	  return (aLocation=='chrome://sendtophone/content/uploads.xul') || prevFunc.apply(XULBrowserWindow, [aLocation]);
	}

}

sendtophone.installToolbarButton = function()
{
	try {
		 var firefoxnav = document.getElementById("nav-bar");
		 var curSet = firefoxnav.currentSet;
		 if (curSet.indexOf("sendtophone-toolbar-button") == -1)
		 {
			 var set;
			 // Place the button at the end
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

//Toggle Protocol Prefrences onFlyout Menu Click
sendtophone.onToggleOption = function(menuitem)
{
	var option = menuitem.getAttribute("option");
	var checked = menuitem.getAttribute("checked") == "true";
	this.prefs.setBoolPref("protocols."+option, checked );
	if (!option.indexOf("sms"))
		this.prefs.setBoolPref("protocols."+option+"to", checked );
}

//Set MenuItem as checked based on preferences.
sendtophone.onOptionsShowing= function(popup)
    {
        for (var child = popup.firstChild; child; child = child.nextSibling)
        {
            if (child.localName == "menuitem")
            {
                var option = child.getAttribute("option");
                if (option)
                {
                    var checked = this.prefs.getBoolPref("protocols."+option);
                    child.setAttribute("checked", checked);
                }
            }
        }
    }

sendtophone.showFirefoxContextMenu = function(event) {
	// show or hide the menuitem based on what the context menu is on
	// see http://kb.mozillazine.org/Adding_items_to_menus
	var mediaURL = gContextMenu.mediaURL;

	gContextMenu.showItem("context-sendtophone-link", gContextMenu.onLink);
	gContextMenu.showItem("context-sendtophone-image", false);
	gContextMenu.showItem("context-sendtophone-qrimage", false);
	gContextMenu.showItem("context-sendtophone-video", false);
	if (gContextMenu.onImage)
	{
		var data = this.detectQR( mediaURL );
		if (data)
		{
			gContextMenu.showItem("context-sendtophone-qrimage", true);
			var label = this.getString("qrContextMenu");
			label = label.replace("%s", data.substring(0, 20) + "..." );
			document.getElementById("context-sendtophone-qrimage").setAttribute("label", label);
		}
		else
			gContextMenu.showItem("context-sendtophone-image", true);
	}
	/* TBC
	if(mediaURL.match(/.webm$/i)){
		gContextMenu.showItem("context-sendtophone-video", true);
	}
	*/

  gContextMenu.showItem("context-sendtophone-text", gContextMenu.isTextSelected ||
  	(gContextMenu.onTextInput && gContextMenu.target.selectionEnd > gContextMenu.target.selectionStart) );

  gContextMenu.showItem("context-sendtophone-page",  !( gContextMenu.inDirList || gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink || gContextMenu.onImage ));

};




// https://developer.mozilla.org/En/DragDrop/Drag_and_Drop
sendtophone.checkDrag = function(event)
{
	//event.dataTransfer.dropEffect = "copy";
	var types = event.dataTransfer.types;
	if (types.contains("text/plain") || types.contains("text/uri-list") || types.contains("text/x-moz-url"))
		event.preventDefault();

	if (this.prefs.getCharPref( "fileServerUrl" ) && types.contains("application/x-moz-file") )
		event.preventDefault();
}

sendtophone.doDrop = function(event)
{
	var dt = event.dataTransfer;
	var types = dt.types;
	var supportedTypes = ["application/x-moz-file", "text/x-moz-url", "text/uri-list", "text/plain"];
	types = supportedTypes.filter(function (value) {return types.contains(value)});

	event.preventDefault();
	switch (types[0])
	{
		case "text/plain":
			var plainText = dt.getData(types[0]);
			sendtophoneCore.send("Selection", "http://www.foxtophone.com/text-copied/", plainText);
			break;

		case "text/x-moz-url":
			var mozUrlArray = dt.getData(types[1]).split("\n");
			var mozUrl = mozUrlArray[0];
			var mozTitle = mozUrlArray[1] || '';
			sendtophoneCore.send(mozTitle, mozUrl, "");
			break;

		case "text/uri-list":
			var mozUrl = dt.getData(types[0]);
			sendtophoneCore.send("", mozUrl, "");
			break;

		case "application/x-moz-file":
			for (var i = 0; i < dt.mozItemCount; i++)
			{
				var file = dt.mozGetDataAt("application/x-moz-file", i);
				if (file instanceof Components.interfaces.nsIFile )
					sendtophoneCore.sendFile(file);
				else
					this.alert(this.getString("InvalidFile"));
			}
			break;
	}
}

sendtophone.pickFile = function(folder)
{
	var fp = Components.classes["@mozilla.org/filepicker;1"]
				.createInstance(Components.interfaces.nsIFilePicker);

	if (folder)
		fp.init(window, this.getString("SendFolderToPhone"), Components.interfaces.nsIFilePicker.modeGetFolder);
	else
	{
		fp.init(window, this.getString("SendFileToPhone"), Components.interfaces.nsIFilePicker.modeOpenMultiple);
		fp.appendFilters( Components.interfaces.nsIFilePicker.filterAll );
	}

	var rv = fp.show();

	if (rv == Components.interfaces.nsIFilePicker.returnOK)
	{
		if (folder)
			sendtophoneCore.sendFile( fp.file );
		else
		{
			var files = fp.files;
			while (files.hasMoreElements())
			{
				var file = files.getNext().QueryInterface(Components.interfaces.nsILocalFile);
				sendtophoneCore.sendFile( file );
			}
		}
	}

}
