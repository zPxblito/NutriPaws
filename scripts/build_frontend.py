import os

def build_frontend():
    os.makedirs('frontend', exist_ok=True)
    os.makedirs('frontend/data', exist_ok=True)
    
    # Cargar base de datos
    db_razas_json = "{ perros: [], gatos: [] }"
    if os.path.exists('.tmp/razas_completas.json'):
        with open('.tmp/razas_completas.json', 'r', encoding='utf-8') as f:
            db_razas_json = f.read()

    # HTML
    html_content = """<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriPaws | Asistente Integral</title>
    <link rel="icon" type="image/png" href="assets/logo-fondo.png">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <style>
        /* Ajustes extra para descompactar la UI */
        .dashboard-grid {
            grid-template-columns: 1fr 1fr;
            gap: 2rem; /* Más espacio */
        }
        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
        }
        .view-section {
            padding: 2rem;
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <input type="file" id="dashboard-avatar-upload" accept="image/*" style="display: none;">
    <div class="hero-bg"></div>
    <div class="hero-overlay"></div>
    
    <!-- Menú Desplegable (Totalmente Arriba a la Derecha) -->
    <div class="user-menu" id="user-menu-container" style="display: none; position: fixed; top: 1.5rem; right: 1.5rem; z-index: 1000;">
        <button id="menu-trigger" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; width: 48px; height: 48px; color: white; cursor: pointer; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); transition: all 0.2s ease;" title="Menú">☰</button>
        <div id="dropdown-menu" style="display: none; position: absolute; right: 0; top: 60px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.8rem; width: 220px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <button id="theme-btn-menu" style="width: 100%; text-align: left; background: transparent; border: none; color: white; padding: 0.8rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 1rem; border-radius: 6px; transition: background 0.2s;">☀️ Cambiar Tema</button>
            <button style="width: 100%; text-align: left; background: transparent; border: none; color: var(--text-muted); padding: 0.8rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 1rem; border-radius: 6px; transition: background 0.2s;">🎧 Soporte</button>
            <button id="btn-logout" style="width: 100%; text-align: left; background: transparent; border: none; color: #ff6b6b; padding: 0.8rem; cursor: pointer; font-size: 1rem; border-radius: 6px; transition: background 0.2s;">Cerrar Sesión</button>
        </div>
    </div>
    
    <header style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; margin-top: 3rem; margin-bottom: 1rem;">
        <div class="logo" style="text-align: center;">
            <img src="assets/logo-transparente.png" alt="NutriPaws Logo" style="height: 220px; max-width: 90vw; object-fit: contain; filter: drop-shadow(0 15px 25px rgba(0,0,0,0.5)); transition: transform 0.3s ease;">
        </div>
        <p class="subtitle" id="header-subtitle" style="margin-top: 1rem; font-size: 1.2rem; font-weight: 500; color: rgba(255,255,255,0.9); letter-spacing: 1px;">Tu Asistente Médico y Nutricional</p>
    </header>

    <!-- ================= VISTA 1: LOGIN ================= -->
    <main class="container view-section" id="view-login" style="max-width: 500px;">
        <div class="card" style="text-align: center; padding: 3rem 2rem;">
            <h2 style="margin-bottom: 1rem; font-size: 1.8rem;">Bienvenido a NutriPaws</h2>
            <p style="color: var(--text-muted); margin-bottom: 2.5rem; font-size: 1.1rem;">Inicia sesión para gestionar el perfil de tu mascota</p>
            
            <form id="login-form">
                <div class="form-group" style="text-align: left; margin-bottom: 1.5rem;">
                    <label style="font-size: 1rem;">Correo Electrónico</label>
                    <input type="email" id="login-email" placeholder="ejemplo@correo.com" required style="padding: 1rem; font-size: 1rem;">
                </div>
                <button type="submit" class="btn-primary" style="padding: 1rem; font-size: 1.1rem; width: 100%;">Ingresar / Crear Cuenta</button>
            </form>
        </div>
    </main>

    <!-- ================= VISTA 2: DASHBOARD ================= -->
    <main class="container view-section" id="view-dashboard" style="display: none; max-width: 1000px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2 style="font-size: 2rem;">Hola, <span id="user-name-display">Usuario</span> <button id="edit-name-btn" style="background:none; border:none; color: var(--text-muted); cursor:pointer; font-size: 1.2rem; transition: transform 0.2s;" title="Editar nombre">✏️</button> 👋</h2>
            <button class="btn-primary" id="btn-goto-create-pet" style="padding: 0.8rem 1.5rem; font-size: 1rem; border-radius: 12px; transition: transform 0.2s;">+ Añadir Mascota</button>
        </div>

        <!-- Contenedor Dinámico de Mascotas -->
        <div id="pets-list-container" style="margin-bottom: 3rem; display: flex; flex-direction: column; gap: 1.5rem;">
            <div style="text-align: center; padding: 3rem; background: rgba(15, 23, 42, 0.4); border-radius: 20px; border: 2px dashed rgba(255,255,255,0.1);">
                <p style="color: var(--text-muted); font-size: 1.2rem; margin-bottom: 1rem;">No tienes mascotas registradas aún.</p>
                <p style="color: var(--text-muted); font-size: 1rem;">Añade tu primer peludo para comenzar.</p>
            </div>
        </div>

        <!-- Módulo: Registros Médicos y Calendario -->
        <div class="dashboard-grid" style="margin-bottom: 2.5rem;">
            <!-- Columna 1: Subida de Registros -->
            <div class="card" style="padding: 2rem;">
                <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">🏥 Registro Médico</h3>
                <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5;">
                    Escribe notas o sube un PDF. La IA de NutriPaws lo analizará y agendará tus próximos cuidados.
                </p>
                <form id="medical-form">
                    <textarea id="medical-notes" placeholder="Ej: Hoy le tocaba la Séxtuple pero el doc dijo que volvamos en 5 días..." style="width: 100%; height: 120px; padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: white; font-family: inherit; margin-bottom: 1.5rem; resize: none; font-size: 1rem;"></textarea>
                    
                    <div style="border: 2px dashed rgba(255,255,255,0.2); padding: 1.5rem; text-align: center; border-radius: 12px; margin-bottom: 1.5rem; cursor: pointer; background: rgba(255,255,255,0.02); transition: background 0.3s;">
                        📄 Subir PDF o Foto del Registro
                    </div>
                    
                    <button type="submit" class="btn-primary" style="padding: 1rem; font-size: 1.1rem; width: 100%;">Analizar y Guardar</button>
                </form>
            </div>

            <!-- Columna 2: Calendario -->
            <div class="card" style="padding: 2rem;">
                <h3 style="font-size: 1.3rem; margin-bottom: 1.5rem;">📅 Próximos Eventos</h3>
                <div id="calendar-events" style="margin-top: 1rem;">
                    <p style="color: var(--text-muted); font-size: 1rem; text-align: center; padding: 3rem 0; font-style: italic;">No hay citas o vacunas programadas aún.</p>
                </div>
                <button id="btn-cron" class="btn-secondary" style="width: 100%; margin-top: 2rem; font-size: 0.9rem; border: none; background: rgba(255,255,255,0.05); padding: 0.8rem;">[Dev] Simular Notificaciones Cron</button>
            </div>
        </div>

        <!-- Módulo: AI-SkinGuard -->
        <div class="card" style="margin-bottom: 2.5rem; padding: 2.5rem; border: 1px solid rgba(16, 185, 129, 0.3); background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(6, 78, 59, 0.4));">
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #34d399; display: flex; align-items: center; gap: 0.5rem;">
                🔬 Análisis de Piel con IA
            </h3>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 1rem; max-width: 600px;">
                ¿Tu peludo tiene un sarpullido, costra o zona sin pelo? Sube una foto y nuestra IA dermatológica te dará una evaluación instantánea.
            </p>
            
            <div id="skinguard-upload-area" style="border: 2px dashed rgba(52, 211, 153, 0.4); border-radius: 12px; padding: 2rem; text-align: center; background: rgba(0,0,0,0.2); cursor: pointer; transition: all 0.3s; margin-bottom: 1.5rem; position: relative; overflow: hidden;">
                <input type="file" id="skinguard-input" accept="image/*" capture="camera" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
                <div id="skinguard-upload-content">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
                    <p style="font-size: 1.1rem; font-weight: bold; color: var(--text-main);">Toca para abrir la cámara o subir foto</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">Formatos soportados: JPG, PNG</p>
                </div>
                <div id="skinguard-loading" style="display: none; align-items: center; justify-content: center; flex-direction: column;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid rgba(52, 211, 153, 0.1); border-top-color: #34d399; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
                    <p style="color: #34d399; font-weight: bold;">Analizando con Gemini Vision...</p>
                </div>
            </div>

            <div id="skinguard-results" style="display: none; background: rgba(0,0,0,0.4); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.05);">
                <!-- Resultados se inyectan por JS -->
            </div>
        </div>

        <!-- Módulo: Calculadora Rápida -->
        <div class="card" style="padding: 2.5rem; text-align: center; border: 1px solid rgba(139, 92, 246, 0.3); background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 27, 75, 0.8));">
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #a78bfa;">Calculadora Rápida</h3>
            <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 1.1rem;">¿Quieres calcular una dieta para una mascota que no es tuya?</p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button class="btn-secondary" id="btn-quick-calc" style="padding: 1rem 2rem; font-size: 1.1rem; border: 1px solid #8b5cf6; background: rgba(139, 92, 246, 0.1); color: #c4b5fd;">Usar Calculadora Rápida</button>
            </div>
        </div>
    </main>

    <!-- ================= VISTA 2.5: CREAR PERFIL ================= -->
    <main class="container view-section" id="view-create-pet" style="display: none; max-width: 600px;">
        <button id="btn-back-from-create" class="btn-secondary" style="margin-bottom: 1.5rem; border: none; display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.5rem; font-size: 1rem; background: rgba(255,255,255,0.1);">
            <span>◀ Cancelar</span>
        </button>

        <div class="card" style="padding: 2.5rem;">
            <h2 style="font-size: 1.8rem; margin-bottom: 0.5rem; text-align: center;">Nuevo Miembro de la Familia</h2>
            <p style="color: var(--text-muted); text-align: center; margin-bottom: 2rem;">Ingresa los datos principales de tu mascota</p>

            <form id="create-pet-form">
                <!-- Avatar Upload (Aislado aquí) -->
                <div style="display: flex; justify-content: center; margin-bottom: 2rem;">
                    <label for="pet-avatar-upload" style="cursor: pointer; display: block; position: relative;" title="Subir foto de la mascota">
                        <img id="pet-avatar-img" src="" style="display: none; width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.2);">
                        <div id="pet-avatar-placeholder" style="width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; border: 2px dashed rgba(255,255,255,0.3); transition: background 0.3s;">
                            📷
                        </div>
                    </label>
                    <input type="file" id="pet-avatar-upload" accept="image/*" style="display: none;">
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="font-size: 1.1rem;">¿Cómo se llama?</label>
                    <input type="text" id="create-pet-name" placeholder="Ej: Max, Luna..." required style="width: 100%; padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: white; font-size: 1.1rem;">
                </div>

                <div class="options-grid" style="margin-bottom: 1.5rem;">
                    <label class="radio-card">
                        <input type="radio" name="create_especie" value="perro" required>
                        <span class="card-content" style="font-size: 1.1rem; padding: 1rem;">🐶 Perro</span>
                    </label>
                    <label class="radio-card">
                        <input type="radio" name="create_especie" value="gato">
                        <span class="card-content" style="font-size: 1.1rem; padding: 1rem;">🐱 Gato</span>
                    </label>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="font-size: 1.1rem;">Raza</label>
                    <select id="create-pet-raza" required style="padding: 1rem; font-size: 1.1rem;">
                        <option value="">Selecciona primero la especie...</option>
                    </select>
                </div>

                <div class="age-group" style="margin-bottom: 1.5rem;">
                    <div class="form-group">
                        <label style="font-size: 1.1rem;">Años</label>
                        <input type="number" id="create-pet-anos" step="0.1" min="0" max="30" placeholder="0" style="padding: 1rem; font-size: 1.1rem;" required>
                    </div>
                    <div class="form-group">
                        <label style="font-size: 1.1rem;">Meses</label>
                        <input type="number" id="create-pet-meses" step="0.1" min="0" placeholder="0" style="padding: 1rem; font-size: 1.1rem;">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="font-size: 1.1rem;">Personalidad (Opcional) 💖</label>
                    <select id="create-pet-personalidad" style="padding: 1rem; font-size: 1.1rem;">
                        <option value="">No especificar</option>
                        <option value="jugueton">Muy juguetón / Activo</option>
                        <option value="dormilon">Dormilón / Tranquilo</option>
                        <option value="timido">Tímido / Reservado</option>
                        <option value="guardian">Guardián protector</option>
                        <option value="mimoso">Súper mimoso</option>
                    </select>
                </div>

                <button type="submit" class="btn-primary" style="padding: 1.2rem; font-size: 1.2rem; width: 100%; border-radius: 12px;">Guardar Perfil</button>
            </form>
        </div>
    </main>

    <!-- ================= VISTA 3: CALCULADORA ================= -->
    <main class="container view-section" id="view-calculator" style="display: none; max-width: 800px;">
        <button id="btn-close-calculator" class="btn-secondary" style="margin-bottom: 1.5rem; border: none; display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 1.5rem; font-size: 1.1rem; background: rgba(255,255,255,0.1);">
            <span>◀ Volver al Dashboard</span>
        </button>

        <div class="card" id="calculator-card" style="padding: 2.5rem;">
            <form id="barf-form">
                
                <div id="calc-guest-fields" style="display: none; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2rem; margin-bottom: 2rem;">
                    <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem; color: #a78bfa;">Datos Base del Paciente (No Guardado)</h2>
                    <div class="options-grid" style="margin-bottom: 1.5rem;">
                        <label class="radio-card">
                            <input type="radio" name="guest_especie" value="perro">
                            <span class="card-content" style="font-size: 1.1rem; padding: 1rem;">🐶 Perro</span>
                        </label>
                        <label class="radio-card">
                            <input type="radio" name="guest_especie" value="gato">
                            <span class="card-content" style="font-size: 1.1rem; padding: 1rem;">🐱 Gato</span>
                        </label>
                    </div>
                    <div class="age-group">
                        <div class="form-group">
                            <label style="font-size: 1.1rem;">Años</label>
                            <input type="number" name="guest_anos" id="guest_anos" step="0.1" min="0" max="30" placeholder="0" style="padding: 1rem; font-size: 1.1rem;">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 1.1rem;">Meses</label>
                            <input type="number" name="guest_meses" id="guest_meses" step="0.1" min="0" placeholder="0" style="padding: 1rem; font-size: 1.1rem;">
                        </div>
                    </div>
                </div>

                <div class="step" id="step-1" style="display: none;">
                    <h2 style="font-size: 1.8rem; margin-bottom: 1.5rem;"><span class="step-num">1</span> Datos Físicos Actuales</h2>
                    
                    <p style="color: var(--brand-green); margin-bottom: 1.5rem; font-size: 1.1rem;" id="calc-phys-desc">Ingresa el peso y nivel de actividad actual de tu mascota para calcular su dieta exacta hoy.</p>


                    
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="font-size: 1.1rem;">Peso Corporal</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="number" name="peso" step="0.1" min="0.5" placeholder="Ej. 15.5" required style="flex: 1; padding: 1rem; font-size: 1.1rem;">
                            <select name="unidad_peso" style="width: 90px; padding-left: 0.5rem; padding-right: 0.5rem; font-size: 1.1rem;">
                                <option value="kg">kg</option>
                                <option value="lbs">lbs</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group" id="actividad-group">
                        <label style="font-size: 1.1rem;">Nivel de Actividad</label>
                        <select name="actividad" id="actividad-select" style="padding: 1rem; font-size: 1.1rem;">
                            <option value="mantenimiento">Actividad Media / Mantenimiento</option>
                            <option value="sedentario">Sedentario / Pérdida de Peso</option>
                            <option value="alto">Alta Actividad / Ganancia de Peso</option>
                        </select>
                    </div>
                </div>

                <button type="submit" class="btn-primary" id="submit-btn" style="padding: 1.2rem; font-size: 1.2rem; margin-top: 2rem; width: 100%;">Generar Plan Nutricional</button>
            </form>
        </div>

        <div class="result-container" id="result-container" style="display:none; margin-top: 2rem;">
            <div class="summary-card card" style="padding: 2.5rem;">
                <h2 style="font-size: 1.8rem; margin-bottom: 1.5rem;">Plan Nutricional</h2>
                
                <div class="summary-stats-grid">
                    <div class="stat-box main-stat">
                        <div class="label">Ración Diaria Total</div>
                        <div class="value" id="racion-total">0g</div>
                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;" id="racion-calorias">0 kcal</div>
                    </div>
                    
                    <div class="stat-box">
                        <div class="label">Comidas al Día</div>
                        <div class="value" id="racion-comidas" style="font-size: 1.8rem; color: white;">2</div>
                    </div>
                    
                    <div class="stat-box">
                        <div class="label">Porción por Comida</div>
                        <div class="value" id="racion-recomendacion" style="font-size: 1.8rem; color: white;">0g</div>
                    </div>
                </div>

                <button class="btn-secondary" id="btn-recalculate" style="margin-top: 2rem; background: white; color: var(--brand-blue); border: none; padding: 1rem 1.5rem; font-size: 1.1rem;">Recalcular Dieta</button>
            </div>

            <div class="ingredients-grid" id="ingredient-list">
                <!-- Injected via JS -->
            </div>
            
            <div class="warnings" style="margin-top: 2rem; font-size: 1rem;">
                <p><strong>⚠️ Atención:</strong> Los huesos carnosos <strong>NUNCA</strong> deben cocinarse (se astillan y son peligrosos). Estos cálculos son una base inicial recomendada.</p>
                <p id="taurina-warning" style="display:none;"><strong>🐱 Extra Gatos:</strong> Es vital incluir cortes ricos en Taurina (como el corazón) dentro de la porción de carne magra.</p>
            </div>
        </div>
    </main>

    <!-- ================= VISTA 4: AGENDA Y CALENDARIO ================= -->
    <main class="container view-section" id="view-calendar" style="display: none; max-width: 800px; width: 100%;">
        <button id="btn-close-calendar" class="btn-secondary" style="margin-bottom: 2rem; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: white;">
            <span>◀ Volver al Dashboard</span>
        </button>

        <div class="card" style="padding: 2.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="font-size: 1.8rem; color: var(--brand-green);">Agenda de <span id="calendar-pet-name">Mascota</span></h2>
                <div style="display: flex; align-items: center; gap: 1rem; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 0.5rem;">
                    <button id="btn-prev-month" style="background:none; border:none; color:white; font-size: 1.5rem; cursor:pointer; padding: 0 0.5rem;">◀</button>
                    <span id="calendar-month-year" style="font-size: 1.2rem; font-weight: 600; min-width: 120px; text-align: center;">Mayo 2026</span>
                    <button id="btn-next-month" style="background:none; border:none; color:white; font-size: 1.5rem; cursor:pointer; padding: 0 0.5rem;">▶</button>
                </div>
            </div>

            <div id="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center;">
                <!-- Días de la semana -->
                <div style="color: var(--text-muted); font-size: 0.9rem; padding-bottom: 1rem;">Lun</div>
                <div style="color: var(--text-muted); font-size: 0.9rem; padding-bottom: 1rem;">Mar</div>
                <div style="color: var(--text-muted); font-size: 0.9rem; padding-bottom: 1rem;">Mié</div>
                <div style="color: var(--text-muted); font-size: 0.9rem; padding-bottom: 1rem;">Jue</div>
                <div style="color: var(--text-muted); font-size: 0.9rem; padding-bottom: 1rem;">Vie</div>
                <div style="color: var(--text-muted); font-size: 0.9rem; padding-bottom: 1rem;">Sáb</div>
                <div style="color: var(--text-muted); font-size: 0.9rem; padding-bottom: 1rem;">Dom</div>
                
                <!-- Días inyectados por JS -->
            </div>
        </div>
    </main>

    <!-- Modal para Añadir/Ver Evento -->
    <div id="event-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index: 10000; align-items:center; justify-content:center;">
        <div class="card" style="width: 90%; max-width: 400px; padding: 2rem; transform: scale(0.9); opacity: 0; transition: transform 0.3s, opacity 0.3s;" id="event-modal-content">
            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;" id="event-modal-date-title">15 de Mayo</h3>
            <div id="event-modal-existing" style="margin-bottom: 1.5rem; color: var(--brand-green); font-size: 1.1rem; font-weight: bold; display: none;">
                <!-- Evento existente -->
            </div>
            
            <form id="add-event-form">
                <div class="form-group">
                    <label>Añadir Nuevo Evento</label>
                    <input type="text" id="new-event-title" placeholder="Ej: Vacuna, Paseo al parque..." required style="padding: 1rem; font-size: 1rem; width: 100%;">
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="button" class="btn-secondary" id="btn-close-modal" style="flex: 1; padding: 0.8rem; font-size: 1rem; background: rgba(255,255,255,0.1); border: none;">Cancelar</button>
                    <button type="submit" class="btn-primary" style="flex: 1; padding: 0.8rem; font-size: 1rem;">Guardar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= FOOTER GLOBAL ================= -->
    <footer id="main-footer" style="display: none; background-color: var(--bg-color); width: calc(100% + 2rem); margin: 4rem -1rem -2rem -1rem; padding: 4rem 2rem; border-top: 1px solid var(--border-color); flex-direction: column; align-items: center; z-index: 10; position: relative;">
        <div style="max-width: 800px; text-align: center;">
            <h4 style="font-size: 2.2rem; color: var(--brand-green); margin-bottom: 1.5rem; font-weight: 800; letter-spacing: -1px;">NutriPaws</h4>
            
            <p style="color: var(--text-main); margin-bottom: 2.5rem; font-size: 1.1rem; line-height: 1.6; max-width: 600px; margin-left: auto; margin-right: auto; opacity: 0.9;">
                Nos importa la salud de tu peludo. NutriPaws está creado por un equipo apasionado que ama a los animales, y nuestra misión es darte las mejores herramientas para que cuides a tu amado compañero.
            </p>
            
            <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 3rem; flex-wrap: wrap;">
                <a href="#" style="color: var(--brand-green); font-size: 1rem; text-decoration: none; font-weight: bold; border: 2px solid var(--brand-green); padding: 0.5rem 1rem; border-radius: 8px;">Instagram</a>
                <a href="#" style="color: var(--brand-green); font-size: 1rem; text-decoration: none; font-weight: bold; border: 2px solid var(--brand-green); padding: 0.5rem 1rem; border-radius: 8px;">Twitter / X</a>
                <a href="#" style="color: var(--brand-green); font-size: 1rem; text-decoration: none; font-weight: bold; border: 2px solid var(--brand-green); padding: 0.5rem 1rem; border-radius: 8px;">Facebook</a>
            </div>
            
            <p style="color: var(--text-muted); font-size: 0.9rem;">&copy; 2025-2026 NutriPaws. Todos los derechos reservados.</p>
        </div>
    </footer>

    <script src="app.js"></script>
</body>
</html>
"""

    css_content = """
:root {
    --brand-green: #8DC63F;
    --brand-blue: #124962;
    --brand-blue-light: #1A627B;
    
    --bg-color: #F4F7F6;
    --card-bg: #FFFFFF;
    --text-main: #124962;
    --text-muted: #64748B;
    --border-color: #E2E8F0;
    --input-bg: #F8FAFC;
    --shadow: 0 10px 25px -5px rgba(18, 73, 98, 0.08), 0 8px 10px -6px rgba(18, 73, 98, 0.04);
}

[data-theme="dark"] {
    --bg-color: #0B1120;
    --card-bg: rgba(30, 41, 59, 0.6);
    --text-main: #F8FAFC;
    --text-muted: #94A3B8;
    --border-color: #334155;
    --input-bg: #1E293B;
    --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    --backdrop-blur: blur(16px);
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    transition: background-color 0.3s, color 0.3s, border-color 0.3s, transform 0.3s ease, box-shadow 0.3s ease;
}

/* Ocultar iconos de flechas en input number */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] {
  -moz-appearance: textfield;
}

h1, h2, h3, .logo { font-family: 'Inter', sans-serif; font-weight: 800; letter-spacing: -0.5px; }

body {
    background-color: transparent;
    color: var(--text-main);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    overflow-x: hidden;
}

.hero-bg {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100vh;
    background-image: url('img/hero-bg.png');
    background-size: cover;
    background-position: center;
    z-index: -2;
    animation: slowPan 25s infinite alternate ease-in-out;
}

.hero-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100vh;
    background: rgba(11, 17, 32, 0.75);
    z-index: -1;
}

@keyframes slowPan {
    0% { transform: scale(1) translateX(0); }
    100% { transform: scale(1.1) translateX(-10px); }
}

.theme-toggle {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
}

#theme-btn {
    background: var(--card-bg);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

header {
    text-align: center;
    margin-bottom: 2.5rem;
    margin-top: 1rem;
}

.logo {
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -1.5px;
}

.logo-nutri { color: var(--brand-blue); }
[data-theme="dark"] .logo-nutri { color: #FFFFFF; }
.logo-paws { color: var(--brand-green); }

.stat-box.main-stat .value {
    color: var(--brand-green);
    font-size: 2.2rem;
}

/* Resplandor del Cursor */
#cursor-glow {
    position: fixed;
    width: 20px;
    height: 20px;
    background: rgba(139, 92, 246, 0.4);
    box-shadow: 0 0 50px 30px rgba(139, 92, 246, 0.4);
    border-radius: 50%;
    pointer-events: none;
    transform: translate(-50%, -50%);
    z-index: 9999;
    transition: width 0.1s, height 0.1s;
}

.subtitle {
    color: var(--text-muted);
    font-size: 1.1rem;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.container {
    width: 100%;
    max-width: 600px;
}

.card {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 2.5rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    backdrop-filter: var(--backdrop-blur, none);
}

.step {
    margin-bottom: 2.5rem;
    animation: fadeIn 0.4s ease-out;
}

.step h2 {
    font-size: 1.4rem;
    margin-bottom: 1.2rem;
    display: flex;
    align-items: center;
    gap: 10px;
}

.step-num {
    background: var(--brand-green);
    color: white;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 1rem;
    font-weight: bold;
}

.options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.radio-card input { display: none; }

.card-content {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.2rem;
    background: var(--input-bg);
    border: 2px solid var(--border-color);
    border-radius: 14px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1.1rem;
    transition: all 0.3s ease;
}

.radio-card:hover .card-content {
    transform: translateY(-4px);
    box-shadow: 0 8px 15px rgba(141, 198, 63, 0.15);
    border-color: var(--brand-green);
}

.radio-card input:checked + .card-content {
    border-color: var(--brand-green);
    background: rgba(141, 198, 63, 0.08);
    color: var(--brand-green);
    box-shadow: 0 0 0 4px rgba(141, 198, 63, 0.15);
}

.form-group {
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
}

.age-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group label {
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.95rem;
}

.form-group select, .form-group input {
    padding: 1rem;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--input-bg);
    color: var(--text-main);
    font-size: 1rem;
}

.form-group select:focus, .form-group input:focus {
    outline: none;
    border-color: var(--brand-green);
    box-shadow: 0 0 0 3px rgba(141, 198, 63, 0.2);
}

.btn-primary {
    width: 100%;
    padding: 1.2rem;
    background-color: var(--brand-green);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.15rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(141, 198, 63, 0.4);
}

.btn-primary:hover {
    background-color: #7ab335;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(141, 198, 63, 0.5);
}

.btn-secondary {
    width: 100%;
    padding: 1rem;
    background-color: transparent;
    color: var(--brand-blue);
    border: 2px solid var(--border-color);
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
}
[data-theme="dark"] .btn-secondary { color: white; }

.result-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.summary-card {
    text-align: center;
    background: linear-gradient(135deg, var(--brand-blue), var(--brand-blue-light));
    color: white;
    border: none;
}

.summary-card h2 { color: white; opacity: 0.9; margin-bottom: 0.5rem; }

.summary-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
}

.stat-box {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.stat-box.main-stat {
    grid-column: 1 / -1;
    background: rgba(255, 255, 255, 0.15);
    padding: 1.5rem;
}

.stat-label {
    font-size: 0.85rem;
    opacity: 0.85;
    margin-bottom: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
}

.stat-value {
    font-size: 1.4rem;
    font-weight: 700;
}

.main-stat .stat-value {
    font-size: 3.5rem;
    color: var(--brand-green);
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    line-height: 1;
    margin-top: 0.2rem;
}

.ingredients-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.ingredient-item {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    padding: 1rem;
    border-radius: 12px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}

.ingredient-item:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 12px 25px -5px rgba(18, 73, 98, 0.15);
}

.ing-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 0.95rem;
}

.ing-grams {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--brand-green);
}

.ing-bar-bg {
    width: 100%;
    height: 6px;
    background: var(--input-bg);
    border-radius: 3px;
    overflow: hidden;
}

.ing-bar-fill {
    height: 100%;
    background: var(--brand-green);
    border-radius: 3px;
}

.warnings {
    background: rgba(249, 115, 22, 0.1);
    border-left: 4px solid #F97316;
    padding: 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    color: var(--text-main);
    line-height: 1.5;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@media (max-width: 500px) {
    .ingredients-grid { grid-template-columns: 1fr; }
}
"""

    js_content = f"""document.addEventListener('DOMContentLoaded', () => {{
    // --- LÓGICA DE VISTAS (SPA) ---
    const viewLogin = document.getElementById('view-login');
    const viewDashboard = document.getElementById('view-dashboard');
    const viewCreatePet = document.getElementById('view-create-pet');
    const viewCalculator = document.getElementById('view-calculator');
    const viewCalendar = document.getElementById('view-calendar');
    const menuContainer = document.getElementById('user-menu-container');
    const dropdownMenu = document.getElementById('dropdown-menu');
    
    // Calendar State
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDateForEvent = null;
    
    let pets = [];
    let activePetIndex = -1;
    let tempAvatarSrc = "";
    
    // Resplandor del Cursor
    const cursorGlow = document.createElement('div');
    cursorGlow.id = 'cursor-glow';
    document.body.appendChild(cursorGlow);
    document.addEventListener('mousemove', (e) => {{
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    }});

    function showView(view) {{
        viewLogin.style.display = 'none';
        viewDashboard.style.display = 'none';
        viewCreatePet.style.display = 'none';
        viewCalculator.style.display = 'none';
        viewCalendar.style.display = 'none';
        view.style.display = 'block';
        
        const footer = document.getElementById('main-footer');
        if (footer) {{
            footer.style.display = view === viewLogin ? 'none' : 'flex';
        }}
        
        if(view === viewDashboard || view === viewCalculator) {{
            menuContainer.style.display = 'block';
        }} else {{
            menuContainer.style.display = 'none';
        }}
    }}

    // Toggle Menu
    document.getElementById('menu-trigger').addEventListener('click', () => {{
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    }});

    // Edit Name
    document.getElementById('edit-name-btn').addEventListener('click', () => {{
        const newName = prompt("¿Cómo te gustaría que te llamemos?");
        if(newName && newName.trim() !== "") {{
            document.getElementById('user-name-display').innerText = newName.trim();
        }}
    }});

    // Navigation
    document.getElementById('btn-goto-create-pet').addEventListener('click', () => {{
        document.getElementById('create-pet-form').reset();
        document.getElementById('pet-avatar-img').style.display = 'none';
        document.getElementById('pet-avatar-placeholder').style.display = 'flex';
        tempAvatarSrc = "";
        showView(viewCreatePet);
    }});
    
    document.getElementById('btn-back-from-create').addEventListener('click', () => {{
        showView(viewDashboard);
    }});

    // Avatar Upload Logic
    document.getElementById('pet-avatar-upload').addEventListener('change', (e) => {{
        const file = e.target.files[0];
        if (file) {{
            const reader = new FileReader();
            reader.onload = (event) => {{
                const src = event.target.result;
                document.getElementById('pet-avatar-img').src = src;
                document.getElementById('pet-avatar-img').style.display = 'block';
                document.getElementById('pet-avatar-placeholder').style.display = 'none';
                tempAvatarSrc = src;
            }};
            reader.readAsDataURL(file);
        }}
    }});

    // Login Form Handler
    document.getElementById('login-form').addEventListener('submit', async (e) => {{
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        try {{
            const res = await fetch('http://localhost:5000/api/login', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify({{email}})
            }});
            const data = await res.json();
            document.getElementById('user-name-display').innerText = data.name;
            showView(viewDashboard);
        }} catch(err) {{
            console.error("Backend no detectado, usando fallback local", err);
            document.getElementById('user-name-display').innerText = email.split('@')[0];
            showView(viewDashboard);
        }}
    }});

    document.getElementById('btn-logout').addEventListener('click', () => {{
        dropdownMenu.style.display = 'none';
        showView(viewLogin);
    }});

    // La apertura de calculadora ahora se hace desde renderPets()

    // Calculadora Rápida (Invitado)
    document.getElementById('btn-quick-calc').addEventListener('click', () => {{
        activePetIndex = -1;
        document.getElementById('calc-guest-fields').style.display = 'block';
        document.getElementById('calc-phys-desc').style.display = 'none';
        document.getElementById('step-1').style.display = 'block';
        showView(viewCalculator);
    }});

    document.getElementById('btn-close-calculator').addEventListener('click', () => {{
        showView(viewDashboard);
    }});
    
    // Simular envío de registros
    document.getElementById('medical-form').addEventListener('submit', async (e) => {{
        e.preventDefault();
        const text = document.getElementById('medical-notes').value;
        if(!text) return;
        try {{
            const res = await fetch('http://localhost:5000/api/process_medical_record', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify({{pet_id: 1, text: text}})
            }});
            const data = await res.json();
            
            const calendar = document.getElementById('calendar-events');
            if(calendar.innerHTML.includes('No hay citas')) calendar.innerHTML = '';
            calendar.innerHTML += `
                <div style="background: rgba(255,255,255,0.1); padding: 0.8rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                    <div>
                        <strong style="color: var(--brand-green);">${{data.event_extracted.type}}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${{data.event_extracted.description}}</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 0.8rem; background: rgba(0,0,0,0.5); padding: 0.2rem 0.5rem; border-radius: 4px;">📅 ${{data.event_extracted.scheduled_date}}</span>
                    </div>
                </div>
            `;
            document.getElementById('medical-notes').value = '';
        }} catch(err) {{
            alert("El backend en Python (localhost:5000) no está corriendo. Simulación fallida.");
        }}
    }});

    // Cron Job Simulator
    document.getElementById('btn-cron').addEventListener('click', async () => {{
        try {{
            const res = await fetch('http://localhost:5000/api/cron/check_notifications');
            const data = await res.json();
            if(data.notifications.length > 0) {{
                alert("🔔 NOTIFICACIÓN ENVIADA: \n" + data.notifications.join('\n'));
            }} else {{
                alert("No hay notificaciones programadas para dentro de 3 días.");
            }}
        }} catch(err) {{
            alert("El backend en Python no está corriendo.");
        }}
    }});

    // --- FIN LÓGICA DE VISTAS ---

    const themeBtnMenu = document.getElementById('theme-btn-menu');
    const htmlObj = document.documentElement;
    let isDark = true;
    themeBtnMenu.innerText = '☀️ Cambiar Tema';
    
    themeBtnMenu.addEventListener('click', () => {{
        isDark = !isDark;
        if(isDark) {{
            htmlObj.setAttribute('data-theme', 'dark');
            themeBtnMenu.innerText = '☀️ Cambiar Tema';
        }} else {{
            htmlObj.setAttribute('data-theme', 'light');
            themeBtnMenu.innerText = '🌙 Cambiar Tema';
        }}
        dropdownMenu.style.display = 'none';
    }});

    const dbRazas = {{
    "perros": [
        {{
            "id": "criollo",
            "name": "Criollo / Mestizo"
        }},
        {{
            "id": "affenpinscher",
            "name": "Affenpinscher"
        }},
        {{
            "id": "african-wild",
            "name": "Wild African"
        }},
        {{
            "id": "airedale",
            "name": "Airedale"
        }},
        {{
            "id": "akita",
            "name": "Akita"
        }},
        {{
            "id": "appenzeller",
            "name": "Appenzeller"
        }},
        {{
            "id": "australian-kelpie",
            "name": "Kelpie Australian"
        }},
        {{
            "id": "australian-shepherd",
            "name": "Shepherd Australian"
        }},
        {{
            "id": "bakharwal-indian",
            "name": "Indian Bakharwal"
        }},
        {{
            "id": "basenji",
            "name": "Basenji"
        }},
        {{
            "id": "beagle",
            "name": "Beagle"
        }},
        {{
            "id": "bluetick",
            "name": "Bluetick"
        }},
        {{
            "id": "borzoi",
            "name": "Borzoi"
        }},
        {{
            "id": "bouvier",
            "name": "Bouvier"
        }},
        {{
            "id": "boxer",
            "name": "Boxer"
        }},
        {{
            "id": "brabancon",
            "name": "Brabancon"
        }},
        {{
            "id": "briard",
            "name": "Briard"
        }},
        {{
            "id": "buhund-norwegian",
            "name": "Norwegian Buhund"
        }},
        {{
            "id": "bulldog-boston",
            "name": "Boston Bulldog"
        }},
        {{
            "id": "bulldog-english",
            "name": "English Bulldog"
        }},
        {{
            "id": "bulldog-french",
            "name": "French Bulldog"
        }},
        {{
            "id": "bullterrier-staffordshire",
            "name": "Staffordshire Bullterrier"
        }},
        {{
            "id": "cattledog-australian",
            "name": "Australian Cattledog"
        }},
        {{
            "id": "cavapoo",
            "name": "Cavapoo"
        }},
        {{
            "id": "chihuahua",
            "name": "Chihuahua"
        }},
        {{
            "id": "chippiparai-indian",
            "name": "Indian Chippiparai"
        }},
        {{
            "id": "chow",
            "name": "Chow"
        }},
        {{
            "id": "clumber",
            "name": "Clumber"
        }},
        {{
            "id": "cockapoo",
            "name": "Cockapoo"
        }},
        {{
            "id": "collie-border",
            "name": "Border Collie"
        }},
        {{
            "id": "coonhound",
            "name": "Coonhound"
        }},
        {{
            "id": "corgi-cardigan",
            "name": "Cardigan Corgi"
        }},
        {{
            "id": "cotondetulear",
            "name": "Cotondetulear"
        }},
        {{
            "id": "dachshund",
            "name": "Dachshund"
        }},
        {{
            "id": "dalmatian",
            "name": "Dalmatian"
        }},
        {{
            "id": "dane-great",
            "name": "Great Dane"
        }},
        {{
            "id": "danish-swedish",
            "name": "Swedish Danish"
        }},
        {{
            "id": "deerhound-scottish",
            "name": "Scottish Deerhound"
        }},
        {{
            "id": "dhole",
            "name": "Dhole"
        }},
        {{
            "id": "dingo",
            "name": "Dingo"
        }},
        {{
            "id": "doberman",
            "name": "Doberman"
        }},
        {{
            "id": "elkhound-norwegian",
            "name": "Norwegian Elkhound"
        }},
        {{
            "id": "entlebucher",
            "name": "Entlebucher"
        }},
        {{
            "id": "eskimo",
            "name": "Eskimo"
        }},
        {{
            "id": "finnish-lapphund",
            "name": "Lapphund Finnish"
        }},
        {{
            "id": "frise-bichon",
            "name": "Bichon Frise"
        }},
        {{
            "id": "gaddi-indian",
            "name": "Indian Gaddi"
        }},
        {{
            "id": "german-shepherd",
            "name": "Shepherd German"
        }},
        {{
            "id": "greyhound-indian",
            "name": "Indian Greyhound"
        }},
        {{
            "id": "greyhound-italian",
            "name": "Italian Greyhound"
        }},
        {{
            "id": "groenendael",
            "name": "Groenendael"
        }},
        {{
            "id": "havanese",
            "name": "Havanese"
        }},
        {{
            "id": "hound-afghan",
            "name": "Afghan Hound"
        }},
        {{
            "id": "hound-basset",
            "name": "Basset Hound"
        }},
        {{
            "id": "hound-blood",
            "name": "Blood Hound"
        }},
        {{
            "id": "hound-english",
            "name": "English Hound"
        }},
        {{
            "id": "hound-ibizan",
            "name": "Ibizan Hound"
        }},
        {{
            "id": "hound-plott",
            "name": "Plott Hound"
        }},
        {{
            "id": "hound-walker",
            "name": "Walker Hound"
        }},
        {{
            "id": "husky",
            "name": "Husky"
        }},
        {{
            "id": "keeshond",
            "name": "Keeshond"
        }},
        {{
            "id": "kelpie",
            "name": "Kelpie"
        }},
        {{
            "id": "kombai",
            "name": "Kombai"
        }},
        {{
            "id": "komondor",
            "name": "Komondor"
        }},
        {{
            "id": "kuvasz",
            "name": "Kuvasz"
        }},
        {{
            "id": "labradoodle",
            "name": "Labradoodle"
        }},
        {{
            "id": "labrador",
            "name": "Labrador"
        }},
        {{
            "id": "leonberg",
            "name": "Leonberg"
        }},
        {{
            "id": "lhasa",
            "name": "Lhasa"
        }},
        {{
            "id": "malamute",
            "name": "Malamute"
        }},
        {{
            "id": "malinois",
            "name": "Malinois"
        }},
        {{
            "id": "maltese",
            "name": "Maltese"
        }},
        {{
            "id": "mastiff-bull",
            "name": "Bull Mastiff"
        }},
        {{
            "id": "mastiff-english",
            "name": "English Mastiff"
        }},
        {{
            "id": "mastiff-indian",
            "name": "Indian Mastiff"
        }},
        {{
            "id": "mastiff-tibetan",
            "name": "Tibetan Mastiff"
        }},
        {{
            "id": "mexicanhairless",
            "name": "Mexicanhairless"
        }},
        {{
            "id": "mix",
            "name": "Mix"
        }},
        {{
            "id": "mountain-bernese",
            "name": "Bernese Mountain"
        }},
        {{
            "id": "mountain-swiss",
            "name": "Swiss Mountain"
        }},
        {{
            "id": "mudhol-indian",
            "name": "Indian Mudhol"
        }},
        {{
            "id": "newfoundland",
            "name": "Newfoundland"
        }},
        {{
            "id": "otterhound",
            "name": "Otterhound"
        }},
        {{
            "id": "ovcharka-caucasian",
            "name": "Caucasian Ovcharka"
        }},
        {{
            "id": "papillon",
            "name": "Papillon"
        }},
        {{
            "id": "pariah-indian",
            "name": "Indian Pariah"
        }},
        {{
            "id": "pekinese",
            "name": "Pekinese"
        }},
        {{
            "id": "pembroke",
            "name": "Pembroke"
        }},
        {{
            "id": "pinscher-miniature",
            "name": "Miniature Pinscher"
        }},
        {{
            "id": "pitbull",
            "name": "Pitbull"
        }},
        {{
            "id": "pointer-german",
            "name": "German Pointer"
        }},
        {{
            "id": "pointer-germanlonghair",
            "name": "Germanlonghair Pointer"
        }},
        {{
            "id": "pomeranian",
            "name": "Pomeranian"
        }},
        {{
            "id": "poodle-medium",
            "name": "Medium Poodle"
        }},
        {{
            "id": "poodle-miniature",
            "name": "Miniature Poodle"
        }},
        {{
            "id": "poodle-standard",
            "name": "Standard Poodle"
        }},
        {{
            "id": "poodle-toy",
            "name": "Toy Poodle"
        }},
        {{
            "id": "pug",
            "name": "Pug"
        }},
        {{
            "id": "puggle",
            "name": "Puggle"
        }},
        {{
            "id": "pyrenees",
            "name": "Pyrenees"
        }},
        {{
            "id": "rajapalayam-indian",
            "name": "Indian Rajapalayam"
        }},
        {{
            "id": "redbone",
            "name": "Redbone"
        }},
        {{
            "id": "retriever-chesapeake",
            "name": "Chesapeake Retriever"
        }},
        {{
            "id": "retriever-curly",
            "name": "Curly Retriever"
        }},
        {{
            "id": "retriever-flatcoated",
            "name": "Flatcoated Retriever"
        }},
        {{
            "id": "retriever-golden",
            "name": "Golden Retriever"
        }},
        {{
            "id": "ridgeback-rhodesian",
            "name": "Rhodesian Ridgeback"
        }},
        {{
            "id": "rottweiler",
            "name": "Rottweiler"
        }},
        {{
            "id": "rough-collie",
            "name": "Collie Rough"
        }},
        {{
            "id": "saluki",
            "name": "Saluki"
        }},
        {{
            "id": "samoyed",
            "name": "Samoyed"
        }},
        {{
            "id": "schipperke",
            "name": "Schipperke"
        }},
        {{
            "id": "schnauzer-giant",
            "name": "Giant Schnauzer"
        }},
        {{
            "id": "schnauzer-miniature",
            "name": "Miniature Schnauzer"
        }},
        {{
            "id": "segugio-italian",
            "name": "Italian Segugio"
        }},
        {{
            "id": "setter-english",
            "name": "English Setter"
        }},
        {{
            "id": "setter-gordon",
            "name": "Gordon Setter"
        }},
        {{
            "id": "setter-irish",
            "name": "Irish Setter"
        }},
        {{
            "id": "sharpei",
            "name": "Sharpei"
        }},
        {{
            "id": "sheepdog-english",
            "name": "English Sheepdog"
        }},
        {{
            "id": "sheepdog-indian",
            "name": "Indian Sheepdog"
        }},
        {{
            "id": "sheepdog-shetland",
            "name": "Shetland Sheepdog"
        }},
        {{
            "id": "shiba",
            "name": "Shiba"
        }},
        {{
            "id": "shihtzu",
            "name": "Shihtzu"
        }},
        {{
            "id": "spaniel-blenheim",
            "name": "Blenheim Spaniel"
        }},
        {{
            "id": "spaniel-brittany",
            "name": "Brittany Spaniel"
        }},
        {{
            "id": "spaniel-cocker",
            "name": "Cocker Spaniel"
        }},
        {{
            "id": "spaniel-irish",
            "name": "Irish Spaniel"
        }},
        {{
            "id": "spaniel-japanese",
            "name": "Japanese Spaniel"
        }},
        {{
            "id": "spaniel-sussex",
            "name": "Sussex Spaniel"
        }},
        {{
            "id": "spaniel-welsh",
            "name": "Welsh Spaniel"
        }},
        {{
            "id": "spitz-indian",
            "name": "Indian Spitz"
        }},
        {{
            "id": "spitz-japanese",
            "name": "Japanese Spitz"
        }},
        {{
            "id": "springer-english",
            "name": "English Springer"
        }},
        {{
            "id": "stbernard",
            "name": "Stbernard"
        }},
        {{
            "id": "terrier-american",
            "name": "American Terrier"
        }},
        {{
            "id": "terrier-andalusian",
            "name": "Andalusian Terrier"
        }},
        {{
            "id": "terrier-australian",
            "name": "Australian Terrier"
        }},
        {{
            "id": "terrier-bedlington",
            "name": "Bedlington Terrier"
        }},
        {{
            "id": "terrier-border",
            "name": "Border Terrier"
        }},
        {{
            "id": "terrier-boston",
            "name": "Boston Terrier"
        }},
        {{
            "id": "terrier-cairn",
            "name": "Cairn Terrier"
        }},
        {{
            "id": "terrier-dandie",
            "name": "Dandie Terrier"
        }},
        {{
            "id": "terrier-fox",
            "name": "Fox Terrier"
        }},
        {{
            "id": "terrier-irish",
            "name": "Irish Terrier"
        }},
        {{
            "id": "terrier-kerryblue",
            "name": "Kerryblue Terrier"
        }},
        {{
            "id": "terrier-lakeland",
            "name": "Lakeland Terrier"
        }},
        {{
            "id": "terrier-norfolk",
            "name": "Norfolk Terrier"
        }},
        {{
            "id": "terrier-norwich",
            "name": "Norwich Terrier"
        }},
        {{
            "id": "terrier-patterdale",
            "name": "Patterdale Terrier"
        }},
        {{
            "id": "terrier-russell",
            "name": "Russell Terrier"
        }},
        {{
            "id": "terrier-scottish",
            "name": "Scottish Terrier"
        }},
        {{
            "id": "terrier-sealyham",
            "name": "Sealyham Terrier"
        }},
        {{
            "id": "terrier-silky",
            "name": "Silky Terrier"
        }},
        {{
            "id": "terrier-tibetan",
            "name": "Tibetan Terrier"
        }},
        {{
            "id": "terrier-toy",
            "name": "Toy Terrier"
        }},
        {{
            "id": "terrier-welsh",
            "name": "Welsh Terrier"
        }},
        {{
            "id": "terrier-westhighland",
            "name": "Westhighland Terrier"
        }},
        {{
            "id": "terrier-wheaten",
            "name": "Wheaten Terrier"
        }},
        {{
            "id": "terrier-yorkshire",
            "name": "Yorkshire Terrier"
        }},
        {{
            "id": "tervuren",
            "name": "Tervuren"
        }},
        {{
            "id": "vizsla",
            "name": "Vizsla"
        }},
        {{
            "id": "waterdog-spanish",
            "name": "Spanish Waterdog"
        }},
        {{
            "id": "weimaraner",
            "name": "Weimaraner"
        }},
        {{
            "id": "whippet",
            "name": "Whippet"
        }},
        {{
            "id": "wolfhound-irish",
            "name": "Irish Wolfhound"
        }}
    ],
    "gatos": [
        {{
            "id": "criollo",
            "name": "Criollo / Mestizo"
        }},
        {{
            "id": "abys",
            "name": "Abyssinian"
        }},
        {{
            "id": "aege",
            "name": "Aegean"
        }},
        {{
            "id": "abob",
            "name": "American Bobtail"
        }},
        {{
            "id": "acur",
            "name": "American Curl"
        }},
        {{
            "id": "asho",
            "name": "American Shorthair"
        }},
        {{
            "id": "awir",
            "name": "American Wirehair"
        }},
        {{
            "id": "amau",
            "name": "Arabian Mau"
        }},
        {{
            "id": "amis",
            "name": "Australian Mist"
        }},
        {{
            "id": "bali",
            "name": "Balinese"
        }},
        {{
            "id": "bamb",
            "name": "Bambino"
        }},
        {{
            "id": "beng",
            "name": "Bengal"
        }},
        {{
            "id": "birm",
            "name": "Birman"
        }},
        {{
            "id": "bomb",
            "name": "Bombay"
        }},
        {{
            "id": "bslo",
            "name": "British Longhair"
        }},
        {{
            "id": "bsho",
            "name": "British Shorthair"
        }},
        {{
            "id": "bure",
            "name": "Burmese"
        }},
        {{
            "id": "buri",
            "name": "Burmilla"
        }},
        {{
            "id": "cspa",
            "name": "California Spangled"
        }},
        {{
            "id": "ctif",
            "name": "Chantilly-Tiffany"
        }},
        {{
            "id": "char",
            "name": "Chartreux"
        }},
        {{
            "id": "chau",
            "name": "Chausie"
        }},
        {{
            "id": "chee",
            "name": "Cheetoh"
        }},
        {{
            "id": "csho",
            "name": "Colorpoint Shorthair"
        }},
        {{
            "id": "crex",
            "name": "Cornish Rex"
        }},
        {{
            "id": "cymr",
            "name": "Cymric"
        }},
        {{
            "id": "cypr",
            "name": "Cyprus"
        }},
        {{
            "id": "drex",
            "name": "Devon Rex"
        }},
        {{
            "id": "dons",
            "name": "Donskoy"
        }},
        {{
            "id": "lihu",
            "name": "Dragon Li"
        }},
        {{
            "id": "emau",
            "name": "Egyptian Mau"
        }},
        {{
            "id": "ebur",
            "name": "European Burmese"
        }},
        {{
            "id": "esho",
            "name": "Exotic Shorthair"
        }},
        {{
            "id": "hbro",
            "name": "Havana Brown"
        }},
        {{
            "id": "hima",
            "name": "Himalayan"
        }},
        {{
            "id": "jbob",
            "name": "Japanese Bobtail"
        }},
        {{
            "id": "java",
            "name": "Javanese"
        }},
        {{
            "id": "khao",
            "name": "Khao Manee"
        }},
        {{
            "id": "kora",
            "name": "Korat"
        }},
        {{
            "id": "kuri",
            "name": "Kurilian"
        }},
        {{
            "id": "lape",
            "name": "LaPerm"
        }},
        {{
            "id": "mcoo",
            "name": "Maine Coon"
        }},
        {{
            "id": "mala",
            "name": "Malayan"
        }},
        {{
            "id": "manx",
            "name": "Manx"
        }},
        {{
            "id": "munc",
            "name": "Munchkin"
        }},
        {{
            "id": "nebe",
            "name": "Nebelung"
        }},
        {{
            "id": "norw",
            "name": "Norwegian Forest Cat"
        }},
        {{
            "id": "ocic",
            "name": "Ocicat"
        }},
        {{
            "id": "orie",
            "name": "Oriental"
        }},
        {{
            "id": "pers",
            "name": "Persian"
        }},
        {{
            "id": "pixi",
            "name": "Pixie-bob"
        }},
        {{
            "id": "raga",
            "name": "Ragamuffin"
        }},
        {{
            "id": "ragd",
            "name": "Ragdoll"
        }},
        {{
            "id": "rblu",
            "name": "Russian Blue"
        }},
        {{
            "id": "sava",
            "name": "Savannah"
        }},
        {{
            "id": "sfol",
            "name": "Scottish Fold"
        }},
        {{
            "id": "srex",
            "name": "Selkirk Rex"
        }},
        {{
            "id": "siam",
            "name": "Siamese"
        }},
        {{
            "id": "sibe",
            "name": "Siberian"
        }},
        {{
            "id": "sing",
            "name": "Singapura"
        }},
        {{
            "id": "snow",
            "name": "Snowshoe"
        }},
        {{
            "id": "soma",
            "name": "Somali"
        }},
        {{
            "id": "sphy",
            "name": "Sphynx"
        }},
        {{
            "id": "tonk",
            "name": "Tonkinese"
        }},
        {{
            "id": "toyg",
            "name": "Toyger"
        }},
        {{
            "id": "tang",
            "name": "Turkish Angora"
        }},
        {{
"name": "York Chocolate"
        }}
    ]
}};

    const createRazaSelect = document.getElementById('create-pet-raza');

    document.querySelectorAll('input[name="create_especie"]').forEach(radio => {{
        radio.addEventListener('change', (e) => {{
            const especie = e.target.value;
            
            createRazaSelect.innerHTML = '<option value="">Selecciona la raza...</option>';
            const list = especie === 'perro' ? dbRazas.perros : dbRazas.gatos;
            if(list) {{
                const sortedList = [...list].sort((a, b) => {{
                    if (a.id === 'criollo') return -1;
                    if (b.id === 'criollo') return 1;
                    return a.name.localeCompare(b.name);
                }});
                
                sortedList.forEach(r => {{
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = r.name;
                    createRazaSelect.appendChild(opt);
                }});
            }}
        }});
    }});

    // Guardar Perfil (Create Pet)
    document.getElementById('create-pet-form').addEventListener('submit', (e) => {{
        e.preventDefault();
        
        const newPet = {{
            id: Date.now(),
            name: document.getElementById('create-pet-name').value,
            especie: document.querySelector('input[name="create_especie"]:checked').value,
            raza: createRazaSelect.value,
            avatarSrc: tempAvatarSrc,
            lastPeso: null,
            lastUnidadPeso: null,
            lastDieta: null,
            events: []
        }};
        
        const anosIngresados = parseFloat(document.getElementById('create-pet-anos').value) || 0;
        const mesesIngresados = parseFloat(document.getElementById('create-pet-meses').value) || 0;
        
        const birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - Math.floor(anosIngresados));
        birthDate.setMonth(birthDate.getMonth() - Math.floor(mesesIngresados));
        newPet.birthDate = birthDate;

        pets.push(newPet);
        renderPets();
        showView(viewDashboard);
    }});

    function renderPets() {{
        const container = document.getElementById('pets-list-container');
        if(pets.length === 0) {{
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; background: rgba(15, 23, 42, 0.4); border-radius: 20px; border: 2px dashed rgba(255,255,255,0.1);">
                    <p style="color: var(--text-muted); font-size: 1.2rem; margin-bottom: 1rem;">No tienes mascotas registradas aún.</p>
                    <p style="color: var(--text-muted); font-size: 1rem;">Añade tu primer peludo para comenzar.</p>
                </div>
            `;
            return;
        }}

        container.innerHTML = '';
        pets.forEach((pet, index) => {{
            const now = new Date();
            let currentYears = now.getFullYear() - pet.birthDate.getFullYear();
            let currentMonths = now.getMonth() - pet.birthDate.getMonth();
            if (currentMonths < 0) {{
                currentYears--;
                currentMonths += 12;
            }}

            let ageString = "";
            if (currentYears === 0) {{
                ageString = currentMonths === 1 ? "1 mesecito" : `${{currentMonths}} mesecitos`;
            }} else if (currentYears === 1) {{
                ageString = "1 añito";
            }} else {{
                ageString = `${{currentYears}} añitos`;
            }}

            if (currentYears > 0 && currentMonths > 0) {{
                ageString += currentMonths === 1 ? " y 1 mes" : ` y ${{currentMonths}} meses`;
            }}

            const avatarHTML = pet.avatarSrc 
                ? `<div class="avatar-container" data-index="${{index}}" style="position:relative; cursor:pointer; width: 100px; height: 100px;">
                     <img src="${{pet.avatarSrc}}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid rgba(255,255,255,0.2); box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                     <div class="avatar-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: white; font-size: 0.8rem; font-weight: bold;">✏️ Editar</div>
                   </div>`
                : `<div class="avatar-container" data-index="${{index}}" style="position:relative; cursor:pointer; width: 100px; height: 100px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; border: 2px dashed rgba(255,255,255,0.3);">
                     🐾
                     <div class="avatar-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: white; font-size: 0.8rem; font-weight: bold;">✏️ Editar</div>
                   </div>`;
            
            const pesoText = pet.lastPeso ? ` • ${{pet.lastPeso}}${{pet.lastUnidadPeso}}` : '';
            
            // Determinar Próximo Evento
            let nextEventText = "Sin citas pendientes";
            if (pet.events && pet.events.length > 0) {{
                const now = new Date();
                // Normalizar "now" a las 00:00 para comparación justa por día
                now.setHours(0, 0, 0, 0);
                
                const upcomingEvents = pet.events.filter(e => new Date(e.date) >= now);
                if (upcomingEvents.length > 0) {{
                    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
                    const nextE = upcomingEvents[0];
                    // Formatear fecha (ej: 15 de Mayo)
                    const d = new Date(nextE.date);
                    const day = d.getDate() + 1; // Ajuste UTC
                    const month = d.toLocaleString('es-ES', {{ month: 'short' }});
                    nextEventText = `${{day}} ${{month}} - ${{nextE.title}}`;
                }}
            }}

            const card = document.createElement('div');
            card.className = "card";
            card.style.padding = "2rem";
            card.style.display = "flex";
            card.style.justifyContent = "space-between";
            card.style.alignItems = "center";
            card.style.background = "rgba(15, 23, 42, 0.7)";
            card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
            card.style.borderRadius = "20px";
            card.style.gap = "1rem";
            card.style.flexWrap = "wrap";

            const btnText = pet.lastDieta ? 'Ver Dieta' : 'Calcular Dieta';

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 2rem;">
                    <div style="position: relative;">
                        ${{avatarHTML}}
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 2rem; color: var(--brand-green); font-weight: 800;">${{pet.name}}</h3>
                        <p style="margin: 0; margin-top: 0.8rem; color: var(--text-muted); font-size: 1.1rem;">
                            ${{pet.especie === 'perro' ? '🐶 Perro' : '🐱 Gato'}} • ${{ageString}}${{pesoText}}
                        </p>
                        <p style="margin: 0; margin-top: 0.4rem; color: rgba(255,255,255,0.5); font-size: 0.9rem;">
                            📅 Próximo Evento: ${{nextEventText}}
                        </p>
                    </div>
                </div>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn-primary calc-btn" data-index="${{index}}" style="padding: 1rem 2rem; font-size: 1.1rem; border-radius: 12px; transition: transform 0.2s; background: linear-gradient(135deg, var(--brand-blue), #1e3a8a);">${{btnText}}</button>
                    <button class="btn-secondary agenda-btn" data-index="${{index}}" style="padding: 1rem 2rem; font-size: 1.1rem; border-radius: 12px; transition: transform 0.2s; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white;">Ver Agenda</button>
                    ${{pet.lastDieta ? `<button class="btn-secondary pdf-btn" data-index="${{index}}" style="padding: 1rem 2rem; font-size: 1.1rem; border-radius: 12px; transition: transform 0.2s; border: 1px solid rgba(148, 163, 184, 0.4); background: rgba(148, 163, 184, 0.1); color: #cbd5e1; display: flex; align-items: center; gap: 0.5rem;"><span class="pdf-spinner" style="display:none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></span> 📄 Exportar Reporte</button>` : ''}}
                </div>
            `;
            container.appendChild(card);
        }});

        // Add Listeners to buttons
        document.querySelectorAll('.calc-btn').forEach(btn => {{
            btn.addEventListener('click', (e) => {{
                activePetIndex = parseInt(e.target.getAttribute('data-index'));
                const p = pets[activePetIndex];
                
                if(p.lastDieta) {{
                    document.getElementById('calculator-card').style.display = 'none';
                    document.getElementById('result-container').style.display = 'block';
                    
                    document.getElementById('racion-total').innerText = p.lastDieta.racionTotal + 'g';
                    document.getElementById('racion-calorias').innerText = p.lastDieta.kcalTotales + ' kcal';
                    document.getElementById('racion-comidas').innerText = p.lastDieta.comidas;
                    document.getElementById('racion-recomendacion').innerText = p.lastDieta.recomendacion;
                    document.getElementById('ingredient-list').innerHTML = p.lastDieta.ingredientsHTML;
                    
                    document.getElementById('btn-close-calculator').innerHTML = `<span>◀ Volver al Perfil de ${{p.name}}</span>`;
                    showView(viewCalculator);
                }} else {{
                    document.getElementById('calculator-card').style.display = 'block';
                    document.getElementById('result-container').style.display = 'none';
                    document.getElementById('calc-guest-fields').style.display = 'none';
                    document.getElementById('calc-phys-desc').style.display = 'block';
                    document.getElementById('step-1').style.display = 'block';
                    showView(viewCalculator);
                }}
            }});
        }});

        document.querySelectorAll('.agenda-btn').forEach(btn => {{
            btn.addEventListener('click', (e) => {{
                activePetIndex = parseInt(e.target.getAttribute('data-index'));
                document.getElementById('calendar-pet-name').innerText = pets[activePetIndex].name;
                currentMonth = new Date().getMonth();
                currentYear = new Date().getFullYear();
                renderCalendar();
                showView(viewCalendar);
            }});
        }});

        document.querySelectorAll('.pdf-btn').forEach(btn => {{
            btn.addEventListener('click', async (e) => {{
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                const p = pets[index];
                
                const spinner = e.currentTarget.querySelector('.pdf-spinner');
                spinner.style.display = 'block';
                
                await new Promise(r => setTimeout(r, 1500)); // Simula carga
                generatePDFReport(p);
                spinner.style.display = 'none';
            }});
        }});

        // Hover Effect y Listener para el Avatar
        document.querySelectorAll('.avatar-container').forEach(el => {{
            el.addEventListener('mouseenter', (e) => {{
                e.currentTarget.querySelector('.avatar-overlay').style.opacity = '1';
            }});
            el.addEventListener('mouseleave', (e) => {{
                e.currentTarget.querySelector('.avatar-overlay').style.opacity = '0';
            }});
            el.addEventListener('click', (e) => {{
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                document.getElementById('dashboard-avatar-upload').setAttribute('data-index', idx);
                document.getElementById('dashboard-avatar-upload').click();
            }});
        }});
    }}

    // Lógica para procesar la subida del avatar desde el Dashboard
    document.getElementById('dashboard-avatar-upload').addEventListener('change', (e) => {{
        const file = e.target.files[0];
        const idxStr = e.target.getAttribute('data-index');
        if (file && idxStr !== null) {{
            const idx = parseInt(idxStr);
            const reader = new FileReader();
            reader.onload = (event) => {{
                pets[idx].avatarSrc = event.target.result;
                renderPets(); // Re-render para mostrar la nueva foto inmediatamente
            }};
            reader.readAsDataURL(file);
        }}
    }});

    const form = document.getElementById('barf-form');

    form.addEventListener('submit', (e) => {{
        e.preventDefault();
        
        const formData = new FormData(form);
        const peso = parseFloat(formData.get('peso'));
        const unidadPeso = formData.get('unidad_peso') || 'kg';
        const actividad = formData.get('actividad');
        
        let anos, meses, especie;

        if (activePetIndex === -1) {{
            // Modo Invitado
            const guestEspecieInput = document.querySelector('input[name="guest_especie"]:checked');
            if (!guestEspecieInput) {{
                alert("Por favor selecciona si es perro o gato.");
                return;
            }}
            especie = guestEspecieInput.value;
            anos = parseFloat(formData.get('guest_anos')) || 0;
            meses = parseFloat(formData.get('guest_meses')) || 0;
        }} else {{
            // Perfil Guardado
            const currentPet = pets[activePetIndex];
            if(!currentPet || !currentPet.birthDate) return;

            const now = new Date();
            let currentYears = now.getFullYear() - currentPet.birthDate.getFullYear();
            let currentMonths = now.getMonth() - currentPet.birthDate.getMonth();
            if (currentMonths < 0) {{
                currentYears--;
                currentMonths += 12;
            }}
            anos = currentYears;
            meses = currentMonths;
            especie = currentPet.especie;
        }}
        
        if (anos === 0 && meses === 0) {{
            alert("Por favor, ingresa la edad de tu mascota.");
            return;
        }}
        
        const pesoKg = unidadPeso === 'lbs' ? peso * 0.453592 : peso;
        
        const totalMeses = (anos * 12) + meses;
        let multiplier = 0;
        
        if(especie === 'perro') {{
            if(totalMeses < 12) {{
                if(totalMeses <= 3) multiplier = 0.10;
                else if(totalMeses <= 5) multiplier = 0.08;
                else if(totalMeses <= 8) multiplier = 0.06;
                else multiplier = 0.04;
            }} else if (totalMeses < 84) {{ // Adulto 1-6 años
                if(actividad === 'sedentario') multiplier = 0.015;
                else if(actividad === 'alto') multiplier = 0.035;
                else multiplier = 0.025; // Mantenimiento
            }} else {{ // Senior
                if(actividad === 'alto') multiplier = 0.025;
                else multiplier = 0.02; 
            }}
        }} else {{ // Gato
            if(totalMeses < 12) {{
                if(totalMeses <= 4) multiplier = 0.10;
                else if(totalMeses <= 8) multiplier = 0.06;
                else multiplier = 0.04;
            }} else {{ // Adulto
                if(actividad === 'sedentario') multiplier = 0.02;
                else multiplier = 0.025;
            }}
        }}
        
        const racionTotalGramos = pesoKg * 1000 * multiplier;
        
        let comidas = 2; // Por defecto
        if (totalMeses <= 3) comidas = 4;
        else if (totalMeses <= 6) comidas = 3;
        
        let ratios = [];
        if(especie === 'perro') {{
            ratios = [
                {{name: "Carne Magra", img: "img/icon_meat.png", pct: 0.70}},
                {{name: "Hueso Carnoso", img: "img/icon_bone.png", pct: 0.10}},
                {{name: "Hígado", img: "img/icon_liver.png", pct: 0.05}},
                {{name: "Otros órganos", img: "img/icon_organs.png", pct: 0.05}},
                {{name: "Verduras (Opcional)", img: "img/icon_veggies.png", pct: 0.09, isOptional: true}},
                {{name: "Frutas (Opcional)", img: "img/icon_fruits.png", pct: 0.01, isOptional: true}}
            ];
            document.getElementById('taurina-warning').style.display = 'none';
        }} else {{
            ratios = [
                {{name: "Carne Magra", img: "img/icon_meat.png", pct: 0.80}},
                {{name: "Hueso Carnoso", img: "img/icon_bone.png", pct: 0.10}},
                {{name: "Otros órganos", img: "img/icon_organs.png", pct: 0.06}},
                {{name: "Hígado", img: "img/icon_liver.png", pct: 0.04}}
            ];
            document.getElementById('taurina-warning').style.display = 'block';
        }}
        
        document.getElementById('calculator-card').style.display = 'none';
        document.getElementById('result-container').style.display = 'block';
        document.getElementById('result-container').scrollIntoView({{ behavior: 'smooth' }});
        
        document.getElementById('racion-total').innerText = Math.round(racionTotalGramos) + 'g';
        
        // Cálculo de requerimiento calórico (Fórmula RER y MER - NRC/WSAVA)
        const RER = 70 * Math.pow(pesoKg, 0.75);
        let factorActividadCalorias = 1.6;
        
        if (especie === 'perro') {{
            if (totalMeses < 4) factorActividadCalorias = 3.0;
            else if (totalMeses < 12) factorActividadCalorias = 2.0;
            else if (totalMeses >= 84 || actividad === 'sedentario') factorActividadCalorias = 1.2;
            else if (actividad === 'alto') factorActividadCalorias = 2.0;
            else factorActividadCalorias = 1.6; // Mantenimiento
        }} else {{ // Gato
            if (totalMeses < 12) factorActividadCalorias = 2.5;
            else if (actividad === 'sedentario') factorActividadCalorias = 1.2;
            else if (actividad === 'alto') factorActividadCalorias = 1.6;
            else factorActividadCalorias = 1.4;
        }}

        const kcalTotales = Math.round(RER * factorActividadCalorias);
        document.getElementById('racion-calorias').innerText = kcalTotales + ' kcal';
        document.getElementById('racion-comidas').innerText = comidas;
        document.getElementById('racion-recomendacion').innerText = `${{Math.round(racionTotalGramos / comidas)}}g`;
        
        // Render ingredients
        const list = document.getElementById('ingredient-list');
        list.innerHTML = '';
        
        ratios.forEach(r => {{
            const gramos = Math.round(racionTotalGramos * r.pct);
            const optStyle = r.isOptional ? 'opacity: 0.7;' : '';
            const fillStyle = r.isOptional ? 'background: var(--text-muted);' : '';
            const html = `
                <div class="ingredient-item" style="${{optStyle}}">
                    <div class="ing-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <img src="${{r.img}}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            <span>${{r.name}}</span>
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.8rem;">${{Math.round(r.pct * 100)}}%</span>
                    </div>
                    <div class="ing-grams">${{gramos}}g</div>
                    <div class="ing-bar-bg">
                        <div class="ing-bar-fill" style="width: ${{Math.max(5, r.pct * 100)}}%; ${{fillStyle}}"></div>
                    </div>
                </div>
            `;
            list.innerHTML += html;
        }});

        if (activePetIndex !== -1) {{
            // Actualizar UI del Dashboard con el último peso reportado
            const currentPet = pets[activePetIndex];
            currentPet.lastPeso = peso;
            currentPet.lastUnidadPeso = unidadPeso;
            
            // Guardar Dieta
            currentPet.lastDieta = {{
                racionTotal: Math.round(racionTotalGramos),
                kcalTotales: kcalTotales,
                comidas: comidas,
                recomendacion: `${{Math.round(racionTotalGramos / comidas)}}g`,
                ingredientsHTML: list.innerHTML
            }};

            renderPets();
            document.getElementById('btn-close-calculator').innerHTML = `<span>◀ Volver al Perfil de ${{currentPet.name}}</span>`;
        }} else {{
            document.getElementById('btn-close-calculator').innerHTML = `<span>◀ Volver al Dashboard</span>`;
        }}

    }});

    document.getElementById('btn-recalculate').addEventListener('click', () => {{
        document.getElementById('result-container').style.display = 'none';
        document.getElementById('calculator-card').style.display = 'block';
        if(activePetIndex !== -1) {{
            document.getElementById('calc-guest-fields').style.display = 'none';
            document.getElementById('calc-phys-desc').style.display = 'block';
        }}
    }});

    // ================= LÓGICA DE CALENDARIO =================
    document.getElementById('btn-close-calendar').addEventListener('click', () => {{
        renderPets(); // Refresh text de próximo evento
        showView(viewDashboard);
    }});

    document.getElementById('btn-prev-month').addEventListener('click', () => {{
        currentMonth--;
        if (currentMonth < 0) {{
            currentMonth = 11;
            currentYear--;
        }}
        renderCalendar();
    }});

    document.getElementById('btn-next-month').addEventListener('click', () => {{
        currentMonth++;
        if (currentMonth > 11) {{
            currentMonth = 0;
            currentYear++;
        }}
        renderCalendar();
    }});

    function renderCalendar() {{
        const grid = document.getElementById('calendar-grid');
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        document.getElementById('calendar-month-year').innerText = `${{monthNames[currentMonth]}} ${{currentYear}}`;
        
        // Remove old day cells (keep first 7 which are day headers)
        while(grid.children.length > 7) {{
            grid.removeChild(grid.lastChild);
        }}

        const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Dom) - 6 (Sab)
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Ajustar Lunes como primer día de la semana (1 (Lun) - 0(Dom))
        let startPadding = firstDay === 0 ? 6 : firstDay - 1;

        // Celdas vacías iniciales
        for (let i = 0; i < startPadding; i++) {{
            const cell = document.createElement('div');
            grid.appendChild(cell);
        }}

        const currentPet = pets[activePetIndex];
        const today = new Date();
        today.setHours(0,0,0,0);

        for (let day = 1; day <= daysInMonth; day++) {{
            const cell = document.createElement('div');
            const cellDate = new Date(currentYear, currentMonth, day);
            cellDate.setHours(0,0,0,0);
            
            // Buscar evento para este día exacto
            let dayEvent = null;
            if(currentPet && currentPet.events) {{
                dayEvent = currentPet.events.find(e => {{
                    const eDate = new Date(e.date);
                    eDate.setHours(0,0,0,0);
                    return eDate.getTime() === cellDate.getTime();
                }});
            }}

            const isToday = cellDate.getTime() === today.getTime();

            cell.style.padding = "1rem 0.5rem";
            cell.style.borderRadius = "12px";
            cell.style.cursor = "pointer";
            cell.style.position = "relative";
            cell.style.transition = "background 0.2s";
            
            if (isToday) {{
                cell.style.background = "rgba(255,255,255,0.1)";
                cell.style.fontWeight = "bold";
            }} else {{
                cell.style.background = "rgba(15, 23, 42, 0.4)";
            }}

            cell.addEventListener('mouseenter', () => cell.style.background = "rgba(255,255,255,0.15)");
            cell.addEventListener('mouseleave', () => {{
                cell.style.background = isToday ? "rgba(255,255,255,0.1)" : "rgba(15, 23, 42, 0.4)";
            }});

            cell.innerText = day;

            // Si hay evento, dibujar punto debajo
            if (dayEvent) {{
                const dot = document.createElement('div');
                dot.style.width = "6px";
                dot.style.height = "6px";
                dot.style.background = "var(--brand-green)";
                dot.style.borderRadius = "50%";
                dot.style.position = "absolute";
                dot.style.bottom = "8px";
                dot.style.left = "50%";
                dot.style.transform = "translateX(-50%)";
                dot.style.boxShadow = "0 0 8px var(--brand-green)";
                cell.appendChild(dot);
            }}

            // Click -> Open Modal
            cell.addEventListener('click', () => openEventModal(cellDate, dayEvent));
            grid.appendChild(cell);
        }}
    }}

    const modal = document.getElementById('event-modal');
    const modalContent = document.getElementById('event-modal-content');
    
    function openEventModal(dateObj, existingEvent) {{
        selectedDateForEvent = dateObj;
        
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        document.getElementById('event-modal-date-title').innerText = `${{dateObj.getDate()}} de ${{monthNames[dateObj.getMonth()]}}`;
        
        const existingDiv = document.getElementById('event-modal-existing');
        const titleInput = document.getElementById('new-event-title');
        
        if (existingEvent) {{
            existingDiv.innerHTML = `📌 Toca hoy: <br><span style="color:white; font-size:1.3rem;">${{existingEvent.title}}</span>`;
            existingDiv.style.display = 'block';
            titleInput.placeholder = "Reemplazar evento actual...";
            titleInput.value = "";
            titleInput.required = false; // No obligatorio si ya hay uno y solo quieren ver
        }} else {{
            existingDiv.style.display = 'none';
            titleInput.placeholder = "Ej: Vacuna, Paseo al parque...";
            titleInput.value = "";
            titleInput.required = true;
        }}

        modal.style.display = 'flex';
        // Animación pequeña delay
        setTimeout(() => {{
            modalContent.style.transform = 'scale(1)';
            modalContent.style.opacity = '1';
        }}, 10);
    }}

    function closeEventModal() {{
        modalContent.style.transform = 'scale(0.9)';
        modalContent.style.opacity = '0';
        setTimeout(() => {{
            modal.style.display = 'none';
        }}, 300);
    }}

    document.getElementById('btn-close-modal').addEventListener('click', closeEventModal);
    
    document.getElementById('add-event-form').addEventListener('submit', (e) => {{
        e.preventDefault();
        const title = document.getElementById('new-event-title').value.trim();
        
        if (title !== "") {{
            const currentPet = pets[activePetIndex];
            
            // Filtrar evento existente ese dia (sobreescribir)
            currentPet.events = currentPet.events.filter(ev => {{
                const eDate = new Date(ev.date);
                eDate.setHours(0,0,0,0);
                return eDate.getTime() !== selectedDateForEvent.getTime();
            }});

            // Añadir nuevo
            currentPet.events.push({{
                id: Date.now(),
                title: title,
                date: selectedDateForEvent.toISOString()
            }});
            
            renderCalendar();
        }}
        closeEventModal();
    }});

}});
"""

    with open('frontend/index.html', 'w', encoding='utf-8') as f: f.write(html_content)
    with open('frontend/styles.css', 'w', encoding='utf-8') as f: f.write(css_content)
    with open('frontend/app.js', 'w', encoding='utf-8') as f: f.write(js_content)
    
    print("Frontend generado y mejorado exitosamente.")

if __name__ == "__main__":
    build_frontend()
