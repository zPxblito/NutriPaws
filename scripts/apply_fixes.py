import os
import shutil

def fix_app_html(file_path):
    print(f"Modificando HTML: {file_path}")
    if not os.path.exists(file_path):
        print(f"Error: No se encontró el archivo {file_path}")
        return False
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Eliminar duplicidad
    comment = "<!-- ================= BOTTOM NAVIGATION BAR ================= -->"
    first_idx = content.find(comment)
    if first_idx == -1:
        print("Error: No se encontró el primer comentario de bottom-nav")
        return False
        
    second_idx = content.find(comment, first_idx + len(comment))
    if second_idx == -1:
        print("Advertencia: No se encontró el segundo comentario. Puede que ya esté limpio.")
    else:
        # Eliminamos todo desde el primer comentario hasta justo antes del segundo
        print(f"Limpiando bloque duplicado de {second_idx - first_idx} caracteres...")
        content = content[:first_idx] + content[second_idx:]

    # Remover parches de caché
    content = content.replace('styles.css?v=5', 'styles.css')
    content = content.replace('styles.css?v=4', 'styles.css')
    content = content.replace('firebase-auth.js?v=33', 'firebase-auth.js')
    content = content.replace('app.js?v=33', 'app.js')
    content = content.replace('app.js?v=2', 'app.js')

    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("HTML modificado correctamente.")
    return True

def fix_app_js(file_path):
    print(f"Modificando JS: {file_path}")
    if not os.path.exists(file_path):
        print(f"Error: No se encontró el archivo {file_path}")
        return False
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Cambiar límites de tamaño de subida a 4MB (límite seguro para Vercel de 4.5MB)
    content = content.replace('const MAX_SIZE_MB = 10;', 'const MAX_SIZE_MB = 4;')
    content = content.replace('const MAX_IMG_MB = 5;', 'const MAX_IMG_MB = 4;')

    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("JS modificado correctamente.")
    return True

def sync_assets():
    print("Sincronizando carpeta public/ con assets de Android...")
    public_dir = 'public'
    assets_dir = 'android-app/app/src/main/assets/public'
    
    if os.path.exists(assets_dir):
        shutil.rmtree(assets_dir)
        
    shutil.copytree(public_dir, assets_dir)
    print("Sincronización completada con éxito.")

if __name__ == '__main__':
    # 1. Modificar archivos en public/
    if fix_app_html('public/app.html') and fix_app_js('public/app.js'):
        # 2. Sincronizar con assets de la app móvil
        sync_assets()
        print("Proceso finalizado exitosamente.")
    else:
        print("Hubo un error al procesar las soluciones.")
