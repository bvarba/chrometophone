package com.google.android.apps.chrometophone;

import java.util.Locale;

import android.app.Activity;
import android.os.Bundle;
import android.text.Html;
import android.text.method.LinkMovementMethod;
import android.widget.TextView;

public class HelpActivity extends Activity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.help);

        TextView textView = (TextView) findViewById(R.id.help_text);
        String helpText = getString(R.string.help_text)
                .replace("{tos_link}", getTOSLink())
                .replace("{pp_link}", getPPLink());
        textView.setText(Html.fromHtml(helpText));
        textView.setMovementMethod(LinkMovementMethod.getInstance());
    }

    public static String getTOSLink() {
        return constructLink(Locale.getDefault(), "/tospage", "/toscountry");
    }

    public static String getPPLink() {
        return constructLink(Locale.getDefault(), "/privacy", "/privacy");
    }

    private static String constructLink(Locale locale, String path, String defaultPath) {
        String link = "http://m.google.com" + defaultPath;
        String localeString = locale.toString();
        if (localeString.equals(Locale.CANADA.toString())) {
            link = "http://m.google.ca" + path;
        } else if (localeString.equals(Locale.CANADA_FRENCH.toString())) {
            link = "http://m.google.ca" + path + "?hl=fr";
        } else if (localeString.equals(Locale.CHINA.toString())) {
            link = "http://m.google.cn" + path;
        } else if (localeString.equals(Locale.FRANCE.toString())) {
            link = "http://m.google.fr" + path;
        } else if (localeString.equals(Locale.GERMAN.toString())) {
            link = "http://m.google.de" + path;
        } else if (localeString.equals(Locale.ITALY.toString())) {
            link = "http://m.google.it" + path;
        } else if (localeString.equals(Locale.JAPAN.toString())) {
            link = "http://m.google.co.jp" + path;
        } else if (localeString.equals(Locale.KOREA.toString())) {
            link = "http://m.google.co.kr" + path;
        } else if (localeString.equals(Locale.TAIWAN.toString())) {
            link = "http://m.google.tw" + path;
        } else if (localeString.equals(Locale.UK.toString())) {
            link = "http://m.google.co.uk" + path;
        } else if (localeString.equals(Locale.US.toString())) {
            link = "http://m.google.com" + path;
        }
        return link;
    }
}
