const fs = require('fs');
const filePath = 'scripts/rs-chat-widget.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/inputEl\.placeholder = "Try asking about: " \+ pills\[0\];/, 'inputEl.placeholder = "Try asking: \\"" + pills[0] + "\\"";');

fs.writeFileSync(filePath, code, 'utf8');
