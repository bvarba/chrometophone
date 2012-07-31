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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.jdo.PersistenceManager;
import javax.jdo.Query;
import javax.servlet.ServletContext;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Adds devices whose debug field is not set to the stats, and update the field.
 */
public class StatsConversionServlet extends HttpServlet {
  
    private static final int MAX_ROWS = 500;
    
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp)
        throws IOException{
      ServletContext ctx = getServletContext();
      List<DeviceInfo> devices = null;
      PersistenceManager pm = C2DMessaging.getPMF(ctx).getPersistenceManager();
      Map<String, Integer> conversionsByType = new HashMap<String, Integer>();
      try {
        resp.setContentType("text/html");
        PrintWriter out = resp.getWriter();
        out.println("<html><body>");
        out.println("<head>");
        out.println("<title>Device stats conversion</title>");
        out.println("</head>");
        out.println("<body>");
        int total = 0;
        do {
          Query query = pm.newQuery(DeviceInfo.class);
          query.setFilter("debug == null");
          query.setRange(0, MAX_ROWS);
          @SuppressWarnings("unchecked")
          List<DeviceInfo> uncastDevices = (List<DeviceInfo>) query.execute();
          devices = uncastDevices;
          if (devices.isEmpty()) {
            out.println("<p>No devices need conversion</p>");
          } else {
            int size = devices.size();
            total += size;
            out.println("<p>Converting " + size + " devices...");
            out.flush();
            for (DeviceInfo device : devices) {
              device.setDebug(true);
              pm.currentTransaction().begin();
              pm.makePersistent(device);
              pm.currentTransaction().commit();
              String type = device.getType();
              Integer converted = conversionsByType.get(type);
              if (converted == null) {
                converted = 1;
              } else {
                converted ++;
              }
              conversionsByType.put(type, converted);
            }
          }
          query.closeAll();
          flushStats(pm, conversionsByType);
          out.println(total + " converted so far.</p>");
        } while (devices != null && ! devices.isEmpty());
        out.println("</body></html>");
      } finally {
        pm.close();
      }
      resp.setStatus(HttpServletResponse.SC_OK);
    }

    private void flushStats(PersistenceManager pm, Map<String, Integer> conversionsByType) {
      for (Entry<String, Integer> entry : conversionsByType.entrySet()) {
        String type = entry.getKey();
        int size = entry.getValue();
        DeviceStats stats = DeviceStats.convertsDevice(pm, type, size);
        pm.currentTransaction().begin();
        pm.makePersistent(stats);
        pm.currentTransaction().commit();
      }
      conversionsByType.clear();
    }

}
