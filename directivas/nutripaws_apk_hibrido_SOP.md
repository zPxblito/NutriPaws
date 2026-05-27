# Directiva: Creación de APK Híbrido (Assets Locales + WebViewAssetLoader)

## Contexto
NutriPaws es una WebApp responsiva que debe empaquetarse como una aplicación de Android (APK) para distribución. Para lograr tiempos de carga de milisegundos y evitar depender de la red para descargar el HTML/CSS, los archivos se servirán de manera local (híbrido).

## Restricciones y Casos Borde (IMPORTANTE)
- **Problema de `file://` en Firebase:** Firebase Authentication (especialmente el inicio de sesión con Google) rechaza los orígenes `file://` por razones de seguridad.
- **Solución:** Utilizar `WebViewAssetLoader` de la librería `androidx.webkit`. Esto intercepta las llamadas y las sirve bajo un dominio virtual como `https://appassets.androidplatform.net`.
- **Firebase Auth:** Es MANDATORIO que el administrador añada `appassets.androidplatform.net` a la lista de "Dominios autorizados" en la consola de Firebase -> Authentication -> Configuración.
- **Problema de Gradle (Java 8):** Gradle 8/9 requiere Java 17 o superior. Usar Java 8 causa el error `Gradle requires JVM 17 or later to run`.
- **Solución:** El script en Python debe verificar y descargar un JDK 17 portable (ej. Temurin) y configurar la variable de entorno `JAVA_HOME` para el subproceso de Gradle. No imprimir emojis en Windows CMD porque causa error de codec `cp1252`.
- **Problema de Licencias SDK:** Gradle falla instalando dependencias (ej. `build-tools`) si las licencias del SDK no están aceptadas.
- **Solución:** El script en Python debe auto-aceptar las licencias escribiendo los hashes conocidos en `Android/Sdk/licenses/` antes de compilar.
- **Problema de Icono (Duplicate Resources):** Al reemplazar el icono `ic_launcher.png`, si la carpeta `mipmap-anydpi-v26` contiene archivos `.xml` (iconos adaptativos por defecto), Gradle arrojará el error `Duplicate Resources`.
- **Solución:** Borrar completamente la carpeta `mipmap-anydpi-v26` o eliminar los `.xml` antes de inyectar el PNG.

## Pasos de Ejecución Estándar (SOP)
1.  **Generación:** Utilizar el CLI oficial (`android create empty-activity`).
2.  **Copia de Assets:** Los archivos estáticos (carpeta `public/` del proyecto web) deben copiarse recursivamente a la carpeta nativa `app/src/main/assets/public/`.
3.  **Configuración Nativa:**
    -   Modificar `AndroidManifest.xml` para añadir `<uses-permission android:name="android.permission.INTERNET" />`.
    -   Añadir la dependencia `implementation 'androidx.webkit:webkit:1.8.0'` (o su sintaxis Kotlin) en el archivo `build.gradle` de la app.
4.  **Código del WebView:** El `MainActivity` debe configurar `WebViewAssetLoader`, habilitar Javascript, y cargar `https://appassets.androidplatform.net/assets/public/index.html`.
5.  **Construcción:** Usar `./gradlew assembleDebug` en el entorno de la app para compilar el APK.
