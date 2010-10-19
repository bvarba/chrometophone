package com.google.android.apps.chrometophone;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.text.ClipboardManager;

/**
 * Common set of utility functions for launching apps.
 */
public class LauncherUtils {
    private static final String GMM_PACKAGE_NAME = "com.google.android.apps.maps";
    private static final String GMM_CLASS_NAME = "com.google.android.maps.MapsActivity";

    public static Intent getLaunchIntent(Context context, String title, String url, String sel) {
        Intent intent = null;
        String number = parseTelephoneNumber(sel);
        if (number != null) {
            intent = new Intent(Intent.ACTION_DIAL,
                    Uri.parse("tel:" + number));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ClipboardManager cm =
                (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setText(number);
        } else if (sel != null && sel.length() > 0) {
            // No intent for selection - just copy to clipboard
            ClipboardManager cm =
                (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setText(sel);
        } else {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (isMapsURL(url)) {
                intent.setClassName(GMM_PACKAGE_NAME, GMM_CLASS_NAME);
            }

            // Fall back if we can't resolve intent (i.e. app missing)
            PackageManager pm = context.getPackageManager();
            if (null == intent.resolveActivity(pm)) {
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            }
        }
        return intent;
    }

   public static void generateNotification(Context context, String msg, String title, Intent intent) {
       int icon = R.drawable.status_icon;
       long when = System.currentTimeMillis();

       Notification notification = new Notification(icon, title, when);
       notification.setLatestEventInfo(context, title, msg,
               PendingIntent.getActivity(context, 0, intent, 0));
       notification.flags |= Notification.FLAG_AUTO_CANCEL;

       SharedPreferences settings = Prefs.get(context);
       int notificatonID = settings.getInt("notificationID", 0); // allow multiple notifications

       NotificationManager nm =
               (NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
       nm.notify(notificatonID, notification);
       playNotificationSound(context);

       SharedPreferences.Editor editor = settings.edit();
       editor.putInt("notificationID", ++notificatonID % 32);
       editor.commit();
   }

   public static void playNotificationSound(Context context) {
       Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
       if (uri != null) {
           Ringtone rt = RingtoneManager.getRingtone(context, uri);
           if (rt != null) {
               rt.setStreamType(AudioManager.STREAM_NOTIFICATION);
               rt.play();
           }
       }
   }

   public static String parseTelephoneNumber(String sel) {
       if (sel == null || sel.length() == 0) return null;

       // Hack: Remove trailing left-to-right mark (Google Maps adds this)
       if (sel.codePointAt(sel.length() - 1) == 8206) {
           sel = sel.substring(0, sel.length() - 1);
       }

       String number = null;
       if (sel.matches("([Tt]el[:]?)?\\s?[+]?(\\(?[0-9|\\s|\\-|\\.]\\)?)+")) {
           String elements[] = sel.split("([Tt]el[:]?)");
           number = elements.length > 1 ? elements[1] : elements[0];
           number = number.replace(" ", "");

           // Remove option (0) in international numbers, e.g. +44 (0)20 ...
           if (number.matches("\\+[0-9]{2,3}\\(0\\).*")) {
               int openBracket = number.indexOf('(');
               int closeBracket = number.indexOf(')');
               number = number.substring(0, openBracket) +
                       number.substring(closeBracket + 1);
           }
       }
       return number;
   }

   public static boolean isMapsURL(String url) {
       return url.matches("http://maps\\.google\\.[a-z]{2,3}(\\.[a-z]{2})?[/?].*") ||
               url.matches("http://www\\.google\\.[a-z]{2,3}(\\.[a-z]{2})?/maps.*");
   }

   public static boolean isYouTubeURL(String url) {
       return url.matches("http://www\\.youtube\\.[a-z]{2,3}(\\.[a-z]{2})?/.*");
   }
}
