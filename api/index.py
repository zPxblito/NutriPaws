import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
import PIL.Image
import io
import re
import json

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

app = Flask(__name__)
# Permitir CORS desde cualquier origen para Vercel
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/api/login', methods=['POST'])
def login():
    # Firebase manejará el login en el frontend, 
    # este endpoint queda solo para verificar tokens si es necesario en el futuro.
    return jsonify({"status": "success", "user_id": "firebase-user"})

import datetime

@app.route('/api/process_medical_record', methods=['POST'])
def process_record():
    data = request.json
    text = data.get('text', '')
    
    if not client:
        return jsonify({"error": "API Key no configurada"}), 500

    fecha_hoy = datetime.datetime.now().strftime("%Y-%m-%d")

    prompt = f"""Extrae la siguiente información médica de este texto: '{text}'.
IMPORTANTE: Ten en cuenta que la fecha de hoy es {fecha_hoy}. Si el texto dice "en 3 días", suma 3 días a la fecha de hoy.
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{{
  "events": [
    {{
      "event_type": "Vacuna | Chequeo | Pastilla | Tratamiento",
      "description": "descripción corta del evento a futuro",
      "scheduled_date": "YYYY-MM-DD"
    }}
  ],
  "history_notes": [
    {{
      "date": "{fecha_hoy}",
      "note": "Síntoma o diagnóstico reportado (Ej: El veterinario indicó fiebre)"
    }}
  ]
}}
Solo llena 'events' si hay citas o cosas a futuro. Solo llena 'history_notes' si se mencionan síntomas, diagnósticos o hechos ocurridos hoy/pasado."""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        text_resp = response.text
        text_resp = re.sub(r'```json\n?', '', text_resp)
        text_resp = re.sub(r'```\n?', '', text_resp)
        return jsonify(json.loads(text_resp.strip()))
    except Exception as e:
        return jsonify({"error": "En estos momentos el servicio de análisis se encuentra al máximo, intente de nuevo en un minuto."}), 503

@app.route('/api/analyze_document', methods=['POST'])
def analyze_document():
    if 'document' not in request.files:
        return jsonify({"error": "No document provided"}), 400
        
    file = request.files['document']
    
    if not client:
        return jsonify({"error": "API Key no configurada"}), 500

    fecha_hoy = datetime.datetime.now().strftime("%Y-%m-%d")

    try:
        img = PIL.Image.open(file.stream)
        
        prompt = f"""Eres un asistente veterinario experto. Lee este documento/registro médico.
IMPORTANTE: Ten en cuenta que la fecha de hoy es {fecha_hoy}. Si se mencionan días relativos como "volver en una semana", suma esos días a la fecha de hoy.
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{{
  "events": [
    {{
      "event_type": "Vacuna | Chequeo | Pastilla | Tratamiento",
      "description": "descripción corta del evento a futuro",
      "scheduled_date": "YYYY-MM-DD"
    }}
  ],
  "history_notes": [
    {{
      "date": "{fecha_hoy}",
      "note": "Síntoma, diagnóstico o hallazgo clínico reportado en el documento"
    }}
  ]
}}
Solo llena 'events' si hay citas o cosas a futuro. Solo llena 'history_notes' extrayendo los hallazgos, diagnósticos o recetas del documento."""
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, img]
        )
        
        text_resp = response.text
        text_resp = re.sub(r'```json\n?', '', text_resp)
        text_resp = re.sub(r'```\n?', '', text_resp)
        return jsonify(json.loads(text_resp.strip()))
        
    except Exception as e:
        return jsonify({"error": "En estos momentos el servicio de análisis se encuentra al máximo, intente de nuevo en un minuto."}), 503

@app.route('/api/skinguard/analyze', methods=['POST'])
def skinguard_analyze():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    file = request.files['image']
    
    try:
        if not client:
            raise Exception("No GEMINI_API_KEY configurada")

        img = PIL.Image.open(file.stream)

        prompt = """Eres un experto veterinario en dermatología (SkinGuard). 
Analiza esta imagen de la piel/cuerpo de una mascota y devuelve el resultado ESTRICTAMENTE en este formato JSON puro, SIN markdown ni texto adicional antes ni después:
{
  "diagnostico_presuntivo": "Diagnóstico corto (ej. Dermatitis)",
  "probabilidad": "XX%",
  "explicacion": "Explicación médica visual",
  "primeros_auxilios": ["paso 1", "paso 2"],
  "urgencia": "BAJA",
  "disclaimer": "⚠️ Este es un análisis probabilístico basado en IA y NO reemplaza en absoluto el diagnóstico físico de un veterinario calificado."
}
Las opciones para urgencia son: BAJA, MEDIA, ALTA."""
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, img]
        )
        
        text_resp = response.text
        text_resp = re.sub(r'```json\n?', '', text_resp)
        text_resp = re.sub(r'```\n?', '', text_resp)
        
        return jsonify(json.loads(text_resp.strip()))

    except Exception as e:
        print("Error en Gemini Vision:", e)
        return jsonify({
            "error": "En estos momentos el servicio de análisis se encuentra al máximo, intente de nuevo en un minuto."
        }), 503

@app.route('/api/emergency_sos', methods=['POST'])
def emergency_sos():
    data = request.json
    emergency_type = data.get('emergency_type', '')
    
    if not client:
        return jsonify({"error": "API Key no configurada"}), 500

    prompt = f"""Eres un médico de emergencias veterinarias. El usuario se enfrenta a la siguiente emergencia con su mascota: '{emergency_type}'.
Proporciona ÚNICAMENTE las acciones físicas inmediatas de supervivencia (primeros auxilios).
REGLAS ESTRICTAS:
- No escribas introducciones (ej. "Mantén la calma").
- Usa máximo 3 viñetas muy cortas y directas.
- Lenguaje urgente y claro.
- Termina siempre con "ACUDE AL VETERINARIO INMEDIATAMENTE."."""
    
    try:
        # Usamos gemini-2.5-flash solo con texto para máxima velocidad
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return jsonify({"sos_steps": response.text.strip()})
    except Exception as e:
        print("Error en Emergencia:", e)
        return jsonify({"error": "No se pudo procesar la emergencia, acude a un veterinario YA."}), 503
