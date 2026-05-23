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
                    // Forzar verificación de correo para usuarios con contraseña
                    if (user.providerData && user.providerData.some(p => p.providerId === 'password') && !user.emailVerified) {
                        window.firebaseAuth.signOut(window.firebaseAuth.auth);
                        return;
                    }
                    
                    currentUser = user;
                    const displayName = user.displayName || user.email.split('@')[0];
                    document.getElementById('user-name-display').innerText = displayName;
                    
                    // Lógica de Suscripción / Trial
                    const userDocRef = window.firebaseAuth.doc(window.firebaseAuth.db, 'users', currentUser.uid);
                    try {
                        let userDoc = await window.firebaseAuth.getDoc(userDocRef);
                        
                        let isNewUser = false;
                        if (!userDoc.exists()) {
                            isNewUser = true;
                            // Crear documento por primera vez
                            const now = Date.now();
                            const trialEndsAt = now + (7 * 24 * 60 * 60 * 1000); // 7 días
                            await window.firebaseAuth.setDoc(userDocRef, {
                                createdAt: now,
                                trialEndsAt: trialEndsAt,
                                subscriptionStatus: 'trial',
                                email: user.email
                            });
                            userDoc = await window.firebaseAuth.getDoc(userDocRef);
                        }
                        
                        const userData = userDoc.data();
                        const now = Date.now();
                        
                        const btnUpgradeEarly = document.getElementById('btn-upgrade-early');
                        const trialDaysLeft = document.getElementById('trial-days-left');
                        
                        if (userData.subscriptionStatus === 'active') {
                            if(btnUpgradeEarly) btnUpgradeEarly.style.display = 'none';
                            if(trialDaysLeft) trialDaysLeft.style.display = 'none';
                            showView(viewDashboard);
                            await loadPetsFromFirestore();
                        } else if (now > userData.trialEndsAt) {
                            // Trial expirado y no tiene suscripción activa
                            if(btnUpgradeEarly) btnUpgradeEarly.style.display = 'none';
                            if(trialDaysLeft) trialDaysLeft.style.display = 'none';
                            
                            document.getElementById('subscription-title').innerText = "Tu periodo de prueba ha expirado";
                            document.getElementById('subscription-subtitle').innerText = "Esperamos que hayas disfrutado estos 7 días con NutriPaws. Para seguir teniendo acceso al panel médico y mantenerte al día con la agenda de tu peludo, necesitas una suscripción activa.";
                            document.getElementById('btn-back-dashboard-sub').style.display = 'none';
                            
                            showView(document.getElementById('view-subscription'));
                            renderPayPalButtons();
                        } else {
                            // Trial activo
                            const daysLeft = Math.ceil((userData.trialEndsAt - now) / (1000 * 60 * 60 * 24));
                            if(trialDaysLeft) {
                                trialDaysLeft.innerText = `${daysLeft} días restantes`;
                                trialDaysLeft.style.display = 'block';
                            }
                            
                            if(btnUpgradeEarly) {
                                btnUpgradeEarly.style.display = 'block';
                                btnUpgradeEarly.onclick = () => {
                                    document.getElementById('subscription-title').innerText = "¡Hazte Premium Hoy!";
                                    document.getElementById('subscription-subtitle').innerText = "Adelántate y asegura el acceso ininterrumpido a todas las funciones premium para el cuidado de tu mascota.";
                                    document.getElementById('btn-back-dashboard-sub').style.display = 'block';
                                    
                                    showView(document.getElementById('view-subscription'));
                                    renderPayPalButtons();
                                };
                            }
                            
                            if (isNewUser) {
                                // Pantalla de Onboarding
                                document.getElementById('subscription-title').innerText = "¡Bienvenido a NutriPaws!";
                                document.getElementById('subscription-subtitle').innerText = "Adquiere UltraPaws ahora mismo o comienza tu prueba gratuita de 7 días con acceso total.";
                                const backBtn = document.getElementById('btn-back-dashboard-sub');
                                backBtn.innerText = "Continuar con prueba gratuita (7 Días)";
                                backBtn.style.display = 'block';
                                
                                showView(document.getElementById('view-subscription'));
                                renderPayPalButtons();
                            } else {
                                showView(viewDashboard);
                                await loadPetsFromFirestore();
                            }
                        }
                    } catch (error) {
                        console.error("Error validando suscripción:", error);
                        // Fallback de seguridad, enviarlo al dashboard
                        showView(viewDashboard);
                        await loadPetsFromFirestore();
                    }
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
        document.getElementById('view-subscription').style.display = 'none';
        
        if (view) {
            view.style.display = 'block';
            
            // Mostrar u ocultar barra de navegación inferior
            const bottomNav = document.getElementById('bottom-nav');
            if (bottomNav) {
                if (view === viewDashboard) {
                    bottomNav.style.display = 'flex';
                    window.switchTab('tab-inicio');
                } else {
                    bottomNav.style.display = 'none';
                }
            }
        }
        
        const footer = document.getElementById('main-footer');
        if (footer) {
            footer.style.display = view === viewLogin ? 'none' : 'flex';
        }
        
        if(view === viewDashboard || view === viewCalculator) {
            menuContainer.style.display = 'flex';
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
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Comprimir calidad al 70%

                    document.getElementById('pet-avatar-img').src = dataUrl;
                    document.getElementById('pet-avatar-img').style.display = 'block';
                    document.getElementById('pet-avatar-placeholder').style.display = 'none';
                    tempAvatarSrc = dataUrl;
                };
                img.src = event.target.result;
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
        
        const confirmGroup = document.getElementById('confirm-password-group');
        const confirmInput = document.getElementById('login-password-confirm');
        
        if (isRegisterMode) {
            title.innerText = "Crea tu Cuenta";
            subtitle.innerText = "Únete a NutriPaws y cuida a tu mascota";
            btnSubmit.innerText = "Registrarse";
            toggleLink.innerText = "¿Ya tienes cuenta? Inicia Sesión";
            confirmGroup.style.display = 'block';
            confirmInput.required = true;
        } else {
            title.innerText = "Bienvenido a NutriPaws";
            subtitle.innerText = "Inicia sesión para gestionar el perfil de tu mascota";
            btnSubmit.innerText = "Iniciar Sesión";
            toggleLink.innerText = "¿No tienes cuenta? Regístrate";
            confirmGroup.style.display = 'none';
            confirmInput.required = false;
        }
    });

    document.getElementById('help-resend-email').addEventListener('click', (e) => {
        e.preventDefault();
        alert("💡 Para reenviar el correo de verificación:\n\n1. Asegúrate de estar en la opción 'Iniciar Sesión'.\n2. Ingresa tu correo y contraseña.\n3. Haz clic en 'Iniciar Sesión'.\n\nEl sistema detectará que tu cuenta no está verificada y te dará la opción de enviarte un nuevo enlace automáticamente.");
    });

    // Login / Register Form Handler
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!window.firebaseAuth) return alert("Cargando servicios de Auth... espera un segundo.");
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const confirmPassword = document.getElementById('login-password-confirm').value;
        
        if (isRegisterMode && password !== confirmPassword) {
            return alert("Las contraseñas no coinciden. Inténtalo de nuevo.");
        }

        const btnSubmit = document.getElementById('btn-submit-email');
        const originalText = btnSubmit.innerText;
        
        btnSubmit.innerText = 'Cargando...';
        btnSubmit.disabled = true;
        
        try {
            let result;
            if (isRegisterMode) {
                // Modo Registro
                result = await window.firebaseAuth.createUserWithEmailAndPassword(window.firebaseAuth.auth, email, password);
                
                // Configurar redirección para el correo
                const actionCodeSettings = {
                    url: window.location.origin, // Redirigir a la app tras verificar
                    handleCodeInApp: false
                };
                
                try {
                    await window.firebaseAuth.sendEmailVerification(result.user, actionCodeSettings);
                } catch (e) {
                    console.error("No se pudo enviar el correo con actionCodeSettings:", e);
                    // Si falla por dominio no autorizado, enviar sin settings (caerá en fallback default)
                    await window.firebaseAuth.sendEmailVerification(result.user);
                }
                
                await window.firebaseAuth.signOut(window.firebaseAuth.auth); // Cerrar sesión para forzar la validación
                
                alert("¡Cuenta creada exitosamente!\n\nTe hemos enviado un correo de confirmación. Por favor revisa tu bandeja de entrada (y la carpeta de spam) para verificar tu cuenta antes de iniciar sesión.");
                
                // Cambiar a modo login
                document.getElementById('toggle-auth-mode').click(); 
                document.getElementById('login-form').reset();
                return; // Evita que siga la ejecución y abra el dashboard
            } else {
                // Modo Login
                result = await window.firebaseAuth.signInWithEmailAndPassword(window.firebaseAuth.auth, email, password);
                
                if (!result.user.emailVerified) {
                    const lastSentStr = localStorage.getItem('lastVerificationSent_' + result.user.uid);
                    const lastSent = lastSentStr ? parseInt(lastSentStr) : 0;
                    const now = Date.now();
                    const cooldown = 60000; // 60 segundos
                    
                    if (now - lastSent < cooldown) {
                        const remaining = Math.ceil((cooldown - (now - lastSent)) / 1000);
                        alert(`Tu correo electrónico aún no ha sido verificado.\n\nDebes esperar ${remaining} segundos antes de poder solicitar otro correo de verificación.`);
                    } else {
                        if (confirm("Tu correo electrónico aún no ha sido verificado.\n\n¿Deseas que te enviemos un NUEVO enlace de verificación a tu correo?")) {
                            try {
                                const actionCodeSettings = {
                                    url: window.location.origin,
                                    handleCodeInApp: false
                                };
                                await window.firebaseAuth.sendEmailVerification(result.user, actionCodeSettings);
                                localStorage.setItem('lastVerificationSent_' + result.user.uid, now.toString());
                                alert("¡Nuevo correo enviado! Por favor revisa tu bandeja de entrada o tu carpeta de spam.");
                            } catch (e) {
                                console.error("Error al reenviar correo con settings:", e);
                                if (e.code === 'auth/too-many-requests') {
                                    alert("Has solicitado demasiados correos de verificación. Por seguridad, Firebase ha bloqueado temporalmente los envíos a esta cuenta. Por favor, intenta de nuevo más tarde.");
                                } else {
                                    try {
                                        // Fallback sin actionCodeSettings
                                        await window.firebaseAuth.sendEmailVerification(result.user);
                                        localStorage.setItem('lastVerificationSent_' + result.user.uid, now.toString());
                                        alert("¡Nuevo correo enviado (modo seguro)! Por favor revisa tu bandeja de entrada o spam.");
                                    } catch (fallbackErr) {
                                        console.error("Error crítico de auth:", fallbackErr);
                                        alert("Hubo un error interno de Firebase al intentar enviar el correo: " + fallbackErr.message);
                                    }
                                }
                            }
                        }
                    }
                    
                    await window.firebaseAuth.signOut(window.firebaseAuth.auth);
                    return;
                }
            }
            
            // Si llega aquí, es un login exitoso y verificado
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
            btnSubmit.innerText = isRegisterMode ? "Registrarse" : "Iniciar Sesión";
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

    async function processMedicalHistory(notesArr) {
        const medSelect = document.getElementById('medical-pet-select');
        const selectedIdx = medSelect ? parseInt(medSelect.value) : activePetIndex;

        if (!isNaN(selectedIdx) && selectedIdx !== -1 && pets[selectedIdx]) {
            const pet = pets[selectedIdx];
            if (!pet.medicalHistory) pet.medicalHistory = [];
            
            notesArr.forEach(note => {
                pet.medicalHistory.push(note);
            });
            await savePetToFirestore(pet);
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
            const eventosArr = data.events || [];
            const historyArr = data.history_notes || [];
            
            await processMedicalEvents(eventosArr);
            await processMedicalHistory(historyArr);
            
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
                const eventosArr = data.events || [];
                const historyArr = data.history_notes || [];
                
                await processMedicalEvents(eventosArr);
                await processMedicalHistory(historyArr);
                
                alert("¡Documento procesado! Eventos agregados a la agenda e historial.");
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
                events: [],
                medicalHistory: [],
                tipoDieta: document.getElementById('create-pet-tipo-dieta') ? document.getElementById('create-pet-tipo-dieta').value : 'barf'
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
                    <button class="btn-danger delete-pet-btn" data-index="${index}" title="Eliminar mascota" style="padding: 0.6rem 0.8rem; border-radius: 8px; transition: transform 0.2s; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1); color: #fca5a5; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
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

        document.querySelectorAll('.delete-pet-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                if(confirm('¿Estás seguro de que deseas eliminar esta mascota? Toda su historia médica y nutricional se perderá para siempre.')) {
                    const petToDelete = pets[idx];
                    try {
                        if (currentUser && window.firebaseAuth) {
                            const petRef = window.firebaseAuth.doc(window.firebaseAuth.db, `users/${currentUser.uid}/pets`, petToDelete.id.toString());
                            await window.firebaseAuth.deleteDoc(petRef);
                        }
                        
                        pets.splice(idx, 1);
                        
                        // Ajustar el activePetIndex
                        if (activePetIndex === idx) {
                            activePetIndex = pets.length > 0 ? 0 : -1;
                        } else if (activePetIndex > idx) {
                            activePetIndex--;
                        }
                        
                        renderPets();
                        updatePetSelectors();
                        
                        if (activePetIndex !== -1) {
                            updateDashboardDetails();
                        } else {
                            // Redibuja la vista base, renderPets se encargará de mostrar el placeholder.
                            document.getElementById('dashboard-pet-name').innerText = '--';
                            showView(viewDashboard); 
                        }
                    } catch (error) {
                        console.error("Error deleting pet:", error);
                        alert("Hubo un error al eliminar la mascota.");
                    }
                }
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
    document.getElementById('dashboard-avatar-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const idxStr = e.target.getAttribute('data-index');
        if (file && idxStr !== null) {
            const idx = parseInt(idxStr);
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                    pets[idx].avatarSrc = dataUrl;
                    await savePetToFirestore(pets[idx]); // Persistencia!
                    renderPets(); // Re-render para mostrar la nueva foto
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    const form = document.getElementById('barf-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const peso = parseFloat(formData.get('peso'));
        const unidadPeso = formData.get('unidad_peso') || 'kg';
        const actividad = formData.get('actividad');
        
        let anos, meses, especie, tipoDieta;

        if (activePetIndex === -1) {
            // Modo Invitado
            tipoDieta = 'barf';
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
            tipoDieta = currentPet.tipoDieta || 'barf';
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
        if (tipoDieta === 'mixta') {
            ratios = [
                {name: especie === 'perro' ? "Croquetas / Perrarina" : "Gatarina / Croquetas", img: "img/icon_kibble.png", pct: 0.80},
                {name: "Carne Magra Fresca", img: "img/icon_meat.png", pct: 0.20}
            ];
            document.getElementById('taurina-warning').style.display = 'none';
        } else {
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

            await savePetToFirestore(currentPet);

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
        const existingTextDiv = document.getElementById('event-modal-existing-text');
        const titleInput = document.getElementById('new-event-title');
        
        if (existingEvent) {
            const evTitle = existingEvent.event_type || existingEvent.title || 'Evento';
            const evDesc = existingEvent.description || '';
            existingTextDiv.innerHTML = `📌 Toca hoy: <br><span style="color:white; font-size:1.3rem;">${evTitle}</span><br><span style="font-size: 0.9rem; color: var(--text-muted);">${evDesc}</span>`;
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
    
    document.getElementById('btn-delete-event').addEventListener('click', async () => {
        const currentPet = pets[activePetIndex];
        currentPet.events = currentPet.events.filter(ev => {
            const eDate = new Date(ev.date);
            eDate.setHours(0,0,0,0);
            return eDate.getTime() !== selectedDateForEvent.getTime();
        });
        await savePetToFirestore(currentPet);
        renderCalendar();
        closeEventModal();
    });

    document.getElementById('add-event-form').addEventListener('submit', async (e) => {
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
            
            await savePetToFirestore(currentPet);
            renderCalendar();
        }
        closeEventModal();
    });
    // =========================================================================
    // LÓGICA DE SUSCRIPCIONES Y PAYPAL
    // =========================================================================
    
    document.getElementById('btn-back-dashboard-sub').addEventListener('click', async () => {
        // Restaurar texto normal por si se cambió en el onboarding
        document.getElementById('btn-back-dashboard-sub').innerText = "Volver al Dashboard";
        showView(viewDashboard);
        await loadPetsFromFirestore();
    });

    document.getElementById('btn-logout-subscription').addEventListener('click', async () => {
        if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
            await window.firebaseAuth.signOut(window.firebaseAuth.auth);
            showView(viewLogin);
        }
    });

    let paypalRendered = false;
    
    function renderPayPalButtons() {
        if (paypalRendered) return;
        
        const container = document.getElementById('paypal-button-container');
        if (!container) return;
        
        // El PLAN_ID es proporcionado por el usuario tras crearlo en su dashboard de PayPal.
        const PLAN_ID = 'P-60536265J9476384GNIIOQ5I'; 
        
        if (window.paypal) {
            window.paypal.Buttons({
                style: {
                    shape: 'rect',
                    color: 'blue',
                    layout: 'vertical',
                    label: 'subscribe'
                },
                createSubscription: function(data, actions) {
                    return actions.subscription.create({
                        /* Creates the subscription */
                        plan_id: PLAN_ID,
                        custom_id: currentUser.uid // Pasamos el UID para que el Webhook sepa a quién activar
                    });
                },
                onApprove: function(data, actions) {
                    alert('¡Suscripción aprobada! Tu panel se desbloqueará en los próximos minutos una vez que PayPal confirme el pago a nuestro sistema.');
                    // Nota: El backend recibirá el webhook y actualizará Firestore.
                    // Opcionalmente podemos forzar un refresh manual aquí si quisiéramos.
                },
                onError: function(err) {
                    console.error("Error en PayPal:", err);
                    alert("Ocurrió un error al intentar abrir la pasarela de pago.");
                }
            }).render('#paypal-button-container');
            paypalRendered = true;
        } else {
            console.error("El SDK de PayPal no se ha cargado.");
        }
    }
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
    const dogRatiosBARF = [
        { name: 'Carne Magra', pct: 0.70 },
        { name: 'Hueso Carnoso', pct: 0.10 },
        { name: 'Hígado', pct: 0.05 },
        { name: 'Otros órganos', pct: 0.05 },
        { name: 'Verduras/Frutas', pct: 0.10, isOptional: true }
    ];

    const catRatiosBARF = [
        { name: 'Carne Magra', pct: 0.80 },
        { name: 'Hueso Carnoso', pct: 0.10 },
        { name: 'Hígado', pct: 0.05 },
        { name: 'Otros órganos', pct: 0.05 }
    ];
    
    let ratios = [];
    if (pet.tipoDieta === 'mixta') {
        ratios = [
            {name: pet.especie === 'perro' ? "Croquetas / Perrarina" : "Gatarina / Croquetas", pct: 0.80},
            {name: "Carne Magra Fresca", pct: 0.20}
        ];
    } else {
        ratios = pet.especie === 'perro' ? dogRatiosBARF : catRatiosBARF;
    }

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

    // Formatear historial médico en general (Notas IA)
    let medicalHistoryHTML = "";
    if (pet.medicalHistory && pet.medicalHistory.length > 0) {
        const historySorted = [...pet.medicalHistory].sort((a,b) => new Date(b.date) - new Date(a.date));
        medicalHistoryHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #000;">Historial Médico Clínico</h2>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #333;">
                    ${historySorted.map(note => `<li style="margin-bottom: 5px;"><strong>${new Date(note.date).toLocaleDateString()}</strong> &mdash; ${note.note}</li>`).join('')}
                </ul>
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

            ${medicalHistoryHTML}

            ${skinHistoryHTML}

            <div style="margin-bottom: 20px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #000;">Plan Nutricional (${pet.tipoDieta === 'mixta' ? 'Dieta Comercial Mixta' : 'Dieta BARF / Natural'})</h2>
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

// =========================================================================
// NUEVAS FUNCIONES: CALCULADORA DE DOSIS Y EMERGENCIAS SOS
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Calculadora de Dosificación
    const doseSpecies = document.getElementById('dose-species');
    const doseWeight = document.getElementById('dose-weight');
    const doseMedication = document.getElementById('dose-medication');
    const btnCalculateDose = document.getElementById('btn-calculate-dose');
    const doseResultContainer = document.getElementById('dose-result-container');
    const doseResultValue = document.getElementById('dose-result-value');
    const doseResultMath = document.getElementById('dose-result-math');
    const doseWarningText = document.getElementById('dose-warning-text');

    const medsDatabase = {
        perro: [
            { id: 'meloxicam_dog', name: 'Meloxicam (Dolor/Inflamación)', dose_mg_kg: 0.1, formula_desc: '0.1 mg por cada kg de peso' },
            { id: 'famotidina_dog', name: 'Famotidina (Acidez/Gástrico)', dose_mg_kg: 0.5, formula_desc: '0.5 mg por cada kg de peso' },
            { id: 'carbon_dog', name: 'Carbón Activado (Intoxicación)', dose_mg_kg: 1.0, formula_desc: '1 a 2 g por cada kg de peso (Mostraré 1g/kg conservador)' },
            { id: 'benadryl_dog', name: 'Difenhidramina / Benadryl (Alergias)', dose_mg_kg: 2.0, formula_desc: '2.0 mg por cada kg de peso' },
            { id: 'doxiciclina_dog', name: 'Doxiciclina (Infecciones)', dose_mg_kg: 5.0, formula_desc: '5.0 mg por cada kg de peso (Cada 12 horas)' },
            { id: 'tramadol_dog', name: 'Tramadol (Dolor Fuerte)', dose_mg_kg: 2.0, formula_desc: '2.0 mg por cada kg de peso' },
            { id: 'vitk_dog', name: 'Vitamina K (Raticidas)', dose_mg_kg: 2.5, formula_desc: '2.5 mg por cada kg de peso' },
            { id: 'peroxido_dog', name: 'Agua Oxigenada 3% (Inducir Vómito)', dose_mg_kg: 1.0, formula_desc: '1 ml por cada kg de peso (Máx 45ml)' }
        ],
        gato: [
            { id: 'meloxicam_cat', name: 'Meloxicam (Extremo Cuidado)', dose_mg_kg: 0.05, formula_desc: '0.05 mg por cada kg de peso (Solo 1 día)' },
            { id: 'famotidina_cat', name: 'Famotidina (Acidez)', dose_mg_kg: 0.5, formula_desc: '0.5 mg por cada kg de peso' },
            { id: 'carbon_cat', name: 'Carbón Activado (Intoxicación)', dose_mg_kg: 1.0, formula_desc: '1 g por cada kg de peso' },
            { id: 'tramadol_cat', name: 'Tramadol (Dolor Fuerte)', dose_mg_kg: 1.0, formula_desc: '1.0 mg por cada kg de peso' },
            { id: 'vitk_cat', name: 'Vitamina K (Raticidas)', dose_mg_kg: 2.5, formula_desc: '2.5 mg por cada kg de peso' }
        ]
    };

    function updateMedDropdown() {
        if (!doseSpecies || !doseMedication) return;
        const species = doseSpecies.value;
        doseMedication.innerHTML = '';
        medsDatabase[species].forEach(med => {
            const option = document.createElement('option');
            option.value = med.id;
            option.textContent = med.name;
            doseMedication.appendChild(option);
        });
        
        if (species === 'gato') {
            doseWarningText.innerText = "¡CUIDADO! Muchos medicamentos humanos (como el paracetamol o ibuprofeno) son MORTALES para los gatos. Solo usa opciones listadas.";
            doseWarningText.style.display = 'block';
        } else {
            doseWarningText.style.display = 'none';
        }
    }

    if (doseSpecies) {
        doseSpecies.addEventListener('change', updateMedDropdown);
        updateMedDropdown(); // Init
    }

    if (btnCalculateDose) {
        btnCalculateDose.addEventListener('click', () => {
            const weight = parseFloat(doseWeight.value);
            if (isNaN(weight) || weight <= 0) {
                alert("Por favor ingresa un peso válido en Kg.");
                return;
            }
            
            const species = doseSpecies.value;
            const medId = doseMedication.value;
            const med = medsDatabase[species].find(m => m.id === medId);
            
            if (!med) return;
            
            const resultMg = (weight * med.dose_mg_kg).toFixed(1);
            
            doseResultValue.innerText = `${resultMg} mg`;
            if (med.id.includes('carbon')) {
                doseResultValue.innerText = `${(weight * 1).toFixed(1)} Gramos`;
            }
            
            doseResultMath.innerText = `Cálculo: ${weight} kg x ${med.formula_desc} = ${doseResultValue.innerText}`;
            doseResultContainer.style.display = 'block';
        });
    }

    // 2. Modo Emergencia SOS
    const btnSos = document.getElementById('btn-emergency-sos');
    const modalSos = document.getElementById('modal-emergency-sos');
    const btnCloseSos = document.getElementById('btn-close-emergency');
    const optionBtns = document.querySelectorAll('.emergency-option-btn');
    const btnOther = document.getElementById('btn-emergency-other');
    const inputContainer = document.getElementById('emergency-input-container');
    const customTextInput = document.getElementById('emergency-custom-text');
    const btnSendCustom = document.getElementById('btn-send-custom-emergency');
    const loadingSos = document.getElementById('emergency-loading');
    const resultSos = document.getElementById('emergency-result');
    const resultTextSos = document.getElementById('emergency-result-text');

    if (btnSos) {
        btnSos.addEventListener('click', () => {
            modalSos.style.display = 'flex';
            document.getElementById('emergency-options').style.display = 'flex';
            inputContainer.style.display = 'none';
            resultSos.style.display = 'none';
            loadingSos.style.display = 'none';
        });
    }

    if (btnCloseSos) {
        btnCloseSos.addEventListener('click', () => {
            modalSos.style.display = 'none';
        });
    }

    async function sendEmergencyRequest(emergencyType) {
        document.getElementById('emergency-options').style.display = 'none';
        inputContainer.style.display = 'none';
        resultSos.style.display = 'none';
        loadingSos.style.display = 'block';
        
        try {
            const response = await fetch('/api/emergency_sos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emergency_type: emergencyType })
            });
            const data = await response.json();
            
            loadingSos.style.display = 'none';
            resultSos.style.display = 'block';
            
            if (data.error) {
                resultTextSos.innerHTML = `<span style="color:red">${data.error}</span>`;
            } else {
                resultTextSos.innerHTML = data.sos_steps.replace(/\n/g, '<br>');
            }
        } catch (error) {
            loadingSos.style.display = 'none';
            resultSos.style.display = 'block';
            resultTextSos.innerHTML = '<span style="color:red">Fallo de conexión. ACUDE AL VETERINARIO INMEDIATAMENTE.</span>';
        }
    }

    optionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sendEmergencyRequest(e.target.getAttribute('data-type'));
        });
    });

    if (btnOther) {
        btnOther.addEventListener('click', () => {
            document.getElementById('emergency-options').style.display = 'none';
            inputContainer.style.display = 'block';
        });
    }

    if (btnSendCustom) {
        btnSendCustom.addEventListener('click', () => {
            const txt = customTextInput.value.trim();
            if (txt) {
                sendEmergencyRequest(txt);
            }
        });
    }
});

// ==========================================
// LÓGICA DE PESTAÑAS (BOTTOM NAVIGATION)
// ==========================================
window.switchTab = function(tabId) {
    // 1. Ocultar todas las pestañas
    document.querySelectorAll('.app-tab').forEach(tab => {
        tab.classList.remove('active-tab');
    });
    // 2. Mostrar la seleccionada
    document.getElementById(tabId).classList.add('active-tab');
    
    // 3. Actualizar botones de la barra inferior
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
    window.scrollTo({top: 0, behavior: 'smooth'});
};

// Eventos de la pestaña Perfil
document.getElementById('btn-profile-theme')?.addEventListener('click', toggleTheme);
document.getElementById('btn-profile-support')?.addEventListener('click', () => {
    window.location.href = 'mailto:soporte@nutripaws.com';
});
document.getElementById('btn-profile-sub')?.addEventListener('click', () => {
    document.getElementById('view-dashboard').style.display = 'none';
    document.getElementById('bottom-nav').style.display = 'none';
    document.getElementById('view-subscription').style.display = 'flex';
});
document.getElementById('btn-profile-logout')?.addEventListener('click', async () => {
    try {
        const { getAuth, signOut } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js');
        const auth = getAuth();
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión", error);
    }
});
