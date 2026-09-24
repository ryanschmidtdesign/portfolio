const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/run.js';
let content = fs.readFileSync(file, 'utf8');

// Insert excludedCompanies logic near excludedIndustries
const checkLogic = `
  // Check excluded industries in body text or title
  if (filters.excludedIndustries && filters.excludedIndustries.length > 0) {
    const isExcludedIndustry = filters.excludedIndustries.some(ex => 
      new RegExp(\`\\\\b\${ex}\\\\b\`, 'i').test(title) || new RegExp(\`\\\\b\${ex}\\\\b\`, 'i').test(bodyText)
    );
    if (isExcludedIndustry) {
      console.log(\`[Agent] Skipping "\${title}" due to excluded industry keyword.\`);
      return false;
    }
  }

  // Check excluded companies
  if (filters.excludedCompanies && filters.excludedCompanies.length > 0) {
    const company = extractCompany(job, title);
    const isExcludedCompany = filters.excludedCompanies.some(ex => 
      new RegExp(\`\\\\b\${ex}\\\\b\`, 'i').test(company) || new RegExp(\`\\\\b\${ex}\\\\b\`, 'i').test(title)
    );
    if (isExcludedCompany) {
      console.log(\`[Agent] Skipping "\${title}" because company is excluded.\`);
      return false;
    }
  }
`;

content = content.replace(
  /\/\/ Check excluded industries in body text or title[\s\S]*?return false;\s*}\s*}/m,
  checkLogic
);

fs.writeFileSync(file, content);
console.log("Replaced run logic!");
