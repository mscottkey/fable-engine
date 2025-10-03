#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🪣 Setting up prompts storage bucket...\n');

  // List existing buckets
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    process.exit(1);
  }

  console.log('Existing buckets:', buckets.map(b => b.name).join(', '));

  const promptsBucket = buckets.find(b => b.name === 'prompts');

  if (promptsBucket) {
    console.log('\n✓ Prompts bucket exists');
    console.log('  Public:', promptsBucket.public);
    console.log('  ID:', promptsBucket.id);

    // If not public, try to update it
    if (!promptsBucket.public) {
      console.log('\n⚠️  Bucket is not public. You need to:');
      console.log('  1. Go to Supabase Dashboard → Storage → prompts bucket');
      console.log('  2. Click settings (gear icon)');
      console.log('  3. Toggle "Public bucket" to ON');
      console.log('  4. Save changes');
    }
  } else {
    console.log('\n❌ Prompts bucket does not exist!');
    console.log('\nYou need to create it manually:');
    console.log('  1. Go to Supabase Dashboard → Storage');
    console.log('  2. Click "Create a new bucket"');
    console.log('  3. Name: prompts');
    console.log('  4. Enable "Public bucket"');
    console.log('  5. Click "Create bucket"');
  }
}

main().catch(console.error);
