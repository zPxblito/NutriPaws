import os
import shutil

def update_urls():
    filepath = 'public/app.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inyectar API_BASE si no existe
    api_base_def = """    const API_BASE = (window.location.hostname === 'appassets.androidplatform.net' || window.location.hostname === 'localhost' || window.location.protocol === 'file:')
        ? 'https://nutripaws-api.zzapata-dev.workers.dev'
        : '';\n"""

    if "const API_BASE =" not in content:
        content = content.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\n" + api_base_def)

    # Reemplazar fetch con ruta dinámica
    content = content.replace("fetch('/api/process_medical_record'", "fetch(`${API_BASE}/api/process_medical_record`")
    content = content.replace("fetch('/api/analyze_document'", "fetch(`${API_BASE}/api/analyze_document`")
    content = content.replace("fetch('/api/skinguard/analyze'", "fetch(`${API_BASE}/api/skinguard/analyze`")
    content = content.replace("fetch('/api/emergency_sos'", "fetch(`${API_BASE}/api/emergency_sos`")

    with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("app.js actualizado con API_BASE dinámica.")

    # Sincronizar assets de Android
    assets_dir = 'android-app/app/src/main/assets/public'
    if os.path.exists(assets_dir):
        shutil.rmtree(assets_dir)
    shutil.copytree('public', assets_dir)
    print("Sincronización de assets Android completada.")

if __name__ == '__main__':
    update_urls()
