import os

def update_build_script():
    with open('frontend/index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    with open('frontend/styles.css', 'r', encoding='utf-8') as f:
        css = f.read()
    with open('frontend/app.js', 'r', encoding='utf-8') as f:
        js = f.read()
    
    js = js.replace('{', '{{').replace('}', '}}')
    
    # We also need to restore the python format string replacement for db_razas_json
    # It was: const dbRazas = {db_razas_json};
    # So we change it to: const dbRazas = {db_razas_json};
    js = js.replace('const dbRazas = {{db_razas_json}};', 'const dbRazas = {db_razas_json};')

    new_builder = f'''import os

def build_frontend():
    os.makedirs('frontend', exist_ok=True)
    os.makedirs('frontend/data', exist_ok=True)
    
    # Cargar base de datos
    db_razas_json = "{{ perros: [], gatos: [] }}"
    if os.path.exists('.tmp/razas_completas.json'):
        with open('.tmp/razas_completas.json', 'r', encoding='utf-8') as f:
            db_razas_json = f.read()

    # HTML
    html_content = """{html}"""

    css_content = """{css}"""

    js_content = f"""{js}"""

    with open('frontend/index.html', 'w', encoding='utf-8') as f: f.write(html_content)
    with open('frontend/styles.css', 'w', encoding='utf-8') as f: f.write(css_content)
    with open('frontend/app.js', 'w', encoding='utf-8') as f: f.write(js_content)
    
    print("Frontend generado y mejorado exitosamente.")

if __name__ == "__main__":
    build_frontend()
'''
    with open('scripts/build_frontend.py', 'w', encoding='utf-8') as f:
        f.write(new_builder)

if __name__ == "__main__":
    update_build_script()
