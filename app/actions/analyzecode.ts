'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeCode(code: string, language: string, intent: 'explain' | 'debug' | 'optimize') {
  try {
    if (!code.trim()) return { success: false, message: "Code is empty." };

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = "";
    if (intent === 'explain') {
      prompt = `You are an expert programming tutor. Explain the following ${language} code clearly and concisely. Break down the logic so a beginner can understand it.\n\nCode:\n${code}`;
    } else if (intent === 'debug') {
      prompt = `You are a senior developer. Review the following ${language} code for any bugs, logical errors, or edge cases. If there are issues, explain what they are and provide the corrected code.\n\nCode:\n${code}`;
    } else if (intent === 'optimize') {
      prompt = `You are a senior developer. Optimize the following ${language} code for time and space complexity, and improve its readability. Explain your changes.\n\nCode:\n${code}`;
    }

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return { success: true, data: response };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { success: false, message: "Failed to analyze code. Please try again." };
  }
}