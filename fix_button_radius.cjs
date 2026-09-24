const fs = require('fs');
const cssPath = 'css/components.css';
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(/\.ai-mini-wrapper\.consolidated-nav \.ai-mini-send \{[\s\S]*?border-radius: 14px;/g, (match) => {
  return match.replace('border-radius: 14px;', 'border-radius: 8px;');
});

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Fixed button border radius');
