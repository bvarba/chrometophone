package com.google.android.apps.chrometophone;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.database.sqlite.SQLiteStatement;

/**
 * Database to store and retrieve history of received links.
 */
public class HistoryDatabase {
    public static final int URL_INDEX = 0;
    public static final int TITLE_INDEX = 1;
    public static final int RECEIVE_TIME_INDEX = 2;

    private static final String DATABASE_NAME = "history.db";
    private static final int DATABASE_VERSION = 1;

    private static final String TABLE_NAME = "history";
    private static final String URL_COL_NAME = "url";
    private static final String TITLE_COL_NAME = "title";
    private static final String RECEIVE_TIME_COL_NAME = "receive_time";

    private static final String[] ALL_COLUMNS =
        new String[] { URL_COL_NAME, TITLE_COL_NAME, RECEIVE_TIME_COL_NAME };

    private final SQLiteDatabase mDb;
    private SQLiteStatement mInsertStatement;
    private SQLiteStatement mDeleteStatement;
    private SQLiteStatement mDeleteAllStatement;

    private static HistoryDatabase mSingleton;

    private HistoryDatabase(Context context) {
        mDb = new DatabaseHelper(context).getWritableDatabase();
    }

    public synchronized static HistoryDatabase get(Context context) {
        if (mSingleton == null) {
            mSingleton = new HistoryDatabase(context);
        }
        return mSingleton;
    }

    public void insertHistory(String title, String url) {
        if (mInsertStatement == null) {
            mInsertStatement = mDb.compileStatement("INSERT OR REPLACE INTO "+ TABLE_NAME +
                    "(" + URL_COL_NAME + ", " +
                    TITLE_COL_NAME + ", " +
                    RECEIVE_TIME_COL_NAME +
                    ") VALUES (?, ?, ?)");
        }

        mInsertStatement.bindString(1, url);
        mInsertStatement.bindString(2, title);
        mInsertStatement.bindLong(3, System.currentTimeMillis());
        mInsertStatement.execute();
    }

    public Cursor lookupHistory() {
        return mDb.query(TABLE_NAME, ALL_COLUMNS, null, null, null, null,
                RECEIVE_TIME_COL_NAME + " desc");
    }

    public void deleteHistory(String url) {
        if (mDeleteStatement == null) {
            mDeleteStatement = mDb.compileStatement("DELETE FROM "+ TABLE_NAME +
                                                    " WHERE " + URL_COL_NAME + " == ?");
        }
        mDeleteStatement.bindString(1, url);
        mDeleteStatement.execute();
    }

    public void deleteAllHistory() {
        if (mDeleteAllStatement == null) {
            mDeleteAllStatement = mDb.compileStatement("DELETE FROM "+ TABLE_NAME);
        }
        mDeleteAllStatement.execute();
    }

    /**
     * Database helper that creates and maintains the SQLite database.
     */
    static class DatabaseHelper extends SQLiteOpenHelper {
        public DatabaseHelper(Context context) {
            super(context, DATABASE_NAME, null, DATABASE_VERSION);
        }

        @Override
        public void onCreate(SQLiteDatabase db) {
            createHistoryTable(db);
        }

        private void createHistoryTable(SQLiteDatabase db) {
            db.execSQL("CREATE TABLE "+ TABLE_NAME + "(" +
                    URL_COL_NAME + " TEXT PRIMARY KEY, " +
                    TITLE_COL_NAME + " TEXT NOT NULL, " +
                    RECEIVE_TIME_COL_NAME + " INTEGER)");
        }

        @Override
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            // Implement the upgrade path to databases with DATABASE_VERSION > 1 here
        }
    }
}
