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
package com.google.android.c2dm.server;

import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.appengine.api.datastore.Key;

/**
 * Persistent config info for the server - authentication token 
 */
@PersistenceCapable
public final class C2DMConfig {
    @PrimaryKey
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    @SuppressWarnings("unused")
    private Key key;

    @Persistent
    private String authToken;

    @Persistent
    private String oauth2RefreshToken;
    
    @Persistent 
    private String clientId;
   
    @Persistent 
    private String clientSecret;
   

    public static final String DATAMESSAGING_SEND_ENDPOINT =
        "https://android.apis.google.com/c2dm/send";

    @Persistent 
    private String c2dmUrl;

    public String getAuthToken() {
        return (authToken == null) ? "" : authToken;
    }

    public void setAuthToken(String authToken) {
        this.authToken = authToken;
    }
    
    public void setKey(Key key) {
        this.key = key;
    }
    
    public void setC2DMUrl(String url) {
        this.c2dmUrl = url;
    }
    
    public String getC2DMUrl() {
        if (c2dmUrl == null) {
            return DATAMESSAGING_SEND_ENDPOINT;
        } else {
            return c2dmUrl;
        }
    }

    public void setOauth2RefreshToken(String oauth2RefreshToken) {
        this.oauth2RefreshToken = oauth2RefreshToken;
    }

    public String getOauth2RefreshToken() {
        return oauth2RefreshToken;
    }

    public void setOAuth2ClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getOAuth2ClientId() {
        return clientId;
    }

    public void setOAuth2ClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getOAuth2ClientSecret() {
        return clientSecret;
    }
}