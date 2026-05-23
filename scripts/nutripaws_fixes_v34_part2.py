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
    old_code = """            if (currentUser && window.firebaseAuth) {
                try {
                    const userDocRef = window.firebaseAuth.doc(window.firebaseAuth.db, 'users', currentUser.uid);"""

    new_code = """            const userActual = window.firebaseAuth && window.firebaseAuth.auth ? window.firebaseAuth.auth.currentUser : null;
            if (userActual && window.firebaseAuth) {
                try {
                    const userDocRef = window.firebaseAuth.doc(window.firebaseAuth.db, 'users', userActual.uid);"""
                    
    replace_in_file(APP_FILE, old_code, new_code)

def run_git_commands():
    print("Ejecutando comandos Git para despliegue en Vercel...")
    try:
        # Git Add
        subprocess.run(["git", "add", "."], cwd=BASE_DIR, check=True)
        print("git add . completado.")
        
        # Git Commit
        subprocess.run(["git", "commit", "-m", "Fix JS scope error & deploy v34 fixes"], cwd=BASE_DIR, check=True)
        print("git commit completado.")
        
        # Git Push
        subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, check=True)
        print("git push completado. ¡Despliegue a Vercel en proceso!")
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando Git: {e}")

if __name__ == '__main__':
    print("Aplicando parche de scope v34 parte 2...")
    fix_app()
    run_git_commands()
    print("Script finalizado.")
