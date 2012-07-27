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

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Map;
import java.util.Map.Entry;

import javax.jdo.PersistenceManager;
import javax.servlet.ServletContext;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Shows the statistics of how many devices use C2DM or GCM.
 *
 * Useful for debugging purposes.
 */
public class StatsServlet extends HttpServlet {
    
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp)
        throws IOException{
      ServletContext ctx = getServletContext();
      PersistenceManager pm = C2DMessaging.getPMF(ctx).getPersistenceManager();
      Map<String, Integer> stats = DeviceInfo.getDevicesUsage(pm);
      pm.close();

      resp.setContentType("text/html");
      PrintWriter out = resp.getWriter();
      out.println("<html><body>");
      out.println("<head>");
      out.println("<title>Device stats</title>");
      out.println("</head>");
      out.println("<body>");
      out.println("<h3>Device stats</h3>");
      if (stats.isEmpty()) {
        out.println("<p>No devices registered yet!</p>");
      } else {
        int total = 0;
        for (Integer count : stats.values()) {
          total += count;
        }

        out.println("<table cellspacing='2' cellpadding='2'><tr><th>Type</th>" +
        		"<th>Count</th><th>Share</th></tr>");
        for (Entry<String, Integer> entry : stats.entrySet()) {
          String type = entry.getKey();
          int count = entry.getValue();
          float share = (100*count) / total; 
          out.println("<tr>" +
                "<td align='right'>" + type + "</td>" +
                "<td align='right'>" + count + "</td>" +
                "<td align='right'>" + share + "%</td></tr>");
        }
        out.println("<tr>" +
              "<td align='right'>Total</td>" +
              "<td align='right'>" + total+ "</td>" +
              "<td align='right'>100.0%</td></tr>");
        out.println("</table>");
      }
      
      out.println("</body></html>");
      resp.setStatus(HttpServletResponse.SC_OK);
    }
}
