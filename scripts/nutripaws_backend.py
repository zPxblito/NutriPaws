import os
import sqlite3
import json
import re
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)
DB_PATH = os.path.join(os.path.dirname(__file__), '../.tmp', 'nutripaws.db')

# Ensure .tmp exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Users Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            name TEXT
        )
    ''')
    # Pets Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT,
            especie TEXT,
            raza TEXT,
            anos INTEGER,
            meses INTEGER,
            peso REAL,
            actividad TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    # Medical Records / Events Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS medical_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER,
            event_type TEXT, -- Vacuna, Chequeo, Pastilla, Nota
            description TEXT,
            scheduled_date TEXT,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY(pet_id) REFERENCES pets(id)
        )
    ''')
    conn.commit()
    conn.close()

# --- ROUTES FOR FRONTEND ---
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# --- API ROUTES ---
@app.route('/api/login', methods=['POST'])
def login():
    # Mock login for Local-First
    data = request.json
    email = data.get('email', '')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT id, name FROM users WHERE email = ?', (email,))
    user = c.fetchone()
    
    if not user:
        # Create user if not exists (Mock behavior for simplicity)
        c.execute('INSERT INTO users (email, name, password) VALUES (?, ?, ?)', (email, email.split('@')[0], '1234'))
        user_id = c.lastrowid
        name = email.split('@')[0]
    else:
        user_id, name = user

    conn.commit()
    conn.close()
    
    return jsonify({"status": "success", "user_id": user_id, "name": name})

@app.route('/api/process_medical_record', methods=['POST'])
def process_record():
    """
    Simula el motor de IA que analiza el texto libre o el archivo subido.
    """
    data = request.json
    pet_id = data.get('pet_id')
    raw_text = data.get('text', '')
    
    # MOCK AI PARSER
    # Si el texto menciona "vacuna" o "pastilla", agenda algo en 21 días o lo que sea lógico
    event_type = "Nota Clínica"
    if "vacuna" in raw_text.lower():
        event_type = "Vacuna"
    elif "pastilla" in raw_text.lower() or "desparasita" in raw_text.lower():
        event_type = "Medicamento"
    
    # Schedule for 30 days from now as a mock
    scheduled_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO medical_events (pet_id, event_type, description, scheduled_date) VALUES (?, ?, ?, ?)',
              (pet_id, event_type, raw_text, scheduled_date))
    conn.commit()
    conn.close()
    
    return jsonify({
        "status": "success",
        "message": "Registro procesado por IA",
        "event_extracted": {
            "type": event_type,
            "scheduled_date": scheduled_date,
            "description": raw_text
        }
    })

@app.route('/api/cron/check_notifications', methods=['GET'])
def run_cron():
    """
    Simula el Cron Job diario que busca eventos a 3 días y notifica.
    """
    target_date = (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        SELECT m.id, m.event_type, m.description, p.name, u.email 
        FROM medical_events m
        JOIN pets p ON m.pet_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE m.scheduled_date = ? AND m.status = 'pending'
    ''', (target_date,))
    
    events = c.fetchall()
    conn.close()
    
    notifications_sent = []
    for ev in events:
        msg = f"[SIMULATED PUSH/EMAIL] To: {ev[4]} | 🚨 Alerta NutriPaws: A {ev[3]} le toca '{ev[1]}' en 3 días!"
        print(msg) # Aquí iría la integración con n8n/Resend
        notifications_sent.append(msg)
        
    return jsonify({"status": "success", "notifications": notifications_sent})

@app.route('/api/skinguard/analyze', methods=['POST'])
def skinguard_analyze():
    """
    Endpoint que invoca a Gemini 2.0 Flash (Vision) con la nueva SDK google-genai.
    Espera un multipart/form-data con la imagen.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    file = request.files['image']
    
    try:
        if not client:
            raise Exception("No GEMINI_API_KEY configurada en el archivo .env")

        import PIL.Image
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
            "primeros_auxilios": ["Verifique su conexión.", "Compruebe la API Key."],
            "urgencia": "MEDIA",
            "disclaimer": "Fallo temporal del servicio."
        })

if __name__ == '__main__':
    init_db()
    print("[NutriPaws] Backend Local Inicializado")
    print("[+] Escuchando en http://localhost:5000")
    app.run(debug=True, port=5000)
