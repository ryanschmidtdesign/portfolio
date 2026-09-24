const fs = require('fs');
const jsPath = 'scripts/rs-chat-widget.js';
let js = fs.readFileSync(jsPath, 'utf8');

js = js.replace(/function initTypewriter\(\) \{[\s\n]*buildTypewriter\(\);[\s\n]*\}/g, '');
js = js.replace(/initTypewriter\(\);[\s\n]*/g, '');

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Fixed initTypewriter reference error');
