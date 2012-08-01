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

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@SuppressWarnings("serial")
public class UnregisterServlet extends HttpServlet {
    private static final String OK_STATUS = "OK";
    private static final String ERROR_STATUS = "ERROR";

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");

        RequestInfo reqInfo = RequestInfo.processRequest(req, resp, 
                getServletContext());
        if (reqInfo == null) {
            return;
        }

        if (reqInfo.deviceRegistrationID == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (Must specify devregid)");
            return;
        }

        String deviceType = reqInfo.getParameter("deviceType");
        if (deviceType == null) {
            deviceType = "ac2dm";
        }

        reqInfo.deleteRegistration(reqInfo.deviceRegistrationID, deviceType);
        resp.getWriter().println(OK_STATUS);
    }
}
