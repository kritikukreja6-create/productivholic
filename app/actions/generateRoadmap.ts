'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Initialize the Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateRoadmap(goalTitle: string, userId: string) {
  try {
    // 1. Initialize Supabase FIRST so we can check the database before calling AI
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
          remove(name: string, options: any) { cookieStore.delete(name) }
        },
      }
    );

    // 2. Check for Duplicates: Is this exact goal already active?
    const { data: existingGoal } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .ilike('title', goalTitle) // case-insensitive check
      .eq('is_active', true)
      .maybeSingle();

    if (existingGoal) {
      // Block generation instantly and return your custom message
      return { success: false, message: 'This goal is already going on.' };
    }

    // 3. Setup the model and force JSON output
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 4. The Prompt
    const prompt = `
      You are an expert productivity coach. 
      A user has the following goal: "${goalTitle}".
      Break this goal down into a 30-day actionable roadmap.
      
      You MUST output a JSON array of objects exactly matching this schema:
      [
        { "timeframe": "Day 1", "task_title": "Clear and specific task" },
        { "timeframe": "Day 2", "task_title": "Clear and specific task" }
      ]
      Make sure there are exactly 30 items in the array.
    `;

    // 5. Call Gemini
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const roadmapTasks = JSON.parse(responseText);


  // 1. Fetch the ID of the goal the user just made active
    const { data: activeGoal } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!activeGoal) {
      return { success: false, message: "No active goal found to attach roadmap to." };
    }

    // 2. Format the data to include 'goal_id'
    const tasksToInsert = roadmapTasks.map((task: any, index: number) => ({
      user_id: userId,
      goal_id: activeGoal.id, // <--- Links the tasks to the specific goal
      timeframe: task.timeframe,
      task_title: task.task_title,
      status: index === 0 ? 'active' : 'locked', 
    }));

    // 3. Bulk Insert into the database
    const { error: insertError } = await supabase.from('ai_roadmap').insert(tasksToInsert);

    if (insertError) throw insertError;

    return { success: true };

  } catch (error) {
    console.error("Roadmap generation error:", error);
    return { success: false, message: "Failed to generate roadmap" };
  }
}