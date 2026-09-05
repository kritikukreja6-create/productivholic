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

    // 1. Ask Gemini to extract the task and estimate time
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const aiPrompt = `
      A user wrote this in their productivity app: "${prompt}".
      Extract the most important, single actionable task from this text.
      Estimate a reasonable focus duration for it (in minutes, ideally 25, 45, or 60).
      Return ONLY a raw JSON object matching this schema, with no markdown code blocks:
      { "title": "Clear Actionable Task", "duration": 25 }
    `;

    const result = await model.generateContent(aiPrompt);
    const cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const taskData = JSON.parse(cleanedText);

    // 2. Insert a 1-day micro-goal to hold the task
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

    // 3. Insert the parsed task directly into the roadmap as ACTIVE
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