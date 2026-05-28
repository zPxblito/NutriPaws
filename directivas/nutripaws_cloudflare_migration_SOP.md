# Directiva SOP: Migración de NutriPaws a Cloudflare

## Contexto y Objetivo
Migrar toda la infraestructura de NutriPaws de Vercel a la red de Cloudflare para optimizar velocidad, costos y ancho de banda.
*   **Frontend:** Alojar en Cloudflare Pages conectando GitHub.
*   **Backend:** Alojar en Cloudflare Workers en JavaScript para resolver las incompatibilidades del Edge de Cloudflare con librerías nativas de Python (como Pillow).

---

## Restricciones y Casos Borde (IMPORTANTE)
*   **Wrangler en Windows/Powershell:** Para ejecutar comandos de Wrangler en Windows sin interrupción interactiva, pasar variables del `.env` directamente en la consola de comandos de PowerShell o usar `cross-env`.
*   **Secretos en Workers:** No expongas nunca `GEMINI_API_KEY` en `wrangler.toml`. Debe ser inyectada usando el comando `wrangler secret put` de forma segura.
*   **Redirecciones en Pages:** Para evitar fallos de CORS, la comunicación frontend-backend debe pasar por la regla de redirección de Cloudflare Pages (`public/_redirects`).

---

## Lógica de Ejecución y Despliegue

### 1. Creación del Worker
*   Escribir el código del Worker en `api-worker/src/index.js` en formato ES Modules.
*   Definir la configuración del Worker en `api-worker/wrangler.toml`.

### 2. Configuración de Redirecciones
*   Crear `public/_redirects` con la regla de redirección transparente `/api/*` apuntando al subdominio del Worker.
*   Sincronizar este archivo con los assets de Android para mantener coherencia (aunque el APK seguirá cargando de forma local y haciendo llamadas HTTPS absolutas si se requiere, o bien relativas que el interceptor de la app de Android manejará).
*   *Nota:* Para el APK de Android, dado que carga localmente usando `WebViewAssetLoader`, las peticiones relativas a `/api/` no se resuelven en Internet automáticamente a menos que MainActivity.kt o el código JavaScript en la app móvil use la URL absoluta de producción del backend.
*   *IMPORTANTE:* En `public/app.js`, la URL de la API debe poder configurarse de forma dinámica para apuntar a la URL de producción del Worker si se ejecuta en Android, o de forma relativa si se ejecuta en la web.

### 3. Ejecución de Comandos de Despliegue (Wrangler)
*   Cargar las variables `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` del archivo `.env`.
*   Ejecutar `npx wrangler deploy` en el directorio `api-worker/` pasando el token de autenticación.
*   Cargar el secreto `GEMINI_API_KEY` en el Worker usando:
    `echo <key> | npx wrangler secret put GEMINI_API_KEY`
