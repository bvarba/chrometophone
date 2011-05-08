package com.google.android.apps.chrometophone;

import java.util.Calendar;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.os.Bundle;
import android.provider.Browser;
import android.text.ClipboardManager;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseExpandableListAdapter;
import android.widget.ExpandableListView;
import android.widget.TextView;
import android.widget.ExpandableListView.OnChildClickListener;

/**
 * Activity that shows the history of links received.
 */
public class HistoryActivity extends Activity implements OnChildClickListener {
    private static final int DIALOG_LINK_ACTION = 1;
    private static final int SETUP_ACTIVITY_REQUEST_CODE = 1;

    private ExpandableListView mList;
    private HistoryExpandableListAdapter mListAdapter;
    private Context mContext = null;

    private Link mSelectedLink;
    private int mSelectedGroup;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Run the setup first if necessary
        SharedPreferences prefs = Prefs.get(this);
        if (prefs.getString("deviceRegistrationID", null) == null) {
            startActivity(new Intent(this, SetupActivity.class));
        }

        setContentView(R.layout.history);
        mList = (ExpandableListView) findViewById(android.R.id.list);
        mList.setOnCreateContextMenuListener(this);
        mList.setOnChildClickListener(this);

        mListAdapter = new HistoryExpandableListAdapter(this);
        mList.setAdapter(mListAdapter);

        mContext = this;
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.history, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.clear: {
                HistoryDatabase.get(this).deleteAllHistory();
                mListAdapter.refresh();
                for (int i = 0; i < DateBinSorter.NUM_BINS; i++) {
                    mList.collapseGroup(i);
                }
                return true;
            }
            case R.id.settings: {
                startActivityForResult(new Intent(this, SetupActivity.class),
                        SETUP_ACTIVITY_REQUEST_CODE);
                return true;
            }
            case R.id.help: {
                startActivity(new Intent(this, HelpActivity.class));
                return true;
            }
            default: {
                return super.onOptionsItemSelected(item);
            }
        }
    }

    @Override
    protected void onActivityResult (int requestCode, int resultCode, Intent data) {
        if (requestCode == SETUP_ACTIVITY_REQUEST_CODE) {
            SharedPreferences prefs = Prefs.get(this);
            if (prefs.getString("deviceRegistrationID", null) == null) {
                finish();  // user asked to exit
            }
        }
    }

    public boolean onChildClick(ExpandableListView parent, View v, int groupPosition,
            int childPosition, long id) {
        mSelectedLink = mListAdapter.getLinkAtPosition(groupPosition, childPosition);
        mSelectedGroup = groupPosition;
        showDialog(DIALOG_LINK_ACTION);
        return true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        mListAdapter.refresh();
    }

    @Override
    protected Dialog onCreateDialog(int id) {
        switch (id) {
        case DIALOG_LINK_ACTION:
            if (mSelectedLink != null) {
                return new AlertDialog.Builder(this)
                    .setTitle(ellipsis(mSelectedLink.mTitle))
                    .setItems(R.array.link_action_dialog_items, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int which) {
                            if (which == 0) {  // Open
                                startActivity(LauncherUtils.getLaunchIntent(mContext,
                                        mSelectedLink.mTitle, mSelectedLink.mUrl, null));
                            } else if (which == 1) {  // Add bookmark
                                Browser.saveBookmark(mContext, mSelectedLink.mTitle,
                                        mSelectedLink.mUrl);
                            } else if (which == 2) {  // Share link
                                Intent intent = new Intent(Intent.ACTION_SEND);
                                intent.putExtra(Intent.EXTRA_TEXT, mSelectedLink.mUrl);
                                intent.setType("text/plain");
                                startActivity(Intent.createChooser(intent,
                                        getString(R.string.share_chooser_title)));
                            } else if (which == 3) {  // Copy link URL
                                ClipboardManager cm =
                                    (ClipboardManager) mContext.getSystemService(CLIPBOARD_SERVICE);
                                cm.setText(mSelectedLink.mUrl);
                            } else if (which == 4) {  // Remove from history
                                HistoryDatabase.get(mContext).deleteHistory(mSelectedLink.mUrl);
                                mListAdapter.refresh();
                                mList.collapseGroup(mSelectedGroup);
                                mList.expandGroup(mSelectedGroup);
                            }
                        }
                    }).create();
            }
        }
        return null;
    }

    @Override
    protected void onPrepareDialog(int id, Dialog dialog) {
        dialog.setTitle(ellipsis(mSelectedLink.mTitle));
    }

    private String ellipsis(String string) {
        int MAX_LENGTH = 50;
        if (string.length() > MAX_LENGTH - 3) {
            string = string.substring(0, MAX_LENGTH - 3);
            string += "...";
        }
        return string;
    }

    class HistoryExpandableListAdapter extends BaseExpandableListAdapter {
        private final Context mContext;
        private Cursor mCursor;
        private DateBinSorter mDateBinSorter;
        private int mChildCounts[];

        public HistoryExpandableListAdapter(Context context) {
            this.mContext = context;
            refresh();
        }

        public void refresh() {
            mCursor = HistoryDatabase.get(mContext).lookupHistory();
            mDateBinSorter = new DateBinSorter(mContext);
            calculateCounts();
        }

        private void calculateCounts() {
            mChildCounts = new int[DateBinSorter.NUM_BINS];
            for (int j = 0; j < DateBinSorter.NUM_BINS; j++) {
                mChildCounts[j] = 0;
            }

            int dateIndex = -1;
            if (mCursor.moveToFirst() && mCursor.getCount() > 0) {
                while (!mCursor.isAfterLast()) {
                    long date = mCursor.getLong(HistoryDatabase.RECEIVE_TIME_INDEX);
                    int index = mDateBinSorter.getBin(date);
                    if (index > dateIndex) {
                        if (index == DateBinSorter.NUM_BINS - 1) {
                            mChildCounts[index] = mCursor.getCount() - mCursor.getPosition();
                            break;
                        }
                        dateIndex = index;
                    }
                    mChildCounts[dateIndex]++;
                    mCursor.moveToNext();
                }
            }
        }

        public Object getChild(int groupPosition, int childPosition) {
            return null;
        }

        public long getChildId(int groupPosition, int childPosition) {
            return moveCursorPosition(groupPosition, childPosition);
        }

        public View getChildView(int groupPosition, int childPosition, boolean isLastChild,
                View convertView, ViewGroup parent) {
            HistoryItemView itemView;
            if (null == convertView || !(convertView instanceof HistoryItemView)) {
                itemView = new HistoryItemView(mContext);
                // Add padding on the left so it will be indented from the
                // arrows on the group views.
                itemView.setPadding(itemView.getPaddingLeft() + 10,
                        itemView.getPaddingTop(),
                        itemView.getPaddingRight(),
                        itemView.getPaddingBottom());
            } else {
                itemView = (HistoryItemView) convertView;
            }


            moveCursorPosition(groupPosition, childPosition);
            itemView.setTitle(mCursor.getString(HistoryDatabase.TITLE_INDEX));
            itemView.setUrl(mCursor.getString(HistoryDatabase.URL_INDEX));

            return itemView;
        }

        public int getChildrenCount(int groupPosition) {
            return mChildCounts[groupPosition];
        }

        public Object getGroup(int groupPosition) {
            return null;
        }

        public int getGroupCount() {
            return DateBinSorter.NUM_BINS;
        }

        public long getGroupId(int groupPosition) {
            return groupPosition;
        }

        public View getGroupView(int groupPosition, boolean isExpanded, View convertView,
                ViewGroup parent) {
            TextView item;
            if (null == convertView || !(convertView instanceof TextView)) {
                LayoutInflater factory = LayoutInflater.from(mContext);
                item = (TextView) factory.inflate(R.layout.history_header, null);
            } else {
                item = (TextView) convertView;
            }
            String label = mDateBinSorter.getBinLabel(groupPosition);
            item.setText(label);
            return item;
        }

        public boolean hasStableIds() {
            return true;
        }

        public boolean isChildSelectable(int groupPosition, int childPosition) {
            return true;
        }

        private int moveCursorPosition(int groupPosition, int childPosition) {
            int index = childPosition;
            for (int i = 0; i < groupPosition; i++) {
                index += mChildCounts[i];
            }
            mCursor.moveToPosition(index);
            return index;
        }

        private Link getLinkAtPosition(int groupPosition, int childPosition) {
            moveCursorPosition(groupPosition, childPosition);
            return new Link(mCursor.getString(HistoryDatabase.TITLE_INDEX),
                    mCursor.getString(HistoryDatabase.URL_INDEX));
        }
    }

    class DateBinSorter {
        public static final int NUM_BINS = 4;
        private final long [] mBins = new long[NUM_BINS-1];
        private final Context mContext;

        public DateBinSorter(Context context) {
            this.mContext = context;

            Calendar c = Calendar.getInstance();
            c.set(Calendar.HOUR_OF_DAY, 0);
            c.set(Calendar.MINUTE, 0);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            mBins[0] = c.getTimeInMillis();  // today

            c.add(Calendar.DAY_OF_YEAR, -7);
            mBins[1] = c.getTimeInMillis();  // seven days ago

            c.add(Calendar.DAY_OF_YEAR, 7);
            c.add(Calendar.MONTH, -1);
            mBins[2] = c.getTimeInMillis();  // one month ago
        }

        /**
         * Get the date bin for a specified time:
         *     0 => today, 1 => last week,
         *     2 => last month, 3 => older
         */
        public int getBin(long time) {
            int lastDay = NUM_BINS - 1;
            for (int i = 0; i < lastDay; i++) {
                if (time > mBins[i]) return i;
            }
            return lastDay;
        }

        private String getBinLabel(int index) {
            if (index == 0) {
                return mContext.getString(R.string.today_text);
            } else if (index == 1) {
                return mContext.getString(R.string.last_seven_days_text);
            } else if (index == 2) {
                return mContext.getString(R.string.last_month_text);
            } else {
                return mContext.getString(R.string.older_text);
            }
        }
    }

    class Link {
        public final String mTitle;
        public final String mUrl;

        public Link(String title, String url) {
            mTitle = title;
            mUrl = url;
        }
    }
}
