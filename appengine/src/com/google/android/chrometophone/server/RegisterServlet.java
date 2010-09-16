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
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.jdo.JDOObjectNotFoundException;
import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.android.c2dm.server.C2DMessaging;
import com.google.appengine.api.channel.ChannelServiceFactory;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.oauth.OAuthService;
import com.google.appengine.api.oauth.OAuthServiceFactory;
import com.google.appengine.api.users.User;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

@SuppressWarnings("serial")
public class RegisterServlet extends HttpServlet {
    private static final Logger log =
        Logger.getLogger(RegisterServlet.class.getName());
    private static final String OK_STATUS = "OK";
    private static final String NOT_ENABLED_STATUS = "NOT_ENABLED";
    private static final String LOGIN_REQUIRED_STATUS = "LOGIN_REQUIRED";
    private static final String ERROR_STATUS = "ERROR";

    private static int MAX_DEVICES = 5;

    /**
     * Get the user using the UserService.
     *
     * If not logged in, return an error message.
     *
     * @return user, or null if not logged in.
     * @throws IOException
     */
    static User checkUser(HttpServletRequest req, HttpServletResponse resp,
            boolean errorIfNotLoggedIn) throws IOException {
        // Is it OAuth ?
        User user = null;
        OAuthService oauthService = OAuthServiceFactory.getOAuthService();
        try {
            user = oauthService.getCurrentUser();
            if (user != null) {
                log.info("Found OAuth user " + user);
                return user;
            }
        } catch (Throwable t) {
            user = null;
        }

        UserService userService = UserServiceFactory.getUserService();
        user = userService.getCurrentUser();
        if (user == null && errorIfNotLoggedIn) {
            // TODO: redirect to OAuth/user service login, or send the URL
            // TODO: 401 instead of 400
            resp.setStatus(400);
            resp.getWriter().println(LOGIN_REQUIRED_STATUS);
        }
        return user;
    }

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");

        // Basic XSRF protection
        if (req.getHeader("X-Same-Domain") == null) {
            log.warning("Blocked XSRF");
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (Missing X-Same-Domain header)");
            return;
        }

        String deviceRegistrationId = req.getParameter("devregid");
        if (deviceRegistrationId == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + "(Must specify devregid)");
            return;
        }

        String deviceName = req.getParameter("deviceName");
        if (deviceName == null) {
            deviceName = "Phone";
        }

        String deviceType = req.getParameter("deviceType");
        if (deviceType == null) {
            deviceType = "ac2dm";
        }

        // Because the deviceRegistrationId isn't static, we use a static
        // identifier for the device. (Can be null in older clients)
        String deviceId = req.getParameter("deviceId");

        User user = checkUser(req, resp, true);
        if (user != null) {
            // Context-shared PMF.
            PersistenceManager pm =
                C2DMessaging.getPMF(getServletContext()).getPersistenceManager();

            try {
                List<DeviceInfo> registrations = DeviceInfo.getDeviceInfoForUser(pm,
                        user.getEmail());

                if (registrations.size() > MAX_DEVICES) {
                    // we could return an error - but user can't handle it yet.
                    // we can't let it grow out of bounds.
                    // TODO: we should also define a 'ping' message and expire/remove
                    // unused registrations
                    DeviceInfo oldest = registrations.get(0);
                    long oldestTime = oldest.getRegistrationTimestamp().getTime();
                    for (int i = 1; i < registrations.size(); i++) {
                        if (registrations.get(i).getRegistrationTimestamp().getTime() <
                                oldestTime) {
                            oldest = registrations.get(i);
                            oldestTime = oldest.getRegistrationTimestamp().getTime();
                        }
                    }
                    pm.deletePersistent(oldest);
                }

                // Get device if it already exists, else create
                String suffix =
                        (deviceId != null ? "#" + Long.toHexString(Math.abs(deviceId.hashCode())) : "");
                Key key = KeyFactory.createKey(DeviceInfo.class.getSimpleName(),
                        user.getEmail() + suffix);

                DeviceInfo device = null;
                try {
                    device = pm.getObjectById(DeviceInfo.class, key);
                } catch (JDOObjectNotFoundException e) { }
                if (device == null) {
                    device = new DeviceInfo(key, deviceRegistrationId);
                    device.setType(deviceType);
                    pm.makePersistent(device);
                }

                device.setName(deviceName);  // update display name

                if (device.getType().equals(DeviceInfo.TYPE_CHROME)) {
                    if (device.getPhoneToChromeExperimentEnabled()) {
                        String channelId =
                            ChannelServiceFactory.getChannelService().createChannel(deviceRegistrationId);
                        resp.getWriter().println(OK_STATUS + " " + channelId);
                    } else {
                        resp.setStatus(400);
                        resp.getWriter().println(NOT_ENABLED_STATUS);
                    }
                } else {
                    resp.getWriter().println(OK_STATUS);
                }
            } catch (Exception e) {
                resp.setStatus(500);
                resp.getWriter().println(ERROR_STATUS + " (Error registering device)");
                log.log(Level.WARNING, "Error registering device.", e);
            } finally {
                pm.close();
            }
        }
    }
}
