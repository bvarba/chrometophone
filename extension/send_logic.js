/*
 * Copyright 2010 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var apiVersion = 6;

var deviceRegistrationId = localStorage['deviceRegistrationId'];
if (deviceRegistrationId == undefined || deviceRegistrationId == null) {
  deviceRegistrationId = (Math.random() + '').substring(3);
  localStorage['deviceRegistrationId'] = deviceRegistrationId;
}

// For dev purpose can be changed to custom server or specific version,
// use javascript console
var host = localStorage['c2dmHost'];
if (host == undefined) {
  // This won't work very well if the URL is x.chrometophone.appspot.com,
  // there is a cert validation issue (cert is for *.appspot.com ), 
  // workaround is to open the URL in the browser and accept the cert
  // warnings.
  host = "chrometophone.appspot.com";
}
var baseUrl = 'https://' + host;
var sendUrl = baseUrl + '/send?ver=' + apiVersion;

var registerUrl =  baseUrl + '/register?ver=' + apiVersion;

var STATUS_SUCCESS = 'success';
var STATUS_LOGIN_REQUIRED = 'login_required';
var STATUS_DEVICE_NOT_REGISTERED = 'device_not_registered';
var STATUS_GENERAL_ERROR = 'general_error';

var oauth = ChromeExOAuth.initBackgroundPage({
    'request_url' : baseUrl + '/_ah/OAuthGetRequestToken',
    'authorize_url' : baseUrl + '/_ah/OAuthAuthorizeToken',
    'access_url' : baseUrl + '/_ah/OAuthGetAccessToken',
    'consumer_key' : 'anonymous',
    'consumer_secret' : 'anonymous',
    'scope' : baseUrl,
    'app_name' : 'Chrome To Phone'
});

var channel;
var socket;
var socketCloseRequested;

function sendToPhone(title, url, msgType, selection, listener) {
  if (oauth.hasToken()) {
    var params = {
      "title": title,
      "url": url, 
      "sel": selection,
      "type": msgType,
      "deviceType":"ac2dm",
      "debug": "1",
      "token": localStorage['deviceRegistrationId'] 
    };
    
    // No longer passing device name - this may be customized
    var data = JSON.stringify(params);
    oauth.sendSignedRequest(baseUrl + "/send", function(responseText, req) {
      if (req.status == 200) {
        var body = req.responseText;
        if (body.indexOf('OK') == 0) {
          listener(STATUS_SUCCESS, "");
        } else if (body.indexOf('LOGIN_REQUIRED') == 0) {
          listener(STATUS_LOGIN_REQUIRED, responseText);
        } else if (body.indexOf('DEVICE_NOT_REGISTERED') == 0) {
          listener(STATUS_DEVICE_NOT_REGISTERED, responseText);
        }
      } else {
        listener(STATUS_GENERAL_ERROR, responseText);
      }
    }, {
        'method': 'POST',
        'body': data,
        'headers': {
          'X-Same-Domain': 'true',
          'Content-Type': 'application/json;charset=UTF-8'  
        }
      });
      return;
    } else {
      listener(STATUS_LOGIN_REQUIRED, "Login required");
    }
}

function initializeBrowserChannel() {
  // Disabled pending more QA
  return;

  if (!oauth.hasToken()) {
    console.log('Login required for initializeBrowserChannel');
    return;
  }

  console.log(new Date().toTimeString() + ' Initializing browser channel');
  socketCloseRequested = false;
  var params = {
    "devregid": deviceRegistrationId,
    "deviceId": deviceRegistrationId,
    "ver": apiVersion,
    "deviceType": "chrome",
    "debug":"1",
    "deviceName":"Chrome"
  };
  var data = JSON.stringify(params);
  
  oauth.sendSignedRequest(baseUrl + "/register", function(responseText, req) {
    if (req.status == 200) {
      var channelId = req.responseText.substring(3).trim();  // expect 'OK <id>';
      channel = new goog.appengine.Channel(channelId);
      console.log(new Date().toTimeString() + ' Opening channel...');
      socket = channel.open();
      socket.onopen = function() {
        console.log(new Date().toTimeString() + ' Browser channel initialized');
      }
      socket.onclose = function() {
        console.log(new Date().toTimeString() + ' Browser channel closed');
        if (!socketCloseRequested) {
          console.log(new Date().toTimeString() + ' Reconnecting...');
          setTimeout('initializeBrowserChannel()', 0);
        } 
      }
      socket.onerror = function(error) {
        if (error.code == 401) {  // token expiry
          console.log(new Date().toTimeString() + ' Browser channel token expired');
        } else {
          console.log(new Date().toTimeString() + ' Browser channel error');
          socket.close();
        }
        // Reconnects in onclose()
      }
      socket.onmessage = function(evt) {
        console.log("Onmessage " + evt.data);
        var url = unescape(evt.data);
        var regex = /http[s]?:\/\//;
        if (regex.test(url)) { 
          chrome.tabs.create({url: url})
        }
      }
    } else if (req.status == 400) {
      if (req.responseText.indexOf('LOGIN_REQUIRED') == 0) {
        console.log(new Date().toTimeString() + ' Not initializing browser channel because user not logged in');
      }
    } else {  // server not happy, random backoff
      var delay = Math.round(Math.random() * 20000);
      console.log(new Date().toTimeString() + ' Failed to register browser channel (' + req.status + '), retrying in ' + delay + 'ms');
      setTimeout('initializeBrowserChannel()', delay);
    }
  }, {
      'method': 'POST',
      'body': data,
      'headers': {
        'X-Same-Domain': 'true',
        'Content-Type': 'application/json'  
      }
  });
}

function closeBrowserChannel() {
  socketCloseRequested = true;
  if (socket) socket.close();
}
