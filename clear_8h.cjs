const fs = require('fs');
const file = '/Users/ryanschmidt/Desktop/Portfolio Dev/job-agent/src/storage/db.json';
let db = { applications: [] };
if (fs.existsSync(file)) {
  db = JSON.parse(fs.readFileSync(file, 'utf8'));
}

const eightHoursAgo = Date.now() - (8 * 60 * 60 * 1000);
const initialCount = db.applications.length;

db.applications = db.applications.filter(app => {
  const appDate = new Date(app.date).getTime();
  return appDate < eightHoursAgo;
});

fs.writeFileSync(file, JSON.stringify(db, null, 2));
console.log(`Cleared ${initialCount - db.applications.length} applications from the last 8 hours.`);
