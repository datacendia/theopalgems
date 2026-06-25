// Apply a stills -> product mapping LOCALLY (for review; nothing is committed/deployed):
//   - copies each matched still from Whatsapp1/original/ to public/assets/opal/<id>.jpg
//   - repoints that product's `link` in src/data/kiraProducts.js to /assets/opal/<id>.jpg
//
// Mapping format (from the stills matcher Export): { "<still filename>": "<product id>", ... }
//
// Usage: node scripts/apply_stills.mjs [mappingJsonPath]   (default: scripts/_stills_map.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, '..');
const MAP_FILE = process.argv[2] || path.join(BASE, 'scripts', '_stills_map.json');
const STILLS_DIR = path.join(BASE, 'Whatsapp1', 'original');
const OUT_DIR = path.join(BASE, 'public', 'assets', 'opal');
const PRODUCTS_FILE = path.join(BASE, 'src', 'data', 'kiraProducts.js');

if (!fs.existsSync(MAP_FILE)) {
  console.error('Mapping file not found: ' + MAP_FILE);
  console.error('Pass a path or save the matcher export to scripts/_stills_map.json');
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
fs.mkdirSync(OUT_DIR, { recursive: true });

let src = fs.readFileSync(PRODUCTS_FILE, 'utf8');
let copied = 0;
let relinked = 0;
const problems = [];

for (const [still, id] of Object.entries(map)) {
  const from = path.join(STILLS_DIR, still);
  if (!fs.existsSync(from)) {
    problems.push('still not found on disk: ' + still);
    continue;
  }
  fs.copyFileSync(from, path.join(OUT_DIR, id + '.jpg'));
  copied++;

  // Replace the link belonging to this exact product id (name is unique).
  const re = new RegExp('(name:\\s*"' + id + '"\\s*,\\s*link:\\s*")[^"]*(")');
  if (re.test(src)) {
    src = src.replace(re, '$1/assets/opal/' + id + '.jpg$2');
    relinked++;
  } else {
    problems.push('product id not found in kiraProducts.js: ' + id);
  }
}

fs.writeFileSync(PRODUCTS_FILE, src);
console.log('Copied images    : ' + copied + ' -> public/assets/opal/');
console.log('Relinked products: ' + relinked + ' in src/data/kiraProducts.js');
if (problems.length) {
  console.log('\nIssues (' + problems.length + '):');
  for (const p of problems) console.log('  - ' + p);
}
console.log('\nLocal only - review at the dev server, nothing committed or deployed.');
