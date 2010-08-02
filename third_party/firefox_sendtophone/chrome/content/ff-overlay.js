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

