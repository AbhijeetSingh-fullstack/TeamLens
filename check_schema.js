const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sjvakvjvlihwmcrpnyfp.supabase.co',
  'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj'
);

async function checkTeamsOrg() {
  const { data, error } = await supabase
    .from('teams')
    .select('*, organizations(org_name)')
    .limit(1)
    .single();
    
  console.log('Data:', data);
  console.log('Error:', error);
}

checkTeamsOrg();
