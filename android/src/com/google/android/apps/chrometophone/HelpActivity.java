package com.google.android.apps.chrometophone;

import java.util.Locale;

import com.google.android.apps.chrometophone.HistoryActivity.DateBinSorter;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.text.Html;
import android.text.method.LinkMovementMethod;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.widget.TextView;

public class HelpActivity extends Activity {
    // Consistent with http://m.google.com/toscountry as of 4th Sept 2010
    private static final String DOT_CO[] = { "bw", "jp", "in", "id", "il", "jp", "ke", "kr", "ma",
                                             "mz", "nz", "th", "tz", "ug", "uk", "ve", "za", "zm",
                                             "zw" };
    private static final  String DOT_COM[] = { "af", "ar", "au", "bh", "bd", "br", "co", "ec",
                                               "eg", "et", "gh", "hk", "kw", "lb", "ly", "my",
                                               "mt", "mx", "na", "ng", "pk", "pe", "pr", "qa",
                                               "sl", "sg", "tr", "tw", "ua", "vn" };

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
        return constructLink(Locale.getDefault(), "/tospage");
    }

    public static String getPPLink() {
        return constructLink(Locale.getDefault(), "/privacy");
    }

    private static String constructLink(Locale locale, String path) {
        String domain = locale.getCountry().toLowerCase();

        // ISO-3166-to-TLD exceptions...
        if (domain.equals("us")) {
            domain = "com";
        } else if (domain.equals("ao")) {
            domain = "it.ao";
        } else if (domain.equals("gb")) {
            domain = "co.uk";
        } else {
            for (int i = 0; i < DOT_COM.length; i++) {
                if (domain.equals(DOT_COM[i])) {
                    domain = "com." + domain;
                    break;
                }
            }
            for (int i = 0; i < DOT_CO.length; i++) {
                if (domain.equals(DOT_CO[i])) {
                    domain = "co." + domain;
                    break;
                }
            }
            if (locale.toString().equals(Locale.CANADA_FRENCH.toString())) {
                path += "?hl=fr";
            }
        }

        return "http://m.google." + domain + path;
    }
}
