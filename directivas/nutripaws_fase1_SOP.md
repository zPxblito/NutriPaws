# Proyecto: NutriPaws (Fase 1: Motor de Nutrición BARF)

## 1. Objetivo Principal
Construir el MVP (Fase 1) del sitio web de NutriPaws. El objetivo es crear un sistema interactivo y visualmente atractivo (Premium) que recoja los datos de la mascota (perro o gato) y calcule su dieta natural (BARF) exacta en base a su especie, edad, peso y nivel de actividad.

## 2. Lógica Core (Motor Nutricional)

### Para Perros 🐶
*   **Cantidad Diaria (Peso Ideal):**
    *   **Cachorros (0 a 11 meses):**
        *   2 a 3 meses: 10% del peso.
        *   4 a 5 meses: 8% del peso.
        *   6 a 8 meses: 6% del peso.
        *   9 a 11 meses: 4% del peso.
    *   **Adultos (1 a 6 años):**
        *   Sedentario / Pérdida de Peso: 1.5% - 2% del peso.
        *   Actividad Media / Mantenimiento: 2.5% del peso.
        *   Alta Actividad / Ganancia de Peso: 3% - 4% del peso.
    *   **Senior (7+ años):**
        *   Mantenimiento general: 2% del peso (o ajustable según actividad).
*   **Proporciones (Ratios BARF Perros):**
    *   70% Carne magra (Músculo)
    *   10% Hueso carnoso crudo
    *   7% Verduras
    *   5% Hígado
    *   5% Otros órganos secretores
    *   2% Semillas/Nueces
    *   1% Frutas

### Para Gatos 🐱
*   **Cantidad Diaria (Peso Ideal):**
    *   **Cachorros (0 a 11 meses):**
        *   2 a 4 meses: 10% del peso.
        *   5 a 8 meses: 6% del peso.
        *   9 a 11 meses: 4% del peso.
    *   **Adultos (1+ años):**
        *   Actividad Media / Mantenimiento: 2.5% - 3% del peso.
        *   Esterilizados / Sedentarios: 2% del peso.
*   **Proporciones (Ratios BARF Gatos):**
    *   80% Carne magra (Músculo - Rico en Taurina, ej. Corazón)
    *   10% Hueso carnoso crudo
    *   10% Órganos (aprox 4% hígado, 6% otros)

## 3. Entradas Requeridas (Formulario de Usuario)
1.  **Especie:** Perro o Gato.
2.  **Edad:** Inputs numéricos detallados para **Años** y **Meses** (Ej. 1 año y 3 meses). Esto determina internamente si es Cachorro, Adulto o Senior.
3.  **Peso:** En kg o lbs.
4.  **Nivel de Actividad:** Textos profesionales: "Sedentario / Pérdida de Peso", "Actividad Media / Mantenimiento", "Alta Actividad / Ganancia de Peso".
5.  **Raza:** (**OBLIGATORIO**. Es un factor crítico para determinar la alimentación óptima. El sistema debe integrar todas las razas posibles utilizando bases de datos exhaustivas como 'The Dog API' y 'The Cat API'. **Imprescindible:** Se debe incluir siempre la opción "Criollo" al inicio de la lista, diseñada para animales adoptados o mestizos de la calle. **Lógica Dinámica:** El menú desplegable de razas debe filtrar y mostrar estrictamente solo las razas correspondientes a la 'Especie' seleccionada en el paso 1).

## 4. Diseño y UX (Premium & Gamificado)
El diseño debe generar asombro y dar la sensación de una app moderna de alto valor. Se requiere un sistema de **Dos Temas (Claro y Oscuro)**.

*   **Paleta de Colores (Basada en el Logo):**
    *   **Verde Principal (Logo):** `#8DC63F` (Para botones primarios, banners y acentos de éxito).
    *   **Azul Oscuro/Teal (Logo):** `#124962` (Para textos principales en modo claro y fondos secundarios).
*   **Tema Claro (Light Mode):**
    *   Fondo blanco (`#FFFFFF`) o gris muy claro (`#F8FAFC`).
    *   Tarjetas (Cards) blancas con sombras suaves (neumorfismo ligero).
    *   Textos principales en Azul Oscuro (`#124962`).
    *   Botones y llamadas a la acción en Verde Principal (`#8DC63F`).
*   **Tema Oscuro (Dark Mode):**
    *   Fondo oscuro profundo (ej. `#0F172A`).
    *   Tarjetas con efecto *Glassmorphism* (fondos translúcidos con desenfoque).
    *   Textos en blanco nítido (`#F8FAFC`).
    *   Botones en Verde Principal (`#8DC63F`) que resalten fuertemente.
*   **Tipografía e Interacciones:**
    *   Fuente: Inter o Outfit (Google Fonts).
    *   Micro-interacciones: Transiciones suaves al cambiar de tema, efectos hover en botones.
*   **Logotipo:** Se usará una representación en texto estilizada `NutriPaws` (o la imagen en `assets/logo.png` si el usuario la provee localmente) integrando los dos colores principales.

## 5. Salida Esperada (Entregable Fase 1)
Una "Calculadora de Dieta" web que:
1.  Captura la atención.
2.  Pide los datos paso a paso (wizard).
3.  Imprime en pantalla la dieta calculada en gramos, dividida por ingredientes.
4.  (Futuro/Fase 2): Call to action para dejar el correo o WhatsApp a cambio de un plan de 7 días o alertas.

## 6. Restricciones y Casos Borde
*   **Nota:** Nunca recomendar cocinar los huesos. Debe indicarse explícitamente en la interfaz.
*   **Nota:** Para los gatos, añadir una nota sobre la importancia de la *Taurina* (corazón).
*   **Nota:** Los cálculos son aproximaciones para iniciar. Se debe incluir un disclaimer indicando consultar a un veterinario.
*   **Nota:** No usar 'The Dog API' sin llave de acceso porque causa el error '403 Forbidden'. En su lugar, hacer llamadas a 'https://dog.ceo/api/breeds/list/all' que es un endpoint público para extraer las razas de perros.
*   **Nota:** No usar `fetch('data.json')` para cargar los datos de razas de manera asíncrona si la aplicación se ejecuta localmente sin servidor, porque causa el error `CORS policy` en el protocolo `file://`. En su lugar, inyectar directamente la cadena JSON como una constante estática de JavaScript (`const dbRazas = {...};`) dentro del archivo `app.js`.
