const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function checkCol() {
  const { data, error } = await supabase.from('teams').select('creator_email').limit(1);
  console.log("data:", data, "error:", error);
}

checkCol();
