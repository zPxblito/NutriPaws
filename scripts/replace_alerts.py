import re
import os

filepath = r"p:\New descargas\10 SKILLS GEMINI\kit-skill-creator\saas-app-builder-skill\public\app.js"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Añadir función showToast al principio después de document.addEventListener
toast_func = """
    window.showToast = function(msg, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;
        
        let icon = '✅';
        if(type === 'error') icon = '❌';
        if(type === 'warning') icon = '⚠️';
        if(type === 'info') icon = 'ℹ️';
        
        toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span class="custom-toast-message">${msg.replace(/\\n/g, '<br>')}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };
"""

content = content.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\n" + toast_func)

# Replace alerts
# We need to be careful. alert("...") -> showToast("...")
content = re.sub(r'alert\((.*?)\);', r'showToast(\1, "info");', content)
# Make some error alerts showToast(..., "error") instead
content = re.sub(r'showToast\((.*?Error.*?|.*?error.*?|.*?err\.message.*?), "info"\);', r'showToast(\1, "error");', content)
content = re.sub(r'showToast\((.*?falló.*?|.*?incorrecto.*?), "info"\);', r'showToast(\1, "error");', content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Alerts replaced with toasts.")
