const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/run.js';
let content = fs.readFileSync(file, 'utf8');

const dedupeLogic = `
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
    
    // Check if we've already applied to another role at this company
    if (company && typeof db.hasAppliedToCompany === 'function' && db.hasAppliedToCompany(company)) {
      console.log(\`[Agent] Skipping "\${title}" to avoid duplicate applications to \${company}.\`);
      return false;
    }
  }
`;

content = content.replace(
  /\/\/ Check excluded companies[\s\S]*?return false;\s*}\s*}/m,
  dedupeLogic
);

fs.writeFileSync(file, content);
console.log("Added deduplication logic!");
