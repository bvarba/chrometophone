window.onload = function() {
  document.getElementById('help').textContent = chrome.i18n.getMessage('help_message');
  
  if (oauth.hasToken()) {
    document.getElementById('msg').textContent = chrome.i18n.getMessage('sending_message');
    document.getElementById('signout').textContent = chrome.i18n.getMessage('sign_out_message');

    chrome.tabs.getSelected(null, function(tab) {
      if (tab.url.indexOf('http:') == 0 ||
        tab.url.indexOf('https:') == 0) {
        chrome.tabs.executeScript(null, {file: "content_script.js"});
      } else {
        document.getElementById('msg').textContent = chrome.i18n.getMessage('invalid_scheme_message');
      }
    });
  } else {
    // we need the options page to show signin           
    activateSignInLink(function() {
        chrome.tabs.create({url: 'oauth_interstitial.html'})
    });
  }   

  document.querySelector("#help").onclick = function() {
    chrome.tabs.create({url: 'help.html'});
  };

  document.querySelector("#close").onclick = function() {
    window.close();
  }
}

function sendToPhoneListener(status, responseText) {
  if (status == STATUS_SUCCESS) {
    document.getElementById('msg').textContent = chrome.i18n.getMessage('sent_message');
    activateSignOutLink();  
  } else if (status == STATUS_LOGIN_REQUIRED) {
    activateSignInLink(function() {
      chrome.tabs.create({url: 'help.html?fromPopup=1'}); // token revoked
    });
  } else if (status == STATUS_DEVICE_NOT_REGISTERED) {
    document.getElementById('msg').textContent = chrome.i18n.getMessage('device_not_registered_message');
    activateSignOutLink();
  } else { 
    document.getElementById('msg').textContent =  
        chrome.i18n.getMessage('error_sending_message', responseText);
    activateSignOutLink();
  }
}

chrome.extension.onConnect.addListener(function(port) {
  // This will get called by the content script. We go through
  // these hoops to get the optional text selection.
  port.onMessage.addListener(function(info) {
    var msgType = (info.selection && info.selection.length > 0) ? 'selection' : 'page';
    sendToPhone(info.title, info.url, msgType, info.selection, sendToPhoneListener);
  });
});

function setSignOutVisibility(visible) {
  var signOutLink = document.getElementById('signout');
  signOutLink.style.visibility = visible ? 'visible' : 'hidden';
  var sep = document.getElementById('sep');
  sep.style.visibility = visible ? 'visible' : 'hidden';
}

function activateSignOutLink() {
  setSignOutVisibility(true);
  var signOutLink = document.getElementById('signout');
  signOutLink.textContent = chrome.i18n.getMessage('sign_out_message');
  signOutLink.style.color = 'blue';
  signOutLink.onclick = function() {
    chrome.extension.getBackgroundPage().closeBrowserChannel();
    oauth.clearTokens();
    window.close();
  }
}

function activateSignInLink(onclick) {
  var link = document.createElement("a");
  link.href = "#";
  link.onclick = onclick;
  link.textContent = chrome.i18n.getMessage('sign_in_message');
  var linkToken = '$link$';
  var msg = chrome.i18n.getMessage('sign_in_required_message', linkToken);
  var linkIndex = msg.indexOf(linkToken);

  var parent = document.getElementById('msg');
  parent.textContent = '';
  parent.appendChild(document.createTextNode(msg.substring(0, linkIndex)));
  parent.appendChild(link);
  parent.appendChild(
      document.createTextNode(msg.substring(linkIndex + linkToken.length)));
  
  setSignOutVisibility(false);
}

