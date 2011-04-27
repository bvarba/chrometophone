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

package com.google.android.chrometophone.server;

import java.io.IOException;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.appengine.api.xmpp.JID;
import com.google.appengine.api.xmpp.Message;
import com.google.appengine.api.xmpp.MessageBuilder;
import com.google.appengine.api.xmpp.XMPPService;
import com.google.appengine.api.xmpp.XMPPServiceFactory;

/**
 * Receives XMPP messages sent to chrometophone@appspot.com or
 * foo@chrometophone.appspotchat.com.
 * 
 * TODO: we can use the address to identify a specific device ( phoneID@... )
 * 
 * The sender is trusted - authenticated with its XMPP client/server.
 * 
 * The chat message can be either a simple URL, or the same as what SendServlet
 * expects, i.e. form-data encoded name/value pairs.
 */
@SuppressWarnings("serial")
public class XMPPSendServlet extends SendServlet {

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        XMPPService xmpp = XMPPServiceFactory.getXMPPService();
        Message message = xmpp.parseMessage(req);

        JID fromJid = message.getFromJid();
        
        String body = message.getBody();

        String jid = fromJid.getId();
        int resIdx = jid.indexOf("/");
        if (resIdx > 0) {
            jid = jid.substring(0, resIdx);
        }
        if (body.equals("register")) {
            
            return;
        }
        
        Map<String, String> params = new HashMap<String, String>();
        
        String[] bodyParts = body.split("&");
        for (String part: bodyParts) {
            String[] keyValue = part.split("=");
            if (keyValue.length > 1) {
                params.put(keyValue[0], URLDecoder.decode(keyValue[1], "UTF-8"));
            }
        }
        
        String sel = params.get("sel");
        if (sel == null) sel = "";  // optional

        String title = params.get("title");
        if (title == null) title = "";  // optional

        String url = params.get("url");
        if (url == null) {
            // Assume the body is the URL - will be sent to all 
            // registered devices.
            url = body;
        }
        
        String deviceName = params.get("deviceName");
        String deviceType = params.get("deviceType");

        
        log.info("Sending " + jid);
        RequestInfo reqInfo = new RequestInfo(jid, getServletContext());
        
        String id = doSendToDevice(url, title, sel, reqInfo,
                    deviceName == null ? null : new String[] {deviceName}, 
                            deviceType);
        // Confirm
        Message respmsg = 
            new MessageBuilder()
            .withBody(id)
            .withRecipientJids(fromJid)
            .withFromJid(message.getRecipientJids()[0]).build();
        xmpp.sendMessage(respmsg);
    }
}
