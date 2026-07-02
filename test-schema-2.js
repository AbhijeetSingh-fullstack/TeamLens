const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function test() {
  const { data: teamData } = await supabase.from('teams').select('*').limit(1);
  console.log('Team:', teamData);

  const { data: orgData } = await supabase.from('organizations').select('*').limit(1);
  console.log('Org:', orgData);
}

test();
