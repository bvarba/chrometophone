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

function getPageInfo() {
  var pageInfo = {
    "url": document.location.href,
    "title": document.title,
    "selection": window.getSelection().toString()
  };

  // URL overrides.
  if (pageInfo.url.match(/^http[s]?:\/\/maps\.google\./) ||
      pageInfo.url.match(/^http[s]?:\/\/www\.google\.[a-z]{2,3}(\.[a-z]{2})\/maps/)) {
    var link = document.getElementById('link');
    if (link && link.href) {
      pageInfo.url = link.href;
    }
  }
  return pageInfo;
}

// Respond to extension requests with the current page info.
chrome.extension.onRequest.addListener(
   function(request, sender, sendResponse) {
     if (request == 'run') {
       sendResponse(getPageInfo());
     }
   });

// Allow pages to initiate sending as well.
var element = document.createElement('sendtophone');
element.style.display='none';
element.style.background='url(\'' + chrome.extension.getURL("icon_16.png") + '\')';
element.addEventListener('sendToPhone', function() {
  var pageInfo = getPageInfo();
  pageInfo.selection = element.innerText;
  chrome.extension.sendRequest(pageInfo, function(response) {});
});
document.head.appendChild(element);
