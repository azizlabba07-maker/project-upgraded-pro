// ============================================================================
// 🎬 BATCH RENDER SCRIPT - Reads batch_tokens.json and renders each item
// Usage: node scripts/batch-render.js [output-dir]
// ============================================================================
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = process.argv[2] || 'D:\\ADOBE\\New folder (4)';
const BATCH_FILE = path.join(__dirname, '..', 'batch_tokens.json');

if (!fs.existsSync(BATCH_FILE)) {
  console.error('❌ ملف batch_tokens.json غير موجود!');
  console.error('   قم بتحميله أولاً من واجهة Motion Engine في المتصفح.');
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const batchData = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf-8'));
const items = batchData.items || batchData;

console.log('========================================');
console.log(`  🎬 Adobe Motion Engine - Batch Render`);
console.log(`  📦 ${items.length} videos to render`);
console.log(`  📂 Output: ${OUTPUT_DIR}`);
console.log('========================================\n');

let success = 0;
let failed = 0;

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const title = (item.meta?.title || `Video_${i + 1}`).replace(/[^a-zA-Z0-9 _-]/g, '').substring(0, 40).trim();
  const filename = `Stock_${String(i + 1).padStart(2, '0')}_${title.replace(/ /g, '_')}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`\n[${i + 1}/${items.length}] 🎬 Rendering: ${title}`);
  console.log(`   Duration: ${item.tokens?.animation?.duration || 8}s`);
  console.log(`   Output: ${filename}`);

  // Write this item's tokens to a temp file
  const tokenProps = { designTokens: item.tokens };
  fs.writeFileSync('tokens.json', JSON.stringify(tokenProps, null, 2), 'utf-8');

  try {
    execSync(
      `npx remotion render src/remotion/index.ts MyComp "${outputPath}" --props=tokens.json --gl=angle --concurrency=1`,
      { stdio: 'inherit', timeout: 300000 }
    );
    success++;
    console.log(`   ✅ Done!`);
  } catch (err) {
    failed++;
    console.error(`   ❌ Failed: ${err.message}`);
  }
}

console.log('\n========================================');
console.log(`  ✅ Success: ${success}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📂 Output: ${OUTPUT_DIR}`);
console.log('========================================');

// Clean up
try { fs.unlinkSync('tokens.json'); } catch {}
