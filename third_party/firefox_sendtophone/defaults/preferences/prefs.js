pref("extensions.sendtophone.installedButton", false);
pref("extensions.sendtophone.appUrl", "https://chrometophone.appspot.com");

pref("extensions.sendtophone.proxyUrl", "http://smallroomstudios.net/s2p.php?ml=");
pref("extensions.sendtophone.fileServerUrl", "http://martinezdelizarrondo.com/sendtophone.php");
pref("extensions.sendtophone.fileUploadMaxKb", 50000);

pref("extensions.sendtophone.protocols.market", true);
pref("extensions.sendtophone.protocols.sms", true);
pref("extensions.sendtophone.protocols.smsto", true);
pref("extensions.sendtophone.protocols.mms", false); // conflicts with http://en.wikipedia.org/wiki/Microsoft_Media_Server
pref("extensions.sendtophone.protocols.mmsto", true);
pref("extensions.sendtophone.protocols.tel", true);

pref("extensions.sendtophone.qrlink", true);

// https://developer.mozilla.org/en/Localizing_extension_descriptions
pref("extensions.sendtophone@martinezdelizarrondo.com.description", "chrome://sendtophone/locale/overlay.properties");
