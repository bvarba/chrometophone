/*
 */
package com.google.android.chrometophone.server;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class DebugServlet extends HttpServlet {
    
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) {
        // Nothing, we're just looking for logs to find response times and delivery
        // confirmation. 
        // TODO: use memcache to dynamically get statistics.
    }
}
