/*
 */
package com.google.android.chrometophone.server;

import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.jdo.JDOObjectNotFoundException;
import javax.jdo.PersistenceManager;
import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.android.c2dm.server.C2DMessaging;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.oauth.OAuthService;
import com.google.appengine.api.oauth.OAuthServiceFactory;
import com.google.appengine.api.users.User;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import com.google.appengine.labs.repackaged.org.json.JSONException;
import com.google.appengine.labs.repackaged.org.json.JSONObject;

/**
 * Common code and helpers to handle a request and manipulate device info.
 *
 */
public class RequestInfo {
    private static final Logger log =
        Logger.getLogger(RequestInfo.class.getName());
    private static final String ERROR_STATUS = "ERROR";
    private static final String LOGIN_REQUIRED_STATUS = "LOGIN_REQUIRED";

    public List<DeviceInfo> devices = new ArrayList<DeviceInfo>();

    public String userName;

    private ServletContext ctx;
    public String deviceRegistrationID;

    // Request parameters - transitioning to JSON, but need to support existing
    // code.
    Map<String, String[]> parameterMap;
    JSONObject jsonParams;


    public boolean isAuth() {
        return userName != null;
    }

    /**
     * Authenticate the user, check headers and pull the registration data.
     *
     * @return null if authentication fails.
     * @throws IOException
     */
    public static RequestInfo processRequest(HttpServletRequest req,
            HttpServletResponse resp, ServletContext ctx) throws IOException {

        // Basic XSRF protection
        if (req.getHeader("X-Same-Domain") == null) {
            resp.setStatus(400);
            resp.getWriter().println(ERROR_STATUS + " (Missing X-Same-Domain header)");
            log.warning("Missing X-Same-Domain");
            return null;
        }

        User user = null;
        RequestInfo ri = new RequestInfo();
        ri.ctx= ctx;
        OAuthService oauthService = OAuthServiceFactory.getOAuthService();
        try {
            user = oauthService.getCurrentUser();
            if (user != null) {
                ri.userName = user.getEmail();
            }
        } catch (Throwable t) {
            log.log(Level.INFO, "Non-OAuth request");
            user = null;
        }

        if (user == null) {
            // Try ClientLogin
            UserService userService = UserServiceFactory.getUserService();
            user = userService.getCurrentUser();
            if (user != null) {
                ri.userName = user.getEmail();
            }
        }

        if (req.getContentType().startsWith("application/json")) {
            Reader reader = req.getReader();
            // where is readFully ?
            char[] tmp = new char[2048];
            StringBuffer body = new StringBuffer();
            while (true) {
                int cnt = reader.read(tmp);
                if (cnt <= 0) {
                    break;
                }
                body.append(tmp, 0, cnt);
            }
            try {
                ri.jsonParams = new JSONObject(body.toString());
            } catch (JSONException e) {
                resp.setStatus(500);
                return null;
            }
        } else {
            @SuppressWarnings("unchecked")
            Map<String, String[]> castMap = req.getParameterMap();
            ri.parameterMap = castMap;
        }

        ri.deviceRegistrationID = ri.getParameter("devregid");
        if (ri.deviceRegistrationID != null) {
            ri.deviceRegistrationID = ri.deviceRegistrationID.trim();
            if ("".equals(ri.deviceRegistrationID)) {
                ri.deviceRegistrationID = null;
            }
        }

        if (ri.userName == null) {
            resp.setStatus(200);
            resp.getWriter().println(LOGIN_REQUIRED_STATUS);
            log.info("Missing user, login required");
            return null;
        }

        // check if account was really set on development environment
        if (ri.userName.endsWith("@example.com")) {
          String account = req.getParameter("account");
          if (account != null) {
            log.log(Level.INFO, "Using " + account + " instead of " + ri.userName);
            ri.userName = account;
          }
        }

        if (ctx != null) {
            ri.initDevices(ctx);
        }


        return ri;
    }

    public String getParameter(String name) {
        if (jsonParams != null) {
            return jsonParams.optString(name, null);
        } else {
            String res[] = parameterMap.get(name);
            if (res == null || res.length == 0) {
                return null;
            }
            return res[0];
        }
    }

    /**
     *  Authenticate using the req, fetch devices.
     */
    private RequestInfo() {
    }

    @Override
    public String toString() {
        return userName + " " + devices.size() + " " + jsonParams;
    }

    public RequestInfo(String userN, ServletContext ctx) {
        this.userName = userN;
        this.ctx= ctx;
        if (ctx != null) {
            initDevices(ctx);
        }
    }

    private void initDevices(ServletContext ctx) {
        // Context-shared PMF.
        PersistenceManager pm =
            C2DMessaging.getPMF(ctx).getPersistenceManager();

        try {
            devices = DeviceInfo.getDeviceInfoForUser(pm,
                    userName);
            // cleanup for multi-device
            if (devices.size() > 1) {
                // Make sure there is no 'bare' registration
                // Keys are sorted - check the first
                DeviceInfo first = devices.get(0);
                Key oldKey = first.getKey();
                if (oldKey.toString().indexOf("#") < 0) {
                    log.warning("Removing old-style key " + oldKey.toString());
                    // multiple devices, first is old-style.
                    devices.remove(0);
                    pm.deletePersistent(first);
                }
            }
        } catch (Exception e) {
            log.log(Level.WARNING, "Error loading registrations ", e);
        } finally {
            pm.close();
        }

    }

    // We need to iterate again - can be avoided with a query.
    // delete will fail if the pm is different than the one used to
    // load the object - we must close the object when we're done
    public void deleteRegistration(String regId, String type) {
        if (ctx == null) {
            return;
        }
        PersistenceManager pm =
            C2DMessaging.getPMF(ctx).getPersistenceManager();
        try {
            List<DeviceInfo> registrations = DeviceInfo.getDeviceInfoForUser(pm, userName);
            for (int i = 0; i < registrations.size(); i++) {
                DeviceInfo deviceInfo = registrations.get(i);
                if (deviceInfo.getDeviceRegistrationID().equals(regId)) {
                    pm.deletePersistent(deviceInfo);
                    // Keep looping in case of duplicates
                }
            }
        } catch (JDOObjectNotFoundException e) {
            log.warning("User unknown");
        } catch (Exception e) {
            log.warning("Error unregistering device: " + e.getMessage());
        } finally {
            pm.close();
        }

    }

    public void updateRegistration(String regId, String canonicalRegId) {
      if (ctx == null) {
        return;
      }
      log.fine("Updating regId " + regId + " to canonical " + canonicalRegId);
      PersistenceManager pm = C2DMessaging.getPMF(ctx).getPersistenceManager();
      DeviceInfo device = DeviceInfo.getDeviceInfo(pm, regId);
      device.setDeviceRegistrationID(canonicalRegId);
      pm.currentTransaction().begin();
      pm.makePersistent(device);
      pm.currentTransaction().commit();
    }
}
