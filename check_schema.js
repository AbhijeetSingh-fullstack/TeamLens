const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sjvakvjvlihwmcrpnyfp.supabase.co',
  'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj'
);

async function checkSchema() {
  const { data: teamsData, error: teamsError } = await supabase.from('teams').select('*').limit(1);
  console.log("teams error:", teamsError?.message);
  console.log("teams data:", teamsData);
  
  const { data: orgsData, error: orgsError } = await supabase.from('organizations').select('*').limit(1);
  console.log("orgs error:", orgsError?.message);
  console.log("orgs data:", orgsData);
}
checkSchema();
