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

        String locale = Locale.getDefault().toString();
        if (locale.equals(Locale.US.toString())) {
            link = "http://m.google.com/tospage";
        } else if (locale.equals(Locale.UK.toString())) {
            link = "http://m.google.co.uk/tospage";
        } else if (locale.equals(Locale.CANADA.toString())) {
            link = "http://m.google.ca/tospage";
        } else if (locale.equals(Locale.CANADA_FRENCH.toString())) {
            link = "http://m.google.ca/tospage?hl=fr";
        } else if (locale.equals(Locale.FRANCE.toString())) {
            link = "http://m.google.fr/tospage";
        }
        return link;
    }

    public static String getPPLink() {
        String link = "http://m.google.com/privacy";  // default

        String locale = Locale.getDefault().toString();
        if (locale.toString().equals(Locale.US.toString())) {
            link = "http://m.google.com/privacy";
        } else if (locale.toString().equals(Locale.UK.toString())) {
            link = "http://m.google.co.uk/privacy";
        } else if (locale.toString().equals(Locale.CANADA.toString())) {
            link = "http://m.google.ca/privacy";
        } else if (locale.toString().equals(Locale.CANADA_FRENCH.toString())) {
            link = "http://m.google.ca/privacy?hl=fr";
        } else if (locale.toString().equals(Locale.FRANCE.toString())) {
            link = "http://m.google.fr/privacy";
        }
        return link;
    }
}
