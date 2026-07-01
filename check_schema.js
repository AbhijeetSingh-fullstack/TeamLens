const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sjvakvjvlihwmcrpnyfp.supabase.co',
  'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj'
);

async function checkSchema() {
  const { data: usersData, error } = await supabase.from('users').select('*').limit(1);
  console.log("users error:", error?.message);
  
  const { data: profilesData, error: profError } = await supabase.from('profiles').select('*').limit(1);
  console.log("profiles error:", profError?.message);
}
checkSchema();
