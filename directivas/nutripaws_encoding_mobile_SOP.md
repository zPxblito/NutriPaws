# Directiva SOP: Corrección de Codificación y Diseño Móvil en NutriPaws

## Contexto y Problema
Recientemente se reportaron dos fallas mayores en producción:
1.  **Caracteres de texto rotos (Codificación):** Emojis y caracteres especiales (ñ, acentos, viñetas) se visualizaban de forma incorrecta (ej: `ðŸ¶`, `aÃ±ito`, `â€¢`).
2.  **Layout móvil roto:** La aplicación NutriPaws no cargaba o se rompía visualmente en pantallas móviles.

### Análisis de Causa Raíz
*   **Codificación:** El script de PowerShell `scripts/replace_emojis.ps1` fue ejecutado en Windows leyendo archivos UTF-8 con un simple `Get-Content` sin especificar el parámetro `-Encoding UTF8`. PowerShell lee por defecto usando la codificación ANSI de Windows (Windows-1252), corrompiendo los caracteres UTF-8 en memoria, y posteriormente los reescribió como UTF-8 con `Set-Content -Encoding UTF8`, causando una **doble codificación**.
*   **Falta de Commits/Deploys:** En la sesión anterior se corrigieron los archivos de forma local en `public/`, pero **nunca se subieron al repositorio de GitHub (commit y push)**, por lo que Vercel continuaba sirviendo los archivos dañados de la versión anterior.
*   **Layout Móvil:** El archivo `public/app.html` contiene una **duplicación masiva y malformación de HTML** a partir de la línea 652 (con elementos como `#view-calendar`, `#view-subscription`, etc., repetidos y anidados erróneamente dentro de un bloque del menú de navegación inferior). Esta malformación rompe el árbol DOM del navegador, provocando que en dispositivos móviles las vistas colapsen o se muestren en blanco.
*   **Límites de Vercel:** Los límites máximos del cuerpo de la solicitud en Vercel Serverless (Free) son de **4.5 MB**. Las validaciones actuales del lado del cliente en `app.js` permitían hasta 10 MB para documentos y 5 MB para SkinGuard, lo cual excede el límite de Vercel y causaría un error 413 no controlado.

---

## Restricciones y Casos Borde (IMPORTANTE)
*   **Manipulación de Archivos en PowerShell/Windows:** Nunca leas archivos de código UTF-8 en PowerShell sin forzar el parámetro `-Encoding UTF8` (ej: `Get-Content -Path 'file' -Encoding UTF8 -Raw`). De lo contrario, se reintroducirá el error de doble codificación.
*   **Evitar Parches de Caché temporales:** Eliminar cualquier parámetro temporal `?v=X` en los scripts de `app.html` y mantener las llamadas limpias (`app.js`, `styles.css`). La actualización real se asegura mediante el despliegue correcto y la purga del CDN en Vercel/GitHub.
*   **Sincronización Obligatoria:** Todo cambio en la carpeta `public/` debe replicarse en la carpeta de assets del proyecto Android híbrido (`android-app/app/src/main/assets/public/`) antes de compilar y desplegar.

---

## Lógica de Corrección y Ejecución

### 1. Limpieza de Estructura de HTML en `public/app.html`
*   Eliminar el bloque duplicado y malformado que se encuentra entre la línea 652 (inclusive) y la línea 846 (exclusive), manteniendo únicamente la estructura limpia del pie de página global y los scripts reales.
*   Remover parámetros temporales de caché en `app.html` (líneas 31, 872 y 874) dejando las referencias limpias.
*   Replicar los mismos cambios de limpieza en `android-app/app/src/main/assets/public/app.html`.

### 2. Ajuste de Límites en `public/app.js`
*   Reducir el límite de tamaño de archivos para subida en `app.js` a un máximo de **4 MB** (`MAX_SIZE_MB = 4` y `MAX_IMG_MB = 4`) para coincidir de forma segura con el límite de Vercel (4.5 MB).
*   Replicar los cambios en `android-app/app/src/main/assets/public/app.js`.

### 3. Sincronización y Compilación APK
*   Sincronizar todos los archivos frontend modificados con la carpeta de assets móviles de Android.
*   Efectuar commit y push de todas las modificaciones a la rama `main` para forzar la compilación limpia y el despliegue automático de Vercel.
