const fs = require('fs');
const cssPath = 'css/components.css';
let css = fs.readFileSync(cssPath, 'utf8');

const bridgeCss = `
.ai-mini-wrapper.consolidated-nav .menu-submenu::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 16px;
}
`;

css = css.replace(/\.ai-mini-wrapper\.consolidated-nav \.menu-item-group:hover \.menu-submenu,/, bridgeCss + '\n.ai-mini-wrapper.consolidated-nav .menu-item-group:hover .menu-submenu,');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Submenu bridge added');
