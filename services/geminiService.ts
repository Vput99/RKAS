
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetItem, AIAnalysisResponse, SPJRecommendation } from "../types";

export async function analyzeBudget(items: BudgetItem[], totalBudget: number): Promise<AIAnalysisResponse | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analisis data anggaran RKAS berikut sebagai auditor profesional:
    Pagu: Rp${totalBudget.toLocaleString('id-ID')}
    Item: ${JSON.stringify(items)}
    Berikan analisis JSON: summary (string), recommendations (array of string), riskAssessment (Low/Medium/High).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskAssessment: { type: Type.STRING }
          },
          required: ["summary", "recommendations", "riskAssessment"]
        }
      }
    });

    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
}

export async function getSPJRecommendations(item: BudgetItem): Promise<SPJRecommendation | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Berikan checklist SPJ berdasarkan JUKNIS BOSP 2026 untuk kegiatan:
    Nama: ${item.name}
    SNP: ${item.category}
    Nilai: Rp${item.total.toLocaleString('id-ID')}
    
    Berikan JSON: activityId, legalBasis, tips, dan checklist (array: id, label, description, required, type).
    Type: receipt, photo, signature, tax, doc.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            activityId: { type: Type.STRING },
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  type: { type: Type.STRING }
                },
                required: ["id", "label", "description", "required", "type"]
              }
            },
            legalBasis: { type: Type.STRING },
            tips: { type: Type.STRING }
          },
          required: ["checklist", "legalBasis", "tips"]
        }
      }
    });

    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("AI SPJ Recommendation failed:", error);
    return null;
  }
}
