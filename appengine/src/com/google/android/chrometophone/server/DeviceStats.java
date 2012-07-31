/*
 * Copyright 2012 Google Inc.
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

import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.jdo.JDOObjectNotFoundException;
import javax.jdo.PersistenceManager;
import javax.jdo.Query;
import javax.jdo.annotations.IdGeneratorStrategy;
import javax.jdo.annotations.IdentityType;
import javax.jdo.annotations.PersistenceCapable;
import javax.jdo.annotations.Persistent;
import javax.jdo.annotations.PrimaryKey;

/**
 * Statistics about a device type.
 */
@PersistenceCapable(identityType = IdentityType.APPLICATION)
public class DeviceStats {

    private static final Logger log =
      Logger.getLogger(DeviceStats.class.getName());

    /**
     * Device type, as defined on {@link DeviceInfo}.
     */
    @Persistent(valueStrategy = IdGeneratorStrategy.IDENTITY)
    @PrimaryKey
    private String type;

    /**
     * Current number of devices using this type.
     */
    @Persistent
    private int total;

    /**
     * Total number of devices added for this type.
     */
    @Persistent
    private int added;

    /**
     * Current number of devices using this type.
     */
    @Persistent
    private int deleted;

    /**
     * Current number of devices converted to this type
     */
    @Persistent
    private int converted;
    
    private DeviceStats(String type) {
        this.type = type;
        this.total = this.added = this.deleted = 0;
    }

    public String getType() {
      return type;
    }

    public int getTotal() {
      return total;
    }

    public int getAdded() {
      return added;
    }

    public int getDeleted() {
      return deleted;
    }

    public int getConverted() {
      return converted;
    }

    @Override
    public String toString() {
      return String.format("DeviceStats[%s]: total=%d, added=%d, deleted=%d, converted=%d",
          type, total, added, deleted, converted);
    }

    /**
     * Queries the stats for a given type.
     */
    public static DeviceStats getStats(PersistenceManager pm, String type) {
        Query query = pm.newQuery(DeviceStats.class);
        DeviceStats stats = null;
        Object key = pm.newObjectIdInstance(DeviceStats.class, type);
        try {
          stats = (DeviceStats) pm.getObjectById(key);
          log.log(Level.INFO, "getStats(): {0}", stats);
        } catch (JDOObjectNotFoundException e) {
          log.log(Level.INFO, "getStats() not found for type {0}", type);
        } finally {
          query.closeAll();
        }
        return stats;
    }

    /**
     * Adds one device by a given type.
     */
    static DeviceStats addDevice(PersistenceManager pm, String type) {
        DeviceStats stats = getStats(pm, type);
        stats.total++;
        stats.added++;
        return stats;
    }

    /**
     * Removes one device by a given type.
     */
    static DeviceStats removeDevice(PersistenceManager pm, String type) {
        DeviceStats stats = getStats(pm, type);
        stats.total--;
        stats.deleted++;
        return stats;
    }

    /**
     * Converts one device by a given type.
     */
    static DeviceStats convertsDevice(PersistenceManager pm, String type, int size) {
        log.log(Level.INFO, "Updating entity of type {0} with {1} conversions",
            new Object[] {type, size});
        DeviceStats stats = getStats(pm, type);
        stats.total += size;
        stats.converted += size;
        return stats;
    }
 
    static List<DeviceStats> getAll(PersistenceManager pm) {
      Query query = pm.newQuery(DeviceStats.class);
      @SuppressWarnings("unchecked")
      List<DeviceStats> allStats = (List<DeviceStats>) query.execute();
      return allStats;
    }
    
    /**
     * Create initial objects.
     */
    static void init(PersistenceManager pm) {
       for (String type : DeviceInfo.SUPPORTED_TYPES) {
         add(pm, type);
       }
    }

    private static void add(PersistenceManager pm, String type) {
        DeviceStats stats = getStats(pm, type);
        if (stats == null) {
          stats = new DeviceStats(type);
          log.log(Level.INFO, "Creating {0} entity for type {1}",
              new Object[] {DeviceStats.class.getSimpleName(), type});
          pm.makePersistent(stats);
        }
    }

}
