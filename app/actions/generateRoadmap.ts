'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Initialize the Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateRoadmap(goalTitle: string, userId: string) {
  try {
    // 1. Setup the model and force JSON output
    // 1. Setup the model
     const model = genAI.getGenerativeModel({
     model: "gemini-pro"
    });

    // 2. The Prompt
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

    // 3. Call Gemini
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    // 4. Parse the AI's JSON output
    const roadmapTasks = JSON.parse(responseText);

    // 5. Initialize Supabase
    const cookieStore = cookies();
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

    // 6. Format the data for Supabase
    // We only make the very first task 'active', the rest are 'locked'
    const tasksToInsert = roadmapTasks.map((task: any, index: number) => ({
      user_id: userId,
      timeframe: task.timeframe,
      task_title: task.task_title,
      status: index === 0 ? 'active' : 'locked', 
    }));

    // 7. Bulk Insert into the database
    const { error } = await supabase.from('ai_roadmap').insert(tasksToInsert);

    if (error) throw error;

    return { success: true };

  } catch (error) {
    console.error("Roadmap generation error:", error);
    return { success: false, error: "Failed to generate roadmap" };
  }
}