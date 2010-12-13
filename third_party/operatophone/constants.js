/*
 * Portions of this page are modifications based on work created and shared 
 * by Google and used according to terms described in the Creative Commons 3.0
 * Attribution License.
 */

var apiVersion = 5;
var baseUrl = 'https://chrometophone.appspot.com';
var sendUrl = baseUrl + '/send?ver=' + apiVersion;
var signInUrl = baseUrl + '/signin?extret=' +
encodeURIComponent('http://code.google.com/p/chrometophone/logo') + '?login&ver=' + apiVersion;
var signOutUrl = baseUrl + '/signout?extret=' +
encodeURIComponent('http://code.google.com/p/chrometophone/logo') + '?logout&ver=' + apiVersion;
var registerUrl =  baseUrl + '/register?ver=' + apiVersion;
var apkUrl = 'http://code.google.com/p/chrometophone/wiki/AndroidApp';

var ACTION_START_SEND = 'start_send_process';
var ACTION_SEND_PAGE = 'send_to_phone';
var ACTION_APK_REQUIRED = 'apk_required';
var ACTION_CAPTURE_SELECTION = 'capture_selection';
var ACTION_OPEN_TAB = 'open_tab';
var ACTION_CLOSE_TAB = 'close_tab';

var STATUS_SUCCESS = 'success';
var STATUS_LOGIN_REQUIRED = 'login_required';
var STATUS_DEVICE_NOT_REGISTERED = 'device_not_registered';
var STATUS_NO_TAB_ACCESS = 'no_tab_access';
var STATUS_GENERAL_ERROR = 'general_error';

var BROWSER_CHANNEL_RETRY_INTERVAL_MS = 10000 * (1 + Math.random() - 0.5);