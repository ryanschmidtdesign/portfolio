// scripts/seed-kb.js
// Run: node scripts/seed-kb.js
// Loads portfolio-kb.json, chunks content, generates embeddings, inserts into Supabase.
// Requires GEMINI_API_KEY env var.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = 'https://ggmkmymtilpkezkpihxt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!GEMINI_API_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required env vars: GEMINI_API_KEY, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

const KB_PATH = path.join(__dirname, '..', 'assets', 'portfolio-kb.json');
const kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));

function chunkByTokens(text, maxTokens = 512) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxTokens) {
    chunks.push(words.slice(i, i + maxTokens).join(' '));
  }
  return chunks.length ? chunks : [text];
}

function buildChunks() {
  const chunks = [];

  // About
  if (kb.about) {
    const text = Object.entries(kb.about)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n');
    for (const c of chunkByTokens(text)) {
      chunks.push({ chunk_text: c, source: 'about', metadata: {} });
    }
  }

  // Resume
  if (kb.resume) {
    const text = Object.entries(kb.resume)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n');
    for (const c of chunkByTokens(text)) {
      chunks.push({ chunk_text: c, source: 'resume', metadata: {} });
    }
  }

  // Each case study
  if (Array.isArray(kb.cases)) {
    for (const c of kb.cases) {
      const caseText = Object.entries(c)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n');
      for (const chunk of chunkByTokens(caseText)) {
        chunks.push({
          chunk_text: chunk,
          source: `case_study:${c.id || c.slug || c.title}`,
          metadata: { caseId: c.id, caseTitle: c.title, caseUrl: c.url }
        });
      }
    }
  }

  // FAQ
  if (Array.isArray(kb.faq)) {
    for (const faq of kb.faq) {
      const text = `Q: ${faq.q}\nA: ${faq.a}`;
      chunks.push({ chunk_text: text, source: 'faq', metadata: { question: faq.q } });
    }
  }

  // Answer examples
  if (Array.isArray(kb.answer_examples)) {
    const text = kb.answer_examples
      .map(ex => `Intent: ${ex.intent}\nUser: ${ex.prompt}\nAssistant: ${ex.answer}`)
      .join('\n\n');
    for (const c of chunkByTokens(text)) {
      chunks.push({ chunk_text: c, source: 'answer_examples', metadata: {} });
    }
  }

  // Meta QA
  if (Array.isArray(kb.meta_qa)) {
    for (const item of kb.meta_qa) {
      const text = `Q: ${item.q}\nA: ${item.a}`;
      chunks.push({ chunk_text: text, source: 'meta_qa', metadata: { question: item.q } });
    }
  }

  // Engineering
  if (kb.engineering) {
    const text = Object.entries(kb.engineering)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n');
    for (const c of chunkByTokens(text)) {
      chunks.push({ chunk_text: c, source: 'engineering', metadata: {} });
    }
  }

  // Looking for
  if (kb.looking_for) {
    const text = Object.entries(kb.looking_for)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n');
    for (const c of chunkByTokens(text)) {
      chunks.push({ chunk_text: c, source: 'looking_for', metadata: {} });
    }
  }

  // Evidence by role
  if (kb.evidence_by_role) {
    const text = Object.entries(kb.evidence_by_role)
      .map(([k, v]) => `${k}: ${Object.entries(v).map(([kk, vv]) => `${kk}: ${Array.isArray(vv) ? vv.join('; ') : vv}`).join(' | ')}`)
      .join('\n');
    for (const c of chunkByTokens(text)) {
      chunks.push({ chunk_text: c, source: 'evidence_by_role', metadata: {} });
    }
  }

  // Company fit patterns
  if (kb.company_fit_patterns) {
    const text = Object.entries(kb.company_fit_patterns)
      .map(([k, v]) => `${k}: ${Object.entries(v).map(([kk, vv]) => `${kk}: ${Array.isArray(vv) ? vv.join('; ') : vv}`).join(' | ')}`)
      .join('\n');
    for (const c of chunkByTokens(text)) {
      chunks.push({ chunk_text: c, source: 'company_fit_patterns', metadata: {} });
    }
  }

  return chunks;
}

async function generateEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-2',
      content: { parts: [{ text: text.slice(0, 2000) }] },
      outputDimensionality: 768
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Embedding error: ${resp.status} ${err}`);
  }
  const data = await resp.json();
  return data.embedding?.values;
}

async function insertChunk(chunk) {
  const url = `${SUPABASE_URL}/rest/v1/kb_chunks`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({
      chunk_text: chunk.chunk_text,
      source: chunk.source,
      metadata: chunk.metadata,
      embedding: chunk.embedding
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error(`Insert error for ${chunk.source}: ${resp.status} ${err}`);
    return false;
  }
  return true;
}

async function main() {
  console.log('Building chunks from portfolio-kb.json...');
  const chunks = buildChunks();
  console.log(`Generated ${chunks.length} text chunks`);

  console.log('Clearing existing KB chunks...');
  await fetch(`${SUPABASE_URL}/rest/v1/kb_chunks`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  console.log('Generating embeddings and inserting...');
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    process.stdout.write(`[${i + 1}/${chunks.length}] ${chunk.source}... `);

    try {
      const embedding = await generateEmbedding(chunk.chunk_text);
      if (!embedding) {
        console.log('SKIP (no embedding)');
        fail++;
        continue;
      }
      chunk.embedding = embedding;
      const inserted = await insertChunk(chunk);
      if (inserted) {
        console.log('OK');
        ok++;
      } else {
        fail++;
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      fail++;
    }

    // Rate limit: 10 requests per second
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 110));
    }
  }

  console.log(`\nDone: ${ok} inserted, ${fail} failed`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
