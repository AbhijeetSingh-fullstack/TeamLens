const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjvakvjvlihwmcrpnyfp.supabase.co', 'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj');

async function run() {
  console.log("Creating user_push_tokens table...");
  const { error } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS user_push_tokens (
        user_id TEXT PRIMARY KEY,
        push_token TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      NOTIFY pgrst, 'reload schema';
    `
  });
  
  if (error) {
    console.error("Error creating table:", error);
  } else {
    console.log("Table created successfully!");
  }
}

run();
