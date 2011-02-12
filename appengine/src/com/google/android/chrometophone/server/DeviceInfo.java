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

package com.google.android.chrometophone.server;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.jdo.PersistenceManager;
import javax.jdo.Query;
import javax.jdo.annotations.IdentityType;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

import com.google.appengine.api.datastore.Key;

/**
 * Registration info.
 *
 * An account may be associated with multiple phones,
 * and a phone may be associated with multiple accounts.
 *
 * registrations lists different phones registered to that account.
 */
@PersistenceCapable(identityType = IdentityType.APPLICATION)
public class DeviceInfo {
    public static final String TYPE_AC2DM = "ac2dm";
    public static final String TYPE_CHROME = "chrome";

    /**
     * User-email # device-id
     *
     * Device-id can be specified by device, default is hash of abs(registration
     * id).
     *
     * user@example.com#1234
     */
    @PrimaryKey
    @Persistent
    private Key key;

    /**
     * The ID used for sending messages to.
     */
    @Persistent
    private String deviceRegistrationID;

    /**
     * Current supported types:
     *   (default) - ac2dm, regular froyo+ devices using C2DM protocol
     *
     * New types may be defined - for example for sending to chrome.
     */
    @Persistent
    private String type;

    /**
     * Friendly name for the device. May be edited by the user.
     */
    @Persistent
    private String name;

    /**
     * For statistics - and to provide hints to the user.
     */
    @Persistent
    private Date registrationTimestamp;

    @Persistent
    private Boolean debug;

    public DeviceInfo(Key key, String deviceRegistrationID) {
        this.key = key;
        this.deviceRegistrationID = deviceRegistrationID;
        this.setRegistrationTimestamp(new Date()); // now
    }

    public DeviceInfo(Key key) {
        this.key = key;
    }

    public Key getKey() {
        return key;
    }

    public void setKey(Key key) {
        this.key = key;
    }

    // Accessor methods for properties added later (hence can be null)

    public String getDeviceRegistrationID() {
        return deviceRegistrationID;
    }

    public void setDeviceRegistrationID(String deviceRegistrationID) {
        this.deviceRegistrationID = deviceRegistrationID;
    }

    public boolean getDebug() {
        return (debug != null ? debug.booleanValue() : false);
    }

    public void setDebug(boolean debug) {
        this.debug = new Boolean(debug);
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getType() {
        return type != null ? type : "";
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getName() {
        return name != null ? name : "";
    }

    public void setRegistrationTimestamp(Date registrationTimestamp) {
        this.registrationTimestamp = registrationTimestamp;
    }

    public Date getRegistrationTimestamp() {
        return registrationTimestamp;
    }

    /**
     * Helper function - will query all registrations for a user.
     */
    @SuppressWarnings("unchecked")
    public static List<DeviceInfo> getDeviceInfoForUser(PersistenceManager pm, String user) {
        Query query = pm.newQuery(DeviceInfo.class);
        query.setFilter("key >= '" +
                user + "' && key < '" + user + "$'");
        List<DeviceInfo> qresult = (List<DeviceInfo>) query.execute();
        // Copy to array - we need to close the query
        List<DeviceInfo> result = new ArrayList<DeviceInfo>();
        for (DeviceInfo di : qresult) {
            result.add(di);
        }
        query.closeAll();
        return result;
    }
}
