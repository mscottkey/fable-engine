#!/usr/bin/env node

// Test the generate-phase1 edge function
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // You need to be logged in - get the session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ Not logged in. Please log in to the app first.');
    console.log('The script needs an active session to test the edge function.');
    process.exit(1);
  }

  console.log('✅ Found session for user:', session.user.email);
  console.log('');

  // Use an existing campaign seed ID (you provided this earlier)
  const seedId = '42e8d689-f835-4719-9c59-a21f350db29f';

  console.log('📤 Calling generate-phase1 edge function...');
  console.log('Seed ID:', seedId);
  console.log('');

  const requestBody = {
    seedId: seedId,
    type: 'initial'
  };

  console.log('Request:', JSON.stringify(requestBody, null, 2));
  console.log('');

  const { data, error } = await supabase.functions.invoke('generate-phase1', {
    body: requestBody
  });

  if (error) {
    console.error('❌ Error:', error);
    console.log('');
    console.log('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Success!');
    console.log('');
    console.log('Response:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
