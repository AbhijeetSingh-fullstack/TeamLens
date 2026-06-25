const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY
);

async function testInsert() {
  // First get a valid member ID
  const { data: members, error: memErr } = await supabase.from('team_members').select('id').limit(1);
  if (memErr || !members || members.length === 0) {
    console.error('Failed to get member:', memErr);
    return;
  }
  const memberId = members[0].id;
  console.log('Using member ID:', memberId);

  const { data, error } = await supabase.from('schedules').insert({
    user_id: memberId,
    title: 'Test Title',
    description: 'Test Desc',
    date: '2026-06-25',
    start_time: '10:00:00',
    end_time: '11:00:00'
  });

  console.log('Insert result:', data, error);
}

testInsert();
