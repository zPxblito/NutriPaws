import os
import shutil
import subprocess
import urllib.request
import zipfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANDROID_DIR = os.path.join(BASE_DIR, 'android-app')
APP_DIR = os.path.join(ANDROID_DIR, 'app')
SRC_MAIN = os.path.join(APP_DIR, 'src', 'main')
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
ASSETS_DIR = os.path.join(SRC_MAIN, 'assets', 'public')

def ensure_jdk17():
    jdk_dir = os.path.join(ANDROID_DIR, 'jdk')
    if not os.path.exists(jdk_dir):
        print("Descargando JDK 17 (Temurin) para compilar Gradle...")
        url = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.zip"
        zip_path = os.path.join(ANDROID_DIR, "jdk.zip")
        try:
            urllib.request.urlretrieve(url, zip_path)
            print("Extrayendo JDK 17...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(jdk_dir)
            os.remove(zip_path)
        except Exception as e:
            print(f"Error descargando JDK: {e}")
            return None
    
    for folder in os.listdir(jdk_dir):
        if "jdk" in folder.lower():
            return os.path.join(jdk_dir, folder)
    return None

def accept_licenses():
    print("Aceptando licencias del SDK de Android automaticamente...")
    sdk_path = os.environ.get("ANDROID_HOME") or os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Android', 'Sdk')
    licenses_dir = os.path.join(sdk_path, 'licenses')
    os.makedirs(licenses_dir, exist_ok=True)
    
    # Hashes conocidos para aceptar licencias
    hashes = {
        "android-sdk-license": "24333f8a63b6825ea9c5514f83c2829b004d1fee\\n8933bad161af4178b1185d1a37fbf41ea5269c55\\nd56f5187479451eabf01fb78af6dfcb131a6481e\\n24333f8a63b6825ea9c5514f83c2829b004d1fee\\n",
        "android-googletv-license": "601085b94cd77f0b54ff86406957099ebe79c4d6\\n",
        "android-sdk-preview-license": "84831b9409646a918e30573bab4c9c91346d8abd\\n",
    }
    
    for name, content in hashes.items():
        with open(os.path.join(licenses_dir, name), 'w', encoding='utf-8') as f:
            f.write(content.replace('\\n', '\n'))
    print("Licencias inyectadas.")

def setup_assets():
    print("Copiando carpeta public/ a assets/public/...")
    if os.path.exists(ASSETS_DIR):
        shutil.rmtree(ASSETS_DIR)
    shutil.copytree(PUBLIC_DIR, ASSETS_DIR)

def update_manifest():
    print("Anadiendo permisos a AndroidManifest.xml...")
    manifest_path = os.path.join(SRC_MAIN, 'AndroidManifest.xml')
    with open(manifest_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "android.permission.INTERNET" not in content:
        content = content.replace("<application", "<uses-permission android:name=\"android.permission.INTERNET\" />\n    <application")
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(content)

def update_gradle():
    print("Anadiendo dependencia androidx.webkit...")
    gradle_path = os.path.join(APP_DIR, 'build.gradle.kts')
    with open(gradle_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "androidx.webkit" not in content:
        content = content.replace("dependencies {", "dependencies {\n  implementation(\"androidx.webkit:webkit:1.8.0\")")
        with open(gradle_path, 'w', encoding='utf-8') as f:
            f.write(content)

def update_main_activity():
    print("Sobrescribiendo MainActivity.kt para inyectar WebView Hibrido...")
    activity_path = os.path.join(SRC_MAIN, 'java', 'com', 'example', 'nutripaws', 'MainActivity.kt')
    
    kt_code = """package com.example.nutripaws

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.ViewGroup
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
        }
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
        }
        
        setContentView(webView)
        
        webView.loadUrl("https://appassets.androidplatform.net/assets/public/index.html")
    }
}
"""
    with open(activity_path, 'w', encoding='utf-8') as f:
        f.write(kt_code)

def build_apk():
    print("Iniciando compilacion del APK...")
    gradlew = os.path.join(ANDROID_DIR, 'gradlew.bat')
    
    env = os.environ.copy()
    jdk_path = ensure_jdk17()
    if jdk_path:
        env["JAVA_HOME"] = jdk_path
        print(f"Usando JAVA_HOME: {jdk_path}")

    try:
        subprocess.run([gradlew, "assembleDebug"], cwd=ANDROID_DIR, env=env, check=True)
        print("OK: APK compilado con exito. Busca el archivo en android-app/app/build/outputs/apk/debug/")
    except subprocess.CalledProcessError as e:
        print(f"FAIL: Error al compilar el APK: {e}")

if __name__ == '__main__':
    accept_licenses()
    setup_assets()
    update_manifest()
    update_gradle()
    update_main_activity()
    build_apk()
    print("Script de orquestacion finalizado.")
