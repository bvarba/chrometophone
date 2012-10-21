"use strict";

/* This js module doesn't export anything, it's meant to handle the protocol registration/unregistration */
var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;

//XXXgijs: Because necko is annoying and doesn't expose this error flag, we
//         define our own constant for it. Throwing something else will show
//         ugly errors instead of seeminly doing nothing.
const NS_ERROR_MODULE_NETWORK_BASE = 0x804b0000;
const NS_ERROR_NO_CONTENT = NS_ERROR_MODULE_NETWORK_BASE + 17;


var manager = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
var strings = Cc["@mozilla.org/intl/stringbundle;1"]
				.getService(Ci.nsIStringBundleService)
				.createBundle("chrome://sendtophone/locale/overlay.properties");

// Utility function to handle the preferences
// https://developer.mozilla.org/en/Code_snippets/Preferences
function PrefListener(branchName, func) {
    var prefService = Cc["@mozilla.org/preferences-service;1"]
                                .getService(Ci.nsIPrefService);
    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(Ci.nsIPrefBranch2);

    this.register = function() {
        branch.addObserver("", this, false);
        branch.getChildList("", { })
              .forEach(function (name) { func(branch, name); });
    };

    this.unregister = function unregister() {
        if (branch)
            branch.removeObserver("", this);
    };

    this.observe = function(subject, topic, data) {
        if (topic == "nsPref:changed")
            func(branch, data);
    };
}


// our XPCOM components to handle the protocols
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function SendToPhone_ProtocolWrapper( properties )
{
	var myHandler = function() {};

	myHandler.prototype = {
		QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),

		_xpcom_factory: {
			singleton: null,
			createInstance: function (aOuter, aIID) {
				if (aOuter) throw Components.results.NS_ERROR_NO_AGGREGATION;

				if (!this.singleton) this.singleton = new myHandler();
				return this.singleton.QueryInterface(aIID);
			}
		  },

		// nsIProtocolHandler implementation:

		// default attributes
		protocolFlags : Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE | Ci.nsIProtocolHandler.URI_DOES_NOT_RETURN_DATA,
		defaultPort : -1,

		newURI : function(aSpec, aCharset, aBaseURI)
		{
			var uri = Cc["@mozilla.org/network/simple-uri;1"].createInstance(Ci.nsIURI);
			uri.spec = aSpec;
			return uri;
		},

		newChannel : function(aURI)
		{
			// Use our channel implementation
		    return new BogusChannel(aURI, this.linkTitle);
		},
		scheme : properties.scheme,
		classDescription : "SendToPhone handler for " + properties.scheme,
		classID : Components.ID( properties.ID ),
		contractID : "@mozilla.org/network/protocol;1?name=" + properties.scheme,
		linkTitle : strings.GetStringFromName(  properties.scheme + "Link" ) // Translations
	}

	return myHandler;
}



/* bogus nsiChannel copied from Chatzilla */
function BogusChannel(URI, linkTitle)
{
    this.URI = URI;
	this.linkTitle = linkTitle;
}

BogusChannel.prototype.QueryInterface =
function bc_QueryInterface(iid)
{
   if (!iid.equals(Ci.nsIChannel) && !iid.equals(Ci.nsIRequest) &&
        !iid.equals(Ci.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    return this;
}

/* nsIChannel */
BogusChannel.prototype.loadAttributes = null;
BogusChannel.prototype.contentLength = 0;
BogusChannel.prototype.owner = null;
BogusChannel.prototype.loadGroup = null;
BogusChannel.prototype.notificationCallbacks = null;
BogusChannel.prototype.securityInfo = null;

BogusChannel.prototype.open =
BogusChannel.prototype.asyncOpen =
function bc_open(observer, ctxt)
{
	// Core functions are loaded on demand
	if (typeof sendtophoneCore == "undefined")
		Components.utils.import("resource://sendtophone/sendtophone.js");

	sendtophoneCore.send(this.linkTitle, decodeURI(this.URI.spec), "")


	// We don't throw this (a number, not a real 'resultcode') because it
    // upsets xpconnect if we do (error in the js console).
    Components.returnCode = NS_ERROR_NO_CONTENT;
}

BogusChannel.prototype.asyncRead =
function bc_asyncRead(listener, ctxt)
{
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
}

/* nsIRequest */
BogusChannel.prototype.isPending =
function bc_isPending()
{
    return true;
}

BogusChannel.prototype.status = Components.results.NS_OK;

BogusChannel.prototype.cancel =
function bc_cancel(status)
{
    this.status = status;
}

BogusChannel.prototype.suspend =
BogusChannel.prototype.resume =
function bc_suspres()
{
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
}
/* /bogus nsiChannel */

// This function takes care of register/unregister the protocol handlers as requested
// It's called when the preferences change.
function toggleProtocolHandler(branch, name)
{
	// Get the value in preferences
	var register = branch.getBoolPref(name);
	// Retrieve the object for that protocol
	var protocolHandler = sendToPhoneProtocols[ name ];
	// If someone did change the defaults for mms or mmsto this
	// function will be called, but the handlers have been removed.
	if (!protocolHandler)
		return;

	var proto = protocolHandler.prototype;

	if (register)
	{
		if (!protocolHandler.registered)
			manager.registerFactory(proto.classID,
							proto.classDescription,
							proto.contractID,
							proto._xpcom_factory);

		protocolHandler.registered = true;
	}
	else
	{
		if (protocolHandler.registered)
		    manager.unregisterFactory(proto.classID, proto._xpcom_factory);
		protocolHandler.registered = false;
	}
}

// Each protocol handler
var sendToPhoneProtocols = {
	market:	SendToPhone_ProtocolWrapper( { scheme: "market", ID: "{751de080-95d1-11df-981c-0800200c9a66}" } ) ,
	sms: 	SendToPhone_ProtocolWrapper( { scheme: "sms", 	 ID: "{345de080-95d1-11df-981c-0800200c9a66}" } ) ,
	smsto: 	SendToPhone_ProtocolWrapper( { scheme: "smsto",  ID: "{854de080-95d1-11df-981c-0800200c9a66}" } ) ,
	tel: 	SendToPhone_ProtocolWrapper( { scheme: "tel", 	 ID: "{948de080-95d1-11df-981c-0800200c9a66}" } )
};

// Listen for changes in the preferences and register the protocols as needed.
var preferencesListener = new PrefListener("extensions.sendtophone.protocols.", toggleProtocolHandler);
preferencesListener.register();

// Outputs log message to the console
function log( text )
{
	Cc["@mozilla.org/consoleservice;1"]
		.getService(Ci.nsIConsoleService)
		.logStringMessage( "foxtophone prococolHandler: " + text );
}