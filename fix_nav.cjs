const fs = require('fs');
const cssPath = 'css/components.css';
let css = fs.readFileSync(cssPath, 'utf8');

const replacement = `.ai-mini-wrapper.consolidated-nav {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  z-index: 240;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  padding: 12px;
  border-radius: 28px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04);
  border: 1px solid rgba(0,0,0,0.06);
  width: max-content;
  max-width: calc(100vw - 24px);
  gap: 0;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-nav {
  display: flex;
  gap: 12px; /* with 10px padding, total visual gap between text is 10 + 12 + 10 = 32px */
  align-items: center;
  justify-content: center;
  padding: 4px 16px 12px;
  width: 100%;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-nav a,
.ai-mini-wrapper.consolidated-nav .ai-mini-nav button.menu-trigger {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  background: none;
  border: none;
  padding: 6px 10px;
  margin: 0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
  opacity: 1 !important;
  transform: none !important;
  min-height: auto;
  letter-spacing: normal;
  display: inline-flex;
  align-items: center;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-nav button.menu-trigger {
  width: auto;
  gap: 4px;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-nav a:hover,
.ai-mini-wrapper.consolidated-nav .ai-mini-nav button.menu-trigger:hover {
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.04);
}

.ai-mini-wrapper.consolidated-nav .ai-mini-nav a[aria-current="page"] {
  color: var(--text-primary);
  position: relative;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-nav a[aria-current="page"]::after {
  content: '';
  position: absolute;
  bottom: 0px;
  left: 10px;
  right: 10px;
  height: 2px;
  background: var(--accent-primary, #4F6EF7);
  border-radius: 2px;
}

/* Fix Case Studies Chevron */
.ai-mini-wrapper.consolidated-nav .ai-mini-nav button.menu-trigger::after {
  content: '';
  display: block;
  width: 6px;
  height: 6px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-2px) rotate(45deg);
  margin-left: 2px !important;
  opacity: 0.6;
  transition: transform 0.2s ease;
  box-sizing: border-box;
}

.ai-mini-wrapper.consolidated-nav .menu-item-group:hover button.menu-trigger::after,
.ai-mini-wrapper.consolidated-nav .menu-item-group:focus-within button.menu-trigger::after {
  transform: translateY(1px) rotate(-135deg);
  opacity: 0.9;
}

.ai-mini-wrapper.consolidated-nav .menu-item-group {
  position: relative;
}

.ai-mini-wrapper.consolidated-nav .menu-submenu {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  padding: 8px;
  min-width: 220px;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  max-height: none !important;
  overflow: visible !important;
}

.ai-mini-wrapper.consolidated-nav .menu-item-group:hover .menu-submenu,
.ai-mini-wrapper.consolidated-nav .menu-item-group:focus-within .menu-submenu {
  display: flex;
}

.ai-mini-wrapper.consolidated-nav .menu-submenu a {
  padding: 8px 12px;
  margin: 0;
  border-radius: 6px;
  color: var(--text-secondary);
  opacity: 1 !important;
  display: block;
}

.ai-mini-wrapper.consolidated-nav .menu-submenu a:hover {
  background: rgba(0,0,0,0.04);
  color: var(--text-primary);
}

.ai-mini-wrapper.consolidated-nav .ai-mini-input-container {
  position: relative;
  width: 100%;
  display: flex;
  border-top: 1px solid rgba(0,0,0,0.06);
  padding-top: 12px;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-input {
  background: var(--surface-subtle, #f7f7f7);
  border: 1px solid transparent;
  color: var(--text-primary);
  width: 100%;
  min-width: 420px;
  border-radius: 20px;
  padding: 0 44px 0 16px;
  height: 40px;
  font-size: 14px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
  transition: all 0.2s ease;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-input::placeholder {
  color: rgba(0,0,0,0.4);
}

.ai-mini-wrapper.consolidated-nav .ai-mini-input:focus {
  background: white;
  border-color: rgba(79, 110, 247, 0.3);
  box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.1);
  outline: none;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-send {
  position: absolute;
  right: 6px;
  top: 18px;
  background: var(--accent-primary, #4F6EF7);
  color: white;
  border: none;
  border-radius: 14px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 241;
  padding: 0;
  margin: 0;
  transition: transform 0.2s ease, background 0.2s ease;
}

.ai-mini-wrapper.consolidated-nav .ai-mini-send:hover {
  transform: scale(1.05);
  background: var(--accent-hover, #3a56d4);
}`;

const startRegex = /\.ai-mini-wrapper\.consolidated-nav \{/;
const endRegex = /@media \(max-width: 600px\)/;

const startIndex = css.search(startRegex);
const endIndex = css.search(endRegex);

if (startIndex !== -1 && endIndex !== -1) {
  const newCss = css.substring(0, startIndex) + replacement + '\n\n' + css.substring(endIndex);
  fs.writeFileSync(cssPath, newCss, 'utf8');
  console.log('CSS updated successfully');
} else {
  console.error('Could not find boundaries');
}
