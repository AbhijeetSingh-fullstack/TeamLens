const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sjvakvjvlihwmcrpnyfp.supabase.co',
  'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj'
);

async function checkSchema() {
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  if (error) {
    console.log("Error:", error.message);
  } else if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    console.log("No messages, but query succeeded");
  }
}
checkSchema();
