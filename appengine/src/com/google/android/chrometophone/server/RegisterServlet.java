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

import javax.jdo.PersistenceManager;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.android.c2dm.server.C2DMessaging;
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
    private static final String ERROR_STATUS = "ERROR";

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
            resp.getWriter().println(ERROR_STATUS + " (Not authorized)");
        }
        return user;
    }

    /**
     * @deprecated will be removed in next rel.
     */
    @Deprecated
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        doPost(req, resp);
    }

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");

        // Basic XSRF protection
        if (req.getHeader("X-Same-Domain") == null) {
            // TODO: Enable at consumer launch
            //resp.setStatus(400);
            //resp.getWriter().println(ERROR_STATUS + " (Missing X-Same-Domain header)");
            //return;
        }

        String deviceRegistrationID = req.getParameter("devregid");
        if (deviceRegistrationID == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + "(Must specify devregid)");
            return;
        }

        User user = checkUser(req, resp, true);
        if (user != null) {
            Key key = KeyFactory.createKey(DeviceInfo.class.getSimpleName(), user.getEmail());
            DeviceInfo device = new DeviceInfo(key, deviceRegistrationID);
            // Context-shared PMF.
            PersistenceManager pm =
                    C2DMessaging.getPMF(getServletContext()).getPersistenceManager();
            try {
                pm.makePersistent(device);
                resp.getWriter().println(OK_STATUS);
            } catch (Exception e) {
                resp.setStatus(500);
                resp.getWriter().println(ERROR_STATUS + " (Error registering device)");
                log.warning("Error registering device.");
            } finally {
                pm.close();
            }
        }
    }
}
