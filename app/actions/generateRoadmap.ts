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

    // 1. SMART DUPLICATE CHECK: Ask Gemini if the goal already exists
    const { data: existingGoals } = await supabase
      .from('goals')
      .select('title')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (existingGoals && existingGoals.length > 0) {
      const existingTitles = existingGoals.map(g => g.title).join(", ");
      
      const checkModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      const checkPrompt = `
        A user wants to add a new goal: "${goalTitle}".
        They already have these active goals: [${existingTitles}].
        Is the new goal fundamentally the exact same thing as any of the existing goals (even if phrased slightly differently)? 
        Reply ONLY with the word "YES" or "NO".
      `;
      
      const checkResult = await checkModel.generateContent(checkPrompt);
      const isDuplicate = checkResult.response.text().trim().toUpperCase();

      if (isDuplicate.includes("YES")) {
        return { success: false, message: "You already have an active goal that is too similar to this one!" };
      }
    }

    // 2. Create the goal with the dynamic duration
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

    // 3. Prompt Gemini dynamically based on the selected days
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
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

    // 4. Format and Insert tasks
    const tasksToInsert = roadmapTasks.map((task: any, index: number) => ({
      user_id: userId,
      goal_id: goalId, 
      timeframe: task.timeframe,
      task_title: task.task_title,
      status: index === 0 ? 'active' : 'locked', 
    }));

    const { error: insertError } = await supabase.from('ai_roadmap').insert(tasksToInsert);

    if (insertError) throw insertError;

    return { success: true };
  } catch (error: any) {
    console.error("Roadmap generation error:", error);
    return { success: false, message: error.message || "Failed to generate roadmap." };
  }
}
