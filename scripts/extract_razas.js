const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
const razasJsPath = path.join(__dirname, '..', 'public', 'razas.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// The regex will capture from 'const dbRazas = {' up to the closing '};' that precedes the next const or event listener
const regex = /const dbRazas = {[\s\S]*?\n    };\n/;
const match = content.match(regex);

if (match) {
    const dbRazasContent = "window.dbRazas = " + match[0].substring(14); // replaces 'const dbRazas = '
    
    // Write razas.js
    fs.writeFileSync(razasJsPath, dbRazasContent, 'utf8');
    
    // Remove from app.js
    content = content.replace(regex, '');
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log("Extracted dbRazas successfully.");
} else {
    console.log("Could not find dbRazas.");
}
