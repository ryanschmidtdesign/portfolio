const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/config/company_boards.json';
const companies = JSON.parse(fs.readFileSync(file, 'utf8'));

const additions = [
  "tasb", "tceq", "lcra", 
  "raytheon", "lockheed", "lockheedmartin", "northrop", "northropgrumman", 
  "boeing", "anduril", "spacex", "blueorigin", 
  "ford", "gm", "tesla", "rivian", "toyota", 
  "roku", "netflix", "tubi", "hulu", "disney", "paramount", "warnerbros", "pluto",
  "southwest", "southwestairlines", "delta", "deltaairlines", "united", "unitedairlines", "americanairlines"
];

for (const c of additions) {
  if (!companies.includes(c)) {
    companies.push(c);
  }
}

// Sort alphabetically
companies.sort();

fs.writeFileSync(file, JSON.stringify(companies, null, 2));
console.log(`Added ${additions.length} companies!`);
