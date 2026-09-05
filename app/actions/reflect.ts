'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateReflection(accomplished: string, blocked: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `
      You are an empathetic, elite AI productivity coach. The user is ending their day.
      They accomplished: "${accomplished}"
      They struggled with: "${blocked}"
      
      Write a concise, 2-to-3 sentence evening reflection. Praise their wins, offer a brief reframe for their struggles, and tell them to get some rest. Use a warm, professional tone. No markdown, no emojis.
    `;

    const result = await model.generateContent(prompt);
    return { success: true, summary: result.response.text().trim() };
  } catch (error) {
    console.error("Reflection Error:", error);
    return { success: false, summary: "Great effort today. Rest up, reset your focus, and we will tackle tomorrow with fresh energy." };
  }
}