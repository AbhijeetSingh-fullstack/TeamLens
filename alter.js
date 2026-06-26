const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjvakvjvlihwmcrpnyfp.supabase.co', 'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj');

async function run() {
  const { error } = await supabase.rpc('execute_sql', { 
    sql: `
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES auth.users(id);
      NOTIFY pgrst, 'reload schema';
    ` 
  });
  console.log(error ? error : 'Success');
}
run();
