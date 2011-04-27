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
import java.net.URLEncoder;
import java.util.logging.Logger;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

/**
 * Handles login/logout requests by redirecting to the cookie-based login page.
 * Has logic to handle redirect limitations, the redirect URL can't be a chrome
 * URL. 
 * 
 * Not needed if OAuth1 is used.  
 */
@SuppressWarnings("serial")
public class AuthServlet extends HttpServlet {
    private static final Logger log =
        Logger.getLogger(SendServlet.class.getName());
    private static final String ERROR_STATUS = "ERROR";

    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/html");
        boolean signIn = req.getRequestURI().startsWith("/signin");

        // Get the extension return URL
        String extRet = req.getParameter("extret");
        if (extRet == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (extret parameter missing)");
            return;
        }
        
        // If login/logout is complete, redirect to the extension page. Otherwise, send user to
        // login/logout, setting the continue page back to this servlet (since UserService does
        // not understand chrome-extension:// URLs)
        if (req.getParameter("completed") != null) {
            // Server-side redirects don't work for chrome-extension:// URLs so we do a client-
            // side redirect instead

            // Sanitize the extRet URL for XSS protection
            String regExChromeOld = "chrome-extension://[a-z]+" +
                    (signIn ? "/signed_in\\.html" : "/signed_out\\.html");  // TODO: Deprecated 04/08/10
            String regExChrome = "chrome-extension://[a-z]+" +
                    (signIn ? "/help\\.html(#signed_in)?" : "/signed_out\\.html");
            String regExFirefox = "http://code\\.google\\.com/p/chrometophone/logo\\?" +
                    (signIn ? "login" : "logout");
            if (extRet.matches(regExChromeOld) || extRet.matches(regExChrome) ||
                    extRet.matches(regExFirefox)) {
                resp.getWriter().println("<meta http-equiv=\"refresh\" content=\"0;url=" + extRet + "\">");
            } else {
                resp.setStatus(400);
                resp.getWriter().println(ERROR_STATUS + " (invalid redirect)");
                log.warning("Invalid redirect " + extRet);
            }
        } else {
            // Called directly from extension, redirect
            String followOnURL = req.getRequestURI() + "?completed=true" +
            		"&extret=" + URLEncoder.encode(extRet, "UTF-8");
            UserService userService = UserServiceFactory.getUserService();
            resp.sendRedirect(signIn ? userService.createLoginURL(followOnURL) :
                    userService.createLogoutURL(followOnURL));
        }
    }
}
