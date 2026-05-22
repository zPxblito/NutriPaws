
document.addEventListener('DOMContentLoaded', async () => {
    // Theme logic
    const themeBtn = document.getElementById('theme-btn');
    const htmlObj = document.documentElement;
    
    // Auto-detect system preference or previous setting (assuming light default for this session)
    let isDark = false;
    
    themeBtn.addEventListener('click', () => {
        isDark = !isDark;
        if(isDark) {
            htmlObj.setAttribute('data-theme', 'dark');
            themeBtn.innerText = '☀️ Modo Claro';
        } else {
            htmlObj.setAttribute('data-theme', 'light');
            themeBtn.innerText = '🌙 Modo Oscuro';
        }
    });

    // Form logic
    const form = document.getElementById('barf-form');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const submitBtn = document.getElementById('submit-btn');
    const razaSelect = document.getElementById('raza-select');
    const edadSelect = document.getElementById('edad-select');
    const actividadGroup = document.getElementById('actividad-group');
    
    let dbRazas = { perros: [], gatos: [] };
    
    // Fetch breeds
    try {
        const req = await fetch('data/razas.json');
        dbRazas = await req.json();
    } catch(e) {
        console.error("Error loading razas", e);
    }

    // Step 1 to Step 2
    document.querySelectorAll('input[name="especie"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const especie = e.target.value;
            step2.style.display = 'block';
            
            // Populate razas
            razaSelect.innerHTML = '<option value="">Selecciona la raza...</option>';
            const list = especie === 'perro' ? dbRazas.perros : dbRazas.gatos;
            
            if(list) {
                list.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = r.name;
                    razaSelect.appendChild(opt);
                });
            }
        });
    });

    // Step 2 to Step 3
    razaSelect.addEventListener('change', (e) => {
        if(e.target.value) {
            step3.style.display = 'block';
            submitBtn.style.display = 'block';
        }
    });

    // Hide/Show Actividad based on Edad
    edadSelect.addEventListener('change', (e) => {
        if(e.target.value === 'cachorro') {
            actividadGroup.style.display = 'none';
        } else {
            actividadGroup.style.display = 'block';
        }
    });

    // Calc Logic
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const especie = formData.get('especie');
        const peso = parseFloat(formData.get('peso'));
        const edad = formData.get('edad');
        const actividad = formData.get('actividad');
        
        let multiplier = 0;
        
        if(especie === 'perro') {
            if(edad === 'cachorro') multiplier = 0.06; // 6% promedio
            else {
                if(actividad === 'bajo') multiplier = 0.015;
                else if(actividad === 'alto') multiplier = 0.03;
                else multiplier = 0.025;
            }
        } else {
            if(edad === 'cachorro') multiplier = 0.06;
            else multiplier = 0.025; // 2.5% promedio gato
        }
        
        const racionTotalGramos = peso * 1000 * multiplier;
        
        let ratios = [];
        if(especie === 'perro') {
            ratios = [
                {name: "Carne Magra (Músculo)", pct: 0.70},
                {name: "Hueso Carnoso Crudo", pct: 0.10},
                {name: "Verduras", pct: 0.07},
                {name: "Hígado", pct: 0.05},
                {name: "Otros órganos secretores", pct: 0.05},
                {name: "Semillas / Nueces", pct: 0.02},
                {name: "Frutas", pct: 0.01}
            ];
            document.getElementById('taurina-warning').style.display = 'none';
        } else {
            ratios = [
                {name: "Carne Magra (Rico en Taurina)", pct: 0.80},
                {name: "Hueso Carnoso Crudo", pct: 0.10},
                {name: "Hígado", pct: 0.04},
                {name: "Otros órganos", pct: 0.06}
            ];
            document.getElementById('taurina-warning').style.display = 'block';
        }
        
        // Render
        document.getElementById('calculator-card').style.display = 'none';
        document.getElementById('result-card').style.display = 'block';
        
        document.getElementById('racion-total').innerText = Math.round(racionTotalGramos) + 'g / día';
        
        const ul = document.getElementById('ingredient-list');
        ul.innerHTML = '';
        
        ratios.forEach(r => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${r.name} (${r.pct * 100}%)</span> <strong>${Math.round(racionTotalGramos * r.pct)}g</strong>`;
            ul.appendChild(li);
        });
    });
});
