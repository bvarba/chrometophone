package com.google.android.apps.chrometophone;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Receiver called when the application is updated (Android 3.1+), it will check
 * if the previous version used C2DM and, if so, update to GCM.
 */
public class Updater extends BroadcastReceiver {

    private static final String TAG = "Updater";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "onReceive(" + intent + ")");
        DeviceRegistrar.updateC2DM(context);
    }
    
}
