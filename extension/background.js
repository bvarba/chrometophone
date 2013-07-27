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
function onClickHandler(info, tab) {
  var url = info.srcUrl;
  if (url == undefined) url = info.linkUrl;
  if (url == undefined) url = tab.url;

  var msgType = info.mediaType;
  if (msgType == undefined) msgType = 'page';

  var sel = info.selectionText;
  if (sel == undefined) sel = '';

  var bg = chrome.extension.getBackgroundPage();
  bg.sendToPhone(tab.title, url, msgType, sel, function(status) {
    if (status == STATUS_LOGIN_REQUIRED) {
        // user will have to click the link again
        // TODO: encode the parameters, re-do the post after login
        // or TODO: display the 'login required' message first, if regToken is null
      chrome.tabs.create({url: signInUrl});
    } 
  });
}

if (chrome.contextMenus) {
  chrome.contextMenus.create({'title': chrome.i18n.getMessage('app_name_short'),
                              'documentUrlPatterns': [ 'http://*/*', 'https://*/*' ],
                              'contexts': ['link', 'selection', 'image', 'video', 'audio'],
                              'id': '0'});
  chrome.contextMenus.onClicked.addListener(onClickHandler);
}

initializeBrowserChannel();
