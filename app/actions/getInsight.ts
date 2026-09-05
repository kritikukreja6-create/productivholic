'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function getInsight(xp: number, tasks: number, goals: number) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `
      You are an elite, data-driven AI productivity coach. 
      A user has the following lifetime stats: ${xp} XP, ${tasks} roadmap tasks completed, and ${goals} currently active goals.
      Based on this data, generate exactly ONE short, highly actionable, and personalized sentence of strategic advice. 
      Do not use greetings, emojis, formatting, or fluff. Output only the raw insight.
    `;

    const result = await model.generateContent(prompt);
    
    return { success: true, insight: result.response.text().trim() };
  } catch (error: any) {
    console.error("AI Insight Error:", error);
    return { success: false, insight: "Maintain your current pace and focus on closing out your active roadmap milestones." };
  }
}