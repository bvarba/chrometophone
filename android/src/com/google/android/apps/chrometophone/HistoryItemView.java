package com.google.android.apps.chrometophone;

import android.content.Context;
import android.graphics.drawable.Drawable;
import android.view.LayoutInflater;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * A single history item (child view for expandable list).
 */
public class HistoryItemView extends LinearLayout {
    private final TextView mTextView;
    private final TextView mUrlText;
    private final ImageView mImageView;
    private final Context mContext;

    public HistoryItemView(Context context) {
        super(context);
        mContext = context;
        LayoutInflater factory = LayoutInflater.from(context);
        factory.inflate(R.layout.history_item, this);
        mTextView = (TextView) findViewById(R.id.title);
        mUrlText = (TextView) findViewById(R.id.url);
        mImageView = (ImageView) findViewById(R.id.icon);
    }

    public void setTitle(String title) {
        mTextView.setText(ellipsis(title));
    }

    public void setUrl(String url) {
        int id = R.drawable.history_browser_item_indicator;
        if (LauncherUtils.isMapsURL(url)) {
            id = R.drawable.history_maps_item_indicator;
        } else if (LauncherUtils.isYouTubeURL(url)) {
            id = R.drawable.history_yt_item_indicator;
        }
        Drawable icon = mContext.getResources().getDrawable(id);
        mImageView.setImageDrawable(icon);
        mUrlText.setText(ellipsis(url));
    }

    private String ellipsis(String string) {
        int MAX_LENGTH = 50;
        if (string.length() > MAX_LENGTH - 3) {
            string = string.substring(0, MAX_LENGTH - 3);
            string += "...";
        }
        return string;
    }
}

