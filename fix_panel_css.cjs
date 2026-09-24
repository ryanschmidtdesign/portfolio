const fs = require('fs');
const jsPath = 'scripts/rs-chat-widget.js';
let js = fs.readFileSync(jsPath, 'utf8');

// The style tag starts at line ~22, ends around 380
// We'll replace specific strings within the shadow DOM template.
let newJs = js;

// Panel background and borders
newJs = newJs.replace(/background: var\(--surface-dark-glass\);/g, 'background: rgba(255, 255, 255, 0.96);');
newJs = newJs.replace(/border: 1px solid var\(--surface-dark-border\);/g, 'border: 1px solid rgba(0, 0, 0, 0.08);');
newJs = newJs.replace(/color: #f8fafc;/g, 'color: var(--text-primary, #111);');
newJs = newJs.replace(/box-shadow: 0 28px 90px rgba\(0, 0, 0, 0\.24\);/g, 'box-shadow: 0 28px 90px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);');

// Close button
newJs = newJs.replace(/border: 1px solid rgba\(255,255,255,0\.10\);\s*border-radius: 12px;\s*background: rgba\(6, 12, 22, 1\);/g, 'border: 1px solid rgba(0,0,0,0.06);\n        border-radius: 12px;\n        background: rgba(0, 0, 0, 0.04);');
newJs = newJs.replace(/background: rgba\(10, 10, 10, 0\.94\);/g, 'background: rgba(0, 0, 0, 0.08);');

// Message user
newJs = newJs.replace(/border: 1px solid rgba\(255, 255, 255, 0\.10\);/g, 'border: 1px solid rgba(0, 0, 0, 0.06);');
newJs = newJs.replace(/box-shadow: 0 1px 2px rgba\(0,0,0,\.35\);/g, 'box-shadow: 0 1px 2px rgba(0,0,0,.02);');
newJs = newJs.replace(/background: rgba\(79, 110, 247, 0\.2\);\s*border-color: var\(--accent, #4F6EF7\); color: #f8fafc;/g, 'background: var(--accent, #4F6EF7);\n        border-color: transparent; color: white;');

// Message bot
newJs = newJs.replace(/background: rgba\(255, 255, 255, 0\.06\);\s*border-color: rgba\(255, 255, 255, 0\.08\);/g, 'background: rgba(0, 0, 0, 0.03);\n        border-color: rgba(0, 0, 0, 0.06);');
newJs = newJs.replace(/background: rgba\(255, 255, 255, 0\.04\);/g, 'background: rgba(0, 0, 0, 0.02);');

// Pills
newJs = newJs.replace(/background: rgba\(255, 255, 255, 0\.06\);/g, 'background: rgba(0, 0, 0, 0.04);');
newJs = newJs.replace(/border: 1px solid rgba\(255, 255, 255, 0\.10\);/g, 'border: 1px solid rgba(0, 0, 0, 0.08);');
newJs = newJs.replace(/color: #f8fafc;/g, 'color: var(--text-primary, #111);');

// Input
newJs = newJs.replace(/background: rgba\(6, 12, 22, 1\);/g, 'background: rgba(245, 245, 245, 1);');
newJs = newJs.replace(/border: 1px solid rgba\(255,255,255,0\.10\);/g, 'border: 1px solid transparent;');
newJs = newJs.replace(/color: rgba\(255,255,255,0\.45\);/g, 'color: rgba(0,0,0,0.4);');
newJs = newJs.replace(/box-shadow: 0 24px 64px rgba\(0, 0, 0, 0\.24\);/g, 'box-shadow: none;');

fs.writeFileSync(jsPath, newJs, 'utf8');
console.log('Styles fixed');
