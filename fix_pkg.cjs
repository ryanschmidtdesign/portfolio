const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/package.json';
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
pkg.scripts.dashboard = 'node serve_dashboard.js';
fs.writeFileSync(file, JSON.stringify(pkg, null, 2));
