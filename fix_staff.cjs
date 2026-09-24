const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/config/filters.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

if (!data.excludedTitles.includes("Staff")) {
  data.excludedTitles.push("Staff");
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log("Added Staff to excludedTitles!");
