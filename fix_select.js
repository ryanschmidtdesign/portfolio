const fs = require('fs');
const path = require('path');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/src/ats/greenhouse.js';
let content = fs.readFileSync(file, 'utf8');

// Replace standard label selections
content = content.replace(/await select\.selectOption\(\{ label:(.+?)\}\)\.catch/g, 'await select.selectOption({ label:$1}, { force: true }).catch');

// Replace valToSelect which doesn't have an object wrapping it
content = content.replace(/await select\.selectOption\(valToSelect\)\.catch/g, 'await select.selectOption(valToSelect, { force: true }).catch');

fs.writeFileSync(file, content);
console.log("Replaced");
