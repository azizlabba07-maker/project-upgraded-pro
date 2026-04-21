// ============================================================================
// 🎬 BATCH RENDER SCRIPT - Smart auto-detection of batch_tokens.json (ESM Version)
// Usage: node scripts/batch-render.js [output-dir]
// ============================================================================
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = process.argv[2] || 'D:\\ADOBE\\New folder (4)';

// Smart search for batch_tokens.json in multiple locations
const SEARCH_PATHS = [
  path.join(PROJECT_DIR, 'batch_tokens.json'),
  path.join('D:\\ADOBE\\New folder (4)', 'batch_tokens.json'),
  path.join(process.env.USERPROFILE || '', 'Downloads', 'batch_tokens.json'),
  path.join(process.env.USERPROFILE || '', 'Desktop', 'batch_tokens.json'),
];

let batchFile = null;
for (const p of SEARCH_PATHS) {
  if (fs.existsSync(p)) {
    batchFile = p;
    break;
  }
}

if (!batchFile) {
  console.error('========================================');
  console.error('  ❌ ERROR: batch_tokens.json not found!');
  console.error('========================================');
  console.error('  Searched in:');
  SEARCH_PATHS.forEach(p => console.error(`    - ${p}`));
  console.error('');
  console.error('  Steps to fix:');
  console.error('  1. Open Motion Engine in your browser');
  console.error('  2. Generate your batch designs');
  console.error('  3. Click "Export" to download batch_tokens.json');
  console.error('  4. Move the file to the project folder');
  console.error('  5. Run this script again');
  process.exit(1);
}

// Copy to project dir if found elsewhere
const projectBatchFile = path.join(PROJECT_DIR, 'batch_tokens.json');
if (batchFile !== projectBatchFile) {
  console.log(`📂 Found batch_tokens.json at: ${batchFile}`);
  console.log(`📋 Copying to project directory...`);
  fs.copyFileSync(batchFile, projectBatchFile);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const batchData = JSON.parse(fs.readFileSync(projectBatchFile, 'utf-8'));
const items = batchData.items || batchData;

console.log('');
console.log('========================================');
console.log('  🎬 Adobe Motion Engine - Batch Render');
console.log('========================================');
console.log(`  📦 Videos to render: ${items.length}`);
console.log(`  📂 Output folder: ${OUTPUT_DIR}`);
console.log('========================================');
console.log('');

let success = 0;
let failed = 0;

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const title = (item.meta?.title || `Video_${i + 1}`)
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .substring(0, 40)
    .trim();
  const duration = item.tokens?.animation?.duration || item.duration || 8;
  const filename = `Stock_${String(i + 1).padStart(2, '0')}_${title.replace(/ /g, '_')}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`[${i + 1}/${items.length}] 🎬 ${title}`);
  console.log(`   ⏱️  Duration: ${duration}s | 📁 ${filename}`);

  // Write THIS item's unique tokens to tokens.json
  const tokenProps = { designTokens: item.tokens };
  fs.writeFileSync(
    path.join(PROJECT_DIR, 'tokens.json'),
    JSON.stringify(tokenProps, null, 2),
    'utf-8'
  );

  try {
    execSync(
      `npx remotion render src/remotion/index.ts MyComp "${outputPath}" --props=tokens.json --gl=angle --concurrency=1`,
      { stdio: 'inherit', cwd: PROJECT_DIR, timeout: 300000 }
    );
    success++;
    console.log(`   ✅ Done!\n`);
  } catch (err) {
    failed++;
    console.error(`   ❌ Failed: ${err.message}\n`);
  }
}

console.log('========================================');
console.log(`  ✅ Rendered: ${success} videos`);
if (failed > 0) console.log(`  ❌ Failed: ${failed} videos`);
console.log(`  📂 Output: ${OUTPUT_DIR}`);
console.log('========================================');

// Clean up temp tokens.json
try { fs.unlinkSync(path.join(PROJECT_DIR, 'tokens.json')); } catch {}
