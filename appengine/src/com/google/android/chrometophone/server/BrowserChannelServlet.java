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

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.appengine.api.channel.ChannelMessage;
import com.google.appengine.api.channel.ChannelService;
import com.google.appengine.api.channel.ChannelServiceFactory;
import com.google.appengine.api.users.User;

@SuppressWarnings("serial")
public class BrowserChannelServlet extends HttpServlet {
    private static final String OK_STATUS = "OK";
    private static final String LOGIN_REQUIRED_STATUS = "LOGIN_REQUIRED";
    private static final String ERROR_STATUS = "ERROR";

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");

        // Basic XSRF protection
        if (req.getHeader("X-Same-Domain") == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS);
            return;
        }

        User user = RegisterServlet.checkUser(req, resp, false);
        if (user == null) {
            resp.setStatus(400);
            resp.getWriter().println(LOGIN_REQUIRED_STATUS);
        } else {
            String channelToken = String.valueOf(user.hashCode());  // channel per user
            String data = req.getParameter("data");
            if (data != null) {  // send data
                getChannelService().sendMessage(new ChannelMessage(channelToken, data));
                resp.getWriter().print(OK_STATUS);
            } else {  // setup channel
                String channelId = getChannelService().createChannel(channelToken);
                resp.getWriter().print(channelId);
            }
        }
    }

    private ChannelService getChannelService() {
        return ChannelServiceFactory.getChannelService();
    }
}
