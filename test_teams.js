const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjvakvjvlihwmcrpnyfp.supabase.co', 'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj');

async function test() {
  const { data, error } = await supabase
    .from('teams')
    .select('*, organizations(created_by)')
    .limit(1);
    
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
