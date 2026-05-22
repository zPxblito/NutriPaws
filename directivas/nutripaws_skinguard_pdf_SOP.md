# SOP: NutriPaws - Módulos "Escudo Anti-Veterinarios" & "AI-SkinGuard"

Esta directiva define los estándares operativos para los submódulos clínicos introducidos en la Fase 3.

## 1. Módulo "Escudo Anti-Veterinarios" (Exportación PDF)
- **Objetivo:** Generar un reporte clínico en PDF con diseño limpio, combinando datos de la mascota, dieta BARF actual y agenda de eventos médicos.
- **Entradas:** `petId` (para recolectar estado en memoria) y librerías de generación PDF.
- **Salida:** Descarga automática en el navegador del usuario de un archivo `Reporte_Clinico_[Mascota].pdf`.
- **Restricciones / Trampas Conocidas:**
  - *Generación de PDF en Backend (Python):* Requiere dependencias pesadas a nivel de sistema operativo (`wkhtmltopdf` o libcairo). Para mantener el despliegue serverless gratis en Firebase, **se restringe la generación de PDF en Backend**.
  - *Solución Definitiva:* La generación del PDF se delega al Frontend utilizando `html2pdf.bundle.js` apuntando a un elemento DOM invisible (template HTML).
  - El PDF siempre debe incluir el bloque "Metodología de Cálculo Nutricional" al final del documento.

## 2. Módulo "AI-SkinGuard"
- **Objetivo:** Analizar problemas dermatológicos usando IA de Visión y devolver diagnósticos probabilísticos.
- **Entradas:** Archivo de imagen subido desde el Frontend (`multipart/form-data`) hacia la ruta de Backend `/api/skinguard/analyze`.
- **Salida JSON:** La IA debe devolver *únicamente* una estructura JSON con los campos: `diagnostico_presuntivo`, `probabilidad`, `explicacion`, `primeros_auxilios`, `urgencia` (BAJA, MEDIA, ALTA), `disclaimer`.
- **Restricciones / Trampas Conocidas:**
  - *Gemini Prompting:* LLMs tienden a añadir texto extra (e.g. "Aquí tienes tu JSON..."). El System Prompt debe ser sumamente estricto prohibiendo cualquier texto fuera de la sintaxis JSON.
  - *Fallback / Mocks:* En ausencia de `GEMINI_API_KEY` en el entorno (`.env`), el endpoint de Python `/api/skinguard/analyze` debe realizar un `time.sleep(2)` para simular latencia y devolver un payload JSON estático (mock) estructurado correctamente, garantizando que el Frontend no falle.
  - En la interfaz UI, el Input debe ser `<input type="file" accept="image/*">` para invocar la cámara en móviles de forma nativa.
  - En la UI, los colores de resultado están estrictamente mapeados: Verde (BAJA), Amarillo (MEDIA), Rojo (ALTA).
