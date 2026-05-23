import os
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
INDEX_FILE = os.path.join(PUBLIC_DIR, 'index.html')

def fix_pc_nav():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    style_injection = """
    <style>
    /* Forzar barra inferior en PC para que no desaparezca la navegacion */
    @media (min-width: 769px) {
        .bottom-bar {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: var(--bg-color);
            border-top: 1px solid var(--border-color);
            justify-content: center;
            gap: 2rem;
            padding: 1rem;
            z-index: 9998;
            box-shadow: 0 -4px 15px rgba(0,0,0,0.05);
        }
        .bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 8px;
            transition: all 0.2s;
            width: 80px;
            height: 70px;
            justify-content: center;
        }
        .bottom-nav-item img {
            width: 28px;
            height: 28px;
            opacity: 0.6;
            transition: all 0.2s;
            filter: invert(0);
        }
        [data-theme="dark"] .bottom-nav-item img {
            filter: invert(1);
        }
        .bottom-nav-item.active {
            background: var(--brand-green);
            color: white;
            transform: translateY(-5px);
            box-shadow: 0 4px 10px rgba(141, 198, 63, 0.3);
        }
        .bottom-nav-item.active img {
            opacity: 1;
            filter: invert(1);
        }
        .bottom-nav-item span {
            font-size: 0.85rem;
            margin-top: 6px;
            font-weight: 600;
        }
        main.container {
            padding-bottom: 120px !important;
        }
    }
    </style>
</head>"""

    if "/* Forzar barra inferior en PC" not in content:
        content = content.replace("</head>", style_injection)
        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print("CSS para PC inyectado en index.html")
    else:
        print("El CSS de PC ya estaba inyectado.")

def run_git_commands():
    print("Ejecutando comandos Git para despliegue en Vercel...")
    try:
        subprocess.run(["git", "add", "."], cwd=BASE_DIR, check=True)
        subprocess.run(["git", "commit", "-m", "Fix PC navigation visibility"], cwd=BASE_DIR, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, check=True)
        print("git push completado. ¡Despliegue a Vercel en proceso!")
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando Git: {e}")

if __name__ == '__main__':
    print("Aplicando parche de navegacion de PC...")
    fix_pc_nav()
    run_git_commands()
    print("Script finalizado.")
