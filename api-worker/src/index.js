// Rate Limit persistente en memoria por instancia de Worker
const RATE_LIMIT_STORE = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  if (!RATE_LIMIT_STORE.has(ip)) {
    RATE_LIMIT_STORE.set(ip, []);
  }
  let timestamps = RATE_LIMIT_STORE.get(ip);
  timestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  timestamps.push(now);
  RATE_LIMIT_STORE.set(ip, timestamps);
  return true;
}

// Convertir ArrayBuffer a Base64 de forma eficiente y segura (sin desbordamiento de pila)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  const chunk_size = 0x8000; // Bloques de 32KB
  for (let i = 0; i < len; i += chunk_size) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunk_size, len))
    );
  }
  return btoa(binary);
}

// Verificación de JWT de Firebase en el Edge usando el Set de Claves Públicas (JWKS) de Google
async function verifyFirebaseToken(authHeader, projectId) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error("Token de autenticación faltante o con formato incorrecto.");
  }
  const token = authHeader.split('Bearer ')[1];
  
  // Dividir el JWT en sus tres partes
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error("Token JWT malformado.");
  }
  
  // Decodificar Header y Payload
  let header, payload;
  try {
    header = JSON.parse(atob(parts[0]));
    payload = JSON.parse(atob(parts[1]));
  } catch (e) {
    throw new Error("Error decodificando cabeceras de token.");
  }

  // Validaciones básicas de Firebase
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) {
    throw new Error(`Audiencia inválida: esperado ${projectId}, recibido ${payload.aud}`);
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Emisor del token de autenticación inválido.");
  }
  if (payload.exp < now) {
    throw new Error("El token de autenticación ha expirado.");
  }

  // Obtener JWKS de Google
  const jwksResponse = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys.find(key => key.kid === header.kid);
  if (!jwk) {
    throw new Error("No se encontró una clave pública firma coincidente para el token.");
  }

  // Importar clave JWK a Web Crypto
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    false,
    ["verify"]
  );

  // Generar buffers de firma y datos
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(`${parts[0]}.${parts[1]}`);
  
  // Decodificar la firma en formato Base64URL a binario
  const rawSignature = parts[2].replace(/-/g, '+').replace(/_/g, '/');
  const signatureBytes = Uint8Array.from(atob(rawSignature), c => c.charCodeAt(0));

  // Verificar la firma de forma nativa
  const isSignatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signatureBytes,
    dataBuffer
  );

  if (!isSignatureValid) {
    throw new Error("La firma del token de autenticación no es válida.");
  }

  return payload;
}

// Handler de peticiones Fetch principal del Worker
export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const clientIp = request.headers.get("CF-Connecting-IP") || "127.0.0.1";

    // 1. Rate Limiting Check
    if (!checkRateLimit(clientIp)) {
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Por favor, espera." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // 2. Ruta Pública de Login (Mock)
    if (url.pathname === "/api/login") {
      return new Response(JSON.stringify({ status: "success", user_id: "firebase-user" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // 3. Autenticación Firebase obligatoria para el resto de rutas
    let user;
    try {
      const projectId = env.FIREBASE_PROJECT_ID || "nutri-paws";
      user = await verifyFirebaseToken(request.headers.get("Authorization"), projectId);
    } catch (authError) {
      return new Response(JSON.stringify({ error: "No autorizado", details: authError.message }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const geminiApiKey = env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "API Key de Gemini no configurada en el Worker." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      // Endpoint 1: Procesar indicaciones médicas de texto
      if (url.pathname === "/api/process_medical_record") {
        const { text } = await request.json();
        const fechaHoy = new Date().toISOString().split('T')[0];
        
        const prompt = `Extrae la siguiente información médica de este texto: '${text}'.
IMPORTANTE: Ten en cuenta que la fecha de hoy es ${fechaHoy}. Si el texto dice "en 3 días", suma 3 días a la fecha de hoy.
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "events": [
    {
      "event_type": "Vacuna | Chequeo | Pastilla | Tratamiento",
      "description": "descripción corta del evento a futuro",
      "scheduled_date": "YYYY-MM-DD"
    }
  ],
  "history_notes": [
    {
      "date": "${fechaHoy}",
      "note": "Síntoma o diagnóstico reportado (Ej: El veterinario indicó fiebre)"
    }
  ]
}
Solo llena 'events' si hay citas o cosas a futuro. Solo llena 'history_notes' si se mencionan síntomas o diagnósticos.`;

        const responseObj = await callGeminiAPI(geminiApiKey, prompt);
        return new Response(JSON.stringify(responseObj), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Endpoint 2: Guía de primeros auxilios SOS
      if (url.pathname === "/api/emergency_sos") {
        const { emergency_type } = await request.json();
        
        const prompt = `Eres un médico de emergencias veterinarias. El usuario se enfrenta a la siguiente emergencia con su mascota: '${emergency_type}'.
Proporciona ÚNICAMENTE las acciones físicas inmediatas de supervivencia (primeros auxilios).
REGLAS ESTRICTAS:
- No escribas introducciones (ej. "Mantén la calma").
- Usa máximo 3 viñetas muy cortas y directas.
- Lenguaje urgente y claro.
- Termina siempre con "ACUDE AL VETERINARIO INMEDIATAMENTE."`;

        const responseText = await callGeminiText(geminiApiKey, prompt);
        return new Response(JSON.stringify({ sos_steps: responseText }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Endpoint 3 & 4: Subida de imágenes/documentos (Gemini Vision)
      if (url.pathname === "/api/analyze_document" || url.pathname === "/api/skinguard/analyze") {
        const formData = await request.formData();
        const file = formData.get("document") || formData.get("image");
        if (!file) {
          return new Response(JSON.stringify({ error: "No se proporcionó ningún archivo de imagen o documento." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const arrayBuffer = await file.arrayBuffer();
        const mimeType = file.type;
        const base64Data = arrayBufferToBase64(arrayBuffer);

        const fechaHoy = new Date().toISOString().split('T')[0];
        let prompt = "";

        if (url.pathname === "/api/analyze_document") {
          prompt = `Eres un asistente veterinario experto. Lee este documento/registro médico.
IMPORTANTE: Ten en cuenta que la fecha de hoy es ${fechaHoy}. Si se mencionan días relativos como "volver en una semana", suma esos días a la fecha de hoy.
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "events": [
    {
      "event_type": "Vacuna | Chequeo | Pastilla | Tratamiento",
      "description": "descripción corta del evento a futuro",
      "scheduled_date": "YYYY-MM-DD"
    }
  ],
  "history_notes": [
    {
      "date": "${fechaHoy}",
      "note": "Síntoma, diagnóstico o hallazgo clínico reportado en el documento"
    }
  ]
}
Solo llena 'events' si hay citas o cosas a futuro. Solo llena 'history_notes' extrayendo los hallazgos, diagnósticos o recetas del documento.`;
        } else {
          prompt = `Eres un experto veterinario en dermatología (SkinGuard). 
Analiza esta imagen de la piel/cuerpo de una mascota y devuelve el resultado ESTRICTAMENTE en este formato JSON puro, SIN markdown ni texto adicional antes ni después:
{
  "diagnostico_presuntivo": "Diagnóstico corto (ej. Dermatitis)",
  "probabilidad": "XX%",
  "explicacion": "Explicación médica visual",
  "primeros_auxilios": ["paso 1", "paso 2"],
  "urgencia": "BAJA",
  "disclaimer": "⚠️ Este es un análisis probabilístico basado en IA y NO reemplaza en absoluto el diagnóstico físico de un veterinario calificado."
}
Las opciones para urgencia son: BAJA, MEDIA, ALTA.`;
        }

        const responseObj = await callGeminiVision(geminiApiKey, prompt, base64Data, mimeType);
        return new Response(JSON.stringify(responseObj), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

    } catch (executionError) {
      return new Response(JSON.stringify({ error: executionError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: "Endpoint no encontrado" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

// Función auxiliar para llamar a la API de texto de Gemini
async function callGeminiText(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en API de Gemini: ${response.statusText} | ${errorText}`);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Función auxiliar para forzar formato JSON puro desde la respuesta de Gemini
async function callGeminiAPI(apiKey, prompt) {
  const rawText = await callGeminiText(apiKey, prompt);
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Gemini no retornó una respuesta JSON válida: ${rawText}`);
  }
  return JSON.parse(rawText.substring(start, end + 1));
}

// Función auxiliar para llamar a Gemini con archivos binarios (Vision)
async function callGeminiVision(apiKey, prompt, base64Data, mimeType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Data } }
        ]
      }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en API de Gemini Vision: ${response.statusText} | ${errorText}`);
  }
  
  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Gemini Vision no retornó una respuesta JSON válida: ${rawText}`);
  }
  return JSON.parse(rawText.substring(start, end + 1));
}
