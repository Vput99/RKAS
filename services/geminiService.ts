
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetItem, AIAnalysisResponse, SPJRecommendation } from "../types";

// Fix: Added explicit return type Promise<AIAnalysisResponse | null>
export async function analyzeBudget(items: BudgetItem[], totalBudget: number): Promise<AIAnalysisResponse | null> {
  // Always initialize GoogleGenAI inside the function to use the latest API key from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Bertindaklah sebagai Konsultan Keuangan Pendidikan Senior di Indonesia.
    Analisis data anggaran RKAS (Rencana Kegiatan dan Anggaran Sekolah) berikut:
    Total Pagu: Rp${totalBudget.toLocaleString('id-ID')}
    Daftar Item: ${JSON.stringify(items)}

    Berikan analisis mendalam mengenai:
    1. Kesesuaian dengan 8 Standar Nasional Pendidikan (SNP).
    2. Identifikasi pemborosan atau efisiensi yang mungkin dilakukan.
    3. Rekomendasi prioritas pengeluaran untuk meningkatkan mutu pendidikan.
    4. Penilaian risiko kepatuhan anggaran.

    Berikan respon dalam format JSON yang valid sesuai schema.
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
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            riskAssessment: { 
                type: Type.STRING,
                description: "Nilai: Low, Medium, atau High"
            }
          },
          required: ["summary", "recommendations", "riskAssessment"]
        }
      }
    });

    // Access response.text as a property and trim before parsing
    const resultText = response.text?.trim() || "{}";
    return JSON.parse(resultText);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
}

// Fix: Added explicit return type Promise<SPJRecommendation | null>
export async function getSPJRecommendations(item: BudgetItem): Promise<SPJRecommendation | null> {
  // Always initialize GoogleGenAI inside the function to use the latest API key from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Bertindaklah sebagai Ahli Audit Internal Kemendikbudristek RI.
    Berikan rekomendasi daftar bukti (evidence) SPJ untuk kegiatan berikut berdasarkan JUKNIS BOSP TAHUN 2026:
    Nama Kegiatan: ${item.name}
    Kategori SNP: ${item.category}
    Kode Rekening: ${item.accountCode}
    Total Nilai: Rp${item.total.toLocaleString('id-ID')}

    Aturan Juknis 2026 menekankan pada:
    - Digitalisasi penuh (E-Kwitansi, QR Code).
    - Bukti foto dengan Metadata/Geotagging.
    - Dokumentasi absensi digital untuk honor/pelatihan.
    - Kelengkapan pajak (PPN/PPh) sesuai tarif terbaru 2026.

    Berikan daftar checklist dokumen yang HARUS ada agar lolos audit BOS.
    Tentukan 'type' untuk setiap item: 'receipt', 'photo', 'signature', 'tax', atau 'doc'.
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
                  type: { type: Type.STRING, description: "receipt, photo, signature, tax, doc" }
                },
                required: ["id", "label", "description", "required", "type"]
              }
            },
            legalBasis: { type: Type.STRING, description: "Pasal atau dasar hukum Juknis BOSP 2026" },
            tips: { type: Type.STRING, description: "Tips khusus agar tidak jadi temuan BPK" }
          },
          required: ["checklist", "legalBasis", "tips"]
        }
      }
    });

    // Access response.text as a property and trim before parsing
    const resultText = response.text?.trim() || "{}";
    return JSON.parse(resultText);
  } catch (error) {
    console.error("AI SPJ Recommendation failed:", error);
    return null;
  }
}
