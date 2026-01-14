
import { GoogleGenAI, Type } from "@google/genai";
import { Appointment } from "../types";

// Always use the named parameter and direct environment variable for API key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSchedule = async (appointments: Appointment[]) => {
  try {
    const prompt = `Analyze this appointment schedule and provide insights in Thai. 
    Appointments: ${JSON.stringify(appointments)}
    Please identify:
    1. Busy days/times.
    2. Any scheduling conflicts.
    3. Suggestions for staffing or resource allocation based on service types.
    Keep it concise and professional.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Access .text property directly
    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้";
  }
};

export const getSmartResponse = async (query: string, appointments: Appointment[]) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an AI Assistant for a service shop. Answer the following user query about their schedule.
      Context: ${JSON.stringify(appointments)}
      User Query: ${query}
      Answer in Thai politely.`,
    });
    // Access .text property directly
    return response.text;
  } catch (error) {
    return "ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล";
  }
};
