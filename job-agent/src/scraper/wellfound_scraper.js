// Uses global native fetch (Node 18+)

/**
 * Discovers remote Product Design opportunities from public startup feeds & aggregators
 * (Wellfound/AngelList, WeWorkRemotely, and Jobspresso).
 */
export async function discoverStartupAndAggregatorJobs() {
  const jobs = [];

  // 1. WeWorkRemotely RSS/JSON Design Feed
  try {
    const wwrUrl = 'https://weworkremotely.com/categories/remote-design-jobs.rss';
    const resp = await fetch(wwrUrl, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const xml = await resp.text();
      const items = xml.split('<item>').slice(1);
      for (const item of items) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);

        const rawTitle = titleMatch ? titleMatch[1] : '';
        const link = linkMatch ? linkMatch[1] : '';
        const desc = descMatch ? descMatch[1] : '';

        if (/product design|ux design|ui\/ux|ux\/ui|design system/i.test(rawTitle) && !/contract|freelance/i.test(rawTitle + desc)) {
          const parts = rawTitle.split(':');
          const company = parts.length > 1 ? parts[0].trim() : 'Startup';
          const title = parts.length > 1 ? parts.slice(1).join(':').trim() : rawTitle;

          jobs.push({
            company,
            title,
            url: link,
            atsType: 'external',
            source: 'WeWorkRemotely',
            location: 'Remote',
            jobDescription: desc.replace(/<[^>]*>?/gm, '').slice(0, 1500)
          });
        }
      }
    }
  } catch (err) {
    console.warn('[StartupScraper] WeWorkRemotely feed note:', err.message);
  }

  // 2. Jobspresso Remote Design Feed
  try {
    const jobspressoUrl = 'https://jobspresso.co/wp-json/wp/v2/job_listing?categories=design&per_page=20';
    const resp = await fetch(jobspressoUrl, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const listings = await resp.json();
      for (const item of listings) {
        const title = item.title?.rendered || '';
        const link = item.link || '';
        const content = item.content?.rendered || '';

        if (/product design|ux design|product designer/i.test(title) && !/contract/i.test(title + content)) {
          jobs.push({
            company: 'Startup',
            title,
            url: link,
            atsType: 'external',
            source: 'Jobspresso',
            location: 'Remote',
            jobDescription: content.replace(/<[^>]*>?/gm, '').slice(0, 1500)
          });
        }
      }
    }
  } catch (err) {
    console.warn('[StartupScraper] Jobspresso feed note:', err.message);
  }

  // 3. Hacker News "Who is Hiring" (via HNRSS) - Great for early-stage startups
  try {
    const hnUrl = 'https://hnrss.org/whoishiring?q=designer';
    const resp = await fetch(hnUrl, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const xml = await resp.text();
      const items = xml.split('<item>').slice(1);
      for (const item of items) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
        
        const rawTitle = titleMatch ? titleMatch[1] : '';
        const link = linkMatch ? linkMatch[1] : '';
        const desc = descMatch ? descMatch[1] : '';

        if (/design/i.test(rawTitle) || /design/i.test(desc)) {
          // HN titles are usually "Company Name | Job Title | Location"
          const parts = rawTitle.split('|');
          const company = parts[0] ? parts[0].trim() : 'HN Startup';
          const title = parts[1] ? parts[1].trim() : rawTitle;

          jobs.push({
            company,
            title,
            url: link,
            atsType: 'external',
            source: 'HackerNews',
            location: 'Remote',
            jobDescription: desc.replace(/<[^>]*>?/gm, '').slice(0, 1500)
          });
        }
      }
    }
  } catch (err) {
    console.warn('[StartupScraper] HackerNews feed note:', err.message);
  }

  // 4. Remote.co Design Feed - Often has smaller boutique agencies and startups
  try {
    const remoteCoUrl = 'https://remote.co/remote-jobs/design/feed/';
    const resp = await fetch(remoteCoUrl, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const xml = await resp.text();
      const items = xml.split('<item>').slice(1);
      for (const item of items) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/);
        
        const rawTitle = titleMatch ? titleMatch[1] : '';
        const link = linkMatch ? linkMatch[1] : '';
        const desc = descMatch ? descMatch[1] : '';

        if (/product design|ux design|ui\/ux|product designer/i.test(rawTitle) && !/contract|freelance/i.test(rawTitle)) {
          jobs.push({
            company: 'Remote.co Startup',
            title: rawTitle,
            url: link,
            atsType: 'external',
            source: 'Remote.co',
            location: 'Remote',
            jobDescription: desc.replace(/<[^>]*>?/gm, '').slice(0, 1500)
          });
        }
      }
    }
  } catch (err) {
    console.warn('[StartupScraper] Remote.co feed note:', err.message);
  }

  // 5. Reddit /r/DesignJobs (Outside the box)
  try {
    // Reddit API provides a JSON feed of new posts. We filter for [Hiring].
    const redditUrl = 'https://www.reddit.com/r/DesignJobs/new.json?limit=30';
    const resp = await fetch(redditUrl, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const json = await resp.json();
      for (const child of json.data?.children || []) {
        const post = child.data;
        const title = post.title || '';
        const desc = post.selftext || '';
        const link = post.url || '';
        
        // Only look for [Hiring] posts, ignore [For Hire]
        if (/\[Hiring\]/i.test(title)) {
          jobs.push({
            company: 'Reddit Founder/Agency',
            title: title.replace(/\[Hiring\]/gi, '').trim(),
            url: link,
            atsType: 'external',
            source: 'Reddit',
            location: 'Remote',
            jobDescription: desc.slice(0, 1500)
          });
        }
      }
    }
  } catch (err) {
    console.warn('[StartupScraper] Reddit feed note:', err.message);
  }

  // 6. Working Nomads (Outside the box)
  try {
    // API used by the Working Nomads SPA
    const wnUrl = 'https://www.workingnomads.com/api/exposed_jobs/?category=design';
    const resp = await fetch(wnUrl, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const json = await resp.json();
      for (const job of json || []) {
        if (/design|ux|ui/i.test(job.title) && !/contract|freelance/i.test(job.title)) {
          jobs.push({
            company: job.company_name || 'Working Nomad Startup',
            title: job.title,
            url: job.url,
            atsType: 'external',
            source: 'WorkingNomads',
            location: 'Remote',
            jobDescription: (job.description || '').replace(/<[^>]*>?/gm, '').slice(0, 1500)
          });
        }
      }
    }
  } catch (err) {
    console.warn('[StartupScraper] Working Nomads feed note:', err.message);
  }

  console.log(`[StartupScraper] Discovered ${jobs.length} additional remote design positions.`);
  return jobs;
}
