const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/config/company_boards.json';
const companies = JSON.parse(fs.readFileSync(file, 'utf8'));

const additions = [
  // Non-profits & Tech for Good
  "wikimedia", "mozilla", "aclu", "amnesty", "unicef", "khanacademy", "techsoup",
  "wcs", "npr", "pbs", "gatesfoundation", "fordfoundation", "nature_org", "wwf",
  "codeforamerica", "trevorproject", "charitywater", "donorschoose",
  "oxfam", "kiva", "guidestar", "candid", "path", "directrelief", "plannedparenthood",
  // Government / Civic Tech
  "usds", "18f", "navagov", "adhocteam", "trussworks", "fearless", 
  "skylight", "coforma", "civicmakers", "cityofnewyork", "stateofca",
  "usajobs", "neogov"
];

for (const c of additions) {
  if (!companies.includes(c)) {
    companies.push(c);
  }
}

// Sort alphabetically
companies.sort();

fs.writeFileSync(file, JSON.stringify(companies, null, 2));
console.log(`Added ${additions.length} non-profit and gov tech organizations! Total companies: ${companies.length}`);
