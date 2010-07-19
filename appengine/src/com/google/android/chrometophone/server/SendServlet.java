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
import java.util.logging.Logger;

import javax.jdo.JDOObjectNotFoundException;
import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.android.c2dm.server.C2DMessaging;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.users.User;

@SuppressWarnings("serial")
public class SendServlet extends HttpServlet {
    private static final Logger log =
        Logger.getLogger(SendServlet.class.getName());
    private static final String OK_STATUS = "OK";
    private static final String LOGIN_REQUIRED_STATUS = "LOGIN_REQUIRED";
    private static final String DEVICE_NOT_REGISTERED_STATUS = "DEVICE_NOT_REGISTERED";
    private static final String ERROR_STATUS = "ERROR";

    @Deprecated
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        doPost(req, resp);
    }

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");

        // Check API version
        String apiVersionString = req.getParameter("ver");
        if (apiVersionString == null) apiVersionString = "1";
        int apiVersion = Integer.parseInt(apiVersionString);
        if (apiVersion < 3) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS +
                    " (Please remove old Chrome extension and install latest)");
            log.warning("Old extension version not supported: " + apiVersion);
            return;
        }

        // Basic XSRF protection (TODO: remove X-Extension in a future release for consistency)
        if (req.getHeader("X-Same-Domain") == null && req.getHeader("X-Extension") == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (Missing header)");
            log.warning("Missing header");
            return;
        }

        String sel = req.getParameter("sel");
        if (sel == null) sel = "";  // optional

        String url = req.getParameter("url");
        String title = req.getParameter("title");
        if (url == null || title == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (Must specify url and title parameters)");
            return;
        }

        User user = RegisterServlet.checkUser(req, resp, false);
        if (user != null) {
            doSendToPhone(url, title, sel, user.getEmail(), resp);
        } else {
            resp.getWriter().println(LOGIN_REQUIRED_STATUS);
        }
    }

    private boolean doSendToPhone(String url, String title, String sel,
            String userAccount, HttpServletResponse resp) throws IOException {
        // Get device info
        DeviceInfo deviceInfo = null;
        // Shared PMF
        PersistenceManager pm =
                C2DMessaging.getPMF(getServletContext()).getPersistenceManager();
        try {
            Key key = KeyFactory.createKey(DeviceInfo.class.getSimpleName(), userAccount);
            try {
                deviceInfo = pm.getObjectById(DeviceInfo.class, key);
            } catch (JDOObjectNotFoundException e) {
                log.warning("Device not registered");
                resp.getWriter().println(DEVICE_NOT_REGISTERED_STATUS);
                return false;
            }
        } finally {
            pm.close();
        }

        // Send push message to phone
        C2DMessaging push = C2DMessaging.get(getServletContext());
        boolean res = false;
        String collapseKey = "" + url.hashCode();
        if (deviceInfo.getDebug()) {
            res = push.sendNoRetry(deviceInfo.getDeviceRegistrationID(),
                    collapseKey,
                    "url", url,
                    "title", title,
                    "sel", sel,
                    "debug", "1");

        } else {
            res = push.sendNoRetry(deviceInfo.getDeviceRegistrationID(),
                    collapseKey,
                    "url", url,
                    "title", title,
                    "sel", sel);
        }
        if (res) {
            log.info("Link sent to phone! collapse_key:" + collapseKey);
            resp.getWriter().println(OK_STATUS);
            return true;
        } else {
            log.warning("Error: Unable to send link to phone.");
            resp.setStatus(500);
            resp.getWriter().println(ERROR_STATUS + " (Unable to send link)");
            return false;
        }
    }
}
