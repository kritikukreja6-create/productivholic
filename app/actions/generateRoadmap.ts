'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateRoadmap(goalTitle: string, userId: string, duration: number = 30) {
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

    // 1. Create the goal with the dynamic duration selected by the user
    const { data: newGoal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: goalTitle,
        duration_days: duration,
        is_active: true,
        points: 0
      })
      .select('id')
      .single();

    if (goalError) throw goalError;
    const goalId = newGoal.id;

    // 2. Prompt Gemini dynamically based on the selected days
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `
      A user has the following goal: "${goalTitle}".
      Break this goal down into a ${duration}-day actionable roadmap.

      You MUST output a JSON array of objects exactly matching this schema:
      [
        { "timeframe": "Day 1", "task_title": "Clear and specific task" },
        { "timeframe": "Day 2", "task_title": "Clear and specific task" }
      ]
      Make sure there are exactly ${duration} items in the array. Do not include markdown code blocks like \`\`\`json, just output the raw JSON array string.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const roadmapTasks = JSON.parse(cleanedText);

    // 3. Format tasks
    const tasksToInsert = roadmapTasks.map((task: any, index: number) => ({
      user_id: userId,
      goal_id: goalId, 
      timeframe: task.timeframe,
      task_title: task.task_title,
      status: index === 0 ? 'active' : 'locked', 
    }));

    // 4. Insert into database
    const { error: insertError } = await supabase.from('ai_roadmap').insert(tasksToInsert);

    if (insertError) throw insertError;

    return { success: true };
  } catch (error: any) {
    console.error("Roadmap generation error:", error);
    return { success: false, message: error.message || "Failed to generate roadmap." };
  }
}