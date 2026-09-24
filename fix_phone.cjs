const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/src/ats/greenhouse.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const phoneValue = phoneDigits\.length === 10 \? `\+1\$\{phoneDigits\}` : `\+\$\{phoneDigits\}`;/g,
  'const phoneValue = profile.personal.phone;'
);

fs.writeFileSync(file, content);
console.log("Replaced phone logic!");
