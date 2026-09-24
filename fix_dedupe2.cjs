const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/run.js';
let content = fs.readFileSync(file, 'utf8');

const dedupeLogic = `
  const company = extractCompany(job, title);

  // Check excluded companies
  if (filters.excludedCompanies && filters.excludedCompanies.length > 0) {
    const isExcludedCompany = filters.excludedCompanies.some(ex => 
      new RegExp(\`\\\\b\${ex}\\\\b\`, 'i').test(company) || new RegExp(\`\\\\b\${ex}\\\\b\`, 'i').test(title)
    );
    if (isExcludedCompany) {
      console.log(\`[Agent] Skipping "\${title}" because company is excluded.\`);
      return false;
    }
  }

  // Check if we've already applied to another role at this company recently
  if (company && typeof db.hasAppliedToCompany === 'function' && db.hasAppliedToCompany(company)) {
    console.log(\`[Agent] Skipping "\${title}" to avoid duplicate applications to \${company}.\`);
    return false;
  }
`;

content = content.replace(
  /\/\/ Check excluded companies[\s\S]*?return false;\s*}\s*}/m,
  dedupeLogic
);

fs.writeFileSync(file, content);
console.log("Fixed deduplication logic!");
