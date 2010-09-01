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

import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;

import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.message.BasicNameValuePair;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.widget.Toast;

public class ShareLink implements Handler.Callback {
    private static final String TOAST = "toast";
    private static final String BROWSER_CHANNEL_PATH = "/browserchannel";
    private static ShareLink mInstance;
    private final Handler mHandler;
    private final Context mContext;

    private ShareLink(Context context) {
        mContext = context;
        mHandler = new Handler(this);
    }

    public static synchronized ShareLink getInstance(Context context) {
        if (mInstance == null) {
            mInstance = new ShareLink(context);
        }
        return mInstance;
    }

    public void send(final String link) {
        new Thread(new Runnable() {
            public void run() {
                sendToast(mContext.getString(R.string.sending_link_toast));
                try {
                    List<NameValuePair> params = new ArrayList<NameValuePair>();
                    params.add(new BasicNameValuePair("data", URLEncoder.encode(link)));
                    SharedPreferences settings = Prefs.get(mContext);
                    final String accountName = settings.getString("accountName", null);

                    AppEngineClient client = new AppEngineClient(mContext, accountName);
                    HttpResponse res = client.makeRequest(BROWSER_CHANNEL_PATH, params);
                    if (res.getStatusLine().getStatusCode() == 200) {
                        sendToast(mContext.getString(R.string.link_sent_toast));
                    } else {
                        sendToast(mContext.getString(R.string.link_not_sent_toast));
                    }
                } catch (AppEngineClient.PendingAuthException e) {
                    sendToast(mContext.getString(R.string.link_not_sent_auth_toast));
                } catch (Exception e) {
                    sendToast(mContext.getString(R.string.link_not_sent_toast));
                }
            }
        }).start();
    }

    private void sendToast(String toastMessage) {
        Message msg = new Message();
        Bundle data = new Bundle();
        data.putString(TOAST, toastMessage);
        msg.setData(data);
        mHandler.sendMessage(msg);
    }

    public boolean handleMessage(Message msg) {
        Toast.makeText(mContext, msg.getData().getString(TOAST), Toast.LENGTH_LONG).show();
        return true;
    }
}
