import urllib.request
import json
import os

def fetch_data(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching data from {url}: {e}")
        return []

def main():
    print("Iniciando la extracción de razas de perros y gatos...")
    
    # Endpoints de APIs públicas gratuitas
    dog_url = "https://dog.ceo/api/breeds/list/all"
    cat_url = "https://api.thecatapi.com/v1/breeds"
    
    dogs_data = fetch_data(dog_url)
    cats_data = fetch_data(cat_url)
    
    dog_breeds = [{"id": "criollo", "name": "Criollo / Mestizo"}]
    cat_breeds = [{"id": "criollo", "name": "Criollo / Mestizo"}]
    
    if dogs_data and "message" in dogs_data:
        for breed, sub_breeds in dogs_data["message"].items():
            if sub_breeds:
                for sub in sub_breeds:
                    name = f"{sub.capitalize()} {breed.capitalize()}"
                    dog_breeds.append({"id": f"{breed}-{sub}", "name": name})
            else:
                dog_breeds.append({"id": breed, "name": breed.capitalize()})
        
    for cat in cats_data:
        cat_breeds.append({"id": cat.get("id"), "name": cat.get("name")})
        
    final_data = {
        "perros": dog_breeds,
        "gatos": cat_breeds
    }
    
    # Crear directorio .tmp si no existe
    os.makedirs('.tmp', exist_ok=True)
    output_path = os.path.join('.tmp', 'razas_completas.json')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=4)
        
    print(f"Éxito: Se han guardado {len(dog_breeds)} razas de perros y {len(cat_breeds)} razas de gatos en {output_path}")

if __name__ == "__main__":
    main()
