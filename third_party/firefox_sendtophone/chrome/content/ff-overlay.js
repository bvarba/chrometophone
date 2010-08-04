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
	}

	document.getElementById("contentAreaContextMenu")
		.addEventListener("popupshowing", function (e){ sendtophone.showFirefoxContextMenu(e); }, false);
}

sendtophone.installToolbarButton = function()
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

//Toggle Protocol Prefrences onFlyout Menu Click
sendtophone.onToggleOption = function(menuitem)
    {
        var option = menuitem.getAttribute("option");
        var checked = menuitem.getAttribute("checked") == "true";
	this.prefs.setBoolPref("protocols."+option, checked );
	if(!option.indexOf("sms")|!option.indexOf("mms")){
		this.prefs.setBoolPref("protocols."+option+"to", checked );
	}
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
  gContextMenu.showItem("context-sendtophone-link", gContextMenu.onLink);
  gContextMenu.showItem("context-sendtophone-image", gContextMenu.onImage);
  gContextMenu.showItem("context-sendtophone-text", gContextMenu.isTextSelected || 
  	(gContextMenu.onTextInput && gContextMenu.target.selectionEnd > gContextMenu.target.selectionStart) );

  gContextMenu.showItem("context-sendtophone-page",  !( gContextMenu.inDirList || gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink || gContextMenu.onImage ));
  
};




// https://developer.mozilla.org/En/DragDrop/Drag_and_Drop
sendtophone.checkDrag = function(event)
{
	//event.dataTransfer.dropEffect = "copy";
	var types = event.dataTransfer.types;
	if (types.contains("text/plain") || types.contains("text/uri-list") || types.contains("text/x-moz-url") || types.contains("application/x-moz-file"))
		event.preventDefault();
}

sendtophone.doDrop = function(event)
{
	var types = event.dataTransfer.types;
	var supportedTypes = ["application/x-moz-file", "text/uri-list", "text/x-moz-url", "text/plain"];
	types = supportedTypes.filter(function (value) types.contains(value));
	if (types.length)
		var data = event.dataTransfer.getData(types[0]);
	event.preventDefault();

	switch (types[0])
	{
		case "text/plain":
			sendtophoneCore.send("Selection", "http://google.com", data);
			break;
		case "text/uri-list":
		case "text/x-moz-url":
			sendtophoneCore.send("", data, "");
			break;
		case "application/x-moz-file":
			var file = event.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
			if (file instanceof Components.interfaces.nsIFile && file.isFile() )
			{
				var url = Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService)
					.getProtocolHandler("file")
					.QueryInterface(Ci.nsIFileProtocolHandler)
					.getURLSpecFromFile(file);

			  	sendtophoneCore.send("", url, "");
			}
			else
				this.alert(this.strings.getString("InvalidFile"));
	}
}

sendtophone.sendFile = function()
{
	var fp = Cc["@mozilla.org/filepicker;1"]
				.createInstance(Ci.nsIFilePicker);

	fp.init(window, this.strings.getString("SendFileToPhone"), Ci.nsIFilePicker.modeOpen);
	fp.appendFilters(Ci.nsIFilePicker.filterAll | Ci.nsIFilePicker.filterImages);
	
	var rv = fp.show();
	if (rv == Ci.nsIFilePicker.returnOK) 
		sendtophoneCore.send('', fp.fileURL.spec, '');
}