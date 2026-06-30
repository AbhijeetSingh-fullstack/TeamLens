import { supabase } from './supabase';

export const updateTaskAnalysis = async (
  teamId: string,
  memberId: string,
  updates: {
    assigned?: boolean;
    completed?: boolean;
    revision?: boolean;
    points?: number;
  }
) => {
  try {
    const now = new Date();
    const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Try to fetch existing
    const { data: existing } = await supabase
      .from('task_analysis')
      .select('*')
      .eq('team_id', teamId)
      .eq('member_id', memberId)
      .eq('month_year', month_year)
      .single();

    const newRow = {
      team_id: teamId,
      member_id: memberId,
      month_year,
      assigned_count: (existing?.assigned_count || 0) + (updates.assigned ? 1 : 0),
      completed_count: (existing?.completed_count || 0) + (updates.completed ? 1 : 0),
      revisions_count: (existing?.revisions_count || 0) + (updates.revision ? 1 : 0),
      points: (existing?.points || 0) + (updates.points || 0),
      updated_at: new Date().toISOString()
    };

    if (existing?.id) {
      await supabase.from('task_analysis').update(newRow).eq('id', existing.id);
    } else {
      await supabase.from('task_analysis').insert([{ ...newRow, created_at: new Date().toISOString() }]);
    }
  } catch (error) {
    console.error('Failed to update task analysis:', error);
  }
};
