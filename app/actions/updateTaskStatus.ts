'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function toggleRoadmapTask(taskId: string, currentStatus: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(name: string) { return cookieStore.get(name)?.value } },
    }
  );

  const newStatus = currentStatus === 'completed' ? 'active' : 'completed';

  const { error } = await supabase
    .from('ai_roadmap')
    .update({ status: newStatus })
    .eq('id', taskId);

  if (error) {
    console.error('Failed to update task:', error);
    return { success: false };
  }

  // Instantly refresh the dashboard data cache
  revalidatePath('/dashboard');
  revalidatePath('/profile/[username]', 'page');
  return { success: true };
}
