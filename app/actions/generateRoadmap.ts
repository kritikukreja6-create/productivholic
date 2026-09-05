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

    // 1. Fetch user context to make tasks highly relevant
    const { data: profile } = await supabase
      .from('profiles')
      .select('course, skills')
      .eq('id', userId)
      .single();

    const userContext = profile 
      ? `The user's background: studying ${profile.course || 'their coursework'} with specific skills in ${profile.skills || 'their field'}.` 
      : '';

    // 2. SMART DUPLICATE CHECK
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

    // 3. Create the goal
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

    // 4. Prompt Gemini dynamically with strict isolation rules
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `
      ${userContext}
      A user has committed to this ${duration}-day goal: "${goalTitle}".
      Break this goal down into a strictly sequenced ${duration}-day actionable roadmap.

      CRITICAL RULE: Each daily task will be displayed in isolation on their "Today's Mission" dashboard. 
      Therefore, EVERY single 'task_title' MUST be highly specific and explicitly reference the main goal. 
      Do NOT write generic tasks like "Read documentation" or "Set up environment". 
      Instead, write "Read documentation for ${goalTitle}" or "Set up development environment for ${goalTitle} utilizing [their skills]".

      You MUST output a JSON array of objects exactly matching this schema:
      [
        { "timeframe": "Day 1", "task_title": "Clear, goal-specific task" },
        { "timeframe": "Day 2", "task_title": "Clear, goal-specific task" }
      ]
      Make sure there are exactly ${duration} items in the array. Do not include markdown code blocks like \`\`\`json, just output the raw JSON array string.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const roadmapTasks = JSON.parse(cleanedText);

    // 5. Format and Insert tasks
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