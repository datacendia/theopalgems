// Extract one mid-clip poster frame from each matched turntable video so the
// stills matcher can show a black-background reference image. (Google Drive
// thumbnails used as the live site images are blocked from hotlinking, so they
// render broken in a local file:// page.)
//
// Frames are written to _match_posters/<videoBasename>.jpg (deduped per video).
//
// Usage: node scripts/extract_match_posters.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, '..');
const MATCH_FILE = path.join(BASE, 'scripts', '_spin_match.json');
const OUT_DIR = path.join(BASE, '_match_posters');

function duration(file) {
  try {
    return parseFloat(
      execFileSync('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', file,
      ]).toString().trim()
    ) || 0;
  } catch {
    return 0;
  }
}

const matches = JSON.parse(fs.readFileSync(MATCH_FILE, 'utf8'));
fs.mkdirSync(OUT_DIR, { recursive: true });

const seen = new Set();
let made = 0;
let missing = 0;
for (const m of matches) {
  if (!m.matched || !m.file) continue;
  const base = path.basename(m.file).replace(/\.[^.]+$/, '');
  const key = base.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  const src = path.join(BASE, m.file);
  if (!fs.existsSync(src)) {
    console.warn('MISSING video: ' + m.file);
    missing++;
    continue;
  }
  const ss = Math.max(0, duration(src) / 2);
  const out = path.join(OUT_DIR, base + '.jpg');
  try {
    execFileSync('ffmpeg', [
      '-ss', String(ss), '-i', src,
      '-frames:v', '1', '-vf', "scale='min(300,iw)':-2", '-q:v', '4', '-y', out,
    ], { stdio: ['ignore', 'ignore', 'ignore'] });
    made++;
  } catch {
    console.warn('FAILED: ' + m.file);
  }
}
console.log('Posters written: ' + made + ' unique videos (missing: ' + missing + ')');
console.log('-> ' + OUT_DIR);
