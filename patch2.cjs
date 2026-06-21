const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/value=\{Number\.isNaN\(([^)]+)\) \? '' : \1\}/g, "value={Number.isNaN($1) || $1 === undefined || $1 === null ? '' : $1}");
fs.writeFileSync('src/App.tsx', code);
console.log('patched');
