const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'public', 'app.js');
let content = fs.readFileSync(filepath, 'utf8');

const toast_func = `
    window.showToast = function(msg, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = \`custom-toast \${type}\`;
        
        let icon = '✅';
        if(type === 'error') icon = '❌';
        if(type === 'warning') icon = '⚠️';
        if(type === 'info') icon = 'ℹ️';
        
        // Safety for non-string messages
        const messageStr = (typeof msg === 'string') ? msg : (msg && msg.message ? msg.message : String(msg));
        
        toast.innerHTML = \`<span style="font-size: 1.2rem;">\${icon}</span><span class="custom-toast-message">\${messageStr.replace(/\\n/g, '<br>')}</span>\`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };
`;

content = content.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\n" + toast_func);

// Replace alert("...") with showToast(..., "info")
content = content.replace(/alert\((.*?)\);/g, 'showToast($1, "info");');

// Fix common error alerts
content = content.replace(/showToast\((.*?Error.*?|.*?error.*?|.*?err\.message.*?), "info"\);/gi, 'showToast($1, "error");');
content = content.replace(/showToast\((.*?falló.*?|.*?incorrecto.*?), "info"\);/gi, 'showToast($1, "error");');
content = content.replace(/showToast\((.*?Demasiadas.*?|.*?error.*?|.*?inválido.*?), "info"\);/gi, 'showToast($1, "error");');

fs.writeFileSync(filepath, content, 'utf8');
console.log("Alerts replaced with toasts successfully using Node.js.");
