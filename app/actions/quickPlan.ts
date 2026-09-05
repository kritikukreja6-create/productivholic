'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function quickPlan(prompt: string, userId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
        },
      }
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('course, skills')
      .eq('id', userId)
      .single();

    const userContext = profile 
      ? `This user's background: studying ${profile.course || 'their coursework'} with specific skills in ${profile.skills || 'their field'}.` 
      : '';

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const aiPrompt = `
      ${userContext}
      The user wrote this raw thought: "${prompt}".
      Extract the single most important actionable task. 
      If vague, use their background context to make the task highly specific.
      Estimate a reasonable focus duration (in minutes).
      Return ONLY a raw JSON object matching this schema, no markdown:
      { "title": "Clear Actionable Task", "duration": 25, "goalCategory": "Study Goal Name" }
    `;

    const result = await model.generateContent(aiPrompt);
    const cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const taskData = JSON.parse(cleanedText);

    const expectedGoalTitle = `Quick Plan: ${taskData.goalCategory || 'Daily Focus'}`;

    // 1. Find or Create Logic
    let activeGoalId;

    const { data: existingGoal } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('title', expectedGoalTitle)
      .eq('is_active', true)
      .maybeSingle();

    if (existingGoal) {
      activeGoalId = existingGoal.id;
    } else {
      const { data: newGoal, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          title: expectedGoalTitle,
          duration_days: 1,
          is_active: true,
          points: 0
        })
        .select('id')
        .single();

      if (goalError) throw goalError;
      activeGoalId = newGoal.id;
    }

    // 2. Insert the task tied to the guaranteed unique goal ID
    const { error: insertError } = await supabase.from('ai_roadmap').insert({
      user_id: userId,
      goal_id: activeGoalId,
      timeframe: `Today (${taskData.duration} min)`,
      task_title: taskData.title,
      status: 'active',
    });

    if (insertError) throw insertError;

    return { success: true };
  } catch (error: any) {
    console.error("Quick plan error:", error);
    return { success: false, message: error.message || "Failed to process plan." };
  }
}
