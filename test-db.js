const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function test() {
  const { data, error } = await supabase.from('schedules').select('*').limit(1);
  console.log('Query result:', data, error);
}

test();
