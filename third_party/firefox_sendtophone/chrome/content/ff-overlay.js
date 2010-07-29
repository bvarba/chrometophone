
sendtophone.onFirefoxLoad = function() {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ sendtophone.showFirefoxContextMenu(e); }, false);
};

sendtophone.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  // see http://kb.mozillazine.org/Adding_items_to_menus
  document.getElementById("context-sendtophone").hidden = !(gContextMenu.onImage || gContextMenu.onLink);
};

window.addEventListener("load", function(e) { sendtophone.onFirefoxLoad(e); }, false);
