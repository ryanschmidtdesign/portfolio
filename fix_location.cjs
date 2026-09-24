const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/src/ats/greenhouse.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const optionSelector = '[role="listbox"]:visible [role="option"], [role="listbox"]:visible .select__option, [role="listbox"]:visible li[role="option"], [role="listbox"]:visible div[id*="option"]';`,
  `const optionSelector = '[role="listbox"]:visible [role="option"], [role="listbox"]:visible .select__option, [role="listbox"]:visible li[role="option"], [role="listbox"]:visible div[id*="option"], .pac-container:visible .pac-item, ul.ui-autocomplete:visible li.ui-menu-item';`
);

fs.writeFileSync(file, content);
console.log("Replaced location selector logic!");
