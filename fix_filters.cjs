const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/config/filters.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.excludedCompanies = [
  "Fox News", "FoxNews", "Joe Rogan", "Meta", "Facebook", "Instagram", "Oculus", "WhatsApp"
];

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log("Updated filters.json!");
