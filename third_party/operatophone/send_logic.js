/*
 * Portions of this page are modifications based on work created and shared 
 * by Google and used according to terms described in the Creative Commons 3.0
 * Attribution License.
 */

var channel;
var socket;
var req = new XMLHttpRequest();

function sendToPhone( data, listener ) {
  req.open('POST', sendUrl, true);
  req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  req.setRequestHeader('X-Same-Domain', 'true');  // XSRF protector

  req.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (req.status == 200) {
        var body = req.responseText;
        if (body.indexOf('OK') == 0) {
          listener(STATUS_SUCCESS);
        } else if (body.indexOf('LOGIN_REQUIRED') == 0) {
          listener(STATUS_LOGIN_REQUIRED);
        } else if (body.indexOf('DEVICE_NOT_REGISTERED') == 0) {
          listener(STATUS_DEVICE_NOT_REGISTERED);
        }
      } else {
    	listener(STATUS_GENERAL_ERROR);
      }
    }
  };

  // title, url and sel have already been encoded...
  var postData = '';
  for(var key in data) {
	  if(postData.length > 1) 
		  postData += '&';
	  if( data[key] !== null ) {
		  opera.postError(key + ' = ' + data[key]);
		  postData += key + '=' + encodeURIComponent( data[key] );
	  }
  }
  //var postData = 'title=' + data.title + '&url=' + data.url + 
  //'&sel=' + data.sel + '&type=' + encodeURIComponent(data.msgType);
  req.send(postData);
}
