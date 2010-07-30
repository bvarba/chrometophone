/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the MLDonkey protocol handler 2.5.
 *
 * The Initial Developer of the Original Code is
 * Simon Peter <dn.tlp@gmx.net>.
 * Portions created by the Initial Developer are Copyright (C) 2003 - 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Sven Koch
 * Len Walter <len@unsw.edu.au>
 * Dan Fritz <templar_of_ni@yahoo.se>
 * David Ciecierski <dawid.ciecierski@gmail.com>
 * Dennis Plöger <dennis@dieploegers.de>
 * Dominik Röttsches <d-r@roettsches.de>
 * Stefan Huber <stef@efan.ch>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/***** Defines *****/

// components defined in this file
const MARKETPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=market";
const MARKETPROT_HANDLER_CID =
    Components.ID("{76A4F09C-9B67-11DF-A9F4-6018E0D72085}");

const SMSPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=sms";
const SMSPROT_HANDLER_CID =
    Components.ID("{85F1603A-9B67-11DF-96B2-6118E0D72085}");

const SMSTOPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=smsto";
const SMSTOPROT_HANDLER_CID =
    Components.ID("{8A9EB484-9B67-11DF-9BAE-8818E0D72085}");

const MMSPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=mms";
const MMSPROT_HANDLER_CID =
    Components.ID("{A47959A0-9B70-11DF-92BC-6721E0D72085}");

const MMSTOPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=mmsto";
const MMSTOPROT_HANDLER_CID =
    Components.ID("{A9CE57D4-9B70-11DF-8AF1-6821E0D72085}");

const CALLTOPROT_HANDLER_CONTRACTID =
    "@mozilla.org/network/protocol;1?name=callto";
const CALLTOPROT_HANDLER_CID =
    Components.ID("{E8763476-9B6A-11DF-86FD-B81BE0D72085}");

// components used in this file
const NS_IOSERVICE_CID = "{7fe2aeb0-95d1-11df-981c-0800200c9a66}";
const NS_PREFSERVICE_CONTRACTID = "@mozilla.org/preferences-service;1";
const URI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const NS_WINDOWWATCHER_CONTRACTID = "@mozilla.org/embedcomp/window-watcher;1";
const INPUTSTREAMCHANNEL_CONTRACTID = "@mozilla.org/network/input-stream-channel;1";
const CATEGORY_MANAGER_CONTRACTID = "@mozilla.org/categorymanager;1";
const HTTP_HANDLER_CONTRACTID = "@mozilla.org/network/protocol;1?name=http";

// interfaces used in this file
const nsIProtocolHandler    = Components.interfaces.nsIProtocolHandler;
const nsIURI                = Components.interfaces.nsIURI;
const nsIPrefService        = Components.interfaces.nsIPrefService;
const nsIWindowWatcher      = Components.interfaces.nsIWindowWatcher;
const nsIChannel            = Components.interfaces.nsIChannel;
const nsIContentPolicy      = Components.interfaces.nsIContentPolicy;

// some misc. constants
const PREF_BRANCH   = "extensions.sendtophone.";

/***** PhoneByProtocolHandler *****/

function PhoneByProtocolHandler(scheme)
{
    this.scheme = scheme;
}

// attribute defaults
PhoneByProtocolHandler.prototype.defaultPort = -1;
PhoneByProtocolHandler.prototype.protocolFlags = nsIProtocolHandler.URI_NORELATIVE;
PhoneByProtocolHandler.prototype.withinLoad = false;

PhoneByProtocolHandler.prototype.newURI = function(aSpec, aCharset, aBaseURI)
{
    var uri = Components.classes[URI_CONTRACTID].createInstance(nsIURI);
    uri.spec = aSpec;
    return uri;
}

PhoneByProtocolHandler.prototype.loadPhoneToProtocol = function(aURI)
{
    var s2pTitle;
    var s2pURL = encodeURIComponent(decodeURI(aURI.spec));

    // read preferences again (otherwise saved settings won't be used until after restart
    ProtocolToPhoneModule.readPreferences(PREF_BRANCH);

	// Core functions
	if (typeof sendtophoneCore == "undefined")
		Components.utils.import("resource://sendtophone/sendtophone.js");

    if (!s2pURL.indexOf('market')){
        s2pTitle = "Market Link";
    }
    else if (!s2pURL.indexOf('sms')){
        s2pTitle = "Send SMS";
    }
    else if (!s2pURL.indexOf('mms')){
        s2pTitle = "Send MMS";
    }
    else if (!s2pURL.indexOf('call')){
        s2pTitle = "Call Number";
    }
    else{
        s2pTitle = "Other";
    }

	sendtophoneCore.send(s2pTitle, cfgUrl + s2pURL, "")

    return null;
}

PhoneByProtocolHandler.prototype.newChannel = function(aURI)
{
    // pass URI to PhoneToProtocol
    var chan = this.loadPhoneToProtocol(aURI);

    // return a fake empty channel so current window doesn't change
    if(chan == null) chan = Components.classes[INPUTSTREAMCHANNEL_CONTRACTID].createInstance(nsIChannel);
    return chan;
}

/***** PhoneByProtocolHandlerFactory *****/

function PhoneByProtocolHandlerFactory(scheme)
{
    this.scheme = scheme;
}

PhoneByProtocolHandlerFactory.prototype.createInstance = function(outer, iid)
{
    if(outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if(!iid.equals(nsIProtocolHandler) && !iid.equals(nsIContentPolicy))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new PhoneByProtocolHandler(this.scheme);
}

var factory_market = new PhoneByProtocolHandlerFactory("market");
var factory_sms = new PhoneByProtocolHandlerFactory("sms");
var factory_smsto = new PhoneByProtocolHandlerFactory("smsto");
var factory_mms = new PhoneByProtocolHandlerFactory("mms");
var factory_mmsto = new PhoneByProtocolHandlerFactory("mmsto");
var factory_callto = new PhoneByProtocolHandlerFactory("callto");

/***** ProtocolToPhoneModule *****/

var ProtocolToPhoneModule = new Object();

ProtocolToPhoneModule.readPreferences = function(pref_branch)
{
    // get preferences branch
    var PrefService = Components.classes[NS_PREFSERVICE_CONTRACTID].getService(nsIPrefService);
    var myPrefs = PrefService.getBranch(null);  // Mozilla bug #107617

    // read preferences (if available)
    if(myPrefs.getPrefType(pref_branch + "url") == myPrefs.PREF_STRING)
      cfgUrl = myPrefs.getCharPref(pref_branch + "url");
    if(myPrefs.getPrefType(pref_branch + "protocols") == myPrefs.PREF_STRING)
      cfgProtocols = myPrefs.getCharPref(pref_branch + "protocols");
}

ProtocolToPhoneModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

    // register market protocol handler
    compMgr.registerFactoryLocation(MARKETPROT_HANDLER_CID,
                                    "market protocol handler",
                                    MARKETPROT_HANDLER_CONTRACTID,
                                    fileSpec, location, type);

    // register sms protocol handler
    compMgr.registerFactoryLocation(SMSPROT_HANDLER_CID,
                                    "sms protocol handler",
                                    SMSPROT_HANDLER_CONTRACTID,
                                    fileSpec, location, type);

    // register smsto protocol handler
    compMgr.registerFactoryLocation(SMSTOPROT_HANDLER_CID,
                                    "smsto protocol handler",
                                    SMSTOPROT_HANDLER_CONTRACTID,
                                    fileSpec, location, type);
    // register mms protocol handler
    compMgr.registerFactoryLocation(MMSPROT_HANDLER_CID,
                                    "mms protocol handler",
                                    MMSPROT_HANDLER_CONTRACTID,
                                    fileSpec, location, type);

    // register mmsto protocol handler
    compMgr.registerFactoryLocation(MMSTOPROT_HANDLER_CID,
                                    "mmsto protocol handler",
                                    MMSTOPROT_HANDLER_CONTRACTID,
                                    fileSpec, location, type);
    // register callto protocol handler
    compMgr.registerFactoryLocation(CALLTOPROT_HANDLER_CID,
                                    "calltoo protocol handler",
                                    CALLTOPROT_HANDLER_CONTRACTID,
                                    fileSpec, location, type);
}

ProtocolToPhoneModule.unregisterSelf = function(compMgr, fileSpec, location)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

    // unregister our components
    compMgr.unregisterFactoryLocation(MARKETPROT_HANDLER_CID, fileSpec);
    compMgr.unregisterFactoryLocation(SMSPROT_HANDLER_CID, fileSpec);
    compMgr.unregisterFactoryLocation(SMSTOPROT_HANDLER_CID, fileSpec);
    compMgr.unregisterFactoryLocation(MMSPROT_HANDLER_CID, fileSpec);
    compMgr.unregisterFactoryLocation(MMSTOPROT_HANDLER_CID, fileSpec);
    compMgr.unregisterFactoryLocation(CALLTOPROT_HANDLER_CID, fileSpec);

}

ProtocolToPhoneModule.getClassObject = function(compMgr, cid, iid)
{

    if(!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    // read preferences
    this.readPreferences(PREF_BRANCH);

    // return protocol handler factories
    // To disable a protocol simply comment the line out.
    if(cid.equals(MARKETPROT_HANDLER_CID)) { if(cfgProtocols.search("market") != -1) return factory_market; else return null; }
    if(cid.equals(SMSPROT_HANDLER_CID)) { if(cfgProtocols.search("sms") != -1) return factory_sms; else return null; }
    if(cid.equals(SMSTOPROT_HANDLER_CID)) { if (cfgProtocols.search("smsto") != -1) return factory_smsto; else return null; }
    if(cid.equals(MMSPROT_HANDLER_CID)) { if(cfgProtocols.search("mms") != -1) return factory_mms; else return null; }
    if(cid.equals(MMSTOPROT_HANDLER_CID)) { if (cfgProtocols.search("mmsto") != -1) return factory_mmsto; else return null; }
    if(cid.equals(CALLTOPROT_HANDLER_CID)) { if (cfgProtocols.search("callto") != -1) return factory_callto; else return null; }

    throw Components.results.NS_ERROR_NO_INTERFACE;
}

ProtocolToPhoneModule.canUnload = function(compMgr)
{
    return true;    // our objects can be unloaded
}

/***** Entrypoint *****/

function NSGetModule(compMgr, fileSpec)
{
    return ProtocolToPhoneModule;
}
