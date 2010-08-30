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
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

@SuppressWarnings("serial")
public class UnregisterServlet extends HttpServlet {
    private static final Logger log =
        Logger.getLogger(RegisterServlet.class.getName());
    private static final String OK_STATUS = "OK";
    private static final String ERROR_STATUS = "ERROR";

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");

        // Basic XSRF protection
        if (req.getHeader("X-Same-Domain") == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (Missing X-Same-Domain header)");
            return;
        }

        String deviceRegistrationID = req.getParameter("devregid");
        if (deviceRegistrationID == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (Must specify devregid)");
            return;
        }
        
        // Authorize & store device info
        UserService userService = UserServiceFactory.getUserService();
        User user = userService.getCurrentUser();
        if (user != null) {
            PersistenceManager pm =
                    C2DMessaging.getPMF(getServletContext()).getPersistenceManager();
            try {
                List<DeviceInfo> registrations = DeviceInfo.getDeviceInfoForUser(pm, user.getEmail());
                for (int i = 0; i < registrations.size(); i++) {
                    DeviceInfo deviceInfo = registrations.get(i);
                    if (deviceInfo.getDeviceRegistrationID().equals(deviceRegistrationID)) {
                        pm.deletePersistent(deviceInfo);
                        registrations.remove(i);
                        break;
                    }
                }
                
                resp.getWriter().println(OK_STATUS);
            } catch (JDOObjectNotFoundException e) {
                resp.setStatus(400);
                resp.getWriter().println(ERROR_STATUS + " (User unknown)");
                log.warning("User unknown");
            } catch (Exception e) {
                resp.setStatus(500);
                resp.getWriter().println(ERROR_STATUS + " (Error unregistering device)");
                log.warning("Error unregistering device: " + e.getMessage());
            } finally {
                pm.close();
            }
        } else {
            resp.getWriter().println(ERROR_STATUS + " (Not authorized)");
        }
    }
}
