# Directiva de Despliegue en Vercel para Python/Flask

## Objetivo
Desplegar un backend de Flask (Python) y un frontend estático en Vercel sin errores de configuración.

## Restricciones / Casos Borde
* **Nota:** No usar la propiedad `builds` en `vercel.json` cuando se despliegan aplicaciones Python modernas en Vercel, porque causa la advertencia "Due to `builds` existing in your configuration file..." y puede detener o corromper el proceso de instalación de dependencias y ruteo. En su lugar, usar **Zero-Config** (eliminar el array `builds`) y utilizar `rewrites` para enrutar el tráfico `/api/*` hacia `/api/index.py` y el resto hacia la carpeta estática.
* **Nota:** No incluir `gunicorn` en el `requirements.txt` para Vercel, ya que Vercel Serverless Functions gestiona su propio entorno WSGI y puede causar conflictos de instalación o límites de tamaño innecesarios.

## Estructura Requerida
- `api/index.py`: Debe contener la instancia `app = Flask(__name__)`.
- `vercel.json`: Solo debe contener configuraciones de `rewrites` o `headers`, sin `builds`.
- `requirements.txt`: Dependencias puras, sin servidores WSGI externos.
