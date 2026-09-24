import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/storage/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
const originalCount = db.applications.length;

db.applications = db.applications.filter(app => {
  const ts = new Date(app.appliedAt || app.recordedAt).getTime();
  return ts >= sixHoursAgo;
});

const newCount = db.applications.length;
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`Removed ${originalCount - newCount} old entries.`);
