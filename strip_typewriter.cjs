const fs = require('fs');
const jsPath = 'scripts/rs-chat-widget.js';
let js = fs.readFileSync(jsPath, 'utf8');

// 1. Remove all typewriter variables
js = js.replace(/let twIndex = 0;[\s\S]*?let twTextEl = null;/, '');

// 2. Remove buildTypewriter
js = js.replace(/function buildTypewriter\(\) \{[\s\S]*?const twStyle = document\.createElement\('style'\);[\s\S]*?document\.head\.appendChild\(twStyle\);/g, '');

// 3. Remove typewriterStart
js = js.replace(/function typewriterStart\(\) \{[\s\S]*?\}[\s\n]+function typewriterStop/g, 'function typewriterStop');

// 4. Remove typewriterStop
js = js.replace(/function typewriterStop\(\) \{[\s\S]*?\}/, 'function typewriterStop() {}');

// 5. Remove event listener that restarts typewriter
js = js.replace(/document\.addEventListener\('input', \(e\) => \{[\s\S]*?typewriterStart\(\);[\s\S]*?\}\);/, '');

// 6. Remove initTypewriter
js = js.replace(/function initTypewriter\(\) \{[\s\S]*?\}/, 'function initTypewriter() {}');

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Typewriter stripped');
