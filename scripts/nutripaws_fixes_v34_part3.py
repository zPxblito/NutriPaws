import os
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
APP_FILE = os.path.join(PUBLIC_DIR, 'app.js')

def replace_in_file(file_path, old_text, new_text):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_text in content:
        content = content.replace(old_text, new_text)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Reemplazo exitoso en {os.path.basename(file_path)}")
    else:
        print(f"No se encontro el texto en {os.path.basename(file_path)}")

def fix_app():
    # Fix 1: Expose renderPayPalButtons to window
    old_code_1 = "    function renderPayPalButtons() {"
    new_code_1 = "    window.renderPayPalButtons = renderPayPalButtons;\n    function renderPayPalButtons() {"
    replace_in_file(APP_FILE, old_code_1, new_code_1)

    # Fix 2: Call window.renderPayPalButtons()
    old_code_2 = "if (typeof renderPayPalButtons === 'function') renderPayPalButtons();"
    new_code_2 = "if (typeof window.renderPayPalButtons === 'function') window.renderPayPalButtons();"
    replace_in_file(APP_FILE, old_code_2, new_code_2)

def run_git_commands():
    print("Ejecutando comandos Git para despliegue en Vercel...")
    try:
        subprocess.run(["git", "add", "."], cwd=BASE_DIR, check=True)
        subprocess.run(["git", "commit", "-m", "Fix PayPal render button scope issue"], cwd=BASE_DIR, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, check=True)
        print("git push completado. ¡Despliegue a Vercel en proceso!")
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando Git: {e}")

if __name__ == '__main__':
    print("Aplicando parche de scope de PayPal v34 parte 3...")
    fix_app()
    run_git_commands()
    print("Script finalizado.")
