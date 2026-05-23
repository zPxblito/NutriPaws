# Directiva: Correcciones Versión 34 (Mascotas, Perfil y Suscripción)

## Contexto y Problema
Al implementar Firebase/Firestore en la versión anterior (v33/v34), se introdujeron varios bugs y comportamientos inesperados:
1.  **Pérdida de Mascotas Locales:** Las mascotas almacenadas en `localStorage` no se migraban a Firestore.
2.  **Vista de Suscripción Inválida desde Perfil:** Al hacer clic en "Suscripción UltraPaws" se mostraba el texto duro de HTML ("Tu periodo de prueba ha expirado").
3.  **Error de Alcance (Scope) de JS:** La variable `currentUser` estaba declarada dentro del primer `DOMContentLoaded`, por lo que el segundo `DOMContentLoaded` arrojaba un `ReferenceError` silencioso, impidiendo que el código de actualización de la vista se ejecutara.
4.  **Falta de Despliegue (Deploy):** Vercel no refleja los cambios automáticamente si no se hace `git push`. Las pruebas en vivo daban falso negativo ("No es caché, es culpa del código") cuando en realidad el código no estaba desplegado.

## Restricciones y Casos Borde (IMPORTANTE)
-   **Entorno Windows (Ejecución de Python):** El comando `python` puede fallar redirigiendo al Microsoft Store. Ejecutar usando `py scripts/nombre_script.py`.
-   **Variables Globales vs Scoped en JS:** Nunca asumas que las variables `let` dentro de `DOMContentLoaded` son globales. Para la autenticación en otros scopes, usar `window.firebaseAuth.auth.currentUser`.
-   **Regla de Despliegue:** Todo cambio en la interfaz (como añadir el botón de WhatsApp o PayPal) **DEBE** ir acompañado de un `git commit` y `git push` para que Vercel sirva la nueva versión al usuario.

## Lógica de Corrección y Ejecución

### 1. Parche de Ámbito (Scope) en `app.js`
Reemplazar cualquier llamada a `currentUser` dentro del segundo listener por `window.firebaseAuth.auth.currentUser`.

### 2. Despliegue a Producción
El script de Python debe, tras aplicar los cambios, ejecutar subprocesos de Git para subir los cambios al repositorio (`origin main`).
