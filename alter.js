const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjvakvjvlihwmcrpnyfp.supabase.co', 'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj');

async function run() {
  const { error } = await supabase.rpc('execute_sql', { 
    sql: `
      ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
      ALTER TABLE team_members ALTER COLUMN user_id TYPE TEXT;
      ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;
      ALTER TABLE organizations ALTER COLUMN created_by TYPE TEXT;
      NOTIFY pgrst, 'reload schema';
    ` 
  });
  console.log(error ? error : 'Success');
}
run();
