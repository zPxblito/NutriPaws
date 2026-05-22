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

@app.route('/api/process_medical_record', methods=['POST'])
def process_record():
    data = request.json
    text = data.get('text', '')
    
    if not client:
        return jsonify({"error": "API Key no configurada"}), 500

    prompt = f"""Extrae la siguiente información médica de este texto: '{text}'.
Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{{
  "event_type": "Vacuna | Chequeo | Pastilla | Nota",
  "description": "descripción corta",
  "scheduled_date": "YYYY-MM-DD (si aplica, o null)"
}}"""
    
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
        return jsonify({"error": str(e)}), 500

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
            "diagnostico_presuntivo": "Error de Conexión IA",
            "probabilidad": "--",
            "explicacion": f"No se pudo procesar la imagen: {str(e)}",
            "primeros_auxilios": ["Verifique su conexión."],
            "urgencia": "MEDIA",
            "disclaimer": "Fallo temporal del servicio."
        })

from flask import send_from_directory

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join("frontend", path)):
        return send_from_directory("frontend", path)
    else:
        return send_from_directory("frontend", "index.html")
