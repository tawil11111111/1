const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/await ffmpeg(Ref\.current)?\.terminate\(\);\s*await load\(\);/g, (match, p1) => {
  return `await ffmpeg${p1 || ''}.terminate();\n        await load(true);`;
});

fs.writeFileSync('src/App.tsx', code);
console.log('Patched catches');
