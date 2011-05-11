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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.message.BasicNameValuePair;

import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.widget.Toast;

/**
 * Invoked when user selects "Share page" in the browser. Sends link
 * to AppEngine server.
 */
public class ShareLinkActivity extends Activity implements Handler.Callback {
    private static final int TOAST_MSG = 0;
    private static final int START_ACTIVITY_MSG = 1;

    private static final String SEND_PATH = "/send";

    private boolean mPendingAuth = false;
    private String mPendingLink;
    private final Handler mHandler = new Handler(this);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Intent.ACTION_SEND.equals(getIntent().getAction())) {
            String text = getIntent().getExtras().getString(Intent.EXTRA_TEXT);
            Pattern regex = Pattern.compile("http(s)?://.*");  // find the link
            Matcher matcher = regex.matcher(text);
            if (matcher.find()) {
                mPendingAuth = false;
                mPendingLink = matcher.group();
                sendLink();
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mPendingAuth) {
            sendLink();
        }
    }

    private void sendLink() {
        new Thread(new Runnable() {
            public void run() {
                sendToast(getString(R.string.sending_link_toast));
                try {
                    List<NameValuePair> params = new ArrayList<NameValuePair>();
                    params.add(new BasicNameValuePair("url", mPendingLink));
                    params.add(new BasicNameValuePair("deviceName", "Chrome"));
                    SharedPreferences settings = Prefs.get(ShareLinkActivity.this);
                    final String accountName = settings.getString("accountName", null);
                    if (accountName == null) {
                        sendToast(getString(R.string.link_not_sent_auth_toast));
                        finish();
                        return;
                    }

                    AppEngineClient client = new AppEngineClient(ShareLinkActivity.this, accountName);
                    HttpResponse res = client.makeRequest(SEND_PATH, params);
                    if (res.getStatusLine().getStatusCode() == 200) {
                        sendToast(getString(R.string.link_sent_toast));
                    } else {
                        sendToast(getString(R.string.link_not_sent_toast));
                    }
                    finish();
                } catch (AppEngineClient.PendingAuthException pae) {
                    Intent authIntent = (Intent) pae.getAccountManagerBundle().get(AccountManager.KEY_INTENT);
                    if (authIntent != null && !mPendingAuth) {
                        mPendingAuth = true;
                        mHandler.sendMessage(Message.obtain(mHandler, START_ACTIVITY_MSG, 0, 0, authIntent));
                    } else {
                        sendToast(getString(R.string.link_not_sent_auth_toast));
                        finish();
                    }
                } catch (Exception e) {
                    sendToast(getString(R.string.link_not_sent_toast));
                    finish();
                }
            }
        }).start();
    }

    private void sendToast(String toastMessage) {
        mHandler.sendMessage(Message.obtain(mHandler, TOAST_MSG, 0, 0, toastMessage));
    }

    public boolean handleMessage(Message msg) {
        if (msg.what == TOAST_MSG) {
            Toast.makeText(this, (String) msg.obj, Toast.LENGTH_LONG).show();
        } else if (msg.what == START_ACTIVITY_MSG) {
            startActivity((Intent) msg.obj);
        } else {
            return false;
        }
        return true;
    }
}
