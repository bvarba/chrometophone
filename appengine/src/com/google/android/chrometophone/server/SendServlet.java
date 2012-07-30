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

import com.google.android.c2dm.server.C2DMessaging;
import com.google.appengine.api.channel.ChannelMessage;
import com.google.appengine.api.channel.ChannelServiceFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.logging.Logger;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@SuppressWarnings("serial")
public class SendServlet extends HttpServlet {
    static final Logger log =
        Logger.getLogger(SendServlet.class.getName());
    private static final String OK_STATUS = "OK";
    private static final String DEVICE_NOT_REGISTERED_STATUS = "DEVICE_NOT_REGISTERED";
    private static final String ERROR_STATUS = "ERROR";

    // GET not supported

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");

        RequestInfo reqInfo = RequestInfo.processRequest(req, resp,
                getServletContext());
        if (reqInfo == null) {
            return;
        }

        String sel = reqInfo.getParameter("sel");
        if (sel == null) sel = "";  // optional

        String title = reqInfo.getParameter("title");
        if (title == null) title = "";  // optional

        String url = reqInfo.getParameter("url");
        if (url == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (Must specify url parameter)");
            return;
        }
        logUrlType(url, sel);

        String deviceName = reqInfo.getParameter("deviceName");
        String[] deviceNames = deviceName != null ?
                deviceName.split(",") : null;

        String deviceType = reqInfo.getParameter("deviceType");

        String id = doSendToDevice(url, title, sel, reqInfo,
                deviceNames, deviceType);

        if (id.startsWith(ERROR_STATUS)) {
            resp.setStatus(500);
        }
        resp.getWriter().println(id);
    }
    
    protected String doSendToDevice(String url, String title,
            String sel, RequestInfo reqInfo,
            String deviceNames[], String deviceType) throws IOException {

        // ok = we sent to at least one device.
        boolean ok = false;

        // Send push message to phone
        C2DMessaging push = C2DMessaging.get(getServletContext());
        boolean res = false;

        String collapseKey = "" + url.hashCode();

        boolean reqDebug = "1".equals(reqInfo.getParameter("debug"));

        int ac2dmCnt = 0;
        Iterator<DeviceInfo> iterator = reqInfo.devices.iterator();
        while (iterator.hasNext()) {
            DeviceInfo deviceInfo = iterator.next();
            if ("ac2dm".equals(deviceInfo.getType())) {
                ac2dmCnt++;
            }
            if (deviceNames != null) {
                boolean found = false;
                for (int i = 0; i < deviceNames.length; i++) {
                    if (deviceNames[i].equals(deviceInfo.getName())) {
                        found = true;
                        break;
                    }
                }
                if (!found) continue;  // user-specified device name
            }

            if (deviceType != null && !deviceType.equals(deviceInfo.getType())) {
                continue;  // user-specified device type
            }

            if (deviceInfo.getType().equals(DeviceInfo.TYPE_CHROME)) {
                res = doSendViaBrowserChannel(url, deviceInfo);
            } else {
                res = doSendViaC2dm(url, title, sel, push, collapseKey,
                        deviceInfo, reqDebug);
            }

            if (res) {
                log.info("Link sent to phone! collapse_key:" + collapseKey);
                ok = true;
            } else {
                log.warning("Error: Unable to send link to device: " +
                        deviceInfo.getDeviceRegistrationID());
                IOException ex = C2DMessaging.getC2dmException();
                if (ex != null) {
                    if ("InvalidRegistration".equals(ex.getMessage())) {
                      // Prune device, it no longer works
                      reqInfo.deleteRegistration(deviceInfo.getDeviceRegistrationID());
                      iterator.remove();
                      ac2dmCnt--;
                    } else {
                      throw ex;
                    }
                }
            }
        }

        if (ok) {
            // TODO: return a count of devices we sent to, maybe names as well
            return OK_STATUS;
        } else {
            // Show the 'no devices' if only the browser is registered.
            // We should also clarify that 'error status' mean no matching
            // device found ( when the extension allow specifying the destination )
            if (ac2dmCnt == 0 && "ac2dm".equals(deviceType)) {
                log.warning("No device registered for " + reqInfo.userName);
                return DEVICE_NOT_REGISTERED_STATUS;
            } else {
                return ERROR_STATUS + " (Unable to send link)";
            }
        }
    }

    private boolean doSendViaC2dm(String url, String title, String sel, C2DMessaging push,
            String collapseKey, DeviceInfo deviceInfo, boolean reqDebug) {

        // Trim title, sel if needed.
        if (url.length() + title.length() + sel.length() > 1000) {
            // Shorten the title - C2DM has a 1024 limit, some padding for keys
            if (title.length() > 16) {
                title = title.substring(0, 16);
            }
            // still not enough ?
            if (title.length() + url.length() + sel.length() > 1000) {
                // how much space we have for sel ?
                int space = 1000 - url.length() - title.length();
                if (space > 0 && sel.length() > space) {
                    sel = sel.substring(0, space);
                } // else: we'll get an error sending
            }
        }

        boolean res;
        res = push.sendNoRetry(deviceInfo.getDeviceRegistrationID(),
                collapseKey,
                "url", url,
                "title", title,
                "sel", sel,
                "debug", deviceInfo.getDebug() || reqDebug ? "1" : null);
        return res;
    }

    private boolean doSendViaBrowserChannel(String url, DeviceInfo deviceInfo) {
        String channelToken = deviceInfo.getDeviceRegistrationID();
        ChannelServiceFactory.getChannelService().sendMessage(
                new ChannelMessage(channelToken, url));
        return true;
    }

    private void logUrlType(String url, String sel) {
        String type = "link";  // default
        if (sel != null && sel.matches("([Tt]el[:]?)?\\s?[+]?(\\(?[0-9|\\s|\\-|\\.]\\)?)+")) {
            type = "phone number";
        } else if (url.matches("http://maps\\.google\\.[a-z]{2,3}(\\.[a-z]{2})?[/?].*") ||
                url.matches("http://www\\.google\\.[a-z]{2,3}(\\.[a-z]{2})?/maps.*")) {
            type = "Maps";
        } else if (url.matches("http://www\\.youtube\\.[a-z]{2,3}(\\.[a-z]{2})?/.*")) {
            type = "YouTube";
        }
        log.info("URL type: " + type);
    }
}
