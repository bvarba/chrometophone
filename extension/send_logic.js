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

var apiVersion = 5;
var baseUrl = 'https://chrometophone.appspot.com';
var sendUrl = baseUrl + '/send?ver=' + apiVersion;
var signInUrl = baseUrl + '/signin?extret=' +
    encodeURIComponent(chrome.extension.getURL('help.html')) + '%23signed_in&ver=' + apiVersion;
var signOutUrl = baseUrl + '/signout?extret=' +
    encodeURIComponent(chrome.extension.getURL('signed_out.html')) + '&ver=' + apiVersion;

var STATUS_SUCCESS = 'success';
var STATUS_LOGIN_REQUIRED = 'login_required';
var STATUS_DEVICE_NOT_REGISTERED = 'device_not_registered';
var STATUS_GENERAL_ERROR = 'general_error';

var req = new XMLHttpRequest();

function sendToPhone(title, url, msgType, selection, listener) {
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
  }

  var data = 'title=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url) +
      '&sel=' + encodeURIComponent(selection) + '&type=' + encodeURIComponent(msgType);
  req.send(data);
}

