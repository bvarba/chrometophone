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

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

@SuppressWarnings("serial")
public class AuthServlet extends HttpServlet {
    private static final String ERROR_STATUS = "ERROR";
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (req.getRequestURI().startsWith("/signin")) {
            doSignIn(req, resp);
        } else if (req.getRequestURI().startsWith("/signout")) {
            doSignOut(req, resp);
        }
    }

    private void doSignIn(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // Get the extension return URL
        String extRet = req.getParameter("extret");
        if (extRet == null) {
            resp.setContentType("text/plain");
            resp.getWriter().println(ERROR_STATUS + " (extret parameter missing)");
            return;
        }

        // If login is complete, redirect to the extension page. Otherwise, send user to login,
        // setting the continue page back to this servlet (since UserService does not understand
        // chrome-extension:// URLs
        if (req.getParameter("completed") != null) {
            // Server-side redirects don't work for chrome-extension:// URLs so we do a client-
            // side redirect instead
            resp.getWriter().println("<meta http-equiv=\"refresh\" content=\"0;url=" + extRet + "\">");
        } else {
            String followOnURL = req.getRequestURI() + "?completed=true&extret=" +
                    URLEncoder.encode(extRet, "UTF-8");
            UserService userService = UserServiceFactory.getUserService();
            resp.sendRedirect(userService.createLoginURL(followOnURL));
        }
    }

    private void doSignOut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // Get the extension return URL
        String extRet = req.getParameter("extret");
        if (extRet == null) {
            resp.setContentType("text/plain");
            resp.getWriter().println(ERROR_STATUS + " (extret parameter missing)");
            return;
        }

        // If logout is complete, redirect to the extension page. Otherwise, send user to login,
        // setting the continue page back to this servlet (since UserService does not understand
        // chrome-extension:// URLs
        if (req.getParameter("completed") != null) {
            // Server-side redirects don't work for chrome-extension:// URLs so we do a client-
            // side redirect instead
            resp.getWriter().println("<meta http-equiv=\"refresh\" content=\"0;url=" + extRet + "\">");
        } else {
            String followOnURL = req.getRequestURI() + "?completed=true&extret=" +
                    URLEncoder.encode(extRet, "UTF-8");
            UserService userService = UserServiceFactory.getUserService();
            resp.sendRedirect(userService.createLogoutURL(followOnURL));
        }
    }
}
