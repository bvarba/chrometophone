/* This js module doesn't export anything, it's meant to handle the protocol registration/unregistration*/
var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;

// Utility function to handle the preferences
// https://developer.mozilla.org/en/Code_snippets/Preferences
function PrefListener(branchName, func) {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

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
		protocolFlags : Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,
		defaultPort : -1,
	
		newURI : function(aSpec, aCharset, aBaseURI)
		{
			var uri = Components.classes["@mozilla.org/network/simple-uri;1"].createInstance(Ci.nsIURI);
			uri.spec = aSpec;
			return uri;
		},
	
		newChannel : function(aURI)
		{
			var myURI = decodeURI(aURI.spec);
		
			// Core functions
			if (typeof sendtophoneCore == "undefined")
				Components.utils.import("resource://sendtophone/sendtophone.js");
		
			sendtophoneCore.send(this.linkTitle, myURI, "")
			
			// return a fake empty channel so current window doesn't change
			return Components.classes[ "@mozilla.org/network/input-stream-channel;1" ].createInstance(Ci.nsIChannel);
		},
		scheme : properties.scheme,
		classDescription : "SendToPhone handler for " + properties.scheme,
		classID : Components.ID( properties.ID ),
		contractID : "@mozilla.org/network/protocol;1?name=" + properties.scheme,
		linkTitle : properties.scheme + " link" // fixme, needs translations...
	}
	
	return myHandler;
}

// This function takes care of register/unregister the protocol handlers as requested
// It's called when the preferences change.
function toggleProtocolHandler(protocol, register)
{
	// Retrieve the object for that protocol
	var marketHandler = myProtocols[protocol];
	
	var manager = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
	var proto = marketHandler.prototype;

	if (register)
	{
		if (!marketHandler.registered)
			manager.registerFactory(proto.classID,
							proto.classDescription,
							proto.contractID,
							proto._xpcom_factory);
	
		marketHandler.registered = true;
	}
	else
	{
		if (marketHandler.registered)
		    manager.unregisterFactory(proto.classID, proto._xpcom_factory);
		marketHandler.registered = false;
	}
}

// Each protocol handler
var myProtocols = {
	market:	SendToPhone_ProtocolWrapper( { scheme: "market", ID: "{751de080-95d1-11df-981c-0800200c9a66}" } ) ,
	sms: 	SendToPhone_ProtocolWrapper( { scheme: "sms", 	 ID: "{345de080-95d1-11df-981c-0800200c9a66}" } ) ,
	smsto: 	SendToPhone_ProtocolWrapper( { scheme: "smsto",  ID: "{854de080-95d1-11df-981c-0800200c9a66}" } ) ,
	mms: 	SendToPhone_ProtocolWrapper( { scheme: "mms", 	 ID: "{457de080-95d1-11df-981c-0800200c9a66}" } ) ,
	mmsto: 	SendToPhone_ProtocolWrapper( { scheme: "mmsto",  ID: "{331de080-95d1-11df-981c-0800200c9a66}" } ) ,
	tel: 	SendToPhone_ProtocolWrapper( { scheme: "tel", 	 ID: "{948de080-95d1-11df-981c-0800200c9a66}" } ) 
};

// Listen for changes in the preferences and register the protocols as needed. 		
var preferencesListener = new PrefListener("extensions.sendtophone.protocols.",
                                  function(branch, name) {
                                  	toggleProtocolHandler(name, branch.getBoolPref(name));
                                  });
preferencesListener.register();
