#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PROMPTS_DIR = path.join(__dirname, '../supabase/functions/_shared/prompts');
const BUCKET_NAME = 'prompts';

function walkSync(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkSync(filePath, fileList);
    } else if (file.endsWith('.md') || file.endsWith('.hbs')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

async function main() {
  console.log('📦 Uploading prompts to Supabase Storage...\n');

  // Check if bucket exists, create if not
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log(`Creating bucket: ${BUCKET_NAME}`);
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 1024 * 1024 // 1MB
    });

    if (error) {
      console.error('❌ Failed to create bucket:', error);
      process.exit(1);
    }
  }

  const promptFiles = walkSync(PROMPTS_DIR);
  let uploaded = 0;
  let failed = 0;

  for (const filePath of promptFiles) {
    const relativePath = path.relative(PROMPTS_DIR, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(relativePath, content, {
        contentType: filePath.endsWith('.md') ? 'text/markdown' : 'text/plain',
        upsert: true
      });

    if (error) {
      console.error(`  ❌ ${relativePath}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${relativePath}`);
      uploaded++;
    }
  }

  console.log(`\n✅ Uploaded ${uploaded} prompts`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
}

main().catch(console.error);
