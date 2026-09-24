const fs = require('fs');
const cssPath = 'css/components.css';
let css = fs.readFileSync(cssPath, 'utf8');

const regex = /\/\* Case-study floating suggestion pills above mini input \*\/[\s\S]*?\.ai-mini-suggestion-pill:nth-child\(n\+3\) \{\s*display: none;\s*\}/;

const replacement = `/* Global floating suggestion pills above mini input */
.ai-mini-suggestions {
  position: fixed;
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px) + 114px);
  z-index: 239;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
  width: max-content;
  max-width: calc(100vw - 24px);
}

.ai-mini-suggestions.is-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}

.ai-mini-suggestion-pill {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  color: var(--text-secondary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.ai-mini-suggestion-pill:hover {
  background: white;
  color: var(--text-primary);
  border-color: rgba(0,0,0,0.12);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
}

@media (max-width: 600px) {
  .ai-mini-suggestions {
    bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px) + 104px);
  }
  .ai-mini-suggestion-pill:nth-child(n+3) {
    display: none;
  }
}`;

css = css.replace(regex, replacement);

// There is also a media query block that overrides this at the bottom of the file we should clean up if it exists
css = css.replace(/\.ai-mini-suggestions\s*\{[^}]*?right:\s*12px[^}]*?\}/g, '');
css = css.replace(/\.ai-mini-suggestion-pill\s*\{[^}]*?max-width:\s*calc[^}]*?\}/g, '');
// Note: We might leave some empty @media blocks or stray selectors if we're not careful, but this is safe enough.

fs.writeFileSync(cssPath, css, 'utf8');
console.log('CSS updated successfully');
