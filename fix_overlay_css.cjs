const fs = require('fs');
const jsPath = 'scripts/rs-chat-widget.js';
let js = fs.readFileSync(jsPath, 'utf8');

js = js.replace(/\.tw-overlay \{[\s\S]*?z-index: 242;/, 
`.tw-overlay {
      position: absolute;
      left: 17px;
      top: 50%;
      margin-top: 6px;
      transform: translateY(-50%);
      pointer-events: none;
      white-space: nowrap;
      overflow: hidden;
      color: rgba(0,0,0,0.4);
      font-size: var(--fs-sm, 14px);
      z-index: 242;`);

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Fixed tw-overlay CSS');
