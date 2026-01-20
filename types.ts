
export enum SNP {
  Lulusan = "Standar Kompetensi Lulusan",
  Isi = "Standar Isi",
  Proses = "Standar Proses",
  Penilaian = "Standar Penilaian",
  Pendidik = "Standar Pendidik & Tendik",
  Sarpras = "Standar Sarana & Prasarana",
  Pengelolaan = "Standar Pengelolaan",
  Pembiayaan = "Standar Pembiayaan"
}

export type BudgetItem = {
  id: string;
  name: string;
  category: SNP;
  accountCode: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  realization?: number; // Nilai pengeluaran nyata
  source: string;
  month: string;
};

export type EvidenceItem = {
  id: string;
  label: string;
  description: string;
  required: boolean;
  type: string; 
  status?: 'pending' | 'ready';
};

export type SPJRecommendation = {
  activityId: string;
  checklist: EvidenceItem[];
  legalBasis: string;
  tips: string;
};

export type AIAnalysisResponse = {
  summary: string;
  recommendations: string[];
  riskAssessment: "Low" | "Medium" | "High";
};
