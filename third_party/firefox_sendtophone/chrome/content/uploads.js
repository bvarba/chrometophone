"use strict";

Components.utils.import("resource://gre/modules/DownloadUtils.jsm");
Components.utils.import("resource://gre/modules/PluralForm.jsm");
Components.utils.import("resource://sendtophone/uploadsManager.js");

let FoxToPhoneUploadListener = {
	UploadsView: null,

	fileAdded: function(data)
	{
		this.addFile(data);
	},
	progressUpdate: function(data)
	{
		let item = document.getElementById( "upl" + data.id);
		item.setAttribute("currBytes", data.currBytes);
		item.setAttribute("maxBytes", data.maxBytes);

		let percentComplete = Math.round(100 * data.currBytes / data.maxBytes);
		item.setAttribute("progress", percentComplete);

		// Status text
		FoxToPhoneUploadWindow.updateStatus(item);
	},
	fileFinished: function(data)
	{
		let item = document.getElementById("upl" + data.id);
		this.UploadsView.removeChild(item);

		// If no more pending uploads, close the tab.
		//		Use a 0 ms timeout to avoid flicker while compress -> upload a folder
		//		The trick won't work if in order to upload the file itself we have to perform an extra request before
		// (like creating a gallery in min.us)
		let checkTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	 	checkTimer.initWithCallback( this.checkTimerEvent, 0, Components.interfaces.nsITimer.TYPE_ONE_SHOT );
	},

	checkTimerEvent :
	{
		notify: function(timer)
		{
			if (!sendtophoneUploadsManager.isWindowNeeded(true))
			{
				if (FoxToPhoneUploadListener.UploadsView.children.length==0)
					window.close();
			}
		}
	},

	addFile: function(upload)
	{
		let dl = document.createElement("richlistitem");

		dl.setAttribute("file", upload.file.path);
		dl.setAttribute("target", upload.file.leafName);
		dl.setAttribute("image", "moz-icon://" + upload.file.path + "?size=32");

		dl.setAttribute("state", upload.state);
		dl.setAttribute("startTime", upload.startTime);
		dl.setAttribute("currBytes", upload.currBytes);
		dl.setAttribute("maxBytes", upload.maxBytes);
		dl.setAttribute("lastSeconds", Infinity);

		// Initialize other attributes
		dl.setAttribute("type", "upload");
		dl.setAttribute("id", "upl" + upload.id);
		dl.setAttribute("uploadId", upload.id);

		this.UploadsView.appendChild( dl );
	}

};

let FoxToPhoneUploadWindow = {
	UploadManager: null,

	Startup: function()
	{
		this.UploadManager = sendtophoneUploadsManager;

		FoxToPhoneUploadListener.UploadsView = document.getElementById("UploadsBox");

		this.UploadManager.addListener(FoxToPhoneUploadListener);

		for (let id in this.UploadManager.uploads)
			FoxToPhoneUploadListener.addFile( this.UploadManager.uploads[id] );
	},

	Shutdown: function()
	{
		this.UploadManager.removeListener(FoxToPhoneUploadListener);
	},

	performCancelCommand: function(aItem)
	{
		let elm = aItem;

		while (elm.nodeName != "richlistitem" ||
			   elm.getAttribute("type") != "upload")
		  elm = elm.parentNode;

		if (elm.inProgress)
			this.UploadManager.cancelUpload( parseInt(elm.getAttribute("uploadId"), 10) );
	},

	updateStatus: function(aItem)
	{
		let currBytes = Number(aItem.getAttribute("currBytes"));
		let maxBytes = Number(aItem.getAttribute("maxBytes"));

		let elapsedTime = (Date.now() - Number(aItem.getAttribute("startTime"))) / 1000;
		// If we don't have an active upload, assume 0 bytes/sec
		let speed = (currBytes>0) ? currBytes/elapsedTime : 0;
		let lastSec = Number(aItem.getAttribute("lastSeconds"));

		let status, newLast;
		[status, newLast] =
		DownloadUtils.getDownloadStatus(currBytes, maxBytes, speed, lastSec);

		// Update lastSeconds to be the new value
		aItem.setAttribute("lastSeconds", newLast);

		aItem.setAttribute("status", status);
	}

};


