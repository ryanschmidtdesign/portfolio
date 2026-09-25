const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);

if (styleMatch) {
  const cssContent = styleMatch[1];
  fs.appendFileSync('css/pages.css', '\n/* Extracted from index.html */\n' + cssContent);
  html = html.replace(/<style>[\s\S]*?<\/style>/, '');
  fs.writeFileSync('index.html', html);
  console.log('Extracted inline styles to pages.css');
}
