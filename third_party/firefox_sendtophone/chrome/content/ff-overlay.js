sendtophone.init = function()
{
	// Try to install the toolbar button, but only once
	if (!this.prefs.getBoolPref("installedButton"))
	{
		this.installToolbarButton();
		this.prefs.setBoolPref( "installedButton", true ) ;
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


sendtophone.onFirefoxLoad = function() {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ sendtophone.showFirefoxContextMenu(e); }, false);
};

sendtophone.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  // see http://kb.mozillazine.org/Adding_items_to_menus
  document.getElementById("context-sendtophone-link").hidden = !gContextMenu.onLink;
  document.getElementById("context-sendtophone-image").hidden = !gContextMenu.onImage;
  document.getElementById("context-sendtophone-text").hidden = !gContextMenu.isTextSelected;
};

window.addEventListener("load", function(e) { sendtophone.onFirefoxLoad(e); }, false);
