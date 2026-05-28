import os
import json
import urllib.request
import urllib.error

# Cargar configuración desde el .env
def load_env():
    env_vars = {}
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split('=', 1)
                    if len(parts) == 2:
                        env_vars[parts[0].strip()] = parts[1].strip()
    return env_vars

def run_api_request(url, headers, data=None, method="GET"):
    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_info = e.read().decode('utf-8')
        print(f"HTTP Error {e.code}: {e.reason}")
        print(error_info)
        return {"success": False, "error": error_info}
    except Exception as e:
        print(f"Error general: {e}")
        return {"success": False, "error": str(e)}

def deploy():
    env = load_env()
    account_id = env.get("CLOUDFLARE_ACCOUNT_ID")
    api_token = env.get("CLOUDFLARE_API_TOKEN")
    gemini_key = env.get("GEMINI_API_KEY")
    firebase_id = "nutripaws-c0d81"
    script_name = "nutripaws-api"

    if not account_id or not api_token:
        print("Error: CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN no configurados en el archivo .env")
        return

    print("Iniciando despliegue del Worker a Cloudflare...")

    # 1. Leer código index.js
    with open("api-worker/src/index.js", "r", encoding="utf-8") as f:
        js_code = f.read()

    # 2. Configurar Multipart Form Data para subir código y bindings
    boundary = "----CloudflareWorkerDeployBoundary"
    
    metadata = {
        "main_module": "index.js",
        "bindings": [
            {
                "type": "plain_text",
                "name": "FIREBASE_PROJECT_ID",
                "text": firebase_id
            }
        ]
    }
    
    body = []
    
    # Metadata
    body.append(f"--{boundary}".encode('utf-8'))
    body.append('Content-Disposition: form-data; name="metadata"; filename="metadata.json"'.encode('utf-8'))
    body.append('Content-Type: application/json'.encode('utf-8'))
    body.append(b'')
    body.append(json.dumps(metadata).encode('utf-8'))
    
    # Script
    body.append(f"--{boundary}".encode('utf-8'))
    body.append('Content-Disposition: form-data; name="index.js"; filename="index.js"'.encode('utf-8'))
    body.append('Content-Type: application/javascript+module'.encode('utf-8'))
    body.append(b'')
    body.append(js_code.encode('utf-8'))
    
    # Fin
    body.append(f"--{boundary}--".encode('utf-8'))
    body.append(b'')
    
    multipart_data = b'\r\n'.join(body)
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }

    # Subir script
    upload_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/{script_name}"
    print("Subiendo código y bindings de texto...")
    upload_res = run_api_request(upload_url, headers, data=multipart_data, method="PUT")
    
    if not upload_res.get("success"):
        print("Fallo al subir el script del Worker.")
        return

    print("Script subido con éxito.")

    # 3. Configurar secreto GEMINI_API_KEY
    if gemini_key:
        print("Configurando el secreto GEMINI_API_KEY...")
        secret_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/{script_name}/secrets"
        secret_headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        secret_data = json.dumps({
            "name": "GEMINI_API_KEY",
            "text": gemini_key,
            "type": "secret_text"
        }).encode('utf-8')
        
        secret_res = run_api_request(secret_url, secret_headers, data=secret_data, method="PUT")
        if secret_res.get("success"):
            print("Secreto configurado con éxito.")
        else:
            print("Fallo al configurar el secreto GEMINI_API_KEY.")
            return
    else:
        print("Advertencia: GEMINI_API_KEY no configurado en el archivo .env")

    # 4. Habilitar subdominio *.workers.dev para publicación automática
    print("Activando subdominio *.workers.dev...")
    subdomain_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/{script_name}/subdomain"
    subdomain_headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    subdomain_data = json.dumps({"enabled": True}).encode('utf-8')
    
    subdomain_res = run_api_request(subdomain_url, subdomain_headers, data=subdomain_data, method="POST")
    if subdomain_res.get("success"):
        print("¡Worker publicado exitosamente!")
        # Obtener url de publicación
        # La URL se puede construir sabiendo el script_name y el user_subdomain
        # Consultamos el subdominio del usuario
        user_subdomain_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/subdomain"
        user_subdomain_res = run_api_request(user_subdomain_url, {"Authorization": f"Bearer {api_token}"})
        if user_subdomain_res.get("success"):
            subdomain_name = user_subdomain_res.get("result", {}).get("subdomain")
            print(f"URL de la API en Cloudflare: https://{script_name}.{subdomain_name}.workers.dev")
        else:
            print("Worker publicado. No se pudo obtener el nombre de subdominio exacto.")
    else:
        print("Fallo al activar el subdominio del script.")

if __name__ == '__main__':
    deploy()
