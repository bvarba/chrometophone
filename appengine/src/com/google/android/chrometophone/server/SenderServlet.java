/*
 * Copyright 2012 Google Inc.
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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.jdo.PersistenceManager;
import javax.servlet.ServletContext;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Sends a link to a device without using the Chrome extension.
 *
 * Useful for debugging purposes.
 */
public class SenderServlet extends HttpServlet {

  private static final Logger logger = Logger.getLogger(SenderServlet.class.getName());

  private static final String ATTR_LOG = "log";
  private static final String PARAM_ACCOUNT = "account";
  private static final String PARAM_URL = "url";
    
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp)
        throws IOException {
      String account = getParameter(req, PARAM_ACCOUNT);
      String url = getParameter(req, PARAM_URL);
      String log = (String) req.getAttribute(ATTR_LOG);
      resp.setContentType("text/html");
      PrintWriter out = resp.getWriter();
      out.println("<html>");
      out.println("<head>");
      out.println("<title>Sender</title>");
      out.println("</head>");
      out.println("<body>");
      out.println("<h1>Send a link to the phone</h1>");
      if (log != null) {
        out.println("<h3>Log from previous request</h3>");
        out.println(log);
        out.println("<br/>");
      }
      out.write("<form method='POST'>");
      out.println("<table>");
      out.println("<tr><td align='right'>Account:</td><td>" +
          "<input type='text' name='" + PARAM_ACCOUNT + "' value='" + account + "' size='40'>" +
          "</td></tr>");
      out.println("<tr><td align='right'>Link:</td><td>" +
          "<input type='text' name='" + PARAM_URL + "' value='" + url + "' size='80'>" +
          "</td></tr>");
      out.println("<tr><td colspan='2' align='center'>" +
          "<input type='submit' value='Send'/></td></tr>");
      out.println("</table>");
      out.println("</form>");
      
      out.println("</body></html>");
      resp.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {
      String account = getParameter(req, PARAM_ACCOUNT);
      String url = getParameter(req, PARAM_URL);
      ServletContext ctx = getServletContext();
      PersistenceManager pm = C2DMessaging.getPMF(ctx).getPersistenceManager();
      StringBuilder log = new StringBuilder();
      log.append("Getting devices for account ").append(account).append("<br>");
      List<DeviceInfo> devices = DeviceInfo.getDeviceInfoForUser(pm, account);
      pm.close();
      log.append("Number of devices found: ").append(devices.size()).append("<br>");
      for (DeviceInfo device : devices) {
        String type = device.getType();
        String regId = device.getDeviceRegistrationID();
        log.append("Sending ").append(url).append(" to device of type ")
            .append(type).append("<br/>");
        sendLink(req, account, regId, type, url, log);
      }
      
      req.setAttribute(ATTR_LOG, log.toString());
      doGet(req, resp);      
    }

    private void sendLink(HttpServletRequest req, String account, String regId, String type,
        String url, StringBuilder log) throws IOException {
      // use the /send servlet to send the link - we could use C2DMessaging
      // directly, but the whole idea of this servlet is to emulate the
      // Chrome plugin work
      String sendServletUrl = req.getScheme() + "://" + req.getServerName() + ":" + req.getServerPort() +
          "/" + req.getContextPath() + "send";
      String postUrl = sendServletUrl + "?url=" + URLEncoder.encode(url, "UTF-8") + 
          "&deviceType=" + type + "&devregid=" + URLEncoder.encode(regId, "UTF-8") + 
          "&account=" + URLEncoder.encode(account, "UTF-8");

      HttpURLConnection conn = (HttpURLConnection) new URL(postUrl).openConnection();
      conn.setDoOutput(true);
      conn.setUseCaches(false);
      conn.setFixedLengthStreamingMode(0); // no content, just parameters
      conn.setRequestMethod("POST");
      conn.setRequestProperty("X-Same-Domain", "1");
      OutputStream out = null;
      String status = null;
      String responseBody = null;
      try {
        out = conn.getOutputStream();
        out.close();
        int statusCode = conn.getResponseCode();
        status = Integer.toString(statusCode);
        try {
          InputStream stream = (statusCode == 200) ? conn.getInputStream() : conn.getErrorStream();
          responseBody = getString(stream);
          log.append("\tPOST status: ").append(statusCode).append(" Body: ").append(responseBody).append("<br/>");
        } catch (Exception e) {
          logger.log(Level.SEVERE, "Exception posting to " + postUrl, e);
          log.append("POST threw exception: ").append(e);
        }
      } catch (Exception e) {
        logger.log(Level.SEVERE, "Exception posting to " + postUrl, e);
        log.append("POST threw exception: ").append(e);
      }
    }

    private String getParameter(HttpServletRequest req, String name) {
      String value = req.getParameter(name);
      return (value == null || value.trim().length() == 0) ? "" : value.trim();
    }

    private static String getString(InputStream stream) throws IOException {
      BufferedReader reader = new BufferedReader(new InputStreamReader(stream));
      StringBuilder content = new StringBuilder();
      String newLine;
      do {
        newLine = reader.readLine();
        if (newLine != null) {
          content.append(newLine).append('\n');
        }
      } while (newLine != null);
      if (content.length() > 0) {
        // strip last newline
        content.setLength(content.length() - 1);
      }
      return content.toString();
    }
}
