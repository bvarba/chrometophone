// ==UserScript==
// @include *
// ==/UserScript==

// obtain access to all tabs

var ACTION_REGISTER_USERJS = 'register_userjs';
var ACTION_DEREGISTER_USERJS = 'deregister_userjs';
var ACTION_CAPTURE_SELECTION = 'capture_selection';
var ACTION_SEND_PAGE = 'send_to_phone';

function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

if(!window.top.userJS_UUID) {
	window.top.userJS_UUID = guid();
	
	window.addEventListener('focus', function(){
		opera.extension.postMessage({action: ACTION_REGISTER_USERJS, uuid: window.top.userJS_UUID});
	}, false);
	
	window.addEventListener('blur', function(){
		opera.extension.postMessage({action: ACTION_DEREGISTER_USERJS, uuid: window.top.userJS_UUID});
	}, false);
	
	// register this tab as the active userjs onload
	opera.extension.postMessage({action: ACTION_REGISTER_USERJS, uuid: window.top.userJS_UUID});
}

opera.extension.addEventListener('message', function(request) {
	
	//opera.postError('Callback received at UserJS: ' + request.data.action);
	   	
	if(request.data.action==ACTION_CAPTURE_SELECTION 
			&& request.data.uuid==window.top.userJS_UUID) {
		
		var currentUrl = document.location.href;
		
		var pageInfo = {
			action: ACTION_SEND_PAGE,
			data: {
				link: encodeURIComponent(currentUrl),
				title: encodeURIComponent(document.title),
				selection: encodeURIComponent(window.getSelection())
			}
		};
		
		// URL overrides
		if (currentUrl.match(/^http[s]?:\/\/maps\.google\./) ||
				currentUrl.match(/^http[s]?:\/\/www\.google\.[a-z]{2,3}(\.[a-z]{2})\/maps/)) {
		  var link = document.getElementById('link');
		  if (link && link.href)
			  pageInfo.data.link = encodeURIComponent(link.href);
		}
		
		opera.extension.postMessage(pageInfo);
	}
}, false);

//opera.postError("UserJS loaded: " + window.location.href + " / " + window.top.userJS_UUID);