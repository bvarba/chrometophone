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
			startTime: Date.now(), currBytes: 0, maxBytes: nsFile.fileSize} );

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
		this.init();

		// Creates a counter to automatically assign new ids to each upload	
		let id = this._counter++;
		obj.id = id;
		this.uploads[id] = obj;

		for(let i=0, listener; listener = this._listeners[i]; i++)
			listener.fileAdded( obj );
		
		return id;
	},
		
	init: function()
	{
		// Open the tab
		openAndReuseOneTabPerURL("chrome://sendtophone/content/uploads.xul");
	},

	updateProgress: function(id, loaded, total)
	{
		let upload = this.uploads[id];
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

		this._listeners.forEach( function( listener ) {  
			listener.fileFinished( upload );
		});
	},
	
	cancelUpload: function(id)
	{
		let upload = this.uploads[id];
		upload.req.abort();	
	
	}
}

// https://developer.mozilla.org/en/Code_snippets/Tabbed_browser#Reusing_tabs
function openAndReuseOneTabPerURL(url) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
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
      recentWindow.delayedOpenTab(url, null, null, null, null);
    }
    else {
      // No browser windows are open, so open a new one.
      window.open(url);
    }
  }
}
