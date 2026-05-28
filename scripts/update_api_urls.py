import os
import shutil

def update_urls():
    filepath = 'public/app.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Patrón de API_BASE dinámico anterior
    old_api_base_pattern = """    const API_BASE = (window.location.hostname === 'appassets.androidplatform.net' || window.location.hostname === 'localhost' || window.location.protocol === 'file:')
        ? 'https://nutripaws-api.zzapata-dev.workers.dev'
        : '';"""

    new_api_base = "    const API_BASE = 'https://nutripaws-api.zzapata-dev.workers.dev';"

    # Reemplazar la definición si existe la anterior
    if old_api_base_pattern in content:
        content = content.replace(old_api_base_pattern, new_api_base)
    elif "const API_BASE = " not in content:
        # Si por alguna razón no existía, inyectarla
        content = content.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\n" + new_api_base)
    else:
        # Si ya existe pero tiene otra forma, forzar el reemplazo de cualquier API_BASE asignada dinámicamente
        # Buscamos y reemplazamos manualmente
        import re
        content = re.sub(
            r"const API_BASE = \(window\.location\.hostname === 'appassets\.androidplatform\.net'.*?\n\s*\?\s*'https://nutripaws-api\.zzapata-dev\.workers\.dev'\n\s*:\s*'';?",
            "const API_BASE = 'https://nutripaws-api.zzapata-dev.workers.dev';",
            content
        )

    # Reemplazar fetch con ruta dinámica si aún quedan relativas
    content = content.replace("fetch('/api/process_medical_record'", "fetch(`${API_BASE}/api/process_medical_record`")
    content = content.replace("fetch('/api/analyze_document'", "fetch(`${API_BASE}/api/analyze_document`")
    content = content.replace("fetch('/api/skinguard/analyze'", "fetch(`${API_BASE}/api/skinguard/analyze`")
    content = content.replace("fetch('/api/emergency_sos'", "fetch(`${API_BASE}/api/emergency_sos`")

    with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("app.js actualizado con API_BASE estática de producción.")

    # Sincronizar assets de Android
    assets_dir = 'android-app/app/src/main/assets/public'
    if os.path.exists(assets_dir):
        shutil.rmtree(assets_dir)
    shutil.copytree('public', assets_dir)
    print("Sincronización de assets Android completada.")

if __name__ == '__main__':
    update_urls()

