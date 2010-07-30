
// components used in this file
const NS_PREFSERVICE_CONTRACTID = "@mozilla.org/preferences-service;1";
const URI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const INPUTSTREAMCHANNEL_CONTRACTID = "@mozilla.org/network/input-stream-channel;1";

// interfaces used in this file
const nsIProtocolHandler    = Components.interfaces.nsIProtocolHandler;
const nsIURI                = Components.interfaces.nsIURI;
const nsIPrefService        = Components.interfaces.nsIPrefService;
const nsIChannel            = Components.interfaces.nsIChannel;
const nsIContentPolicy      = Components.interfaces.nsIContentPolicy;

// some misc. constants
const PREF_BRANCH   = "extensions.sendtophone.";

const alert = Components.classes['@mozilla.org/alerts-service;1']
                  .getService(Components.interfaces.nsIAlertsService)
                  .showAlertNotification;


Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function SendToPhoneComponent(scheme) {
	this.scheme = scheme;
}
SendToPhoneComponent.prototype = {
	classDescription: "XPCOM component to handle protocols in SendToPhone",
	// this must match whatever is in chrome.manifest!
	classID: Components.ID("{751de080-95d1-11df-981c-0800200c9a66}"),
	contractID: "@mozilla.org/network/protocol;1?name=market",

	QueryInterface: XPCOMUtils.generateQI([nsIProtocolHandler, nsIContentPolicy]),

	// nsIProtocolHandler implementation:
	
	// attribute defaults
	protocolFlags : nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

	newURI : function(aSpec, aCharset, aBaseURI)
	{
		var uri = Components.classes[URI_CONTRACTID].createInstance(nsIURI);
		uri.spec = aSpec;
		return uri;
	},

	newChannel : function(aURI)
	{
		var myURI = decodeURI(aURI.spec);
	
		// Core functions
		if (typeof sendtophoneCore == "undefined")
			Components.utils.import("resource://sendtophone/sendtophone.js");
	
		sendtophoneCore.send("Market link", myURI, "")
	
		alert(null, "test", myURI);
	
		// return a fake empty channel so current window doesn't change
		return Components.classes[INPUTSTREAMCHANNEL_CONTRACTID].createInstance(nsIChannel);
	}

};

// The following line is what XPCOM uses to create components. Each component prototype
// must have a .classID which is used to create it.
/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([SendToPhoneComponent]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([SendToPhoneComponent]);