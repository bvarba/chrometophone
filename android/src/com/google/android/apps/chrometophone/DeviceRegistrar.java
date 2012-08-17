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
import android.content.res.Configuration;
import android.provider.Settings.Secure;
import android.util.Log;

import com.google.android.gcm.GCMRegistrar;

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
    static final String SENDER_ID = "206147423037";

    private static final String REGISTER_PATH = "/register";
    private static final String UNREGISTER_PATH = "/unregister";

    public static void registerWithServer(final Context context,
          final String deviceRegistrationID) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                Intent updateUIIntent = new Intent("com.google.ctp.UPDATE_UI");
                try {
                    HttpResponse res = makeRequest(context, deviceRegistrationID, REGISTER_PATH);
                    if (res.getStatusLine().getStatusCode() == 200) {
                        GCMRegistrar.setRegisteredOnServer(context, true);
                        updateUIIntent.putExtra(STATUS_EXTRA, REGISTERED_STATUS);
                    } else if (res.getStatusLine().getStatusCode() == 400) {
                        updateUIIntent.putExtra(STATUS_EXTRA, AUTH_ERROR_STATUS);
                    } else {
                        Log.w(TAG, "Registration error " +
                                String.valueOf(res.getStatusLine().getStatusCode()));
                        updateUIIntent.putExtra(STATUS_EXTRA, ERROR_STATUS);
                    }
                    context.sendBroadcast(updateUIIntent);
                    // Check if this is an update from C2DM to GCM - if it is, remove the
                    // old registration id.
                    SharedPreferences settings = Prefs.get(context);
                    String c2dmRegId = settings.getString("deviceRegistrationID", null);
                    if (c2dmRegId != null) {
                        Log.i(TAG, "Removing old C2DM registration id");
                        SharedPreferences.Editor editor = settings.edit();
                        editor.remove("deviceRegistrationID");
                        editor.commit();
                    }
                } catch (AppEngineClient.PendingAuthException pae) {
                    // Get setup activity to ask permission from user.
                    Intent intent = new Intent(SetupActivity.AUTH_PERMISSION_ACTION);
                    intent.putExtra("AccountManagerBundle", pae.getAccountManagerBundle());
                    context.sendBroadcast(intent);
                } catch (Exception e) {
                    Log.w(TAG, "Registration error " + e.getMessage());
                    updateUIIntent.putExtra(STATUS_EXTRA, ERROR_STATUS);
                    context.sendBroadcast(updateUIIntent);
                }
            }
        }).start();
    }

    public static void unregisterWithServer(final Context context, final String deviceRegistrationID) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                Intent updateUIIntent = new Intent("com.google.ctp.UPDATE_UI");
                try {
                    HttpResponse res = makeRequest(context, deviceRegistrationID, UNREGISTER_PATH);
                    if (res.getStatusLine().getStatusCode() != 200) {
                        Log.w(TAG, "Unregistration error " +
                                String.valueOf(res.getStatusLine().getStatusCode()));
                    } else {
                      GCMRegistrar.setRegisteredOnServer(context, false);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Unregistration error " + e.getMessage());
                } finally {
                    SharedPreferences settings = Prefs.get(context);
                    SharedPreferences.Editor editor = settings.edit();
                    editor.remove("accountName");
                    editor.commit();
                    updateUIIntent.putExtra(STATUS_EXTRA, UNREGISTERED_STATUS);
                }

                // Update dialog activity
                context.sendBroadcast(updateUIIntent);
            }
        }).start();
    }

    private static HttpResponse makeRequest(Context context, String deviceRegistrationID,
            String urlPath) throws Exception {
        String accountName = getAccountName(context);

        List<NameValuePair> params = new ArrayList<NameValuePair>();
        params.add(new BasicNameValuePair("devregid", deviceRegistrationID));

        String deviceId = Secure.getString(context.getContentResolver(), Secure.ANDROID_ID);
        if (deviceId != null) {
            params.add(new BasicNameValuePair("deviceId", deviceId));
        }

        // TODO: Allow device name to be configured
        params.add(new BasicNameValuePair("deviceName", isTablet(context) ? "Tablet" : "Phone"));

        params.add(new BasicNameValuePair("deviceType", "ac2dm"));
        params.add(new BasicNameValuePair("gcm", "true"));

        AppEngineClient client = new AppEngineClient(context, accountName);
        return client.makeRequest(urlPath, params);
    }

    static String getAccountName(Context context) {
      SharedPreferences settings = Prefs.get(context);
      String accountName = settings.getString("accountName", null);
      return accountName;
    }

    static boolean isTablet (Context context) {
        // TODO: This hacky stuff goes away when we allow users to target devices
        int xlargeBit = 4; // Configuration.SCREENLAYOUT_SIZE_XLARGE;  // upgrade to HC SDK to get this
        Configuration config = context.getResources().getConfiguration();
        return (config.screenLayout & xlargeBit) == xlargeBit;
    }

    /**
     * Update the device to use GCM instead of C2DM.
     */
    static boolean updateC2DM(Context context) {
        SharedPreferences prefs = Prefs.get(context);
        String c2dmRegId = prefs.getString("deviceRegistrationID", null);
        // The old versions of the app that used C2DM stored the registration id in the default
        // preferences; the new version stores it in the GCM library.
        if (c2dmRegId != null) {
            Log.i(TAG, "Updating from C2DM to GCM");
            // Since the server will update the existing DeviceInfo entry to use GCM,
            // it's not necessary to call unregister
            GCMRegistrar.register(context, DeviceRegistrar.SENDER_ID);
            return true;
        } else {
            return false;
        }
    }
}
