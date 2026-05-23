import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')

INDEX_FILE = os.path.join(PUBLIC_DIR, 'index.html')
APP_FILE = os.path.join(PUBLIC_DIR, 'app.js')

def replace_in_file(file_path, old_text, new_text):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_text in content:
        content = content.replace(old_text, new_text)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Reemplazo exitoso en {os.path.basename(file_path)}")
    else:
        print(f"No se encontro el texto en {os.path.basename(file_path)}")

def fix_index():
    # 1. Add Pagar Suscripcion Button
    old_paypal_html = """                <!-- PayPal Button Container -->
                <div id="paypal-button-container" style="margin-top: 2rem;"></div>"""
    
    new_paypal_html = """                <!-- PayPal Button Container -->
                <button id="btn-show-paypal" class="btn-primary" style="width: 100%; padding: 1rem; margin-top: 1.5rem; border-radius: 8px; font-size: 1.1rem; font-weight: bold; background: linear-gradient(45deg, #10b981, #059669);">Pagar Suscripción</button>
                <div id="paypal-button-container" style="margin-top: 1rem; display: none;"></div>"""
    replace_in_file(INDEX_FILE, old_paypal_html, new_paypal_html)

    # 2. Update contact link
    old_contact_html = """¿Prefieres pagar manual con Binance o Zinli? <a href="mailto:soporte@nutripaws.com" style="color: var(--brand-green);">Contáctanos</a>"""
    new_contact_html = """¿Prefieres pagar manual con Binance o Zinli? <a href="https://wa.me/584121287701" target="_blank" style="color: var(--brand-green);">Contáctanos</a>"""
    replace_in_file(INDEX_FILE, old_contact_html, new_contact_html)

def fix_app():
    # 1. Pets migration
    old_pets_logic = """            pets = [];
            querySnapshot.forEach((doc) => {
                pets.push(doc.data());
            });
            if (pets.length > 0) activePetIndex = 0;"""
            
    new_pets_logic = """            pets = [];
            querySnapshot.forEach((doc) => {
                pets.push(doc.data());
            });
            
            // --- INICIO MIGRACION LOCALSTORAGE ---
            const localKeys = ['pets', 'nutripaws_pets', 'nutripaws_mascotas', 'saved_pets'];
            let migrated = false;
            for (let key of localKeys) {
                const localPetsStr = localStorage.getItem(key);
                if (localPetsStr) {
                    try {
                        const localPets = JSON.parse(localPetsStr);
                        if (Array.isArray(localPets) && localPets.length > 0) {
                            for (let p of localPets) {
                                if (!p.id) p.id = Date.now() + Math.floor(Math.random() * 1000);
                                pets.push(p);
                                const petRef = window.firebaseAuth.doc(window.firebaseAuth.db, `users/${currentUser.uid}/pets`, p.id.toString());
                                await window.firebaseAuth.setDoc(petRef, p);
                            }
                            migrated = true;
                        }
                        localStorage.removeItem(key);
                    } catch(e) { console.error("Migracion local fallida:", e); }
                }
            }
            if (migrated) {
                console.log("Mascotas migradas desde localStorage a Firestore exitosamente.");
            }
            // --- FIN MIGRACION LOCALSTORAGE ---
            
            if (pets.length > 0) activePetIndex = 0;"""
    replace_in_file(APP_FILE, old_pets_logic, new_pets_logic)

    # 2. Profile Subscription Button logic
    old_btn_sub = """    const btnSub = document.getElementById('btn-profile-sub');
    if(btnSub) {
        btnSub.addEventListener('click', () => {
            document.getElementById('view-dashboard').style.display = 'none';
            document.getElementById('bottom-nav').style.display = 'none';
            document.getElementById('view-subscription').style.display = 'flex';
        });
    }"""

    new_btn_sub = """    const btnSub = document.getElementById('btn-profile-sub');
    if(btnSub) {
        btnSub.addEventListener('click', async () => {
            document.getElementById('view-dashboard').style.display = 'none';
            if(document.getElementById('bottom-nav')) document.getElementById('bottom-nav').style.display = 'none';
            document.getElementById('view-subscription').style.display = 'flex';
            
            const titleEl = document.getElementById('subscription-title');
            
            if (currentUser && window.firebaseAuth) {
                try {
                    const userDocRef = window.firebaseAuth.doc(window.firebaseAuth.db, 'users', currentUser.uid);
                    const userDoc = await window.firebaseAuth.getDoc(userDocRef);
                    if(userDoc.exists()) {
                        const userData = userDoc.data();
                        const now = Date.now();
                        const subtitleEl = document.getElementById('subscription-subtitle');
                        const backBtn = document.getElementById('btn-back-dashboard-sub');
                        
                        if (userData.subscriptionStatus !== 'active' && now <= userData.trialEndsAt) {
                            const daysLeft = Math.ceil((userData.trialEndsAt - now) / (1000 * 60 * 60 * 24));
                            if (titleEl) titleEl.innerText = "¡Suscripción UltraPaws!";
                            if (subtitleEl) subtitleEl.innerText = "Te quedan " + daysLeft + " días de prueba gratuita. Adelántate y asegura tu acceso ininterrumpido a todas las funciones premium para el cuidado de tu mascota.";
                            const btnShowPaypal = document.getElementById('btn-show-paypal');
                            if (btnShowPaypal) btnShowPaypal.style.display = 'block';
                        } else if (userData.subscriptionStatus === 'active') {
                            if (titleEl) titleEl.innerText = "¡Suscripción Activa!";
                            if (subtitleEl) subtitleEl.innerText = "Gracias por ser parte de la familia UltraPaws. Tienes acceso completo a todas las funciones premium.";
                            const btnShowPaypal = document.getElementById('btn-show-paypal');
                            if (btnShowPaypal) btnShowPaypal.style.display = 'none';
                        }
                        if (backBtn) {
                            backBtn.innerText = "Volver al Dashboard";
                            backBtn.style.display = 'block';
                        }
                    }
                } catch(e) { console.error("Error perfil sub:", e); }
            }
            
            const btnShowPaypal = document.getElementById('btn-show-paypal');
            const paypalContainer = document.getElementById('paypal-button-container');
            if (btnShowPaypal && paypalContainer && paypalContainer.style.display !== 'block') {
                if (!titleEl || titleEl.innerText !== "¡Suscripción Activa!") {
                    btnShowPaypal.style.display = 'block';
                }
                paypalContainer.style.display = 'none';
            }
        });
    }

    const globalBtnShowPaypal = document.getElementById('btn-show-paypal');
    if (globalBtnShowPaypal) {
        globalBtnShowPaypal.addEventListener('click', () => {
            globalBtnShowPaypal.style.display = 'none';
            const container = document.getElementById('paypal-button-container');
            if (container) container.style.display = 'block';
            if (typeof renderPayPalButtons === 'function') renderPayPalButtons();
        });
    }"""
    replace_in_file(APP_FILE, old_btn_sub, new_btn_sub)

if __name__ == '__main__':
    print("Aplicando parches de la v34...")
    fix_index()
    fix_app()
    print("Parches aplicados correctamente.")
