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
package com.google.android.apps.chrometophone;

import java.util.ArrayList;
import java.util.List;

import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.message.BasicNameValuePair;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings.Secure;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.WindowManager;

/**
 * Register/unregister with the Chrome to Phone App Engine server.
 */
public class DeviceRegistrar {
    public static final String STATUS_EXTRA = "Status";
    public static final int REGISTERED_STATUS = 1;
    public static final int AUTH_ERROR_STATUS = 2;
    public static final int UNREGISTERED_STATUS = 3;
    public static final int ERROR_STATUS = 4;

    private static final String TAG = "DeviceRegistrar";
    static final String SENDER_ID = "stp.chrome@gmail.com";

    private static final String REGISTER_PATH = "/register";
    private static final String UNREGISTER_PATH = "/unregister";

    public static void registerWithServer(final Context context,
          final String deviceRegistrationID) {
        new Thread(new Runnable() {
            public void run() {
                Intent updateUIIntent = new Intent("com.google.ctp.UPDATE_UI");
                try {
                    HttpResponse res = makeRequest(context, deviceRegistrationID, REGISTER_PATH);
                    if (res.getStatusLine().getStatusCode() == 200) {
                        SharedPreferences settings = Prefs.get(context);
                        SharedPreferences.Editor editor = settings.edit();
                        editor.putString("deviceRegistrationID", deviceRegistrationID);
                        editor.commit();
                        updateUIIntent.putExtra(STATUS_EXTRA, REGISTERED_STATUS);
                    } else if (res.getStatusLine().getStatusCode() == 400) {
                        updateUIIntent.putExtra(STATUS_EXTRA, AUTH_ERROR_STATUS);
                    } else {
                        Log.w(TAG, "Registration error " +
                                String.valueOf(res.getStatusLine().getStatusCode()));
                        updateUIIntent.putExtra(STATUS_EXTRA, ERROR_STATUS);
                    }
                    context.sendBroadcast(updateUIIntent);
                } catch (AppEngineClient.PendingAuthException pae) {
                    // Ignore - we'll reregister later
                } catch (Exception e) {
                    Log.w(TAG, "Registration error " + e.getMessage());
                    updateUIIntent.putExtra(STATUS_EXTRA, ERROR_STATUS);
                    context.sendBroadcast(updateUIIntent);
                }
            }
        }).start();
    }

    public static void unregisterWithServer(final Context context,
            final String deviceRegistrationID) {
        new Thread(new Runnable() {
            public void run() {
                Intent updateUIIntent = new Intent("com.google.ctp.UPDATE_UI");
                try {
                    HttpResponse res = makeRequest(context, deviceRegistrationID, UNREGISTER_PATH);
                    if (res.getStatusLine().getStatusCode() == 200) {
                        SharedPreferences settings = Prefs.get(context);
                        SharedPreferences.Editor editor = settings.edit();
                        editor.remove("deviceRegistrationID");
                        editor.commit();
                        updateUIIntent.putExtra(STATUS_EXTRA, UNREGISTERED_STATUS);
                    } else {
                        Log.w(TAG, "Unregistration error " +
                                String.valueOf(res.getStatusLine().getStatusCode()));
                        updateUIIntent.putExtra(STATUS_EXTRA, ERROR_STATUS);
                    }
                } catch (Exception e) {
                    updateUIIntent.putExtra(STATUS_EXTRA, ERROR_STATUS);
                    Log.w(TAG, "Unegistration error " + e.getMessage());
                }

                // Update dialog activity
                context.sendBroadcast(updateUIIntent);
            }
        }).start();
    }

    private static HttpResponse makeRequest(Context context, String deviceRegistrationID,
            String urlPath) throws Exception {
        SharedPreferences settings = Prefs.get(context);
        String accountName = settings.getString("accountName", null);

        List<NameValuePair> params = new ArrayList<NameValuePair>();
        params.add(new BasicNameValuePair("devregid", deviceRegistrationID));

        String deviceId = Secure.getString(context.getContentResolver(), Secure.ANDROID_ID);
        if (deviceId != null) {
            params.add(new BasicNameValuePair("deviceId", deviceId));
        }

        // TODO: Allow device name to be configured
        params.add(new BasicNameValuePair("deviceName", isTablet(context) ? "Tablet" : "Phone"));

        AppEngineClient client = new AppEngineClient(context, accountName);
        return client.makeRequest(urlPath, params);
    }

    static boolean isTablet (Context context) {
        // Look for a width/height >= 7 inches (which is min xlarge width)
        // TODO: Remove this hack once we allow user to specify device name
        WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics metrics = new DisplayMetrics();
        wm.getDefaultDisplay().getMetrics(metrics);
        return (metrics.widthPixels / metrics.xdpi >= 7 || metrics.heightPixels / metrics.ydpi >= 7);
    }
}
