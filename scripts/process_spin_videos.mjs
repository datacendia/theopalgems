// Batch-process turntable videos in incoming_videos/ into 360/180 spin frames.
// - Parses the leading item ID from each filename (e.g. "313682 - Multi-heart pendant.mp4" -> 313682)
// - Extracts FRAME_COUNT evenly-spaced JPG frames into public/assets/spin/<ID>/
// - Writes/updates public/assets/spin/manifest.json mapping id -> { frames, width }
//
// Usage: node scripts/process_spin_videos.mjs [frameCount]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const inDir = path.join(root, 'incoming_videos');
const outRoot = path.join(root, 'public', 'assets', 'spin');
const manifestPath = path.join(root, 'src', 'data', 'spinManifest.json');

const FRAME_COUNT = Number(process.argv[2]) || 36;
const TARGET_WIDTH = 480; // downscale wide videos; portrait clips usually already small

function ffprobeDuration(file) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ]).toString().trim();
  return parseFloat(out);
}

function parseId(filename) {
  const m = filename.match(/^\s*([0-9]+)/);
  return m ? m[1] : null;
}

if (!fs.existsSync(inDir)) {
  console.error('No incoming_videos/ folder found.');
  process.exit(1);
}
fs.mkdirSync(outRoot, { recursive: true });

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

const videos = fs.readdirSync(inDir).filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f));
if (!videos.length) {
  console.log('No video files in incoming_videos/.');
  process.exit(0);
}

for (const file of videos) {
  const id = parseId(file);
  if (!id) {
    console.warn(`SKIP (no leading ID): ${file}`);
    continue;
  }
  const src = path.join(inDir, file);
  const dur = ffprobeDuration(src);
  const fps = FRAME_COUNT / dur; // evenly spaced across whole clip
  const outDir = path.join(outRoot, id);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Processing ${file} -> id ${id} (${dur.toFixed(1)}s, ${FRAME_COUNT} frames)`);
  execFileSync('ffmpeg', [
    '-i', src,
    '-vf', `fps=${fps},scale='min(${TARGET_WIDTH},iw)':-2`,
    '-frames:v', String(FRAME_COUNT),
    '-q:v', '4',
    '-y',
    path.join(outDir, 'frame_%03d.jpg'),
  ], { stdio: ['ignore', 'ignore', 'inherit'] });

  const frames = fs.readdirSync(outDir).filter((f) => f.endsWith('.jpg')).length;
  manifest[id] = { frames, base: `/assets/spin/${id}` };
  console.log(`  -> ${frames} frames written`);
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nManifest updated: ${manifestPath}`);
console.log(JSON.stringify(manifest, null, 2));
