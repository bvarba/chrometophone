const nsIPasswordManager = Components.interfaces.nsIPasswordManager;

var gPasswordArray = new Array();

function onLoad() {
  document.getElementById("status").value = getLocalizedString("LoginRequired");

  var url = "chrome://sendtophone/";

	// Gecko 1.9
  if (Components.classes["@mozilla.org/login-manager;1"]) {
    var passwordManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);

    var passwords = passwordManager.findLogins({}, url, null, "sendtophone");
    if (passwords.length > 0) {
      for (var i = 0; i < passwords.length; i++) {
        user = passwords[i].username;
        password = passwords[i].password;
        // XXX: why not call the service here to get password?
        if (password === " ") {
          // XXX: empty password is " " for now due to ff3 change
          password = "";
        }

        gPasswordArray[user] = password;

        document.getElementById("username").appendItem(user, user);
      }
    }
  } else {
    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                          .createInstance(nsIPasswordManager);

    var enumerator = passwordManager.enumerator;

    var user, password;

    while (enumerator.hasMoreElements()) {
      var nextPassword;
      try {
        nextPassword = enumerator.getNext();
      } catch(e) {
        break;
      }
      nextPassword = nextPassword.QueryInterface(Components.interfaces.nsIPassword);
      var host = nextPassword.host;

      if (host == url) {
        // try/catch in case decryption fails (invalid signon entry)
        try {
          user = nextPassword.user;
          password = nextPassword.password;

          gPasswordArray[user] = password;

          document.getElementById("username").appendItem(user, user);

        } catch (e) {
          continue;
        }
      }
    }
  }

  var username = window.opener.sendtophone.prefs.getCharPref("users.default");

  if (username) {
    document.getElementById("username").value = username;
		if (gPasswordArray[username] != null) {
			document.getElementById("password").value = gPasswordArray[username];
		}
    document.getElementById("store-password").checked =
      window.opener.sendtophone.prefs.getBoolPref("users.remember");
  }
}

/**
 * Login window calls this if we need to store the login details
 *
 */
function storeLoginDetails(aStorePassword) {
  var url = "chrome://sendtophone/";
	var sendtophone = window.opener.sendtophone;
	var prefs = sendtophone.prefs;
	var user_name = sendtophone.user_name;
	var password = sendtophone.password;

  if (Components.classes["@mozilla.org/login-manager;1"]) {
    var passwordManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);

    if (!passwordManager) {
      return;
    }

    var passwords = passwordManager.findLogins({}, url, null, "sendtophone");
    if (passwords.length > 0) {
      for (var i = 0; i < passwords.length; i++) {
        if (passwords[i].username == user_name) {
          passwordManager.removeLogin(passwords[i]);
          break;
        }
      }
    }

    var logininfo = Components.classes["@mozilla.org/login-manager/loginInfo;1"].createInstance(Components.interfaces.nsILoginInfo);

    if (aStorePassword) {
      prefs.setBoolPref("users.remember", true);
      prefs.setCharPref("users.default", user_name);
      logininfo.init(url, null, "sendtophone", user_name, password, "", "");
      passwordManager.addLogin(logininfo);
    } else {
      // if we don't store the password, we store the user name only
      // XXX: FF3 doesn't allow empty/null names - using " ", need to reconsider
      logininfo.init(url, null, "sendtophone", user_name, " ", "", "");
      passwordManager.addLogin(logininfo);
    }
  } else {
    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance();

    if (passwordManager) {
      passwordManager = passwordManager.QueryInterface(nsIPasswordManager);

      try {
        passwordManager.removeUser(url, user_name);
      } catch (e) {}

      if (aStorePassword) {
        prefs.setBoolPref("users.remember", true);
        prefs.setCharPref("users.default", user_name);
        passwordManager.addUser(url, user_name, password);
      } else {
        // if we don't store the password, we store the user name only
        passwordManager.addUser(url, user_name, "");
      }
    }
  }
}

function selectionChanged(aElement) {
  var name = aElement.value;

  if (gPasswordArray[name] != null) {
    document.getElementById("password").value = gPasswordArray[name];
  }
}

function getLocalizedString(aName) {
  var strbundle=document.getElementById("strings");
  return strbundle.getString(aName);
}

function onAccept() {
  window.opener.sendtophone.initLogin(
    document.getElementById("username").value,
    document.getElementById("password").value);

  // remember login pref
  window.opener.sendtophone.prefs.setBoolPref("users.remember",
    document.getElementById("store-password").checked);

  return false;
}

function setStatus(aStatusNum) {
  var statusMsg = "";

  switch (aStatusNum){
    // trying to log in
    case 1:
      document.getElementById("login").disabled = true;
      statusMsg = getLocalizedString("LoggingStatusLoggingIn");
      break;

    // logged in
    case 2:
      statusMsg = getLocalizedString("LoggingStatusLoggedIn");

      storeLoginDetails(document.getElementById("store-password").checked);
      break;

    // failed to login
    case 3:
      statusMsg = getLocalizedString("LoggingStatusFailed1");
      document.getElementById("login").disabled = false;
      break;

    // invalid username/password
    case 4:
      statusMsg = getLocalizedString("LoggingStatusInvalidLogin");
      document.getElementById("login").disabled = false;
      break;

    default:
      statusMsg = getLocalizedString("LoggingStatusError");
      break;
  }

  document.getElementById("status").value = statusMsg;
}

