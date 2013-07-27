document.addEventListener("DOMContentLoaded", function() {
  // localize easy stuff
  Array.prototype.forEach.call(document.querySelectorAll("*[i18n-message]"),
                               function(node) {
    node.textContent = chrome.i18n.getMessage(node.getAttribute('i18n-message'));
  });

  // localize tos link
  document.querySelector('#gallery_tos_link').href =
      'http://chrome.google.com/extensions/intl/' +
      navigator.language.substring(0, 2) + '/gallery_tos.html';
  

  if (oauth.hasToken()) {
    var link = document.createElement('a');
    link.href = 'help.html';
    link.onclick = function() {
      chrome.extension.getBackgroundPage().closeBrowserChannel();
      oauth.clearTokens();
    };
    link.text = chrome.i18n.getMessage('sign_out_message');
    document.querySelector('#sign_in_out_div').appendChild(link);

    if (document.location.hash == '#just_signed_in') {
      var p = document.createElement('p');
      p.style.fontWeight = 'bold';
      p.style.color = '#0a0';
      p.textContent = chrome.i18n.getMessage('signed_in_message');
      document.querySelector('#just_signed_in_div').appendChild(p);
    }
  } else {
    var sign_in_message = chrome.i18n.getMessage('sign_in_message');
    sign_in_message = sign_in_message.substring(0, 1).toUpperCase() + sign_in_message.substring(1);  // TODO: Get a new title case string translated
    var link = document.createElement('a');
    link.href = 'oauth_interstitial.html';
    link.textContent = sign_in_message;
    document.querySelector('#sign_in_out_div').appendChild(link);
  }
});
