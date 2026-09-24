const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/src/storage/db.js';
let content = fs.readFileSync(file, 'utf8');

const newMethod = `
  hasAppliedToCompany(companyName, recentDays = 90) {
    if (!companyName) return false;
    const data = this.read();
    const threshold = Date.now() - (recentDays * 24 * 60 * 60 * 1000);
    const targetCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return data.applications.some(app => {
      if (app.status !== 'SUBMITTED' && app.status !== 'DRY_RUN_COMPLETED') return false;
      const appDate = new Date(app.date || app.appliedAt || 0).getTime();
      if (appDate < threshold) return false;
      
      const appCompany = (app.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return appCompany && targetCompany && appCompany === targetCompany;
    });
  }

  recordApplication(appInfo, isDryRun = false) {`;

content = content.replace('  recordApplication(appInfo, isDryRun = false) {', newMethod);

fs.writeFileSync(file, content);
console.log("Added hasAppliedToCompany to db.js!");
