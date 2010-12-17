// ==UserScript==
// @include http://*
// @include https://*
// ==/UserScript==

if ( window.location === window.parent.location) {
	
	var ACTION_CAPTURE_SELECTION = 'capture_selection';
	var ACTION_SEND_PAGE = 'send_to_phone';
	var ACTION_CLOSE_TAB = 'close_tab';
	
	var currentUrl = document.location.href;
	
	opera.extension.addEventListener( 'message', function( message ) {
		if( message.data.action === ACTION_CAPTURE_SELECTION ) {
			var pageInfo = {
				action: ACTION_SEND_PAGE,
				data: {
					link: currentUrl,
					title: document.title,
					selection: window.getSelection() ? window.getSelection().toString() : null
				}
			};
			// URL overrides
			if ( currentUrl.match( /^http[s]?:\/\/maps\.google\./i ) ||
					currentUrl.match( /^http[s]?:\/\/www\.google\.[a-z]{2,3}(\.[a-z]{2})\/maps/i ) ) {
			  var link = document.getElementById('link');
			  if (link && link.href)
				  pageInfo.data.link = link.href;
			}
			opera.extension.postMessage( pageInfo );
		}
	}, false);
	
	function findAndReplace(searchText, replacement, searchNode) {
	    if (!searchText || typeof replacement === 'undefined') {
	        // Throw error here if you want...
	        return;
	    }
	    var regex = typeof searchText === 'string' ?
	                new RegExp(searchText, 'g') : searchText,
	        childNodes = (searchNode || document.body).childNodes,
	        cnLength = childNodes.length,
	        excludes = 'html,head,style,title,link,meta,script,object,iframe';
	    while (cnLength--) {
	        var currentNode = childNodes[cnLength];
	        if (currentNode.nodeType === 1 &&
	            (excludes + ',').indexOf(currentNode.nodeName.toLowerCase() + ',') === -1) {
	            arguments.callee(searchText, replacement, currentNode);
	        }
	        if (currentNode.nodeType !== 3 || !regex.test(currentNode.data) ) {
	            continue;
	        }
	        var parent = currentNode.parentNode,
	            frag = (function(){
	                var html = currentNode.data.replace(regex, replacement),
	                    wrap = document.createElement('div'),
	                    frag = document.createDocumentFragment();
	                wrap.innerHTML = html;
	                while (wrap.firstChild) {
	                    frag.appendChild(wrap.firstChild);
	                }
	                return frag;
	            })();
	        parent.insertBefore(frag, currentNode);
	        parent.removeChild(currentNode);
	    }
	}
	window.addEventListener( 'DOMContentLoaded', function() {
		if( currentUrl.match( /^http[s]?:\/\/www\.google\.com\/accounts\/ServiceLogin\?(.*)?ahname=Chrome\+to\+Phone(.*)?$/i ) ) {
			// Opera log in message so users know what they are logging in to.
			findAndReplace('Chrome', 'Opera', document.body); 
		} else if (currentUrl.match( /^http:\/\/code\.google\.com\/p\/chrometophone\/logo(.*)?$/i )) {
			opera.extension.postMessage({
				action: ACTION_CLOSE_TAB
			});
		}
	}, false);

}
