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

def run():
    env = load_env()
    account_id = env.get("CLOUDFLARE_ACCOUNT_ID")
    api_token = env.get("CLOUDFLARE_API_TOKEN")

    if not account_id or not api_token:
        print("Error: CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN no configurados en .env")
        return

    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects"
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    body = {
        "name": "nutripaws",
        "production_branch": "main",
        "build_config": {
            "build_command": "",
            "destination_dir": "public",
            "root_dir": ""
        },
        "source": {
            "type": "github",
            "config": {
                "owner": "zPxblito",
                "repo_name": "NutriPaws",
                "production_branch": "main",
                "pr_comments_enabled": True,
                "deployments_enabled": True
            }
        }
    }
    
    data = json.dumps(body).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            print("PAGES CREATE SUCCESS:")
            subdomain = res.get("result", {}).get("subdomain")
            print(f"Subdomain: {subdomain}")
            return True
    except urllib.error.HTTPError as e:
        error_info = e.read().decode('utf-8')
        print(f"HTTP Error {e.code}: {e.reason}")
        print(error_info)
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == '__main__':
    run()
