var Cc = Components.classes;
var Ci = Components.interfaces;
let Cu = Components.utils;
Cu.import("resource://gre/modules/DownloadUtils.jsm");
Cu.import("resource://gre/modules/PluralForm.jsm");

Cu.import("resource://sendtophone/uploadsManager.js");

let gUploadManager = sendtophoneUploadsManager;
let gUploadsView = null;

function addFile(upload)
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

	gUploadsView.appendChild( dl );
}

function checkPendingUploads()
{
	if (gUploadsView.children.length==0)
		window.close();
}

function cancelUpload(item)
{
	gUploadManager.cancelUpload( parseInt(item.getAttribute("uploadId"), 10) );
}

let gUploadListener = {
	fileAdded: function(data)
	{
		addFile(data);
	},
	progressUpdate: function(data)
	{
		let item = document.getElementById( "upl" + data.id);
		item.setAttribute("currBytes", data.currBytes);
		item.setAttribute("maxBytes", data.maxBytes);
		
		let percentComplete = Math.round(100 * data.currBytes / data.maxBytes);
		item.setAttribute("progress", percentComplete);

		// Status text
		updateStatus(item);
	},
	fileFinished: function(data)
	{
		let item = document.getElementById("upl" + data.id);
		gUploadsView.removeChild(item);
	
		// If no more pending uploads, close the tab.
		//		Use a 0 ms timeout to avoid flicker while compress -> upload a folder
		window.setTimeout( checkPendingUploads, 0);
	}
};


function Startup()
{
	gUploadsView = document.getElementById("UploadsBox");

	gUploadManager.addListener(gUploadListener);

	for (let id in gUploadManager.uploads)
		addFile( gUploadManager.uploads[id] );

}

function Shutdown()
{
	gUploadManager.removeListener(gUploadListener);
}


////////////////////////////////////////////////////////////////////////////////
//// Command Updating and Command Handlers

var gUploadViewController = {
  isCommandEnabled: function(aCommand, aItem)
  {
    let dl = aItem;

    switch (aCommand) {
      case "cmd_cancel":
        return dl.inProgress;
    }
    return false;
  },

  doCommand: function(aCommand, aItem)
  {
    if (this.isCommandEnabled(aCommand, aItem))
      this.commands[aCommand](aItem);
  },

  commands: {
    cmd_cancel: function(aSelectedItem) {
      cancelUpload(aSelectedItem);
    }
  }
};

/**
 * Helper function to do commands.
 *
 * @param aCmd
 *        The command to be performed.
 * @param aItem
 *        The richlistitem that represents the download that will have the
 *        command performed on it. If this is null, the command is performed on
 *        all downloads. If the item passed in is not a richlistitem that
 *        represents a download, it will walk up the parent nodes until it finds
 *        a DOM node that is.
 */
function performCommand(aCmd, aItem)
{
  let elm = aItem;

    while (elm.nodeName != "richlistitem" ||
           elm.getAttribute("type") != "upload")
      elm = elm.parentNode;

  gUploadViewController.doCommand(aCmd, elm);
}

function updateStatus(aItem) 
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
