import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = {
        applications: [],
        dailyCounts: {},
        tokenUsage: {
          currentWeekId: this.getWeekId(),
          tokensUsed: 0
        },
        fieldMemory: {}
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
  }

  read() {
    this.init();
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.applications || !Array.isArray(parsed.applications)) {
        throw new Error('Invalid schema in db.json');
      }
      return parsed;
    } catch (e) {
      console.error(`[DB] Error reading ${DB_FILE}:`, e.message);
      // Attempt recovery from backup if it exists
      const bakFile = `${DB_FILE}.bak`;
      if (fs.existsSync(bakFile)) {
        try {
          const rawBak = fs.readFileSync(bakFile, 'utf-8');
          console.warn(`[DB] Restored database from ${bakFile}`);
          return JSON.parse(rawBak);
        } catch (bakErr) {
          console.error(`[DB] Failed to restore from backup:`, bakErr.message);
        }
      }
      throw new Error(`[DB] Database corrupted or unreadable. Aborting to avoid history loss. File: ${DB_FILE}`);
    }
  }

  write(data) {
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    const bakFile = `${DB_FILE}.bak`;
    try {
      if (fs.existsSync(DB_FILE)) {
        fs.copyFileSync(DB_FILE, bakFile);
      }
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      if (fs.existsSync(tmpFile)) {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
      }
      throw err;
    }
  }

  getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getWeekId() {
    const d = new Date();
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${weekNum}`;
  }

  getTodayApplicationCount() {
    const data = this.read();
    const today = this.getTodayKey();
    return data.dailyCounts[today] || 0;
  }

  canApplyToday(maxDaily = 15) {
    return this.getTodayApplicationCount() < maxDaily;
  }

  hasAppliedTo(url) {
    const data = this.read();
    
    const extractId = (rawUrl) => {
      if (!rawUrl) return '';
      try {
        const u = new URL(rawUrl);
        if (u.searchParams.get('gh_jid')) return u.searchParams.get('gh_jid');
        const ghMatch = rawUrl.match(/gh_jid=([^&]+)/i);
        if (ghMatch) return ghMatch[1];
        if (u.hostname.includes('lever.co') || u.hostname.includes('ashbyhq.com')) {
          const parts = u.pathname.split('/').filter(Boolean);
          return parts[parts.length - 1] || '';
        }
        if (u.hostname.includes('greenhouse.io') || u.hostname.includes('job-boards.greenhouse.io')) {
          const matches = u.pathname.match(/\/jobs\/(\d+)/i);
          if (matches) return matches[1];
        }
        // Fallback: strip tracking params
        u.searchParams.delete('gh_src');
        u.searchParams.delete('utm_source');
        u.searchParams.delete('utm_medium');
        u.searchParams.delete('utm_campaign');
        return u.toString().replace(/\?$/, '');
      } catch {
        return rawUrl.trim();
      }
    };

    const targetId = extractId(url);

    return data.applications.some(app => {
      if (app.status !== 'SUBMITTED' && app.status !== 'DRY_RUN_COMPLETED') return false;
      if (app.url === url) return true;
      const appId = extractId(app.url);
      return appId && targetId && appId === targetId;
    });
  }


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

  recordApplication(appInfo, isDryRun = false) {
    const data = this.read();
    const today = this.getTodayKey();
    if (!isDryRun && appInfo.status === 'SUBMITTED') {
      data.dailyCounts[today] = (data.dailyCounts[today] || 0) + 1;
    }
    data.applications.push({
      ...appInfo,
      appliedAt: new Date().toISOString()
    });
    this.write(data);
  }

  addTokenUsage(tokens, weeklyBudget = 500000) {
    const data = this.read();
    const currentWeek = this.getWeekId();
    if (data.tokenUsage.currentWeekId !== currentWeek) {
      data.tokenUsage = {
        currentWeekId: currentWeek,
        tokensUsed: 0
      };
    }
    data.tokenUsage.tokensUsed += tokens;
    this.write(data);

    const usageRatio = data.tokenUsage.tokensUsed / weeklyBudget;
    return {
      tokensUsed: data.tokenUsage.tokensUsed,
      weeklyBudget,
      usageRatio,
      exceeded75Percent: usageRatio >= 0.75
    };
  }

  getTokenStatus(weeklyBudget = 500000) {
    const data = this.read();
    const currentWeek = this.getWeekId();
    if (data.tokenUsage.currentWeekId !== currentWeek) {
      return { tokensUsed: 0, weeklyBudget, usageRatio: 0, isCapped: false };
    }
    const ratio = data.tokenUsage.tokensUsed / weeklyBudget;
    return {
      tokensUsed: data.tokenUsage.tokensUsed,
      weeklyBudget,
      usageRatio: ratio,
      isCapped: ratio >= 0.75
    };
  }

  recordFieldMemory({ atsType, company, fieldName, resolvedValue, success = true, failureReason = null }) {
    const data = this.read();
    const companyKey = (company || 'unknown').toLowerCase();
    const atsKey = (atsType || 'unknown').toLowerCase();
    if (!data.fieldMemory) data.fieldMemory = {};
    if (!data.fieldMemory[atsKey]) data.fieldMemory[atsKey] = {};
    if (!data.fieldMemory[atsKey][companyKey]) data.fieldMemory[atsKey][companyKey] = {};

    data.fieldMemory[atsKey][companyKey][fieldName] = {
      resolvedValue,
      success,
      failureReason,
      lastUpdated: new Date().toISOString()
    };

    this.write(data);
    return data.fieldMemory[atsKey][companyKey][fieldName];
  }

  getFieldMemory({ atsType, company, fieldName }) {
    const data = this.read();
    const companyKey = (company || 'unknown').toLowerCase();
    const atsKey = (atsType || 'unknown').toLowerCase();
    return data.fieldMemory?.[atsKey]?.[companyKey]?.[fieldName] || null;
  }
}

export const db = new Database();
