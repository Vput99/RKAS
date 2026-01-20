
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetItem, AIAnalysisResponse, SPJRecommendation } from "../types";

// Fungsi pembantu untuk membersihkan output JSON dari AI
function cleanJsonString(str: string): string {
  return str.replace(/```json\n?|```/g, "").trim();
}

export async function analyzeBudget(items: BudgetItem[], totalBudget: number): Promise<AIAnalysisResponse | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Anda adalah auditor profesional BOSP (Biaya Operasional Satuan Pendidikan) Kemdikbud Ristek.
    Analisis data anggaran RKAS berikut berdasarkan Juknis BOSP 2026:
    Total Pagu: Rp${totalBudget.toLocaleString('id-ID')}
    Daftar Item: ${JSON.stringify(items)}
    
    Berikan analisis kritis mengenai:
    1. Kepatuhan terhadap 8 Standar SNP.
    2. Efisiensi harga satuan dibandingkan harga pasar.
    3. Potensi risiko temuan audit (relevansi kegiatan dengan juknis).
    
    Output WAJIB dalam format JSON murni:
    {
      "summary": "string",
      "recommendations": ["string"],
      "riskAssessment": "Low" | "Medium" | "High"
    }
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
            summary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskAssessment: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
          },
          required: ["summary", "recommendations", "riskAssessment"]
        }
      }
    });

    return JSON.parse(cleanJsonString(response.text || "{}"));
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
}

export async function getSPJRecommendations(item: BudgetItem): Promise<SPJRecommendation | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Anda adalah pakar regulasi keuangan sekolah. Buatkan checklist kelengkapan dokumen SPJ Digital sesuai Juknis BOSP 2026 untuk:
    Kegiatan: ${item.name}
    Pagu: Rp${item.total.toLocaleString('id-ID')}
    Kode Rekening: ${item.accountCode}
    
    Pertimbangkan:
    - Jika Honor: Perlu Daftar Hadir, SK, SPTJM, Bukti Potong PPh 21.
    - Jika Barjas/Modal: Perlu Nota SIPLah, Kwitansi, Faktur Pajak (jika kena PPN), BAST, Foto Barang, KIB.
    - Aturan Non-Tunai: Bukti transfer bank.
    
    Output WAJIB JSON murni:
    {
      "activityId": "string",
      "checklist": [
        { "id": "string", "label": "string", "description": "string", "required": true, "type": "Administrasi|Bukti Bayar|Pajak|Serah Terima" }
      ],
      "legalBasis": "Referensi Juknis BOSP 2026 & Aturan Pajak terkait",
      "tips": "Tips auditor agar SPJ tidak menjadi temuan"
    }
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
          required: ["activityId", "checklist", "legalBasis", "tips"]
        }
      }
    });

    return JSON.parse(cleanJsonString(response.text || "{}"));
  } catch (error) {
    console.error("AI SPJ failed:", error);
    return null;
  }
}
