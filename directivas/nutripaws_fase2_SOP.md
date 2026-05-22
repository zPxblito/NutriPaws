# Directiva: NutriPaws Fase 2 (Salud y Notificaciones)

## 1. Objetivo Principal
Convertir NutriPaws de una calculadora estática a un asistente de salud integral (SaaS). El usuario debe poder subir registros médicos para análisis automático de IA, y agendar citas/medicamentos en un calendario que envíe notificaciones automatizadas (Email/WhatsApp) 3 días antes del evento.

## 2. Entradas (Inputs)
- **Archivos/Imágenes:** Registros médicos subidos por el usuario (PDF, JPG, PNG).
- **Datos de Calendario:** Tipo de evento (Vacuna, Chequeo, Medicamento), fecha programada, notas.
- **Datos de Contacto:** Email y Teléfono (con código de país) del usuario para notificaciones.

## 3. Lógica y Flujo (Arquitectura)
1. **Frontend (Panel de Salud):** 
   - Una interfaz segura (requiere autenticación o captura de datos de contacto) con dos secciones: "Análisis Médico" y "Calendario de Cuidados".
2. **Backend & Almacenamiento (Base de Datos):**
   - Se requiere una base de datos (Ej. Supabase, Firebase o Airtable) para almacenar los usuarios, las mascotas y los eventos programados.
3. **Módulo de Análisis IA:**
   - Al subir un registro médico, este archivo es enviado a un webhook (ej. n8n) que utiliza un LLM (Vision/PDF) para extraer datos relevantes y devolver un "Análisis de salud y hábitos recomendados".
4. **Módulo de Notificaciones (Scheduler):**
   - Un script o flujo de automatización en n8n que revisa diariamente la base de datos de eventos. Si un evento ocurre en "Fecha actual + 3 días", detona el envío de notificación (Resend para email, API de WhatsApp para mensajes). Continúa avisando diariamente hasta el día del evento.

## 4. Trampas Conocidas & Restricciones
- **Restricción 1:** Almacenamiento de archivos. Los documentos médicos deben guardarse en un bucket (como Supabase Storage) y solo pasar URLs firmadas al modelo de IA por seguridad, o enviarse en Base64 de forma temporal al LLM.
- **Restricción 2:** WhatsApp API. Las APIs oficiales de WhatsApp requieren plantillas pre-aprobadas para iniciar conversaciones (mensajes proactivos). Si se usa API no oficial (Baileys/Evolution API), hay riesgo de baneo si no hay opt-in. Se priorizará el envío de correos como sistema base infalible, y WhatsApp como capa secundaria.
- **Restricción 3:** Identidad del usuario. Para que el sistema funcione, es estrictamente obligatorio capturar un usuario (Login). Si no, no sabremos a quién enviarle el correo ni cómo vincular sus datos.

## 5. Procedimiento Operativo
1. Configurar la Base de Datos y autenticación.
2. Desarrollar el módulo UI de subida de archivos y calendario.
3. Crear los endpoints/webhooks para conectar con n8n/LLM.
4. Implementar el motor de cron-jobs para notificaciones.
