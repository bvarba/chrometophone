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
import java.util.List;

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
      List<DeviceStats> allStats;
      PersistenceManager pm = C2DMessaging.getPMF(ctx).getPersistenceManager();
      try {
        DeviceStats.init(pm);
        allStats = DeviceStats.getAll(pm);
        resp.setContentType("text/html");
        PrintWriter out = resp.getWriter();
        out.println("<html><body>");
        out.println("<head>");
        out.println("<title>Device stats</title>");
        out.println("</head>");
        out.println("<body>");
        out.println("<h3>Device stats</h3>");
        if (allStats.isEmpty()) {
          out.println("<p>No devices registered yet!</p>");
        } else {
          int total = 0;
          int added = 0;
          int deleted = 0;
          int converted = 0;
          for (DeviceStats stats: allStats) {
            total += stats.getTotal();
            added += stats.getAdded();
            deleted += stats.getDeleted();
            converted += stats.getConverted();
          }
          out.println("<table cellspacing='2' cellpadding='2'><tr><th>Type</th>" +
          		"<th>Added</th><th>Deleted</th><th>Converted</th><th>Total</th><th>Share</th></tr>");
          for (DeviceStats stats: allStats) {
            int count = stats.getTotal();
            float share = (total == 0) ? 0 : (100 * count) / total; 
            out.println("<tr>" +
                  "<td align='right'>" + stats.getType() + "</td>" +
                  "<td align='right'>" + stats.getAdded() + "</td>" +
                  "<td align='right'>" + stats.getDeleted() + "</td>" +
                  "<td align='right'>" + stats.getConverted() + "</td>" +
                  "<td align='right'>" + count + "</td>" +
                  "<td align='right'>" + share + "%</td></tr>");
          }
          out.println("<tr>" +
                "<td align='right'>Total</td>" +
                "<td align='right'>" + added + "</td>" +
                "<td align='right'>" + deleted + "</td>" +
                "<td align='right'>" + converted + "</td>" +
                "<td align='right'>" + total + "</td>" +
                "<td align='right'>100.0%</td></tr>");
          out.println("</table>");
        }
        
        out.println("</body></html>");
      } finally {
        pm.close();
      }
      resp.setStatus(HttpServletResponse.SC_OK);
    }
}
