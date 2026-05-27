# 🐾 Auditoría Completa — NutriPaws

**URL:** https://nutri-paws.vercel.app/  
**Fecha:** 26 de Mayo, 2026  
**Tipo de app:** SPA (Single Page Application) — Salud y nutrición para mascotas  
**Stack:** HTML + CSS + JS Vanilla + Firebase Auth + Firestore + Vercel + PayPal SDK  

---

## ¿Hace falta iniciar sesión para verla completa?

**Sí, es necesario iniciar sesión** para acceder a todas las funcionalidades. Sin login solo se ve:
- La pantalla de login/registro con el logo
- El formulario de autenticación (Google o email/password)

Todo el contenido real (dashboard, calculadora BARF, clínica IA, análisis de piel, agenda, suscripciones) está **bloqueado detrás del login**. Esto significa que:

> [!WARNING]  
> **Cualquier visitante nuevo que llegue a la web NO puede ver qué ofrece NutriPaws antes de registrarse.** No hay landing page, no hay sección de features, no hay pricing público, no hay testimonios visibles. Es un muro de login inmediato.

---

## 📊 Resumen Ejecutivo

| Área | Puntuación | Veredicto |
|------|:----------:|-----------|
| **Propuesta de valor** | ⭐⭐⭐⭐ | Muy buena idea con diferenciación real (IA dermatológica + BARF) |
| **UX / Experiencia** | ⭐⭐⭐ | Funcional pero con fricciones significativas |
| **Diseño visual** | ⭐⭐⭐ | Correcto en dark mode, pero no "wow" — se puede elevar mucho |
| **SEO** | ⭐⭐ | Buenas meta tags pero sin landing page indexable |
| **Código / Rendimiento** | ⭐⭐ | Archivo monolítico de +3100 líneas, sin modularizar |
| **Seguridad** | ⭐⭐ | Exposición de claves de API en el frontend |
| **Modelo de negocio** | ⭐⭐⭐ | Buena estructura (trial + suscripción) pero débil en conversión |

---

## ✅ Puntos Fuertes

### 1. Propuesta de valor diferenciada
NutriPaws combina **4 herramientas útiles** en una sola app:
- **Calculadora BARF/Mixta** con fórmulas veterinarias (RER/MER de NRC/WSAVA)
- **Análisis dermatológico con IA** (Gemini Vision)
- **Registro médico inteligente** que extrae eventos de texto libre
- **Dosificación de emergencia** con advertencias legales

Esto es mucho más que una simple calculadora de comida — es un **mini-veterinario digital**.

### 2. Buen SEO técnico (meta tags)
- Open Graph completo para Facebook/LinkedIn/WhatsApp
- Twitter Cards configuradas
- Meta description descriptiva y con keywords relevantes
- Title tag bien estructurado
- `lang="es"` correcto

### 3. Diseño responsive
- Grid CSS adaptativo con breakpoints para móvil
- Bottom navigation bar nativa para móvil con safe-area para iPhone
- Cards y formularios que se reorganizan bien en pantallas pequeñas

### 4. Sistema de autenticación robusto
- Login con Google + Email/Password
- Verificación de email obligatoria
- Cooldown de 60s para reenvío de verificación
- Manejo de errores traducidos al español
- Migración automática de localStorage a Firestore

### 5. Persistencia de datos sólida
- Firestore como backend con estructura `users/{uid}/pets/{petId}`
- Guardado automático de dietas, eventos, historial médico y dermatológico
- Exportación a PDF de reportes

### 6. Tonalidad y copywriting
- Lenguaje cercano ("peludo", "añitos", "mesecitos")
- Advertencias legales en la dosificación de emergencia
- Microcopy claro en formularios

---

## ❌ Puntos Débiles y Mejoras Necesarias

### 🔴 CRÍTICO: Sin Landing Page

> [!CAUTION]
> **El problema #1 de toda la web.** No hay NINGUNA página pública que explique qué es NutriPaws, qué ofrece, cuánto cuesta, ni por qué deberías registrarte.

**Impacto:** 
- Cualquier persona que llegue desde redes sociales, Google, o un enlace compartido ve SOLO un formulario de login
- No hay propuesta de valor visible antes de registrarse
- Tasa de rebote probablemente altísima (>80%)
- Google no puede indexar contenido útil = SEO muerto en la práctica

**Solución propuesta:**
Crear una landing page completa con:
- Hero section con valor proposición claro
- Sección de features con capturas de pantalla
- Pricing visible ($6.99/mes + 7 días gratis)
- Testimonios / Social proof
- CTA de registro
- FAQ

---

### 🔴 CRÍTICO: Exposición de credenciales en el Frontend

> [!CAUTION]
> **Se exponen claves sensibles directamente en el HTML/JS del frontend:**

1. **PayPal Client ID** visible en el HTML (línea 738):
   ```
   client-id=AcYQgTvYLjNELcrzArrXrwDYtq9lCYixoyQyKz-NMwlbt9pAhJm5HyfOIWhk3l3qa_LDGLW-SZEo8uWI
   ```

2. **Firebase Config** probablemente expuesta en `firebase-auth.js` (no pude leerla pero es una práctica estándar para Firebase)

3. **API de Gemini** se llama a endpoints como `/api/process_medical_record`, `/api/skinguard/analyze`, `/api/emergency_guide` — estos endpoints de Vercel Serverless probablemente contienen las API keys de Google, pero deben tener **rate limiting** y **validación de autenticación** en el backend para evitar abuso.

**Recomendaciones:**
- Validar que TODOS los endpoints API verifiquen el token de Firebase Auth del usuario
- Implementar rate limiting en las funciones serverless
- La clave de PayPal en el frontend es "esperado" (client-side), pero asegurarse de que la validación de suscripción se haga SIEMPRE server-side
- Revisar que la verificación de suscripción no se pueda bypassear desde el cliente

---

### 🔴 CRÍTICO: Validación de suscripción solo en el cliente

El flujo de validación de suscripción ocurre enteramente en el frontend (app.js, líneas ~144-236):
```javascript
if (userData.subscriptionStatus === 'active') {
    showView(viewDashboard); // Acceso completo
} else if (now > userData.trialEndsAt) {
    showView(document.getElementById('view-subscription')); // Paywall
}
```

> [!WARNING]
> Un usuario con conocimientos básicos de DevTools podría:
> 1. Modificar `userData.subscriptionStatus` en memoria a `'active'`
> 2. Llamar a `showView(viewDashboard)` desde la consola
> 3. Acceder a todo el contenido sin pagar

**Solución:** Las reglas de seguridad de Firestore deben validar que el usuario tenga suscripción activa antes de permitir escrituras/lecturas de datos sensibles. La verificación debe ser server-side.

---

### 🟡 IMPORTANTE: Código monolítico

`app.js` tiene **+3100 líneas** en un solo archivo. Esto incluye:
- Lógica de autenticación
- Gestión de vistas (SPA routing)
- Base de datos completa de razas de perros y gatos (~800 líneas de JSON)
- Calculadora nutricional
- Lógica de calendario
- Integración con IA
- Dosificación médica
- Exportación PDF
- PayPal
- Efectos de cursor

**Problemas:**
- Mantenibilidad extremadamente difícil
- No hay separación de concerns
- Imposible hacer testing unitario
- Un solo error puede romper toda la app

**Solución:** Modularizar con ES Modules o migrar a un framework (React/Vue/Next.js):
```
/modules
  ├── auth.js
  ├── pets.js
  ├── calculator.js
  ├── calendar.js
  ├── medical.js
  ├── skinguard.js
  ├── dosage.js
  ├── paypal.js
  └── data/breeds.json
```

---

### 🟡 IMPORTANTE: Exceso de inline styles

El 90% de los estilos están escritos **inline directamente en el HTML**, no en `styles.css`. Esto causa:
- HTML muy pesado y difícil de leer
- Imposible aplicar temas consistentes
- Los cambios de diseño requieren editar cada elemento uno por uno
- No se pueden cachear los estilos

**Ejemplo (línea 137):**
```html
<div id="dropdown-menu" style="display: none; position: absolute; right: 0; top: 60px; 
  background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(15px); border: 1px solid 
  rgba(255,255,255,0.1); border-radius: 12px; padding: 0.8rem; width: 220px; 
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
```

**Solución:** Mover todos los estilos inline a clases CSS en `styles.css`.

---

### 🟡 DISEÑO: Mejoras visuales necesarias

#### a) El logo es demasiado grande
- `height: 220px` para el logo en la pantalla de login es excesivo
- En móvil ocupa casi la mitad de la pantalla
- **Sugerencia:** 120-150px máximo, dejar más espacio para el formulario

#### b) No hay ilustraciones ni imágenes atractivas
- La página de login es solo un formulario sobre un fondo oscuro
- No hay ninguna imagen de mascota, ninguna ilustración que genere conexión emocional
- **Sugerencia:** Añadir ilustraciones de mascotas, fotos de perros/gatos saludables, iconografía más expresiva

#### c) El efecto de cursor trail (puntitos verdes) es innecesario
- Crea 5 elementos DOM adicionales que siguen el cursor
- Con MutationObserver activo observando todo el body
- No aporta valor y puede impactar rendimiento en dispositivos débiles
- **Sugerencia:** Eliminarlo o hacerlo opt-in

#### d) Paleta de colores limitada
- El verde (#8DC63F) es el único color de marca real
- El azul (#124962) apenas se usa
- Las cards son todas del mismo color opaco
- **Sugerencia:** Crear gradientes distintivos para cada sección (clínica=verde, dietas=morado, emergencia=rojo), lo cual ya hacen parcialmente pero de forma inconsistente

#### e) Las tarjetas de mascota necesitan más jerarquía visual
- Todo el texto está centrado sin clara jerarquía
- Los botones de acción son muy similares entre sí
- **Sugerencia:** Layout horizontal con avatar a la izquierda, datos a la derecha, botones abajo

---

### 🟡 UX: Fricciones detectadas

#### a) Formulario de registro de mascota demasiado largo
- 7 campos en una sola pantalla scrolleable
- No hay indicador de progreso
- **Sugerencia:** Dividir en 2-3 pasos con progress bar

#### b) El botón "Emergencia" tiene posición fija conflictiva
```css
.btn-emergency {
    position: fixed;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 9999;
}
```
- En móvil se convierte en un botón circular flotante que puede tapar contenido
- En desktop compite visualmente con el header
- **Sugerencia:** Integrarlo en la bottom bar de navegación como un icono, o crear una sección dedicada

#### c) Nombres de razas en inglés
- Los nombres de razas están todos en inglés ("Border Collie", "French Bulldog", etc.)
- Toda la UI está en español
- **Sugerencia:** Traducir los nombres de razas al español o al menos mostrar ambos

#### d) El menú hamburguesa se oculta en móvil
```css
@media (max-width: 768px) {
    #menu-trigger { display: none !important; }
}
```
- El menú de opciones (cambiar tema, soporte, cerrar sesión) desaparece en móvil
- Solo se accede desde la tab "Perfil" pero no es obvio
- **Sugerencia:** Asegurar que todas las opciones sean accesibles desde la bottom nav

#### e) No hay confirmación visual de acciones
- Al guardar una mascota no hay toast/notificación de éxito
- Al calcular una dieta no hay animación de transición
- Se usa `alert()` nativo para todo — poco profesional
- **Sugerencia:** Implementar un sistema de toasts/snackbars custom

---

### 🟡 Open Graph incorrecto

```html
<meta property="og:url" content="https://nutripaws.app">
<meta property="og:image" content="https://nutripaws.app/assets/logo-fondo.png">
```

> [!IMPORTANT]
> El dominio en Open Graph es `nutripaws.app` pero la app está desplegada en `nutri-paws.vercel.app`. Las previsualizaciones de WhatsApp/Facebook/LinkedIn **no funcionarán** correctamente porque la imagen no se cargará desde el dominio correcto.

**Solución:** Cambiar a:
```html
<meta property="og:url" content="https://nutri-paws.vercel.app">
<meta property="og:image" content="https://nutri-paws.vercel.app/assets/logo-fondo.png">
```

---

### 🟡 Rendimiento

1. **Base de datos de razas embebida en JS:** ~800 líneas de JSON hardcodeado dentro de `app.js`. Debería ser un archivo JSON separado cargado bajo demanda.

2. **html2pdf.js cargado siempre:** La librería de exportación PDF se carga en TODAS las páginas, incluso en login. Debería cargarse lazy cuando el usuario necesita exportar.

3. **PayPal SDK cargado siempre:** El script de PayPal se carga incluso cuando el usuario ya tiene suscripción activa.

4. **Sin lazy loading de imágenes:** Los avatares de mascotas (almacenados como base64 en Firestore) se cargan todos a la vez.

5. **`transition: background-color 0.3s, color 0.3s...` en el selector `*`:** Esto aplica transiciones a TODOS los elementos del DOM, causando repaint innecesario.

---

### 🟡 Footer y enlaces rotos

- Los enlaces de redes sociales (Instagram, Twitter/X, Facebook) apuntan a `#` — no llevan a ningún sitio
- El enlace de "Soporte" en el dropdown no hace nada (no tiene event listener)
- La página de privacidad (`privacy.html`) existe pero debería estar linkeada también desde la landing page

---

### 🟡 Accesibilidad

- No hay `aria-labels` en los botones con solo iconos (botón hamburguesa, botón eliminar)
- Los SVGs inline no tienen `role="img"` ni `aria-hidden`
- Los modales no tienen `role="dialog"` ni `aria-modal`
- No se gestiona el foco (focus trap) en los modales
- El contraste del texto muted (`#94A3B8`) sobre fondo oscuro (`#0B1120`) puede ser insuficiente

---

### 🟡 Modelo de negocio

| Aspecto | Estado actual | Mejora sugerida |
|---------|--------------|-----------------|
| Precio | $6.99/mes | Considerar plan anual con descuento |
| Trial | 7 días | Correcto, pero sin landing page no convierte |
| Opciones de pago | PayPal + Binance/Zinli manual | Añadir Stripe para tarjetas de crédito directas |
| Onboarding | Se muestra paywall al nuevo usuario | Mostrar el valor primero (dejar usar la app), luego paywall |
| Página de pricing | No existe | Crear una sección pública de pricing |

---

## 🎯 Plan de Acción Priorizado

### Prioridad 1 — Crítico (Impacto inmediato)
1. **Crear landing page pública** con features, pricing y CTA
2. **Corregir Open Graph** al dominio correcto
3. **Validar suscripción server-side** en Firestore Security Rules
4. **Implementar rate limiting** en endpoints de IA

### Prioridad 2 — Importante (Próximas 2-4 semanas)
5. **Mover estilos inline a CSS** para mantenibilidad
6. **Modularizar app.js** en archivos separados
7. **Implementar toasts** en lugar de `alert()` nativo
8. **Lazy load** de html2pdf.js y PayPal SDK
9. **Reducir tamaño del logo** y mejorar la pantalla de login

### Prioridad 3 — Mejoras (Próximo mes)
10. **Traducir razas** al español
11. **Dividir formulario de mascota** en wizard de pasos
12. **Añadir plan anual** y Stripe como opción de pago
13. **Mejorar accesibilidad** (ARIA, focus management)
14. **Eliminar cursor trail** o hacerlo opcional
15. **Extraer breeds.json** como archivo separado

---

## 💡 Oportunidades Adicionales

- **PWA (Progressive Web App):** La app ya tiene estructura de SPA. Añadir manifest.json y service worker la convertiría en instalable desde el navegador, lo cual es ideal para dueños de mascotas que la usarían frecuentemente.
- **Notificaciones push:** Recordatorios de citas veterinarias vía push notifications.
- **Multi-idioma:** El público hispanohablante es el target, pero expandir a inglés y portugués multiplicaría el mercado.
- **Programa de referidos:** "Invita a un amigo y obtén 1 mes gratis" — barato de implementar y potente para crecimiento.
- **Blog/Contenido SEO:** Artículos sobre nutrición BARF, cuidado de mascotas, etc. para captar tráfico orgánico.
