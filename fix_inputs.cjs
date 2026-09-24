const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/src/ats/greenhouse.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const customTexts = await container.$$('input[type="text"]:not([id*="first_name"]):not([name*="first_name"]):not([id*="last_name"]):not([name*="last_name"]), textarea');`,
  `const customTexts = await container.$$('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([id*="first_name"]):not([name*="first_name"]):not([id*="last_name"]):not([name*="last_name"]), textarea');`
);

fs.writeFileSync(file, content);
console.log("Replaced input selector logic!");
