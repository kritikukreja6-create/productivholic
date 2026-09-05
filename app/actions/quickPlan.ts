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
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // 1. Fetch the user's specific context to make the AI significantly smarter
    const { data: profile } = await supabase
      .from('profiles')
      .select('course, skills')
      .eq('id', userId)
      .single();

    // Format the context string for the AI
    const userContext = profile 
      ? `This user's background: studying ${profile.course || 'their coursework'} with specific skills in ${profile.skills || 'their field'}.` 
      : '';

    // 2. Ask Gemini to extract the task and estimate time, using their background
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const aiPrompt = `
      ${userContext}
      
      The user wrote this raw thought in their productivity app: "${prompt}".
      Extract the single most important actionable task. 
      If the user's input is vague, use their background context to make the task title highly specific and relevant to their actual skills/coursework.
      Estimate a reasonable focus duration for it (in minutes, ideally 25, 45, or 60).
      
      Return ONLY a raw JSON object matching this schema, with no markdown code blocks:
      { "title": "Clear Actionable Task", "duration": 25 }
    `;

    const result = await model.generateContent(aiPrompt);
    const cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const taskData = JSON.parse(cleanedText);

    // 3. Insert a 1-day micro-goal to hold the task
    const { data: newGoal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: `Quick Plan: ${taskData.title}`,
        duration_days: 1,
        is_active: true,
        points: 0
      })
      .select('id')
      .single();

    if (goalError) throw goalError;

    // 4. Insert the parsed task directly into the roadmap as ACTIVE
    const { error: insertError } = await supabase.from('ai_roadmap').insert({
      user_id: userId,
      goal_id: newGoal.id,
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