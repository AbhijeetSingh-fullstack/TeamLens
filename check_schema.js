const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sjvakvjvlihwmcrpnyfp.supabase.co',
  'sb_publishable_fppN_93C53JFpzNtcO6XMQ_tuovm4Nj'
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(0); // get empty array
    
  if (error) {
    console.log('Error:', error);
  } else {
    // We can't get column names from an empty array from postgrest easily without a row.
    // Let's insert a dummy row and rollback, or just try inserting receiver_id to see if it fails.
  }
}

async function insertTest() {
  const { error } = await supabase
    .from('messages')
    .insert([{ sender_name: 'test', content: 'test', receiver_id: '00000000-0000-0000-0000-000000000000' }]);
  
  console.log('Insert test with receiver_id error:', error?.message || 'Success (Wait, uuid might fail constraint)');
}

insertTest();
