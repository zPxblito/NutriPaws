document.addEventListener('DOMContentLoaded', () => {
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
    let currentUser = null;

    async function loadPetsFromFirestore() {
        if (!currentUser || !window.firebaseAuth) return;
        try {
            const querySnapshot = await window.firebaseAuth.getDocs(
                window.firebaseAuth.collection(window.firebaseAuth.db, `users/${currentUser.uid}/pets`)
            );
            pets = [];
            querySnapshot.forEach((doc) => {
                pets.push(doc.data());
            });
            if (pets.length > 0) activePetIndex = 0;
            else activePetIndex = -1;
            renderPets();
            updatePetSelectors(); // Refrescar los selectores de IA
        } catch (error) {
            console.error("Error loading pets:", error);
        }
    }

    async function savePetToFirestore(pet) {
        if (!currentUser || !window.firebaseAuth) return;
        try {
            const petRef = window.firebaseAuth.doc(window.firebaseAuth.db, `users/${currentUser.uid}/pets`, pet.id.toString());
            await window.firebaseAuth.setDoc(petRef, pet);
        } catch (error) {
            console.error("Error saving pet:", error);
        }
    }

    async function saveData() {
        // Función general que guarda la mascota activa actual si hubo algún cambio
        if (activePetIndex !== -1 && pets[activePetIndex]) {
            await savePetToFirestore(pets[activePetIndex]);
        }
    }

    function updatePetSelectors() {
        const medicalSelect = document.getElementById('medical-pet-select');
        const skinSelect = document.getElementById('skin-pet-select');
        
        if (medicalSelect && skinSelect) {
            medicalSelect.innerHTML = '';
            skinSelect.innerHTML = '';
            
            pets.forEach((pet, index) => {
                const opt1 = document.createElement('option');
                opt1.value = index;
                opt1.textContent = pet.name;
                medicalSelect.appendChild(opt1);
                
                const opt2 = document.createElement('option');
                opt2.value = index;
                opt2.textContent = pet.name;
                skinSelect.appendChild(opt2);
            });

            if (activePetIndex !== -1) {
                medicalSelect.value = activePetIndex;
                skinSelect.value = activePetIndex;
                renderCalendarEvents(activePetIndex);
            }
        }
    }

    // Escuchar el cambio en el selector de mascotas para el calendario
    const medSelectGlobal = document.getElementById('medical-pet-select');
    if (medSelectGlobal) {
        medSelectGlobal.addEventListener('change', (e) => {
            renderCalendarEvents(parseInt(e.target.value));
        });
    }

    // Escuchar el estado de Firebase Auth para persistencia automática
    // Utilizamos setTimeout leve para asegurar que firebaseAuth se inyectó
    setTimeout(() => {
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged(window.firebaseAuth.auth, async (user) => {
                if (user) {
                    currentUser = user;
                    const displayName = user.displayName || user.email.split('@')[0];
                    document.getElementById('user-name-display').innerText = displayName;
                    showView(viewDashboard);
                    await loadPetsFromFirestore();
                } else {
                    currentUser = null;
                    pets = [];
                    activePetIndex = -1;
                    renderPets();
                    updatePetSelectors();
                    showView(viewLogin);
                }
            });
        }
    }, 50);
    
    // Múltiples puntitos verdes que persiguen el cursor
    const numDots = 5;
    const dots = [];
    for (let i = 0; i < numDots; i++) {
        const dot = document.createElement('div');
        dot.className = 'cursor-trail-dot';
        // Reducimos la opacidad en cada punto para un efecto de estela
        dot.style.opacity = 1 - (i * 0.15);
        // Hacemos que cada punto sea un poco más pequeño
        const size = 6 - i;
        dot.style.width = size + 'px';
        dot.style.height = size + 'px';
        // Añadimos un delay diferente a la transición de cada punto
        dot.style.transition = `left ${0.05 + i * 0.05}s linear, top ${0.05 + i * 0.05}s linear, transform 0.1s ease`;
        document.body.appendChild(dot);
        dots.push(dot);
    }

    document.addEventListener('mousemove', (e) => {
        dots.forEach((dot) => {
            dot.style.left = e.clientX + 'px';
            dot.style.top = e.clientY + 'px';
        });
    });

    // Añadir clase al body cuando se hace hover sobre elementos clickeables
    const clickableElements = document.querySelectorAll('button, a, select, input[type="file"], .card-content');
    clickableElements.forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
    
    // Y observar el DOM para nuevos elementos clickeables (como los botones que se crean dinámicamente)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        const newClickables = node.querySelectorAll ? node.querySelectorAll('button, a, select, .card-content') : [];
                        newClickables.forEach(el => {
                            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
                            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
                        });
                    }
                });
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function showView(view) {
        viewLogin.style.display = 'none';
        viewDashboard.style.display = 'none';
        viewCreatePet.style.display = 'none';
        viewCalculator.style.display = 'none';
        viewCalendar.style.display = 'none';
        view.style.display = 'block';
        
        const footer = document.getElementById('main-footer');
        if (footer) {
            footer.style.display = view === viewLogin ? 'none' : 'flex';
        }
        
        if(view === viewDashboard || view === viewCalculator) {
            menuContainer.style.display = 'block';
        } else {
            menuContainer.style.display = 'none';
        }
    }

    // Toggle Menu
    document.getElementById('menu-trigger').addEventListener('click', () => {
        dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
    });

    // Edit Name
    document.getElementById('edit-name-btn').addEventListener('click', () => {
        const newName = prompt("¿Cómo te gustaría que te llamemos?");
        if(newName && newName.trim() !== "") {
            document.getElementById('user-name-display').innerText = newName.trim();
        }
    });

    // Navigation
    document.getElementById('btn-goto-create-pet').addEventListener('click', () => {
        document.getElementById('create-pet-form').reset();
        document.getElementById('pet-avatar-img').style.display = 'none';
        document.getElementById('pet-avatar-placeholder').style.display = 'flex';
        tempAvatarSrc = "";
        showView(viewCreatePet);
    });
    
    document.getElementById('btn-back-from-create').addEventListener('click', () => {
        showView(viewDashboard);
    });

    // Avatar Upload Logic
    document.getElementById('pet-avatar-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target.result;
                document.getElementById('pet-avatar-img').src = src;
                document.getElementById('pet-avatar-img').style.display = 'block';
                document.getElementById('pet-avatar-placeholder').style.display = 'none';
                tempAvatarSrc = src;
            };
            reader.readAsDataURL(file);
        }
    });

    // Funciones Helper de Auth
    const showLoadingLogin = () => {
        document.getElementById('login-form').querySelector('button[type="submit"]').innerText = 'Cargando...';
    };
    const hideLoadingLogin = () => {
        document.getElementById('login-form').querySelector('button[type="submit"]').innerText = 'Iniciar Sesión';
    };

    // Google Login
    document.getElementById('btn-login-google').addEventListener('click', async () => {
        if (!window.firebaseAuth) return alert("Cargando servicios de Auth... espera un segundo.");
        try {
            const result = await window.firebaseAuth.signInWithPopup(window.firebaseAuth.auth, window.firebaseAuth.googleProvider);
            document.getElementById('user-name-display').innerText = result.user.displayName || result.user.email.split('@')[0];
            showView(viewDashboard);
        } catch (error) {
            console.error("Error Google Login:", error);
            alert("Error al iniciar sesión con Google: " + error.message);
        }
    });

    let isRegisterMode = false;
    
    // Toggle Login/Register Mode
    document.getElementById('toggle-auth-mode').addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const btnSubmit = document.getElementById('btn-submit-email');
        const toggleLink = document.getElementById('toggle-auth-mode');
        
        if (isRegisterMode) {
            title.innerText = "Crea tu Cuenta";
            subtitle.innerText = "Únete a NutriPaws y cuida a tu mascota";
            btnSubmit.innerText = "Registrarse";
            toggleLink.innerText = "¿Ya tienes cuenta? Inicia Sesión";
        } else {
            title.innerText = "Bienvenido a NutriPaws";
            subtitle.innerText = "Inicia sesión para gestionar el perfil de tu mascota";
            btnSubmit.innerText = "Iniciar Sesión";
            toggleLink.innerText = "¿No tienes cuenta? Regístrate";
        }
    });

    // Login / Register Form Handler
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!window.firebaseAuth) return alert("Cargando servicios de Auth... espera un segundo.");
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btnSubmit = document.getElementById('btn-submit-email');
        const originalText = btnSubmit.innerText;
        
        btnSubmit.innerText = 'Cargando...';
        btnSubmit.disabled = true;
        
        try {
            let result;
            if (isRegisterMode) {
                // Modo Registro
                result = await window.firebaseAuth.createUserWithEmailAndPassword(window.firebaseAuth.auth, email, password);
                alert("¡Cuenta creada exitosamente!");
            } else {
                // Modo Login
                result = await window.firebaseAuth.signInWithEmailAndPassword(window.firebaseAuth.auth, email, password);
            }
            
            document.getElementById('user-name-display').innerText = result.user.displayName || email.split('@')[0];
            showView(viewDashboard);
            document.getElementById('login-form').reset();
        } catch(error) {
            console.error("Auth Error:", error);
            // Traducir algunos errores comunes de Firebase
            let errorMsg = "Ocurrió un error. Verifica tus datos.";
            if (error.code === 'auth/email-already-in-use') errorMsg = "Este correo ya está registrado. Por favor, inicia sesión.";
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') errorMsg = "Correo o contraseña incorrectos.";
            if (error.code === 'auth/weak-password') errorMsg = "La contraseña es muy débil. Usa al menos 6 caracteres.";
            alert(errorMsg);
        } finally {
            btnSubmit.innerText = originalText;
            btnSubmit.disabled = false;
        }
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        dropdownMenu.style.display = 'none';
        showView(viewLogin);
    });

    // La apertura de calculadora ahora se hace desde renderPets()

    // Calculadora Rápida (Invitado)
    document.getElementById('btn-quick-calc').addEventListener('click', () => {
        activePetIndex = -1;
        document.getElementById('calc-guest-fields').style.display = 'block';
        document.getElementById('calc-phys-desc').style.display = 'none';
        document.getElementById('step-1').style.display = 'block';
        showView(viewCalculator);
    });

    document.getElementById('btn-close-calculator').addEventListener('click', () => {
        showView(viewDashboard);
    });
    
    // Helpers de visualización de eventos
    function renderMedicalEvent(evento) {
        const calendar = document.getElementById('calendar-events');
        if(calendar.innerHTML.includes('No hay citas')) calendar.innerHTML = '';
        
        const typeOrTitle = evento.event_type || evento.title || 'Evento';
        const desc = evento.description || '';
        const scheduled = evento.scheduled_date || evento.date ? new Date(evento.scheduled_date || evento.date).toISOString().split('T')[0] : 'Sin fecha';
        
        calendar.innerHTML += `
            <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--brand-green); font-size: 1.1rem;">${typeOrTitle}</strong>
                    ${desc ? `<div style="font-size: 0.95rem; color: var(--text-muted); margin-top: 4px;">${desc}</div>` : ''}
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.85rem; background: rgba(0,0,0,0.5); padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: bold;">📅 ${scheduled}</span>
                </div>
            </div>
        `;
    }

    function renderCalendarEvents(petIndex) {
        const calendar = document.getElementById('calendar-events');
        calendar.innerHTML = ''; // Limpiar eventos anteriores
        
        const pet = pets[petIndex];
        if (!pet || !pet.events || pet.events.length === 0) {
            calendar.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No hay citas agendadas.</p>';
            return;
        }

        // Renderizar todos los eventos de la mascota seleccionada
        pet.events.forEach(evt => renderMedicalEvent(evt));
    }

    async function processMedicalEvents(eventosArr) {
        const medSelect = document.getElementById('medical-pet-select');
        const selectedIdx = medSelect ? parseInt(medSelect.value) : activePetIndex;

        if (!isNaN(selectedIdx) && selectedIdx !== -1 && pets[selectedIdx]) {
            const pet = pets[selectedIdx];
            if (!pet.events) pet.events = [];
            
            eventosArr.forEach(evt => {
                pet.events.push(evt);
                renderMedicalEvent(evt);
            });
            await savePetToFirestore(pet); // Guardado en DB
            renderPets(); // Actualizar las tarjetas para mostrar el nuevo Próximo Evento
        }
    }

    // Procesar texto médico
    document.getElementById('medical-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('medical-notes').value;
        if(!text) return;
        
        const btn = document.getElementById('btn-process-medical');
        const oldText = btn.innerText;
        btn.innerText = "Analizando...";
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/process_medical_record', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({text: text})
            });
            
            if(!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Error en servidor");
            }
            
            const data = await res.json();
            const eventosArr = Array.isArray(data) ? data : [data]; // Compatible con single object u array
            await processMedicalEvents(eventosArr);
            
            document.getElementById('medical-notes').value = '';
        } catch(err) {
            console.error(err);
            alert(err.message || "Error al contactar con la IA para agendar.");
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });

    // Subir y procesar documento médico
    const btnUploadMed = document.getElementById('btn-upload-medical-doc');
    const inputMedDoc = document.getElementById('medical-doc-input');

    if (btnUploadMed && inputMedDoc) {
        btnUploadMed.addEventListener('click', () => {
            inputMedDoc.click();
        });

        inputMedDoc.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const oldText = btnUploadMed.innerHTML;
            btnUploadMed.innerHTML = "Subiendo...";
            btnUploadMed.disabled = true;

            const formData = new FormData();
            formData.append('document', file);

            try {
                const res = await fetch('/api/analyze_document', {
                    method: 'POST',
                    body: formData
                });
                
                if(!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Error en servidor al procesar documento");
                }
                
                const data = await res.json();
                const eventosArr = Array.isArray(data) ? data : [data];
                await processMedicalEvents(eventosArr);
                
                alert("¡Documento procesado! Eventos agregados a la agenda.");
            } catch(err) {
                console.error(err);
                alert(err.message || "Error al procesar el documento con la IA.");
            } finally {
                btnUploadMed.innerHTML = oldText;
                btnUploadMed.disabled = false;
                inputMedDoc.value = ''; // Reset
            }
        });
    }

    // SkinGuard Image Upload
    const sgInput = document.getElementById('skinguard-input');
    if (sgInput) {
        sgInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const uploadContent = document.getElementById('skinguard-upload-content');
            const loadingUI = document.getElementById('skinguard-loading');
            const resultsDiv = document.getElementById('skinguard-results');

            uploadContent.style.display = 'none';
            loadingUI.style.display = 'flex';
            resultsDiv.style.display = 'none';

            const formData = new FormData();
            formData.append('image', file);

            try {
                // Hacer POST al backend
                const res = await fetch('/api/skinguard/analyze', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await res.json();
                
                if (data.error) {
                    alert("Error de la IA: " + data.error);
                } else {
                    // Populate UI
                    document.getElementById('sg-res-diag').innerText = data.diagnostico_presuntivo || 'N/A';
                    document.getElementById('sg-res-prob').innerText = data.probabilidad || 'N/A';
                    
                    const urgEl = document.getElementById('sg-res-urg');
                    urgEl.innerText = data.urgencia || 'N/A';
                    if (data.urgencia === 'ALTA') urgEl.style.color = '#ef4444';
                    else if (data.urgencia === 'MEDIA') urgEl.style.color = '#f59e0b';
                    else urgEl.style.color = '#10b981';

                    document.getElementById('sg-res-exp').innerText = data.explicacion || 'N/A';
                    
                    const firstAidList = document.getElementById('sg-res-aid');
                    firstAidList.innerHTML = '';
                    if (data.primeros_auxilios && Array.isArray(data.primeros_auxilios)) {
                        data.primeros_auxilios.forEach(paso => {
                            const li = document.createElement('li');
                            li.innerText = paso;
                            li.style.marginBottom = '0.5rem';
                            firstAidList.appendChild(li);
                        });
                    }

                    resultsDiv.style.display = 'block';

                    // Guardar historial dermatológico
                    const skinSelect = document.getElementById('skin-pet-select');
                    const selectedIdx = skinSelect ? parseInt(skinSelect.value) : activePetIndex;
                    
                    if (!isNaN(selectedIdx) && selectedIdx !== -1 && pets[selectedIdx]) {
                        const cp = pets[selectedIdx];
                        if (!cp.skinHistory) cp.skinHistory = [];
                        cp.skinHistory.push({
                            diagnostico: data.diagnostico_presuntivo,
                            probabilidad: data.probabilidad,
                            urgencia: data.urgencia,
                            explicacion: data.explicacion,
                            date: new Date().toISOString()
                        });
                        await savePetToFirestore(cp); // Guardar persistentemente
                    }
                }
            } catch (err) {
                console.error("Error al contactar IA:", err);
                alert("Ocurrió un error de red al contactar con la API de Gemini.");
            } finally {
                loadingUI.style.display = 'none';
                uploadContent.style.display = 'block';
                sgInput.value = ''; // Reset input
            }
        });
    }

    // --- FIN LÓGICA DE VISTAS ---

    const themeBtnMenu = document.getElementById('theme-btn-menu');
    const htmlObj = document.documentElement;
    let isDark = true;
    themeBtnMenu.innerText = '☀️ Cambiar Tema';
    
    themeBtnMenu.addEventListener('click', () => {
        isDark = !isDark;
        if(isDark) {
            htmlObj.setAttribute('data-theme', 'dark');
            themeBtnMenu.innerText = '☀️ Cambiar Tema';
        } else {
            htmlObj.setAttribute('data-theme', 'light');
            themeBtnMenu.innerText = '🌙 Cambiar Tema';
        }
        dropdownMenu.style.display = 'none';
    });

    const dbRazas = {
    "perros": [
        {
            "id": "criollo",
            "name": "Criollo / Mestizo"
        },
        {
            "id": "affenpinscher",
            "name": "Affenpinscher"
        },
        {
            "id": "african-wild",
            "name": "Wild African"
        },
        {
            "id": "airedale",
            "name": "Airedale"
        },
        {
            "id": "akita",
            "name": "Akita"
        },
        {
            "id": "appenzeller",
            "name": "Appenzeller"
        },
        {
            "id": "australian-kelpie",
            "name": "Kelpie Australian"
        },
        {
            "id": "australian-shepherd",
            "name": "Shepherd Australian"
        },
        {
            "id": "bakharwal-indian",
            "name": "Indian Bakharwal"
        },
        {
            "id": "basenji",
            "name": "Basenji"
        },
        {
            "id": "beagle",
            "name": "Beagle"
        },
        {
            "id": "bluetick",
            "name": "Bluetick"
        },
        {
            "id": "borzoi",
            "name": "Borzoi"
        },
        {
            "id": "bouvier",
            "name": "Bouvier"
        },
        {
            "id": "boxer",
            "name": "Boxer"
        },
        {
            "id": "brabancon",
            "name": "Brabancon"
        },
        {
            "id": "briard",
            "name": "Briard"
        },
        {
            "id": "buhund-norwegian",
            "name": "Norwegian Buhund"
        },
        {
            "id": "bulldog-boston",
            "name": "Boston Bulldog"
        },
        {
            "id": "bulldog-english",
            "name": "English Bulldog"
        },
        {
            "id": "bulldog-french",
            "name": "French Bulldog"
        },
        {
            "id": "bullterrier-staffordshire",
            "name": "Staffordshire Bullterrier"
        },
        {
            "id": "cattledog-australian",
            "name": "Australian Cattledog"
        },
        {
            "id": "cavapoo",
            "name": "Cavapoo"
        },
        {
            "id": "chihuahua",
            "name": "Chihuahua"
        },
        {
            "id": "chippiparai-indian",
            "name": "Indian Chippiparai"
        },
        {
            "id": "chow",
            "name": "Chow"
        },
        {
            "id": "clumber",
            "name": "Clumber"
        },
        {
            "id": "cockapoo",
            "name": "Cockapoo"
        },
        {
            "id": "collie-border",
            "name": "Border Collie"
        },
        {
            "id": "coonhound",
            "name": "Coonhound"
        },
        {
            "id": "corgi-cardigan",
            "name": "Cardigan Corgi"
        },
        {
            "id": "cotondetulear",
            "name": "Cotondetulear"
        },
        {
            "id": "dachshund",
            "name": "Dachshund"
        },
        {
            "id": "dalmatian",
            "name": "Dalmatian"
        },
        {
            "id": "dane-great",
            "name": "Great Dane"
        },
        {
            "id": "danish-swedish",
            "name": "Swedish Danish"
        },
        {
            "id": "deerhound-scottish",
            "name": "Scottish Deerhound"
        },
        {
            "id": "dhole",
            "name": "Dhole"
        },
        {
            "id": "dingo",
            "name": "Dingo"
        },
        {
            "id": "doberman",
            "name": "Doberman"
        },
        {
            "id": "elkhound-norwegian",
            "name": "Norwegian Elkhound"
        },
        {
            "id": "entlebucher",
            "name": "Entlebucher"
        },
        {
            "id": "eskimo",
            "name": "Eskimo"
        },
        {
            "id": "finnish-lapphund",
            "name": "Lapphund Finnish"
        },
        {
            "id": "frise-bichon",
            "name": "Bichon Frise"
        },
        {
            "id": "gaddi-indian",
            "name": "Indian Gaddi"
        },
        {
            "id": "german-shepherd",
            "name": "Shepherd German"
        },
        {
            "id": "greyhound-indian",
            "name": "Indian Greyhound"
        },
        {
            "id": "greyhound-italian",
            "name": "Italian Greyhound"
        },
        {
            "id": "groenendael",
            "name": "Groenendael"
        },
        {
            "id": "havanese",
            "name": "Havanese"
        },
        {
            "id": "hound-afghan",
            "name": "Afghan Hound"
        },
        {
            "id": "hound-basset",
            "name": "Basset Hound"
        },
        {
            "id": "hound-blood",
            "name": "Blood Hound"
        },
        {
            "id": "hound-english",
            "name": "English Hound"
        },
        {
            "id": "hound-ibizan",
            "name": "Ibizan Hound"
        },
        {
            "id": "hound-plott",
            "name": "Plott Hound"
        },
        {
            "id": "hound-walker",
            "name": "Walker Hound"
        },
        {
            "id": "husky",
            "name": "Husky"
        },
        {
            "id": "keeshond",
            "name": "Keeshond"
        },
        {
            "id": "kelpie",
            "name": "Kelpie"
        },
        {
            "id": "kombai",
            "name": "Kombai"
        },
        {
            "id": "komondor",
            "name": "Komondor"
        },
        {
            "id": "kuvasz",
            "name": "Kuvasz"
        },
        {
            "id": "labradoodle",
            "name": "Labradoodle"
        },
        {
            "id": "labrador",
            "name": "Labrador"
        },
        {
            "id": "leonberg",
            "name": "Leonberg"
        },
        {
            "id": "lhasa",
            "name": "Lhasa"
        },
        {
            "id": "malamute",
            "name": "Malamute"
        },
        {
            "id": "malinois",
            "name": "Malinois"
        },
        {
            "id": "maltese",
            "name": "Maltese"
        },
        {
            "id": "mastiff-bull",
            "name": "Bull Mastiff"
        },
        {
            "id": "mastiff-english",
            "name": "English Mastiff"
        },
        {
            "id": "mastiff-indian",
            "name": "Indian Mastiff"
        },
        {
            "id": "mastiff-tibetan",
            "name": "Tibetan Mastiff"
        },
        {
            "id": "mexicanhairless",
            "name": "Mexicanhairless"
        },
        {
            "id": "mix",
            "name": "Mix"
        },
        {
            "id": "mountain-bernese",
            "name": "Bernese Mountain"
        },
        {
            "id": "mountain-swiss",
            "name": "Swiss Mountain"
        },
        {
            "id": "mudhol-indian",
            "name": "Indian Mudhol"
        },
        {
            "id": "newfoundland",
            "name": "Newfoundland"
        },
        {
            "id": "otterhound",
            "name": "Otterhound"
        },
        {
            "id": "ovcharka-caucasian",
            "name": "Caucasian Ovcharka"
        },
        {
            "id": "papillon",
            "name": "Papillon"
        },
        {
            "id": "pariah-indian",
            "name": "Indian Pariah"
        },
        {
            "id": "pekinese",
            "name": "Pekinese"
        },
        {
            "id": "pembroke",
            "name": "Pembroke"
        },
        {
            "id": "pinscher-miniature",
            "name": "Miniature Pinscher"
        },
        {
            "id": "pitbull",
            "name": "Pitbull"
        },
        {
            "id": "pointer-german",
            "name": "German Pointer"
        },
        {
            "id": "pointer-germanlonghair",
            "name": "Germanlonghair Pointer"
        },
        {
            "id": "pomeranian",
            "name": "Pomeranian"
        },
        {
            "id": "poodle-medium",
            "name": "Medium Poodle"
        },
        {
            "id": "poodle-miniature",
            "name": "Miniature Poodle"
        },
        {
            "id": "poodle-standard",
            "name": "Standard Poodle"
        },
        {
            "id": "poodle-toy",
            "name": "Toy Poodle"
        },
        {
            "id": "pug",
            "name": "Pug"
        },
        {
            "id": "puggle",
            "name": "Puggle"
        },
        {
            "id": "pyrenees",
            "name": "Pyrenees"
        },
        {
            "id": "rajapalayam-indian",
            "name": "Indian Rajapalayam"
        },
        {
            "id": "redbone",
            "name": "Redbone"
        },
        {
            "id": "retriever-chesapeake",
            "name": "Chesapeake Retriever"
        },
        {
            "id": "retriever-curly",
            "name": "Curly Retriever"
        },
        {
            "id": "retriever-flatcoated",
            "name": "Flatcoated Retriever"
        },
        {
            "id": "retriever-golden",
            "name": "Golden Retriever"
        },
        {
            "id": "ridgeback-rhodesian",
            "name": "Rhodesian Ridgeback"
        },
        {
            "id": "rottweiler",
            "name": "Rottweiler"
        },
        {
            "id": "rough-collie",
            "name": "Collie Rough"
        },
        {
            "id": "saluki",
            "name": "Saluki"
        },
        {
            "id": "samoyed",
            "name": "Samoyed"
        },
        {
            "id": "schipperke",
            "name": "Schipperke"
        },
        {
            "id": "schnauzer-giant",
            "name": "Giant Schnauzer"
        },
        {
            "id": "schnauzer-miniature",
            "name": "Miniature Schnauzer"
        },
        {
            "id": "segugio-italian",
            "name": "Italian Segugio"
        },
        {
            "id": "setter-english",
            "name": "English Setter"
        },
        {
            "id": "setter-gordon",
            "name": "Gordon Setter"
        },
        {
            "id": "setter-irish",
            "name": "Irish Setter"
        },
        {
            "id": "sharpei",
            "name": "Sharpei"
        },
        {
            "id": "sheepdog-english",
            "name": "English Sheepdog"
        },
        {
            "id": "sheepdog-indian",
            "name": "Indian Sheepdog"
        },
        {
            "id": "sheepdog-shetland",
            "name": "Shetland Sheepdog"
        },
        {
            "id": "shiba",
            "name": "Shiba"
        },
        {
            "id": "shihtzu",
            "name": "Shihtzu"
        },
        {
            "id": "spaniel-blenheim",
            "name": "Blenheim Spaniel"
        },
        {
            "id": "spaniel-brittany",
            "name": "Brittany Spaniel"
        },
        {
            "id": "spaniel-cocker",
            "name": "Cocker Spaniel"
        },
        {
            "id": "spaniel-irish",
            "name": "Irish Spaniel"
        },
        {
            "id": "spaniel-japanese",
            "name": "Japanese Spaniel"
        },
        {
            "id": "spaniel-sussex",
            "name": "Sussex Spaniel"
        },
        {
            "id": "spaniel-welsh",
            "name": "Welsh Spaniel"
        },
        {
            "id": "spitz-indian",
            "name": "Indian Spitz"
        },
        {
            "id": "spitz-japanese",
            "name": "Japanese Spitz"
        },
        {
            "id": "springer-english",
            "name": "English Springer"
        },
        {
            "id": "stbernard",
            "name": "Stbernard"
        },
        {
            "id": "terrier-american",
            "name": "American Terrier"
        },
        {
            "id": "terrier-andalusian",
            "name": "Andalusian Terrier"
        },
        {
            "id": "terrier-australian",
            "name": "Australian Terrier"
        },
        {
            "id": "terrier-bedlington",
            "name": "Bedlington Terrier"
        },
        {
            "id": "terrier-border",
            "name": "Border Terrier"
        },
        {
            "id": "terrier-boston",
            "name": "Boston Terrier"
        },
        {
            "id": "terrier-cairn",
            "name": "Cairn Terrier"
        },
        {
            "id": "terrier-dandie",
            "name": "Dandie Terrier"
        },
        {
            "id": "terrier-fox",
            "name": "Fox Terrier"
        },
        {
            "id": "terrier-irish",
            "name": "Irish Terrier"
        },
        {
            "id": "terrier-kerryblue",
            "name": "Kerryblue Terrier"
        },
        {
            "id": "terrier-lakeland",
            "name": "Lakeland Terrier"
        },
        {
            "id": "terrier-norfolk",
            "name": "Norfolk Terrier"
        },
        {
            "id": "terrier-norwich",
            "name": "Norwich Terrier"
        },
        {
            "id": "terrier-patterdale",
            "name": "Patterdale Terrier"
        },
        {
            "id": "terrier-russell",
            "name": "Russell Terrier"
        },
        {
            "id": "terrier-scottish",
            "name": "Scottish Terrier"
        },
        {
            "id": "terrier-sealyham",
            "name": "Sealyham Terrier"
        },
        {
            "id": "terrier-silky",
            "name": "Silky Terrier"
        },
        {
            "id": "terrier-tibetan",
            "name": "Tibetan Terrier"
        },
        {
            "id": "terrier-toy",
            "name": "Toy Terrier"
        },
        {
            "id": "terrier-welsh",
            "name": "Welsh Terrier"
        },
        {
            "id": "terrier-westhighland",
            "name": "Westhighland Terrier"
        },
        {
            "id": "terrier-wheaten",
            "name": "Wheaten Terrier"
        },
        {
            "id": "terrier-yorkshire",
            "name": "Yorkshire Terrier"
        },
        {
            "id": "tervuren",
            "name": "Tervuren"
        },
        {
            "id": "vizsla",
            "name": "Vizsla"
        },
        {
            "id": "waterdog-spanish",
            "name": "Spanish Waterdog"
        },
        {
            "id": "weimaraner",
            "name": "Weimaraner"
        },
        {
            "id": "whippet",
            "name": "Whippet"
        },
        {
            "id": "wolfhound-irish",
            "name": "Irish Wolfhound"
        }
    ],
    "gatos": [
        {
            "id": "criollo",
            "name": "Criollo / Mestizo"
        },
        {
            "id": "abys",
            "name": "Abyssinian"
        },
        {
            "id": "aege",
            "name": "Aegean"
        },
        {
            "id": "abob",
            "name": "American Bobtail"
        },
        {
            "id": "acur",
            "name": "American Curl"
        },
        {
            "id": "asho",
            "name": "American Shorthair"
        },
        {
            "id": "awir",
            "name": "American Wirehair"
        },
        {
            "id": "amau",
            "name": "Arabian Mau"
        },
        {
            "id": "amis",
            "name": "Australian Mist"
        },
        {
            "id": "bali",
            "name": "Balinese"
        },
        {
            "id": "bamb",
            "name": "Bambino"
        },
        {
            "id": "beng",
            "name": "Bengal"
        },
        {
            "id": "birm",
            "name": "Birman"
        },
        {
            "id": "bomb",
            "name": "Bombay"
        },
        {
            "id": "bslo",
            "name": "British Longhair"
        },
        {
            "id": "bsho",
            "name": "British Shorthair"
        },
        {
            "id": "bure",
            "name": "Burmese"
        },
        {
            "id": "buri",
            "name": "Burmilla"
        },
        {
            "id": "cspa",
            "name": "California Spangled"
        },
        {
            "id": "ctif",
            "name": "Chantilly-Tiffany"
        },
        {
            "id": "char",
            "name": "Chartreux"
        },
        {
            "id": "chau",
            "name": "Chausie"
        },
        {
            "id": "chee",
            "name": "Cheetoh"
        },
        {
            "id": "csho",
            "name": "Colorpoint Shorthair"
        },
        {
            "id": "crex",
            "name": "Cornish Rex"
        },
        {
            "id": "cymr",
            "name": "Cymric"
        },
        {
            "id": "cypr",
            "name": "Cyprus"
        },
        {
            "id": "drex",
            "name": "Devon Rex"
        },
        {
            "id": "dons",
            "name": "Donskoy"
        },
        {
            "id": "lihu",
            "name": "Dragon Li"
        },
        {
            "id": "emau",
            "name": "Egyptian Mau"
        },
        {
            "id": "ebur",
            "name": "European Burmese"
        },
        {
            "id": "esho",
            "name": "Exotic Shorthair"
        },
        {
            "id": "hbro",
            "name": "Havana Brown"
        },
        {
            "id": "hima",
            "name": "Himalayan"
        },
        {
            "id": "jbob",
            "name": "Japanese Bobtail"
        },
        {
            "id": "java",
            "name": "Javanese"
        },
        {
            "id": "khao",
            "name": "Khao Manee"
        },
        {
            "id": "kora",
            "name": "Korat"
        },
        {
            "id": "kuri",
            "name": "Kurilian"
        },
        {
            "id": "lape",
            "name": "LaPerm"
        },
        {
            "id": "mcoo",
            "name": "Maine Coon"
        },
        {
            "id": "mala",
            "name": "Malayan"
        },
        {
            "id": "manx",
            "name": "Manx"
        },
        {
            "id": "munc",
            "name": "Munchkin"
        },
        {
            "id": "nebe",
            "name": "Nebelung"
        },
        {
            "id": "norw",
            "name": "Norwegian Forest Cat"
        },
        {
            "id": "ocic",
            "name": "Ocicat"
        },
        {
            "id": "orie",
            "name": "Oriental"
        },
        {
            "id": "pers",
            "name": "Persian"
        },
        {
            "id": "pixi",
            "name": "Pixie-bob"
        },
        {
            "id": "raga",
            "name": "Ragamuffin"
        },
        {
            "id": "ragd",
            "name": "Ragdoll"
        },
        {
            "id": "rblu",
            "name": "Russian Blue"
        },
        {
            "id": "sava",
            "name": "Savannah"
        },
        {
            "id": "sfol",
            "name": "Scottish Fold"
        },
        {
            "id": "srex",
            "name": "Selkirk Rex"
        },
        {
            "id": "siam",
            "name": "Siamese"
        },
        {
            "id": "sibe",
            "name": "Siberian"
        },
        {
            "id": "sing",
            "name": "Singapura"
        },
        {
            "id": "snow",
            "name": "Snowshoe"
        },
        {
            "id": "soma",
            "name": "Somali"
        },
        {
            "id": "sphy",
            "name": "Sphynx"
        },
        {
            "id": "tonk",
            "name": "Tonkinese"
        },
        {
            "id": "toyg",
            "name": "Toyger"
        },
        {
            "id": "tang",
            "name": "Turkish Angora"
        },
        {
"name": "York Chocolate"
        }
    ]
};

    const createRazaSelect = document.getElementById('create-pet-raza');

    document.querySelectorAll('input[name="create_especie"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const especie = e.target.value;
            
            createRazaSelect.innerHTML = '<option value="">Selecciona la raza...</option>';
            const list = especie === 'perro' ? dbRazas.perros : dbRazas.gatos;
            if(list) {
                const sortedList = [...list].sort((a, b) => {
                    if (a.id === 'criollo') return -1;
                    if (b.id === 'criollo') return 1;
                    return a.name.localeCompare(b.name);
                });
                
                sortedList.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = r.name;
                    createRazaSelect.appendChild(opt);
                });
            }
        });
    });

    // Si el navegador restauró la selección tras recargar, forzar el disparo del evento
    const selectedEspecie = document.querySelector('input[name="create_especie"]:checked');
    if (selectedEspecie) {
        selectedEspecie.dispatchEvent(new Event('change'));
    }

    // Guardar Perfil (Create Pet)
    document.getElementById('create-pet-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const especieInput = document.querySelector('input[name="create_especie"]:checked');
            if (!especieInput) {
                alert("Por favor selecciona una especie.");
                return;
            }

            const newPet = {
                id: Date.now(),
                name: document.getElementById('create-pet-name').value,
                especie: especieInput.value,
                raza: createRazaSelect.value,
                personalidad: document.getElementById('create-pet-personalidad').value || "No especificar",
                avatarSrc: tempAvatarSrc,
                lastPeso: null,
                lastUnidadPeso: null,
                lastDieta: null,
                events: []
            };
            
            const anosIngresados = parseFloat(document.getElementById('create-pet-anos').value) || 0;
            const mesesIngresados = parseFloat(document.getElementById('create-pet-meses').value) || 0;
            
            const birthDate = new Date();
            birthDate.setFullYear(birthDate.getFullYear() - Math.floor(anosIngresados));
            birthDate.setMonth(birthDate.getMonth() - Math.floor(mesesIngresados));
            newPet.birthDate = birthDate.toISOString(); // Guardar como string ISO para Firestore

            pets.push(newPet);
            activePetIndex = pets.length - 1;
            await savePetToFirestore(newPet); // Persistencia!
            
            renderPets();
            updatePetSelectors();
            showView(viewDashboard);
        } catch (err) {
            console.error("Error en submit:", err);
            alert("Error al procesar el formulario: " + err.message);
        }
    });

    function renderPets() {
        const container = document.getElementById('pets-list-container');
        if(pets.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; background: rgba(15, 23, 42, 0.4); border-radius: 20px; border: 2px dashed rgba(255,255,255,0.1);">
                    <p style="color: var(--text-muted); font-size: 1.2rem; margin-bottom: 1rem;">No tienes mascotas registradas aún.</p>
                    <p style="color: var(--text-muted); font-size: 1rem;">Añade tu primer peludo para comenzar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        pets.forEach((pet, index) => {
            const now = new Date();
            const bDate = new Date(pet.birthDate);
            let currentYears = now.getFullYear() - bDate.getFullYear();
            let currentMonths = now.getMonth() - bDate.getMonth();
            if (currentMonths < 0) {
                currentYears--;
                currentMonths += 12;
            }

            let ageString = "";
            if (currentYears === 0) {
                ageString = currentMonths === 1 ? "1 mesecito" : `${currentMonths} mesecitos`;
            } else if (currentYears === 1) {
                ageString = "1 añito";
            } else {
                ageString = `${currentYears} añitos`;
            }

            if (currentYears > 0 && currentMonths > 0) {
                ageString += currentMonths === 1 ? " y 1 mes" : ` y ${currentMonths} meses`;
            }

            const avatarHTML = pet.avatarSrc 
                ? `<div class="avatar-container" data-index="${index}" style="position:relative; cursor:pointer; width: 130px; height: 130px; margin: 0 auto;">
                     <img src="${pet.avatarSrc}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid rgba(255,255,255,0.2); box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                     <div class="avatar-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: white; font-size: 0.8rem; font-weight: bold;">✏️ Editar</div>
                   </div>`
                : `<div class="avatar-container" data-index="${index}" style="position:relative; cursor:pointer; width: 130px; height: 130px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; border: 2px dashed rgba(255,255,255,0.3); margin: 0 auto;">
                     🐾
                     <div class="avatar-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: white; font-size: 0.8rem; font-weight: bold;">✏️ Editar</div>
                   </div>`;
            
            const pesoText = pet.lastPeso ? ` • ${pet.lastPeso}${pet.lastUnidadPeso}` : '';
            
            // Determinar Próximo Evento
            let nextEventText = "Sin citas pendientes";
            if (pet.events && pet.events.length > 0) {
                const now = new Date();
                // Normalizar "now" a las 00:00 para comparación justa por día
                now.setHours(0, 0, 0, 0);
                
                const upcomingEvents = pet.events.filter(e => {
                    const evtDate = e.scheduled_date || e.date;
                    return evtDate && new Date(evtDate) >= now;
                });
                if (upcomingEvents.length > 0) {
                    upcomingEvents.sort((a, b) => new Date(a.scheduled_date || a.date) - new Date(b.scheduled_date || b.date));
                    const nextE = upcomingEvents[0];
                    // Formatear fecha (ej: 15 de Mayo)
                    const d = new Date(nextE.scheduled_date || nextE.date);
                    const day = d.getDate() + 1; // Ajuste UTC
                    const month = d.toLocaleString('es-ES', { month: 'short' });
                    nextEventText = `${day} ${month} - ${nextE.event_type || nextE.title || 'Cita'}`;
                }
            }

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
                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1rem; width: 100%;">
                    <div style="position: relative;">
                        ${avatarHTML}
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 2.2rem; color: var(--brand-green); font-weight: 800;">${pet.name}</h3>
                        <p style="margin: 0; margin-top: 0.5rem; color: var(--text-muted); font-size: 1.2rem;">
                            ${pet.especie === 'perro' ? '🐶 Perro' : '🐱 Gato'} • ${ageString}${pesoText}
                        </p>
                        <p style="margin: 0; margin-top: 0.8rem; color: rgba(255,255,255,0.8); font-size: 1rem; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px;">
                            📅 Próximo Evento: <span style="font-weight: bold; color: white;">${nextEventText}</span>
                        </p>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; width: 100%; margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem;">
                    <button class="btn-primary calc-btn" data-index="${index}" style="flex: 1; min-width: 150px; padding: 1rem; font-size: 1.1rem; border-radius: 12px; transition: transform 0.2s; background: linear-gradient(135deg, var(--brand-blue), #1e3a8a);">${btnText}</button>
                    <button class="btn-secondary agenda-btn" data-index="${index}" style="flex: 1; min-width: 150px; padding: 1rem; font-size: 1.1rem; border-radius: 12px; transition: transform 0.2s; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white;">Ver Agenda</button>
                    ${pet.lastDieta ? `<button class="btn-secondary pdf-btn" data-index="${index}" style="flex: 1; min-width: 150px; padding: 1rem; font-size: 1.1rem; border-radius: 12px; transition: transform 0.2s; border: 1px solid rgba(148, 163, 184, 0.4); background: rgba(148, 163, 184, 0.1); color: #cbd5e1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><span class="pdf-spinner" style="display:none; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></span> 📄 Exportar Reporte</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        // Add Listeners to buttons
        document.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                activePetIndex = parseInt(e.target.getAttribute('data-index'));
                const p = pets[activePetIndex];
                
                if(p.lastDieta) {
                    document.getElementById('calculator-card').style.display = 'none';
                    document.getElementById('result-container').style.display = 'block';
                    
                    document.getElementById('racion-total').innerText = p.lastDieta.racionTotal + 'g';
                    document.getElementById('racion-calorias').innerText = p.lastDieta.kcalTotales + ' kcal';
                    document.getElementById('racion-comidas').innerText = p.lastDieta.comidas;
                    document.getElementById('racion-recomendacion').innerText = p.lastDieta.recomendacion;
                    document.getElementById('ingredient-list').innerHTML = p.lastDieta.ingredientsHTML;
                    
                    document.getElementById('btn-close-calculator').innerHTML = `<span>◀ Volver al Perfil de ${p.name}</span>`;
                    showView(viewCalculator);
                } else {
                    document.getElementById('calculator-card').style.display = 'block';
                    document.getElementById('result-container').style.display = 'none';
                    document.getElementById('calc-guest-fields').style.display = 'none';
                    document.getElementById('calc-phys-desc').style.display = 'block';
                    document.getElementById('step-1').style.display = 'block';
                    showView(viewCalculator);
                }
            });
        });

        document.querySelectorAll('.agenda-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                activePetIndex = parseInt(e.target.getAttribute('data-index'));
                document.getElementById('calendar-pet-name').innerText = pets[activePetIndex].name;
                currentMonth = new Date().getMonth();
                currentYear = new Date().getFullYear();
                renderCalendar();
                showView(viewCalendar);
            });
        });

        document.querySelectorAll('.pdf-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                const p = pets[index];
                
                const spinner = e.currentTarget.querySelector('.pdf-spinner');
                spinner.style.display = 'block';
                
                await new Promise(r => setTimeout(r, 1500)); // Simula carga
                generatePDFReport(p);
                spinner.style.display = 'none';
            });
        });

        // Hover Effect y Listener para el Avatar
        document.querySelectorAll('.avatar-container').forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                e.currentTarget.querySelector('.avatar-overlay').style.opacity = '1';
            });
            el.addEventListener('mouseleave', (e) => {
                e.currentTarget.querySelector('.avatar-overlay').style.opacity = '0';
            });
            el.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                document.getElementById('dashboard-avatar-upload').setAttribute('data-index', idx);
                document.getElementById('dashboard-avatar-upload').click();
            });
        });
    }

    // Lógica para procesar la subida del avatar desde el Dashboard
    document.getElementById('dashboard-avatar-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const idxStr = e.target.getAttribute('data-index');
        if (file && idxStr !== null) {
            const idx = parseInt(idxStr);
            const reader = new FileReader();
            reader.onload = (event) => {
                pets[idx].avatarSrc = event.target.result;
                renderPets(); // Re-render para mostrar la nueva foto inmediatamente
            };
            reader.readAsDataURL(file);
        }
    });

    const form = document.getElementById('barf-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const peso = parseFloat(formData.get('peso'));
        const unidadPeso = formData.get('unidad_peso') || 'kg';
        const actividad = formData.get('actividad');
        
        let anos, meses, especie;

        if (activePetIndex === -1) {
            // Modo Invitado
            const guestEspecieInput = document.querySelector('input[name="guest_especie"]:checked');
            if (!guestEspecieInput) {
                alert("Por favor selecciona si es perro o gato.");
                return;
            }
            especie = guestEspecieInput.value;
            anos = parseFloat(formData.get('guest_anos')) || 0;
            meses = parseFloat(formData.get('guest_meses')) || 0;
        } else {
            // Perfil Guardado
            const currentPet = pets[activePetIndex];
            if(!currentPet || !currentPet.birthDate) return;

            const now = new Date();
            const bDate = new Date(currentPet.birthDate);
            let currentYears = now.getFullYear() - bDate.getFullYear();
            let currentMonths = now.getMonth() - bDate.getMonth();
            if (currentMonths < 0) {
                currentYears--;
                currentMonths += 12;
            }
            anos = currentYears;
            meses = currentMonths;
            especie = currentPet.especie;
        }
        
        if (anos === 0 && meses === 0) {
            alert("Por favor, ingresa la edad de tu mascota.");
            return;
        }
        
        const pesoKg = unidadPeso === 'lbs' ? peso * 0.453592 : peso;
        
        const totalMeses = (anos * 12) + meses;
        let multiplier = 0;
        
        if(especie === 'perro') {
            if(totalMeses < 12) {
                if(totalMeses <= 3) multiplier = 0.10;
                else if(totalMeses <= 5) multiplier = 0.08;
                else if(totalMeses <= 8) multiplier = 0.06;
                else multiplier = 0.04;
            } else if (totalMeses < 84) { // Adulto 1-6 años
                if(actividad === 'sedentario') multiplier = 0.015;
                else if(actividad === 'alto') multiplier = 0.035;
                else multiplier = 0.025; // Mantenimiento
            } else { // Senior
                if(actividad === 'alto') multiplier = 0.025;
                else multiplier = 0.02; 
            }
        } else { // Gato
            if(totalMeses < 12) {
                if(totalMeses <= 4) multiplier = 0.10;
                else if(totalMeses <= 8) multiplier = 0.06;
                else multiplier = 0.04;
            } else { // Adulto
                if(actividad === 'sedentario') multiplier = 0.02;
                else multiplier = 0.025;
            }
        }
        
        const racionTotalGramos = pesoKg * 1000 * multiplier;
        
        let comidas = 2; // Por defecto
        if (totalMeses <= 3) comidas = 4;
        else if (totalMeses <= 6) comidas = 3;
        
        let ratios = [];
        if(especie === 'perro') {
            ratios = [
                {name: "Carne Magra", img: "img/icon_meat.png", pct: 0.70},
                {name: "Hueso Carnoso", img: "img/icon_bone.png", pct: 0.10},
                {name: "Hígado", img: "img/icon_liver.png", pct: 0.05},
                {name: "Otros órganos", img: "img/icon_organs.png", pct: 0.05},
                {name: "Verduras (Opcional)", img: "img/icon_veggies.png", pct: 0.09, isOptional: true},
                {name: "Frutas (Opcional)", img: "img/icon_fruits.png", pct: 0.01, isOptional: true}
            ];
            document.getElementById('taurina-warning').style.display = 'none';
        } else {
            ratios = [
                {name: "Carne Magra", img: "img/icon_meat.png", pct: 0.80},
                {name: "Hueso Carnoso", img: "img/icon_bone.png", pct: 0.10},
                {name: "Otros órganos", img: "img/icon_organs.png", pct: 0.06},
                {name: "Hígado", img: "img/icon_liver.png", pct: 0.04}
            ];
            document.getElementById('taurina-warning').style.display = 'block';
        }
        
        document.getElementById('calculator-card').style.display = 'none';
        document.getElementById('result-container').style.display = 'block';
        document.getElementById('result-container').scrollIntoView({ behavior: 'smooth' });
        
        document.getElementById('racion-total').innerText = Math.round(racionTotalGramos) + 'g';
        
        // Cálculo de requerimiento calórico (Fórmula RER y MER - NRC/WSAVA)
        const RER = 70 * Math.pow(pesoKg, 0.75);
        let factorActividadCalorias = 1.6;
        
        if (especie === 'perro') {
            if (totalMeses < 4) factorActividadCalorias = 3.0;
            else if (totalMeses < 12) factorActividadCalorias = 2.0;
            else if (totalMeses >= 84 || actividad === 'sedentario') factorActividadCalorias = 1.2;
            else if (actividad === 'alto') factorActividadCalorias = 2.0;
            else factorActividadCalorias = 1.6; // Mantenimiento
        } else { // Gato
            if (totalMeses < 12) factorActividadCalorias = 2.5;
            else if (actividad === 'sedentario') factorActividadCalorias = 1.2;
            else if (actividad === 'alto') factorActividadCalorias = 1.6;
            else factorActividadCalorias = 1.4;
        }

        const kcalTotales = Math.round(RER * factorActividadCalorias);
        document.getElementById('racion-calorias').innerText = kcalTotales + ' kcal';
        document.getElementById('racion-comidas').innerText = comidas;
        document.getElementById('racion-recomendacion').innerText = `${Math.round(racionTotalGramos / comidas)}g`;
        
        // Render ingredients
        const list = document.getElementById('ingredient-list');
        list.innerHTML = '';
        
        ratios.forEach(r => {
            const gramos = Math.round(racionTotalGramos * r.pct);
            const optStyle = r.isOptional ? 'opacity: 0.7;' : '';
            const fillStyle = r.isOptional ? 'background: var(--text-muted);' : '';
            const html = `
                <div class="ingredient-item" style="${optStyle}">
                    <div class="ing-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <img src="${r.img}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            <span>${r.name}</span>
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.8rem;">${Math.round(r.pct * 100)}%</span>
                    </div>
                    <div class="ing-grams">${gramos}g</div>
                    <div class="ing-bar-bg">
                        <div class="ing-bar-fill" style="width: ${Math.max(5, r.pct * 100)}%; ${fillStyle}"></div>
                    </div>
                </div>
            `;
            list.innerHTML += html;
        });

        if (activePetIndex !== -1) {
            // Actualizar UI del Dashboard con el último peso reportado
            const currentPet = pets[activePetIndex];
            currentPet.lastPeso = peso;
            currentPet.lastUnidadPeso = unidadPeso;
            
            // Registrar historial de peso
            if (!currentPet.pesoHistory) currentPet.pesoHistory = [];
            currentPet.pesoHistory.push({
                peso: peso,
                unidad: unidadPeso,
                date: new Date().toISOString()
            });
            
            // Guardar Dieta
            currentPet.lastDieta = {
                racionTotal: Math.round(racionTotalGramos),
                kcalTotales: kcalTotales,
                comidas: comidas,
                recomendacion: `${Math.round(racionTotalGramos / comidas)}g`,
                ingredientsHTML: list.innerHTML
            };

            renderPets();
            document.getElementById('btn-close-calculator').innerHTML = `<span>◀ Volver al Perfil de ${currentPet.name}</span>`;
        } else {
            document.getElementById('btn-close-calculator').innerHTML = `<span>◀ Volver al Dashboard</span>`;
        }

    });

    document.getElementById('btn-recalculate').addEventListener('click', () => {
        document.getElementById('result-container').style.display = 'none';
        document.getElementById('calculator-card').style.display = 'block';
        if(activePetIndex !== -1) {
            document.getElementById('calc-guest-fields').style.display = 'none';
            document.getElementById('calc-phys-desc').style.display = 'block';
        }
    });

    // ================= LÓGICA DE CALENDARIO =================
    document.getElementById('btn-close-calendar').addEventListener('click', () => {
        renderPets(); // Refresh text de próximo evento
        showView(viewDashboard);
    });

    document.getElementById('btn-prev-month').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    function renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        document.getElementById('calendar-month-year').innerText = `${monthNames[currentMonth]} ${currentYear}`;
        
        // Remove old day cells (keep first 7 which are day headers)
        while(grid.children.length > 7) {
            grid.removeChild(grid.lastChild);
        }

        const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Dom) - 6 (Sab)
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Ajustar Lunes como primer día de la semana (1 (Lun) - 0(Dom))
        let startPadding = firstDay === 0 ? 6 : firstDay - 1;

        // Celdas vacías iniciales
        for (let i = 0; i < startPadding; i++) {
            const cell = document.createElement('div');
            grid.appendChild(cell);
        }

        const currentPet = pets[activePetIndex];
        const today = new Date();
        today.setHours(0,0,0,0);

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            const cellDate = new Date(currentYear, currentMonth, day);
            cellDate.setHours(0,0,0,0);
            
            // Buscar evento para este día exacto
            let dayEvent = null;
            if(currentPet && currentPet.events) {
                dayEvent = currentPet.events.find(e => {
                    const dateStr = e.scheduled_date || e.date;
                    if(!dateStr) return false;
                    const eDate = new Date(dateStr);
                    eDate.setHours(0,0,0,0);
                    return eDate.getTime() === cellDate.getTime();
                });
            }

            const isToday = cellDate.getTime() === today.getTime();

            cell.style.padding = "1rem 0.5rem";
            cell.style.borderRadius = "12px";
            cell.style.cursor = "pointer";
            cell.style.position = "relative";
            cell.style.transition = "background 0.2s";
            
            if (isToday) {
                cell.style.background = "rgba(255,255,255,0.1)";
                cell.style.fontWeight = "bold";
            } else {
                cell.style.background = "rgba(15, 23, 42, 0.4)";
            }

            cell.addEventListener('mouseenter', () => cell.style.background = "rgba(255,255,255,0.15)");
            cell.addEventListener('mouseleave', () => {
                cell.style.background = isToday ? "rgba(255,255,255,0.1)" : "rgba(15, 23, 42, 0.4)";
            });

            cell.innerText = day;

            // Si hay evento, dibujar punto debajo
            if (dayEvent) {
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
            }

            // Click -> Open Modal
            cell.addEventListener('click', () => openEventModal(cellDate, dayEvent));
            grid.appendChild(cell);
        }
    }

    const modal = document.getElementById('event-modal');
    const modalContent = document.getElementById('event-modal-content');
    
    function openEventModal(dateObj, existingEvent) {
        selectedDateForEvent = dateObj;
        
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        document.getElementById('event-modal-date-title').innerText = `${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]}`;
        
        const existingDiv = document.getElementById('event-modal-existing');
        const titleInput = document.getElementById('new-event-title');
        
        if (existingEvent) {
            const evTitle = existingEvent.event_type || existingEvent.title || 'Evento';
            const evDesc = existingEvent.description || '';
            existingDiv.innerHTML = `📌 Toca hoy: <br><span style="color:white; font-size:1.3rem;">${evTitle}</span><br><span style="font-size: 0.9rem; color: var(--text-muted);">${evDesc}</span>`;
            existingDiv.style.display = 'block';
            titleInput.placeholder = "Reemplazar evento actual...";
            titleInput.value = "";
            titleInput.required = false; // No obligatorio si ya hay uno y solo quieren ver
        } else {
            existingDiv.style.display = 'none';
            titleInput.placeholder = "Ej: Vacuna, Paseo al parque...";
            titleInput.value = "";
            titleInput.required = true;
        }

        modal.style.display = 'flex';
        // Animación pequeña delay
        setTimeout(() => {
            modalContent.style.transform = 'scale(1)';
            modalContent.style.opacity = '1';
        }, 10);
    }

    function closeEventModal() {
        modalContent.style.transform = 'scale(0.9)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    document.getElementById('btn-close-modal').addEventListener('click', closeEventModal);
    
    document.getElementById('add-event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('new-event-title').value.trim();
        
        if (title !== "") {
            const currentPet = pets[activePetIndex];
            
            // Filtrar evento existente ese dia (sobreescribir)
            currentPet.events = currentPet.events.filter(ev => {
                const eDate = new Date(ev.date);
                eDate.setHours(0,0,0,0);
                return eDate.getTime() !== selectedDateForEvent.getTime();
            });

            // Añadir nuevo
            currentPet.events.push({
                id: Date.now(),
                title: title,
                date: selectedDateForEvent.toISOString()
            });
            
            renderCalendar();
        }
        closeEventModal();
    });

});

// ================= GENERACIÓN DE PDF =================
window.generatePDFReport = function(pet) {
    if (!pet || !pet.lastDieta) {
        alert("Esta mascota no tiene dieta calculada aún.");
        return;
    }
    
    const bDateStr = pet.birthDate ? new Date(pet.birthDate) : null;
    const ageY = bDateStr ? new Date().getFullYear() - bDateStr.getFullYear() : '--';
    
    // Generar la receta purista directamente calculándola, sin leer HTML sucio del pasado
    const dogRatios = [
        { name: 'Carne Magra', pct: 0.70 },
        { name: 'Hueso Carnoso', pct: 0.10 },
        { name: 'Hígado', pct: 0.05 },
        { name: 'Otros órganos', pct: 0.05 },
        { name: 'Verduras/Frutas', pct: 0.10, isOptional: true }
    ];

    const catRatios = [
        { name: 'Carne Magra', pct: 0.80 },
        { name: 'Hueso Carnoso', pct: 0.10 },
        { name: 'Hígado', pct: 0.05 },
        { name: 'Otros órganos', pct: 0.05 }
    ];
    
    const ratios = pet.especie === 'perro' ? dogRatios : catRatios;
    const racionTotalGramos = parseInt(pet.lastDieta.racionTotal) || 0;
    
    let listaLimpiaHTML = `<table style="width: 100%; border-collapse: collapse; font-size: 16px; color: #000;">`;
    
    ratios.forEach(r => {
        const gramos = Math.round(racionTotalGramos * r.pct);
        const optMark = r.isOptional ? " <span style='font-size: 12px; color: #888;'>(Opcional)</span>" : "";
        listaLimpiaHTML += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0;">
                    <strong>${r.name}</strong>${optMark} 
                    <br><span style="color: #555; font-size: 14px;">(${Math.round(r.pct * 100)}%)</span>
                </td>
                <td style="padding: 12px 0; text-align: right; color: #059669; font-weight: bold; font-size: 22px;">
                    ${gramos}g
                </td>
            </tr>
        `;
    });
    listaLimpiaHTML += `</table>`;

    // Formatear historial de peso
    let pesoHistoryHTML = "";
    if (pet.pesoHistory && pet.pesoHistory.length > 0) {
        const historySorted = [...pet.pesoHistory].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5); // Últimos 5
        pesoHistoryHTML = `
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc;">
                <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #555;">Historial de Peso:</h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #333;">
                    ${historySorted.map(p => `<li style="margin-bottom: 3px;"><strong>${new Date(p.date).toLocaleDateString()}</strong> &mdash; ${p.peso} ${p.unidad}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Formatear historial de SkinGuard
    let skinHistoryHTML = "";
    if (pet.skinHistory && pet.skinHistory.length > 0) {
        const skinSorted = [...pet.skinHistory].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3); // Últimos 3
        skinHistoryHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #000;">Historial Dermatológico (IA)</h2>
                ${skinSorted.map(s => `
                    <div style="margin-bottom: 10px; padding: 10px; background-color: #fef2f2; border-left: 4px solid #ef4444;">
                        <p style="margin: 2px 0; font-size: 14px;"><strong>Fecha del análisis:</strong> ${new Date(s.date).toLocaleDateString()}</p>
                        <p style="margin: 2px 0; font-size: 14px;"><strong>Sospecha IA:</strong> <span style="color: #b91c1c; font-weight: bold;">${s.diagnostico}</span> (${s.probabilidad})</p>
                        <p style="margin: 2px 0; font-size: 14px;"><strong>Nivel de Urgencia:</strong> ${s.urgencia}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Generamos un string HTML puro sin flexboxes frágiles
    const htmlString = `
        <div style="width: 700px; font-family: Arial, sans-serif; color: #000; background: #fff; text-align: left; padding: 0; margin: 0;">
            
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                <img src="assets/logo-fondo.png" style="height: 220px; margin-bottom: 5px;">
                <h1 style="margin: 0; font-size: 28px;">Reporte Clínico y Nutricional</h1>
                <p style="margin: 5px 0 0 0; color: #555; font-size: 14px;">Documento Oficial Generado Automáticamente</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #000;">Ficha del Paciente</h2>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Nombre:</strong> ${pet.name}</p>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Especie:</strong> ${pet.especie} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Raza:</strong> ${pet.raza || 'N/A'}</p>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Edad aprox:</strong> ${ageY} años</p>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Peso Actual:</strong> ${pet.lastPeso || '--'} ${pet.lastUnidadPeso || 'kg'}</p>
                ${pesoHistoryHTML}
            </div>

            ${skinHistoryHTML}

            <div style="margin-bottom: 20px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #000;">Plan Nutricional (Dieta BARF)</h2>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Ración Diaria Total:</strong> <span style="color: #059669; font-weight: bold;">${pet.lastDieta.racionTotal}g</span></p>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Aporte Energético:</strong> ${pet.lastDieta.kcalTotales} kcal</p>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Distribución:</strong> ${pet.lastDieta.comidas} tomas de ${pet.lastDieta.recomendacion}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #000;">Composición de la Receta</h2>
                <div>
                    ${listaLimpiaHTML}
                </div>
            </div>

            <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #555; border-top: 1px solid #ccc; padding-top: 10px;">
                <p>NutriPaws © ${new Date().getFullYear()} - Documento Clínico Orientativo</p>
            </div>
        </div>
    `;

    // Opciones para generar un PDF Estándar Letter limpio
    const opt = {
        margin:       [0, 0.5, 0.5, 0.5], // Margen superior 0 para eliminar el hueco
        filename:     `Reporte_NutriPaws_${pet.name}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, scrollY: 0 }, // scrollY: 0 anula el offset fantasma del navegador
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Convertimos directamente desde String HTML (evitando manipulación fallida del DOM)
    html2pdf().set(opt).from(htmlString).save().catch(err => {
        console.error("Error PDF:", err);
        alert("Ocurrió un error nativo al generar el PDF.");
    });
};
