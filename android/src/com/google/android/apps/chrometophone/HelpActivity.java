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
        String link = "http://m.google.com/toscountry";  // default

        String country = Locale.getDefault().getCountry();
        if (country.equals("US")) {
            link = "http://m.google.com/tospage";
        } else if (country.equals("GB")) {
            link = "http://m.google.co.uk/tospage";
        } else if (country.equals("CA")) {
            link = "http://m.google.ca/tospage";
        }
        return link;
    }

    public static String getPPLink() {
        String link = "http://m.google.com/privacy";  // default

        String country = Locale.getDefault().getCountry();
        if (country.equals("US")) {
            link = "http://m.google.com/privacy";
        } else if (country.equals("GB")) {
            link = "http://m.google.co.uk/privacy";
        } else if (country.equals("CA")) {
            link = "http://m.google.ca/privacy";
        }
        return link;
    }
}
