package com.yourorg.sample;

import android.app.Application;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.os.AsyncTask;
import android.os.Handler;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.TextView;
import java.net.*;
import java.io.*;

public class MainActivity extends AppCompatActivity {

    public class WebAppInterface {
        @JavascriptInterface
        public void copyToClipboard(String text) {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = ClipData.newPlainText("demo", text);
            clipboard.setPrimaryClip(clip);
        }

        @JavascriptInterface
        public String pasteFromClipboard() {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = clipboard.getPrimaryClip();
            if (clip != null && clip.getItemCount() > 0) {
                return clip.getItemAt(0).coerceToText(MainActivity.this).toString();
            }

            return null;
        }

        @JavascriptInterface
        public void notifyControllerAppReady() {
            MainActivity._controllerAppReady = true;
            if(MainActivity.this._pendingYoutubeUrl != null) {
                final String youtubeUrl = MainActivity.this._pendingYoutubeUrl;
                MainActivity.this._pendingYoutubeUrl = null;

                (new Thread(new Runnable() {
                    public void run() {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    Thread.sleep(1000);
                                } catch (InterruptedException e) {
                                    e.printStackTrace();
                                }
                                MainActivity.this._webView.evaluateJavascript("ControllerApp.setYoutubeUrl('" + youtubeUrl + "')", null);
                            }
                        });
                    }
                })).start();

//                new Thread(new Runnable() {
//                    @Override
//                    public void run() {
//                        WebView webView = (WebView) findViewById(R.id.webview);
////                        webView.evaluateJavascript("javascript:alert('test')", null);
//                        webView.evaluateJavascript("ControllerApp.setYoutubeUrl('" + youtubeUrl + "')", null);
//                    }
//                }).start();
            }
        }
    }

    // Used to load the 'native-lib' library on application startup.
    static {
        System.loadLibrary("native-lib");
        System.loadLibrary("node");
    }

    //We just want one instance of node running in the background.
    public static boolean _startedNodeAlready=false;

    private static boolean _controllerAppReady = false;
    private String _pendingYoutubeUrl;
    private WebView _webView;

    private void sendYoutubeUrlToControllerApp(String youtubeUrl) {
        _webView.evaluateJavascript("ControllerApp.setYoutubeUrl('" + youtubeUrl + "')", null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // check if the external Youtube app has shared a video with this app
        Bundle extras = intent.getExtras();
        if(extras != null) {
            String incomingText = extras.getString(Intent.EXTRA_TEXT);
            if(incomingText != null) {
                _pendingYoutubeUrl = incomingText;
                if(_controllerAppReady) {
                    sendYoutubeUrlToControllerApp(_pendingYoutubeUrl);
                    _pendingYoutubeUrl = null;
                }
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
//        android.os.Debug.waitForDebugger();
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // check if the app was started directly by a share from the youtube app
        Bundle extras = getIntent().getExtras();
        if(extras != null) {
            String incomingText = extras.getString(Intent.EXTRA_TEXT);
            if (incomingText != null) {
                _pendingYoutubeUrl = incomingText;
            }
        }

        _webView = (WebView) findViewById(R.id.webview);

//        Intent intent = getIntent();
//        // reuse activity already started with ACTION_MAIN
//        // useful if application was already started, then a video is shared from the Youtube app
//        if(intent.getAction() != Intent.ACTION_MAIN) {
//            Intent newIntent = new Intent(this, MainActivity.class);
//            newIntent.setAction(Intent.ACTION_MAIN);
//            newIntent.addCategory(Intent.CATEGORY_LAUNCHER);
//            newIntent.putExtras(intent.getExtras());
//            newIntent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
//
//            startActivity(newIntent);
//            return;
//        }


        _webView.loadUrl("file:///android_asset/startup/index.html");
        WebSettings webSettings = _webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);

        _webView.addJavascriptInterface(new WebAppInterface(), "NativeAndroid");

        _webView.setWebChromeClient(new WebChromeClient());
        _webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                view.loadUrl(request.getUrl().toString());
                return false;
            }
        });

        if( !_startedNodeAlready ) {
            _startedNodeAlready=true;
            new Thread(new Runnable() {
                @Override
                public void run() {

                    //The path where we expect the node project to be at runtime.
                    String nodeDir=getApplicationContext().getFilesDir().getAbsolutePath()+"/nodejs-project";
                    if (wasAPKUpdated()) {
                        //Recursively delete any existing nodejs-project.
                        File nodeDirReference=new File(nodeDir);
                        if (nodeDirReference.exists()) {
                            deleteFolderRecursively(new File(nodeDir));
                        }
                        //Copy the node project from assets into the application's data path.
                        copyAssetFolder(getApplicationContext().getAssets(), "nodejs-project", nodeDir);

                        saveLastUpdateTime();
                    }
                    startNodeWithArguments(new String[]{"node",
                            nodeDir+"/main.js"
                    });
//                    startNodeWithArguments(new String[]{"node", "-e",
//                            "var http = require('http'); " +
//                                    "var versions_server = http.createServer( (request, response) => { " +
//                                    "  response.end('Versions: ' + JSON.stringify(process.versions)); " +
//                                    "}); " +
//                                    "versions_server.listen(3000);"
//                    });
                }
            }).start();
        }
    }

    private static boolean deleteFolderRecursively(File file) {
        try {
            boolean res=true;
            for (File childFile : file.listFiles()) {
                if (childFile.isDirectory()) {
                    res &= deleteFolderRecursively(childFile);
                } else {
                    res &= childFile.delete();
                }
            }
            res &= file.delete();
            return res;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private static boolean copyAssetFolder(AssetManager assetManager, String fromAssetPath, String toPath) {
        try {
            String[] files = assetManager.list(fromAssetPath);
            boolean res = true;

            if (files.length==0) {
                //If it's a file, it won't have any assets "inside" it.
                res &= copyAsset(assetManager,
                        fromAssetPath,
                        toPath);
            } else {
                new File(toPath).mkdirs();
                for (String file : files)
                    res &= copyAssetFolder(assetManager,
                            fromAssetPath + "/" + file,
                            toPath + "/" + file);
            }
            return res;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private static boolean copyAsset(AssetManager assetManager, String fromAssetPath, String toPath) {
        InputStream in = null;
        OutputStream out = null;
        try {
            in = assetManager.open(fromAssetPath);
            new File(toPath).createNewFile();
            out = new FileOutputStream(toPath);
            copyFile(in, out);
            in.close();
            in = null;
            out.flush();
            out.close();
            out = null;
            return true;
        } catch(Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private static void copyFile(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[1024];
        int read;
        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
        }
    }

    private boolean wasAPKUpdated() {
        SharedPreferences prefs = getApplicationContext().getSharedPreferences("NODEJS_MOBILE_PREFS", Context.MODE_PRIVATE);
        long previousLastUpdateTime = prefs.getLong("NODEJS_MOBILE_APK_LastUpdateTime", 0);
        long lastUpdateTime = 1;
        try {
            PackageInfo packageInfo = getApplicationContext().getPackageManager().getPackageInfo(getApplicationContext().getPackageName(), 0);
            lastUpdateTime = packageInfo.lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
        return (lastUpdateTime != previousLastUpdateTime);
    }

    private void saveLastUpdateTime() {
        long lastUpdateTime = 1;
        try {
            PackageInfo packageInfo = getApplicationContext().getPackageManager().getPackageInfo(getApplicationContext().getPackageName(), 0);
            lastUpdateTime = packageInfo.lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
        SharedPreferences prefs = getApplicationContext().getSharedPreferences("NODEJS_MOBILE_PREFS", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putLong("NODEJS_MOBILE_APK_LastUpdateTime", lastUpdateTime);
        editor.commit();
    }

    /**
     * A native method that is implemented by the 'native-lib' native library,
     * which is packaged with this application.
     */
    public native Integer startNodeWithArguments(String[] arguments);
}
