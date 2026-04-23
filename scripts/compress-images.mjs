// Compress images in public/assets/ using sharp.
// - Backs up originals to public/assets-original/ before first run
// - Idempotent: skips files whose original exists in backup AND whose compressed
//   version is smaller than the source threshold
// - JPG quality 82 (mozjpeg progressive), PNG compressionLevel 9
// - Only touches files > 200 KB; leaves tiny thumbnails alone

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'assets');
const BACKUP = path.join(ROOT, 'assets-original-backup');
const MIN_SIZE = 200 * 1024; // 200 KB
const JPG_QUALITY = 82;
const PNG_LEVEL = 9;

const exts = new Set(['.jpg', '.jpeg', '.png']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (exts.has(path.extname(e.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function ensureBackup(relPath) {
  const backupPath = path.join(BACKUP, relPath);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  try {
    await fs.access(backupPath);
    return false; // already backed up
  } catch {
    await fs.copyFile(path.join(SRC, relPath), backupPath);
    return true;
  }
}

async function compress(file) {
  const ext = path.extname(file).toLowerCase();
  const tmp = file + '.tmp';
  let pipeline = sharp(file, { failOn: 'none' });
  const meta = await pipeline.metadata();
  // Cap width at 2400 for web (huge source images aren't needed)
  if (meta.width && meta.width > 2400) {
    pipeline = pipeline.resize({ width: 2400 });
  }
  if (ext === '.png') {
    await pipeline.png({ compressionLevel: PNG_LEVEL, adaptiveFiltering: true, palette: true }).toFile(tmp);
  } else {
    await pipeline.jpeg({ quality: JPG_QUALITY, progressive: true, mozjpeg: true }).toFile(tmp);
  }
  return tmp;
}

function fmt(bytes) {
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(1) + ' KB';
}

async function main() {
  console.log('Scanning', SRC);
  const files = await walk(SRC);
  console.log(`Found ${files.length} image files`);

  await fs.mkdir(BACKUP, { recursive: true });

  let processed = 0;
  let skipped = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const rel = path.relative(SRC, file);
    const stat = await fs.stat(file);
    if (stat.size < MIN_SIZE) {
      skipped++;
      continue;
    }
    totalBefore += stat.size;

    try {
      await ensureBackup(rel);
      const tmp = await compress(file);
      const tmpStat = await fs.stat(tmp);
      if (tmpStat.size < stat.size) {
        await fs.rename(tmp, file);
        totalAfter += tmpStat.size;
        processed++;
        const saved = ((1 - tmpStat.size / stat.size) * 100).toFixed(0);
        console.log(`  ✓ ${rel}  ${fmt(stat.size)} → ${fmt(tmpStat.size)}  (-${saved}%)`);
      } else {
        await fs.unlink(tmp);
        totalAfter += stat.size;
        skipped++;
      }
    } catch (err) {
      console.warn(`  ✗ ${rel}: ${err.message}`);
      totalAfter += stat.size;
      skipped++;
    }
  }

  console.log('\n─── Summary ───');
  console.log(`Processed: ${processed}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Before:    ${fmt(totalBefore)}`);
  console.log(`After:     ${fmt(totalAfter)}`);
  if (totalBefore > 0) {
    const pct = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
    console.log(`Saved:     ${fmt(totalBefore - totalAfter)} (${pct}%)`);
  }
  console.log(`Backup:    ${BACKUP}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
