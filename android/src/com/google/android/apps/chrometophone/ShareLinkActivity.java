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

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Invoked when user selects "Share page" in the browser. Sends link
 * to AppEngine server.
 */
public class ShareLinkActivity extends Activity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Intent.ACTION_SEND.equals(getIntent().getAction())) {
            String link = getIntent().getExtras().getString(Intent.EXTRA_TEXT);
            ShareLink.getInstance(this).send(link);
        }
        finish();
    }
}
