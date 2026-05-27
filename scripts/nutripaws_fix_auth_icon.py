import os
import shutil
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANDROID_DIR = os.path.join(BASE_DIR, 'android-app')
APP_DIR = os.path.join(ANDROID_DIR, 'app')
SRC_MAIN = os.path.join(APP_DIR, 'src', 'main')
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')

def fix_main_activity():
    print("Inyectando logica de WebChromeClient y User-Agent en MainActivity.kt...")
    activity_path = os.path.join(SRC_MAIN, 'java', 'com', 'example', 'nutripaws', 'MainActivity.kt')
    
    kt_code = """package com.example.nutripaws

import android.annotation.SuppressLint
import android.app.Dialog
import android.os.Bundle
import android.os.Message
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.webkit.WebViewAssetLoader

class MainActivity : ComponentActivity() {
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
            
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
            
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return false
            }
        }
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            
            // HACK PARA GOOGLE SIGN-IN (Elude el Error 403)
            userAgentString = userAgentString.replace("; wv", "")
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onCreateWindow(
                view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message
            ): Boolean {
                val newWebView = WebView(this@MainActivity)
                newWebView.settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    userAgentString = userAgentString.replace("; wv", "")
                    setSupportMultipleWindows(true)
                    javaScriptCanOpenWindowsAutomatically = true
                }
                
                val dialog = Dialog(this@MainActivity, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
                dialog.setContentView(newWebView)
                dialog.show()
                
                newWebView.webChromeClient = object : WebChromeClient() {
                    override fun onCloseWindow(window: WebView) {
                        dialog.dismiss()
                    }
                }
                
                newWebView.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        return false
                    }
                }
                
                val transport = resultMsg.obj as WebView.WebViewTransport
                transport.webView = newWebView
                resultMsg.sendToTarget()
                return true
            }
        }
        
        setContentView(webView)
        webView.loadUrl("https://appassets.androidplatform.net/assets/public/index.html")
    }
}
"""
    with open(activity_path, 'w', encoding='utf-8') as f:
        f.write(kt_code)

def replace_icons():
    print("Reemplazando icono de la app...")
    icon_source = os.path.join(PUBLIC_DIR, 'assets', 'logo-fondo.png')
    res_dir = os.path.join(SRC_MAIN, 'res')
    
    if not os.path.exists(icon_source):
        print("Logo no encontrado. Omitiendo icono.")
        return
        
    for folder in os.listdir(res_dir):
        if folder.startswith('mipmap-'):
            target_dir = os.path.join(res_dir, folder)
            
            # Si es anydpi, la borramos entera para evitar el Duplicate Resource con los XML vectoriales
            if 'anydpi' in folder:
                shutil.rmtree(target_dir)
                continue
                
            shutil.copy(icon_source, os.path.join(target_dir, 'ic_launcher.png'))
            shutil.copy(icon_source, os.path.join(target_dir, 'ic_launcher_round.png'))
            # Some versions use webp, we remove the default webp if they exist
            webp_launcher = os.path.join(target_dir, 'ic_launcher.webp')
            webp_round = os.path.join(target_dir, 'ic_launcher_round.webp')
            if os.path.exists(webp_launcher): os.remove(webp_launcher)
            if os.path.exists(webp_round): os.remove(webp_round)

def build_apk():
    print("Compilando el nuevo APK parcheado...")
    gradlew = os.path.join(ANDROID_DIR, 'gradlew.bat')
    
    env = os.environ.copy()
    jdk_path = os.path.join(ANDROID_DIR, 'jdk', 'jdk-17.0.10+7')
    if os.path.exists(jdk_path):
        env["JAVA_HOME"] = jdk_path
        print(f"Usando JAVA_HOME: {jdk_path}")
        
    try:
        subprocess.run([gradlew, "assembleDebug"], cwd=ANDROID_DIR, env=env, check=True)
        print("OK: Nuevo APK compilado con exito.")
    except subprocess.CalledProcessError as e:
        print(f"FAIL: Error al compilar el APK: {e}")

if __name__ == '__main__':
    fix_main_activity()
    replace_icons()
    build_apk()
    print("Actualizacion finalizada.")
