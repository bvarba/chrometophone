"use strict";

var EXPORTED_SYMBOLS = ["sendtophoneUploadsManager"];

const Cc = Components.classes;
const Ci = Components.interfaces;

var sendtophoneUploadsManager = {
	uploads: {},
	_counter : 0,

	_listeners: [],

	// Add a listener that will be called when there's any change on the uploads
	addListener: function( obj )
	{
		this._listeners.push( obj );
	},

	// Remove an existing listener object
	removeListener: function( obj )
	{
		for(let i=0, listener; listener = this._listeners[i]; i++)
		{
			if (obj == listener)
			{
				this._listeners.splice(i, 1);
				return;
			}
		}
	},

	/**
	* Adds a new upload
	* nsFile: The file that it's being send
	* req: the XmlHttpRequest that will send that file
	*/
	addUpload: function(nsFile, req)
	{
		let id = this._addToUploads( {file:nsFile, req:req, state:0, percent:0,
			startTime: Date.now() - 100, currBytes: 0, maxBytes: nsFile.fileSize} );

		req.upload.addEventListener("progress", function(evt)
			{
				if (evt.lengthComputable) {
					sendtophoneUploadsManager.updateProgress(id, evt.loaded, evt.total);
				}
			}, false);
		req.upload.addEventListener("load", function(evt)
			{
				sendtophoneUploadsManager.updateProgress(id, evt.loaded, evt.total);
			}, false);

		// Clear row when it has finished
		req.addEventListener("load", function(evt)
			{
				sendtophoneUploadsManager.finishedUpload(id);
			}, false);
		// If there's an error or it's aborted, finish its tracking.
		req.addEventListener("error", function(evt)
			{
				sendtophoneUploadsManager.finishedUpload(id);
			}, false);
		req.addEventListener("abort", function(evt)
			{
				sendtophoneUploadsManager.finishedUpload(id);
			}, false);

	},

	/**
	* Adds a zip (it's not an upload, but this way we can show that something is going on)
	* nsFolder: a nsFile object pointing to the folder being compressed
	* When the compression has finished, the external code has to call .finishedUpload(id)
	* with the id returned in this method.
	*/
	addZip: function(nsFolder)
	{
		return this._addToUploads( {file:nsFolder, state:1} );
	},

	_addToUploads: function( obj )
	{
		initShowTest();

		// Creates a counter to automatically assign new ids to each upload
		let id = this._counter++;
		obj.id = id;
		this.uploads[id] = obj;

		for(let i=0, listener; listener = this._listeners[i]; i++)
			listener.fileAdded( obj );

		return id;
	},

	showWindow: function()
	{
		// Open the tab
		openAndReuseOneTabPerURL("chrome://sendtophone/content/uploads.xul");
	},

	updateProgress: function(id, loaded, total)
	{
		let upload = this.uploads[id];

		// The progress events are fired when the data is sent,
		// but that leads to wrong speed because we don't know how long
		//  it has really taken to process the packet
		// As long as the upload progress the speed converges to a more correct value
		// But here we will try to adjust it (fake it) sooner
		if (!upload.firstPacket)
			upload.firstPacket = Date.now();
		else
		if (!upload.adjusted)
		{
			upload.adjusted = true;
//			let elapsed = Date.now() - upload.firstPacket; // time to send a packet to the server and get back
			let elapsed = Date.now() - upload.startTime; //
			upload.startTime = upload.startTime - elapsed;
		}

		upload.currBytes = loaded;
		upload.maxBytes = total;

		this._listeners.forEach( function( listener ) {
			listener.progressUpdate( upload );
		});
	},

	finishedUpload: function(id)
	{
		let upload = this.uploads[id];
		delete this.uploads[id];

		// Review if there are pending files to cancel the show timer
		let count = 0;
		for(let id in this.uploads)
			count++;
		if (count == 0)
			cancelShowTimer();

		// Notify the listeners
		this._listeners.forEach( function( listener ) {
			listener.fileFinished( upload );
		});
	},

	cancelUpload: function(id)
	{
		let upload = this.uploads[id];
		upload.req.abort();

	},

 	// Check if we might need to show the window.
  	// Either some folder is being compressed,
  	// or there's some file that might take longer than 2 seconds.
  	// If there's some file that we still don't know the speed
  	// then consider it also as needed.
	isWindowNeeded: function( alreadyOpen )
	{
		for (let id in this.uploads)
		{
			// If the progress window is already open and there's something pending then leave the window open
			if (alreadyOpen)
				return true;

			let upload = this.uploads[id] ;

			// zipping folder: if takes so long to compress it, it will also take some time to upload it
			if (upload.state==1)
				return true;

			// If it still hasn't uploaded anything then something might be wrong
			if (upload.currBytes==0)
				return true;

			let elapsedTime = (Date.now() - upload.startTime) / 1000;
			let speed = upload.currBytes/elapsedTime;
			let remainingSecs = (upload.maxBytes - upload.currBytes) / speed;

			if (remainingSecs > 2)
				return true;

//			if (remainingSecs > 1 && elapsedTime> 2)
//				return true;
		}
	}
}

/**
* Internal function
* Instead of poping up the uploads window inmediately wait a little
* trying to avoid flicker for small files
*/
let showTimer = null;

// we need a nsITimerCallback compatible...
// ... interface for the callbacks.
var showTimerEvent =
{
	notify: function(timer)
	{
		if (sendtophoneUploadsManager.isWindowNeeded(false))
		{
			cancelShowTimer();
			sendtophoneUploadsManager.showWindow();
		}
	}
}

function initShowTest()
{
	if (showTimer)
		return;

	// Now it is time to create the timer...
	showTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
 	showTimer.initWithCallback(showTimerEvent, 400, Ci.nsITimer.TYPE_REPEATING_SLACK);
}

function cancelShowTimer()
{
	if (!showTimer)
		return;

	showTimer.cancel();
	showTimer = null
}

// https://developer.mozilla.org/en/Code_snippets/Tabbed_browser#Reusing_tabs
function openAndReuseOneTabPerURL(url) {
	var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
			.getService(Ci.nsIWindowMediator);
	var browserEnumerator = wm.getEnumerator("navigator:browser");

  // Check each browser instance for our URL
  var found = false;
  while (!found && browserEnumerator.hasMoreElements()) {
    var browserWin = browserEnumerator.getNext();
    var tabbrowser = browserWin.gBrowser;

    // Check each tab of this browser instance
    var numTabs = tabbrowser.browsers.length;
    for (var index = 0; index < numTabs; index++) {
      var currentBrowser = tabbrowser.getBrowserAtIndex(index);
      if (url == currentBrowser.currentURI.spec) {

        // The URL is already opened. Select this tab.
        tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];

        // Focus *this* browser-window
        browserWin.focus();

        found = true;
        break;
      }
    }
  }

  // Our URL isn't open. Open it now.
  if (!found) {
    var recentWindow = wm.getMostRecentWindow("navigator:browser");
    if (recentWindow) {
      // Use an existing browser window
      recentWindow.getBrowser().loadOneTab( url, null, null, null, false, null );
    }
    else {
      // No browser windows are open, so open a new one.
      window.open(url);
    }
  }
}
