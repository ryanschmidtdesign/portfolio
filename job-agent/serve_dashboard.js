import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'src', 'storage', 'db.json');
const DASHBOARD_PATH = path.join(__dirname, 'dashboard.html');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/dashboard.html')) {
    // Generate dashboard first to ensure it's up to date
    const generator = spawn('node', ['generate_dashboard.js']);
    generator.on('close', () => {
      let html = fs.readFileSync(DASHBOARD_PATH, 'utf8');
      
      // Inject the reset button into the header
      const buttonHtml = `
        <div style="position: absolute; top: 20px; right: 20px;">
          <button onclick="if(confirm('Are you sure you want to reset all data? This cannot be undone.')) { fetch('/reset', {method:'POST'}).then(() => window.location.reload()) }" style="background: #ef4444; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <svg style="width:16px; height:16px; display:inline-block; vertical-align:-3px; margin-right:5px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Reset All Data
          </button>
        </div>
      `;
      html = html.replace('<body>', '<body>' + buttonHtml);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
  } else if (req.method === 'POST' && req.url === '/reset') {
    if (fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({ applications: [] }, null, 2));
    }
    const generator = spawn('node', ['generate_dashboard.js']);
    generator.on('close', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`\nDashboard live at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop.`);
});
