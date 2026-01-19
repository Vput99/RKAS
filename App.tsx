
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  BrainCircuit, 
  Trash2, 
  FileText,
  Wallet,
  TrendingUp,
  ChevronRight,
  Download,
  Calendar,
  Layers,
  FileCheck,
  ShieldCheck,
  Receipt,
  Sparkles,
  Clock,
  CheckCircle,
  Camera,
  PenTool,
  Coins,
  FileBadge,
  MapPin,
  QrCode,
  Filter,
  Pencil,
  X,
  Printer,
  Upload,
  Eye,
  FileUp,
  Loader2,
  Settings,
  School,
  Users,
  BarChart3,
  PieChart,
  Home,
  Save,
  Check
} from 'lucide-react';
import { SNP, BudgetItem, AIAnalysisResponse, SPJRecommendation } from './types';
import { analyzeBudget, getSPJRecommendations } from './services/geminiService';
import { StatCard } from './components/StatCard';
import { jsPDF } from 'jspdf';

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const ACCOUNT_CODES = [
  { code: "5.1.02.01.0001", name: "Honorarium Guru Honorer (Non-ASN)" },
  { code: "5.1.02.01.0002", name: "Honorarium Tenaga Kependidikan Honorer" },
  { code: "5.1.02.02.01.0013", name: "Honorarium Narasumber/Tenaga Ahli" },
  { code: "5.1.02.01.0024", name: "Belanja Alat Tulis Kantor (ATK)" },
  { code: "5.1.02.01.0025", name: "Belanja Kertas dan Cover" },
  { code: "5.1.02.01.0026", name: "Belanja Bahan Cetak (Modul/Formulir)" },
  { code: "5.1.02.01.0027", name: "Belanja Bahan Penggandaan (Fotocopy)" },
  { code: "5.1.02.01.0029", name: "Belanja Bahan Kebersihan" },
  { code: "5.1.02.01.0030", name: "Belanja Obat-obatan (UKS)" },
  { code: "5.1.02.01.0031", name: "Belanja Alat Listrik" },
  { code: "5.1.02.01.0038", name: "Belanja Makanan dan Minuman Kegiatan" },
  { code: "5.1.02.01.0039", name: "Belanja Makanan dan Minuman Tamu" },
  { code: "5.1.02.02.01.0061", name: "Belanja Langganan Listrik" },
  { code: "5.1.02.02.01.0062", name: "Belanja Langganan Telepon" },
  { code: "5.1.02.02.01.0063", name: "Belanja Langganan Air (PDAM)" },
  { code: "5.1.02.02.01.0026", name: "Belanja Langganan Internet (WiFi)" },
  { code: "5.1.02.03.02.0035", name: "Pemeliharaan Bangunan Gedung" },
  { code: "5.1.02.03.02.0121", name: "Pemeliharaan Peralatan Komputer" },
  { code: "5.1.02.03.02.0122", name: "Pemeliharaan Mebeulair" },
  { code: "5.1.02.04.01.0001", name: "Perjalanan Dinas Dalam Daerah" },
  { code: "5.2.02.05.01.0001", name: "Belanja Modal Komputer Unit" },
  { code: "5.2.02.05.01.0005", name: "Belanja Modal Projector" },
  { code: "5.2.05.01.01.0001", name: "Belanja Modal Buku Perpustakaan" }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'analysis' | 'spj' | 'settings'>('dashboard');
  
  // --- Global School & Financial Data ---
  const [schoolData, setSchoolData] = useState({
    name: 'SD Negeri Pintar Jaya',
    npsn: '10203040',
    address: 'Jl. Pendidikan No. 123, Kecamatan Cerdas, Kota Pintar',
  });
  const [totalPagu, setTotalPagu] = useState<number>(150000000);
  const [studentCount, setStudentCount] = useState<number>(450);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- Budget Items State ---
  const [items, setItems] = useState<BudgetItem[]>([
    { id: '1', name: 'Pembelian Laptop Guru', category: SNP.Sarpras, accountCode: "5.2.02.05.01.0001", quantity: 2, unit: 'Unit', price: 7500000, total: 15000000, source: 'BOS Reguler', month: 'Januari' },
    { id: '2', name: 'Kertas HVS A4', category: SNP.Isi, accountCode: "5.1.02.01.0025", quantity: 50, unit: 'Rim', price: 55000, total: 2750000, source: 'BOS Reguler', month: 'Februari' },
    { id: '3', name: 'Pelatihan Kurikulum Merdeka', category: SNP.Pendidik, accountCode: "5.1.02.02.01.0013", quantity: 1, unit: 'Paket', price: 5000000, total: 5000000, source: 'BOS Reguler', month: 'Januari' },
  ]);

  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- SPJ States ---
  const [selectedSpjItem, setSelectedSpjItem] = useState<BudgetItem | null>(null);
  const [spjRecommendations, setSpjRecommendations] = useState<Record<string, SPJRecommendation>>({});
  const [loadingSpj, setLoadingSpj] = useState<string | null>(null);
  const [checkedEvidence, setCheckedEvidence] = useState<Record<string, Set<string>>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, Record<string, string>>>({}); 
  const [spjFilterMonth, setSpjFilterMonth] = useState<string>('Semua');

  // --- Memoized Recaps ---
  const totalSpent = useMemo(() => items.reduce((acc, item) => acc + item.total, 0), [items]);
  const usagePercentage = useMemo(() => (totalSpent / totalPagu) * 100, [totalSpent, totalPagu]);

  const filteredSpjItems = useMemo(() => {
    if (spjFilterMonth === 'Semua') return items;
    return items.filter(item => item.month === spjFilterMonth);
  }, [items, spjFilterMonth]);

  const budgetRecap = useMemo(() => {
    const monthTotals = MONTHS.map(month => ({
      month,
      total: items.filter(i => i.month === month).reduce((acc, curr) => acc + curr.total, 0)
    }));
    
    const sem1 = monthTotals.slice(0, 6).reduce((acc, curr) => acc + curr.total, 0);
    const sem2 = monthTotals.slice(6, 12).reduce((acc, curr) => acc + curr.total, 0);

    const snpTotals = Object.values(SNP).map(snp => ({
      name: snp,
      total: items.filter(i => i.category === snp).reduce((acc, curr) => acc + curr.total, 0)
    }));

    return {
      months: monthTotals,
      semester1: sem1,
      semester2: sem2,
      yearly: totalSpent,
      snpTotals
    };
  }, [items, totalSpent]);

  // --- Effects ---
  useEffect(() => {
    const triggerFetch = async () => {
      if (selectedSpjItem && !spjRecommendations[selectedSpjItem.id] && !loadingSpj) {
        setLoadingSpj(selectedSpjItem.id);
        const result = await getSPJRecommendations(selectedSpjItem);
        if (result) {
          setSpjRecommendations(prev => ({ ...prev, [selectedSpjItem.id]: result }));
        }
        setLoadingSpj(null);
      }
    };
    triggerFetch();
  }, [selectedSpjItem, spjRecommendations, loadingSpj]);

  useEffect(() => {
    if (activeTab === 'spj' && !selectedSpjItem && filteredSpjItems.length > 0) {
      setSelectedSpjItem(filteredSpjItems[0]);
    }
  }, [activeTab, selectedSpjItem, filteredSpjItems]);

  // --- Handlers ---
  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const price = Number(formData.get('price'));
    const quantity = Number(formData.get('quantity'));
    
    if (!price || !quantity) return;

    if (editingItem) {
      setItems(prev => prev.map(item => item.id === editingItem.id ? {
        ...item,
        name: formData.get('name') as string,
        category: formData.get('category') as SNP,
        accountCode: formData.get('accountCode') as string,
        quantity,
        unit: formData.get('unit') as string,
        price,
        total: price * quantity,
        source: formData.get('source') as string,
        month: formData.get('month') as string,
      } : item));
      setEditingItem(null);
    } else {
      const newItem: BudgetItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.get('name') as string,
        category: formData.get('category') as SNP,
        accountCode: formData.get('accountCode') as string,
        quantity,
        unit: formData.get('unit') as string,
        price,
        total: price * quantity,
        source: formData.get('source') as string,
        month: formData.get('month') as string,
      };
      setItems(prev => [...prev, newItem]);
    }
    e.currentTarget.reset();
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (selectedSpjItem?.id === id) setSelectedSpjItem(null);
    if (editingItem?.id === id) {
      setEditingItem(null);
      formRef.current?.reset();
    }
  };

  const startEditing = (item: BudgetItem) => {
    setEditingItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    formRef.current?.reset();
  };

  const triggerAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeBudget(items, totalPagu);
    if (result) setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const selectSpjItem = (item: BudgetItem) => {
    setSelectedSpjItem(item);
  };

  const toggleEvidence = (activityId: string, evidenceId: string) => {
    setCheckedEvidence(prev => {
      const current = new Set(prev[activityId] || []);
      if (current.has(evidenceId)) {
        current.delete(evidenceId);
      } else {
        current.add(evidenceId);
      }
      return { ...prev, [activityId]: current };
    });
  };

  const handleFileUpload = (activityId: string, evidenceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCheckedEvidence(prev => {
        const current = new Set(prev[activityId] || []);
        current.add(evidenceId);
        return { ...prev, [activityId]: current };
      });
      setUploadedFiles(prev => ({
        ...prev,
        [activityId]: {
          ...(prev[activityId] || {}),
          [evidenceId]: file.name
        }
      }));
    }
  };

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const getEvidenceIcon = (type: string) => {
    switch(type) {
      case 'receipt': return <Receipt size={18} />;
      case 'photo': return <Camera size={18} />;
      case 'signature': return <PenTool size={18} />;
      case 'tax': return <Coins size={18} />;
      case 'doc': return <FileBadge size={18} />;
      default: return <FileText size={18} />;
    }
  };

  const handleExportPDF = () => {
    if (!selectedSpjItem) return;
    const doc = new jsPDF();
    const recommendations = spjRecommendations[selectedSpjItem.id];
    const checked = checkedEvidence[selectedSpjItem.id] || new Set();
    const primaryColor = [79, 70, 229]; 
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('RKAS PINTAR - LAPORAN SPJ', 20, 20);
    doc.setFontSize(10);
    doc.text(`Sekolah: ${schoolData.name}`, 20, 28);
    doc.text(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 160, 28);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('1. DETAIL KEGIATAN', 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 58, 190, 58);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const details = [
      ['NPSN', schoolData.npsn],
      ['Kegiatan', selectedSpjItem.name],
      ['Kode Rekening', selectedSpjItem.accountCode],
      ['Bulan', selectedSpjItem.month],
      ['Nominal', formatIDR(selectedSpjItem.total)],
    ];
    let yPos = 68;
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 25, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 65, yPos);
      yPos += 8;
    });
    doc.save(`SPJ_${selectedSpjItem.month}_${selectedSpjItem.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-950 text-slate-300 flex flex-col sticky top-0 h-auto md:h-screen z-50 shadow-2xl no-print">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-900/50">
              <ClipboardList className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none tracking-tight">RKAS<span className="text-indigo-500">Pintar</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sistem Cerdas BOSP</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
              { id: 'planner', icon: PlusCircle, label: 'Anggaran Baru' },
              { id: 'spj', icon: Receipt, label: 'Manajemen SPJ' },
              { id: 'analysis', icon: BrainCircuit, label: 'AI Analysis' },
              { id: 'settings', icon: Settings, label: 'Pengaturan' },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-100'}`}
              >
                <div className="flex items-center gap-4">
                  <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-indigo-400'} />
                  <span className="font-bold text-sm tracking-wide">{item.label}</span>
                </div>
                {activeTab === item.id && <ChevronRight size={14} className="opacity-50" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 pt-0">
          <div className="bg-slate-900/50 rounded-[24px] p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Efisiensi Dana</p>
              <p className="text-xs font-bold text-indigo-400">{usagePercentage.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-700" 
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 no-print">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
              <School size={12} />
              {schoolData.name} ({schoolData.npsn})
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'planner' && 'Perencanaan Strategis'}
              {activeTab === 'analysis' && 'Gemini AI Insights'}
              {activeTab === 'spj' && 'Pertanggungjawaban (SPJ)'}
              {activeTab === 'settings' && 'Pengaturan & Rekapitulasi'}
            </h2>
            <p className="text-slate-400 font-medium">Tahun Anggaran {new Date().getFullYear()}</p>
          </div>
        </header>

        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Pagu Diterima" value={formatIDR(totalPagu)} icon={<Wallet size={24} />} variant="primary" trend="BOS Tahap 1 & 2" />
                <StatCard title="Total Belanja" value={formatIDR(totalSpent)} icon={<TrendingUp size={24} />} variant="warning" trend="Realisasi Saat Ini" />
                <StatCard title="Sisa Saldo" value={formatIDR(totalPagu - totalSpent)} icon={<Coins size={24} />} variant="success" trend="Tersedia" />
                <StatCard title="Jumlah Siswa" value={`${studentCount} Siswa`} icon={<Users size={24} />} variant="primary" trend="Basis Data Dapodik" />
              </div>
              
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-black text-xl text-slate-800">Daftar Kegiatan Utama</h3>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                          <tr>
                            <th className="px-8 py-5">Kegiatan</th>
                            <th className="px-8 py-5">Bulan</th>
                            <th className="px-8 py-5 text-right">Nominal</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                               <td className="px-8 py-5">
                                 <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                 <p className="text-[10px] text-slate-400 font-medium">{item.category}</p>
                               </td>
                               <td className="px-8 py-5">
                                 <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">{item.month}</span>
                               </td>
                               <td className="px-8 py-5 text-right font-black text-slate-900">{formatIDR(item.total)}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'planner' && (
             <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-4 space-y-4">
                  <div className={`bg-white p-8 rounded-[32px] shadow-sm border ${editingItem ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-200'} h-fit transition-all duration-300`}>
                    <h3 className="font-black text-xl text-slate-800 mb-8 flex items-center gap-3">
                      {editingItem ? <Pencil className="text-amber-500" size={24} /> : <PlusCircle className="text-indigo-600" size={24} />}
                      {editingItem ? 'Edit Detail Anggaran' : 'Input Item Baru'}
                    </h3>
                    <form ref={formRef} onSubmit={handleAddItem} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Kegiatan</label>
                        <input name="name" defaultValue={editingItem?.name || ''} key={editingItem?.id || 'new'} required className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium focus:ring-2 focus:ring-indigo-500/20" placeholder="Contoh: Pembelian Laptop Guru" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bulan Pelaksanaan</label>
                          <select name="month" defaultValue={editingItem?.month || MONTHS[0]} key={editingItem?.id || 'month-new'} required className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20">
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Standar (SNP)</label>
                          <select name="category" defaultValue={editingItem?.category || SNP.Sarpras} key={editingItem?.id || 'cat-new'} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20">
                            {Object.values(SNP).map(val => <option key={val} value={val}>{val}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Rekening (ARKAS)</label>
                        <select name="accountCode" defaultValue={editingItem?.accountCode || ''} key={editingItem?.id || 'code-new'} required className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20">
                          <option value="">Pilih Kode Rekening...</option>
                          {ACCOUNT_CODES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah</label>
                          <input name="quantity" type="number" defaultValue={editingItem?.quantity || 1} min="1" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Satuan</label>
                          <input name="unit" placeholder="Rim/Unit/Bln" defaultValue={editingItem?.unit || ''} required className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Satuan (IDR)</label>
                        <input name="price" type="number" defaultValue={editingItem?.price || ''} required min="0" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20" placeholder="0" />
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <button type="submit" className={`w-full ${editingItem ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-black py-4 rounded-[20px] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3`}>
                          {editingItem ? <ShieldCheck size={20} /> : <PlusCircle size={20} />}
                          {editingItem ? 'Update Anggaran' : 'Simpan Anggaran'}
                        </button>
                        {editingItem && (
                          <button type="button" onClick={cancelEditing} className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-[20px] hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm">
                            <X size={16} />
                            Batalkan
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                <div className="xl:col-span-8 bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                     <h3 className="font-black text-xl text-slate-800">Review Rencana Kegiatan</h3>
                     <span className="bg-white px-4 py-1.5 rounded-full border border-slate-100 text-[10px] font-black text-slate-400 uppercase">TOTAL {items.length} ITEM</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-96 opacity-30">
                        <Layers size={64} />
                        <p className="mt-4 font-bold">Belum ada rencana ditambahkan</p>
                      </div>
                    ) : (
                      items.map(item => (
                        <div key={item.id} className={`p-8 flex justify-between items-center group hover:bg-slate-50 transition-colors ${editingItem?.id === item.id ? 'bg-amber-50/50 border-l-4 border-amber-400' : ''}`}>
                           <div className="flex gap-6 items-center">
                              <div className={`w-12 h-12 ${editingItem?.id === item.id ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'} rounded-2xl flex items-center justify-center font-black transition-colors`}>
                                 {item.accountCode.substring(item.accountCode.length - 2)}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-lg">{item.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] font-black ${editingItem?.id === item.id ? 'text-amber-600' : 'text-indigo-600'} uppercase tracking-wider`}>{item.month}</span>
                                  <span className="text-slate-300">|</span>
                                  <span className="text-[10px] font-mono font-bold text-slate-400">{item.accountCode}</span>
                                </div>
                              </div>
                           </div>
                           <div className="text-right flex items-center gap-4">
                              <div className="mr-4">
                                <p className="font-black text-xl text-slate-900 leading-none">{formatIDR(item.total)}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.quantity} {item.unit}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => startEditing(item)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                  <Pencil size={18} />
                                </button>
                                <button onClick={() => removeItem(item.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'spj' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-4 no-print">
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm h-fit">
                   <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                        <Receipt className="text-indigo-600" size={24} />
                        Kegiatan SPJ
                      </h3>
                      <div className="relative group">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 cursor-pointer hover:border-indigo-200 transition-all">
                           <Filter size={14} className="text-slate-400" />
                           <select 
                             value={spjFilterMonth} 
                             onChange={(e) => setSpjFilterMonth(e.target.value)}
                             className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer"
                           >
                             <option value="Semua">Semua Bulan</option>
                             {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-3">
                     {filteredSpjItems.length === 0 ? (
                       <div className="py-12 text-center">
                          <Clock size={32} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-xs font-bold text-slate-400">Tidak ada kegiatan di bulan ini</p>
                       </div>
                     ) : (
                       filteredSpjItems.map((item) => {
                         const currentRec = spjRecommendations[item.id];
                         const totalDocs = currentRec?.checklist?.length || 1;
                         const checkedCount = checkedEvidence[item.id]?.size || 0;
                         const progress = (checkedCount / totalDocs) * 100;
                         
                         return (
                           <button 
                             key={item.id}
                             onClick={() => selectSpjItem(item)}
                             className={`w-full text-left p-5 rounded-2xl border transition-all relative overflow-hidden group ${selectedSpjItem?.id === item.id ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 text-white' : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-600'}`}
                           >
                             <div className="flex justify-between items-start mb-2 relative z-10">
                               <div>
                                 <div className="flex items-center gap-2">
                                   <p className={`text-[10px] font-black uppercase tracking-widest ${selectedSpjItem?.id === item.id ? 'text-indigo-200' : 'text-indigo-500'}`}>
                                     {item.month}
                                   </p>
                                   <span className={`text-[8px] px-1.5 py-0.5 rounded ${selectedSpjItem?.id === item.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                     {item.accountCode.split('.').pop()}
                                   </span>
                                 </div>
                                 <h4 className="font-black text-sm truncate max-w-[200px] mt-1">{item.name}</h4>
                               </div>
                               <div className="text-right">
                                 <p className="font-black text-xs">{formatIDR(item.total)}</p>
                               </div>
                             </div>
                             <div className="mt-4 space-y-2 relative z-10">
                                <div className="flex justify-between items-center text-[10px] font-black">
                                  <span>DOKUMEN SPJ</span>
                                  <span>{Math.round(progress)}%</span>
                                </div>
                                <div className={`h-1.5 w-full rounded-full ${selectedSpjItem?.id === item.id ? 'bg-indigo-400' : 'bg-slate-100'}`}>
                                  <div className={`h-full rounded-full transition-all duration-500 ${selectedSpjItem?.id === item.id ? 'bg-white' : 'bg-indigo-600'}`} style={{ width: `${progress}%` }} />
                                </div>
                             </div>
                           </button>
                         );
                       })
                     )}
                   </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                {selectedSpjItem ? (
                  <div className="space-y-6 animate-in slide-in-from-right duration-500">
                    <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm print-area relative min-h-[600px]">
                       {loadingSpj === selectedSpjItem.id && !spjRecommendations[selectedSpjItem.id] && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 rounded-[40px] flex flex-col items-center justify-center">
                            <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                            <p className="text-lg font-black text-slate-800">Menyusun Rekomendasi AI...</p>
                         </div>
                       )}

                       <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                             <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
                                <Calendar size={24} />
                             </div>
                             <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedSpjItem.name}</h3>
                                <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                                   <ShieldCheck size={14} className="text-emerald-500" />
                                   Bulan {selectedSpjItem.month}
                                </p>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 gap-3">
                          {spjRecommendations[selectedSpjItem.id]?.checklist?.map((doc) => {
                            const isChecked = checkedEvidence[selectedSpjItem.id]?.has(doc.id);
                            return (
                              <div key={doc.id} className="p-5 rounded-3xl border border-slate-100 bg-white flex items-center gap-5 group transition-all">
                                <div 
                                  onClick={() => toggleEvidence(selectedSpjItem.id, doc.id)}
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all shrink-0 ${isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                                >
                                    {isChecked ? <CheckCircle size={22} /> : getEvidenceIcon(doc.type)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-sm text-slate-800">{doc.label}</p>
                                    <p className="text-xs text-slate-400 font-medium">{doc.description}</p>
                                </div>
                                <label className={`p-2.5 rounded-xl cursor-pointer ${isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}>
                                    <Upload size={16} />
                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(selectedSpjItem.id, doc.id, e)} />
                                </label>
                              </div>
                            );
                          })}
                       </div>

                       <div className="mt-10 pt-8 border-t border-slate-100 flex gap-4 no-print">
                          <button onClick={handleExportPDF} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 flex items-center justify-center gap-3">
                             <Printer size={18} /> Cetak SPJ
                          </button>
                       </div>
                    </div>
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center h-full py-20 opacity-30">
                      <Receipt size={64} />
                      <p className="mt-4 font-bold">Pilih kegiatan untuk mengelola SPJ</p>
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-10">
               <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  {/* Left Column: Form Inputs */}
                  <div className="xl:col-span-5 space-y-6">
                     <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                           <School size={120} />
                        </div>
                        <h3 className="font-black text-xl text-slate-800 mb-8 flex items-center gap-3">
                           <School className="text-indigo-600" size={24} />
                           Konfigurasi Sekolah
                        </h3>
                        <form onSubmit={handleSaveSettings} className="space-y-5">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Instansi Sekolah</label>
                              <div className="relative">
                                 <input 
                                    value={schoolData.name} 
                                    onChange={e => setSchoolData({...schoolData, name: e.target.value})}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/10"
                                    placeholder="Nama Sekolah..."
                                 />
                                 <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor NPSN</label>
                                 <input 
                                    value={schoolData.npsn} 
                                    onChange={e => setSchoolData({...schoolData, npsn: e.target.value})}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none text-sm font-bold text-slate-800"
                                    placeholder="NPSN..."
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah Siswa</label>
                                 <div className="relative">
                                    <input 
                                       type="number"
                                       value={studentCount} 
                                       onChange={e => setStudentCount(Number(e.target.value))}
                                       className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none text-sm font-bold text-slate-800"
                                    />
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Lengkap</label>
                              <div className="relative">
                                 <textarea 
                                    value={schoolData.address} 
                                    onChange={e => setSchoolData({...schoolData, address: e.target.value})}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none text-sm font-bold text-slate-800 h-24 resize-none"
                                    placeholder="Alamat Lengkap..."
                                 />
                                 <MapPin className="absolute left-4 top-5 text-slate-300" size={18} />
                              </div>
                           </div>

                           <div className="pt-4 border-t border-slate-100 mt-6">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Total Pagu BOSP Diterima (Rp)</label>
                                 <div className="relative">
                                    <input 
                                       type="number"
                                       value={totalPagu} 
                                       onChange={e => setTotalPagu(Number(e.target.value))}
                                       className="w-full pl-12 pr-5 py-5 bg-indigo-50/30 border border-indigo-100 rounded-[24px] outline-none text-lg font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={24} />
                                 </div>
                                 <p className="text-[10px] text-slate-400 font-medium italic mt-1">*Nilai ini akan menjadi acuan utama analisis efisiensi AI.</p>
                              </div>
                           </div>

                           <button type="submit" className={`w-full mt-6 py-4 rounded-[20px] font-black text-sm flex items-center justify-center gap-3 transition-all ${saveSuccess ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100'}`}>
                              {saveSuccess ? <Check size={20} /> : <Save size={20} />}
                              {saveSuccess ? 'Konfigurasi Tersimpan' : 'Simpan Perubahan'}
                           </button>
                        </form>
                     </div>
                  </div>

                  {/* Right Column: Recaps & Visualization */}
                  <div className="xl:col-span-7 space-y-6">
                     <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                           <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                              <BarChart3 className="text-indigo-600" size={24} />
                              Laporan Rekapitulasi Tahunan
                           </h3>
                           <div className="flex gap-2">
                              <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">
                                 ANGGARAN {new Date().getFullYear()}
                              </div>
                           </div>
                        </div>

                        {/* Yearly & Semester Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                           <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 group hover:border-indigo-200 transition-colors">
                              <div className="flex justify-between items-center mb-4">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semester Ganjil (Jan-Jun)</p>
                                 <Layers size={16} className="text-indigo-300" />
                              </div>
                              <p className="text-2xl font-black text-slate-900 leading-none mb-3">{formatIDR(budgetRecap.semester1)}</p>
                              <div className="flex items-center gap-2">
                                 <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{width: `${(budgetRecap.semester1 / totalPagu) * 100}%`}}></div>
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400">{((budgetRecap.semester1 / totalPagu) * 100).toFixed(1)}%</span>
                              </div>
                           </div>
                           <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 group hover:border-indigo-200 transition-colors">
                              <div className="flex justify-between items-center mb-4">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semester Genap (Jul-Des)</p>
                                 <Layers size={16} className="text-indigo-300" />
                              </div>
                              <p className="text-2xl font-black text-slate-900 leading-none mb-3">{formatIDR(budgetRecap.semester2)}</p>
                              <div className="flex items-center gap-2">
                                 <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{width: `${(budgetRecap.semester2 / totalPagu) * 100}%`}}></div>
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400">{((budgetRecap.semester2 / totalPagu) * 100).toFixed(1)}%</span>
                              </div>
                           </div>
                        </div>

                        {/* Monthly Breakdown Table */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-2">
                              <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                                 <Clock size={12} /> Realisasi Per Bulan
                              </h4>
                              <button className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest">Lihat Detail Laporan</button>
                           </div>
                           <div className="overflow-x-auto rounded-3xl border border-slate-100">
                              <table className="w-full text-left">
                                 <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                    <tr>
                                       <th className="px-6 py-4">Nama Bulan</th>
                                       <th className="px-6 py-4 text-right">Alokasi Anggaran</th>
                                       <th className="px-6 py-4 text-right">Persentase</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {budgetRecap.months.map(m => (
                                       <tr key={m.month} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 font-bold text-sm text-slate-800">{m.month}</td>
                                          <td className="px-6 py-4 text-right font-black text-slate-900">{formatIDR(m.total)}</td>
                                          <td className="px-6 py-4 text-right">
                                             <div className="inline-flex items-center gap-2">
                                                <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                   <div className="h-full bg-indigo-400" style={{width: `${totalSpent > 0 ? (m.total / totalSpent) * 100 : 0}%`}}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-indigo-400">
                                                   {totalSpent > 0 ? ((m.total / totalSpent) * 100).toFixed(1) : 0}%
                                                </span>
                                             </div>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                                 <tfoot className="bg-indigo-50/50">
                                    <tr className="font-black text-indigo-900">
                                       <td className="px-6 py-4">TOTAL TAHUNAN</td>
                                       <td className="px-6 py-4 text-right">{formatIDR(totalSpent)}</td>
                                       <td className="px-6 py-4 text-right">{((totalSpent / totalPagu) * 100).toFixed(1)}% Dari Pagu</td>
                                    </tr>
                                 </tfoot>
                              </table>
                           </div>
                        </div>
                     </div>

                     {/* SNP Standard Distribution */}
                     <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                        <h3 className="font-black text-xl text-slate-800 mb-8 flex items-center gap-3">
                           <PieChart className="text-indigo-600" size={24} />
                           Sebaran Standar SNP
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              {budgetRecap.snpTotals.map((snp, idx) => (
                                 <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                       <span className="text-slate-500 truncate max-w-[180px]">{snp.name}</span>
                                       <span className="text-slate-800">{formatIDR(snp.total)}</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                                       <div 
                                          className={`h-full rounded-full ${idx % 2 === 0 ? 'bg-indigo-500' : 'bg-emerald-500'}`} 
                                          style={{width: `${totalSpent > 0 ? (snp.total / totalSpent) * 100 : 0}%`}}
                                       ></div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                           <div className="bg-indigo-50/50 rounded-[24px] p-6 flex flex-col items-center justify-center text-center">
                              <Sparkles className="text-indigo-600 mb-4" size={40} />
                              <h4 className="font-black text-slate-800 mb-2">Insight SNP</h4>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                 Distribusi anggaran Anda saat ini paling banyak terfokus pada <span className="text-indigo-600 font-bold">
                                    {budgetRecap.snpTotals.sort((a,b) => b.total - a.total)[0]?.name}
                                 </span>. Gunakan menu AI Analysis untuk menyeimbangkan prioritas.
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'analysis' && (
             <div className="max-w-5xl mx-auto py-10 no-print">
                {!aiAnalysis && !isAnalyzing && (
                  <div className="bg-white p-20 rounded-[48px] border border-slate-200 shadow-xl text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
                    <div className="bg-indigo-600 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-200">
                      <BrainCircuit className="text-white" size={44} />
                    </div>
                    <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Audit Strategis RKAS</h3>
                    <p className="text-slate-500 mb-12 text-lg max-w-lg mx-auto font-medium">Gunakan kecerdasan Gemini untuk memverifikasi kepatuhan anggaran Anda terhadap 8 Standar Nasional Pendidikan secara otomatis.</p>
                    <button onClick={triggerAIAnalysis} className="bg-indigo-600 text-white px-12 py-5 rounded-[24px] font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 flex items-center gap-3 mx-auto">
                       <Sparkles size={24} />
                       Jalankan Audit AI
                    </button>
                  </div>
                )}
                {isAnalyzing && (
                   <div className="text-center py-32">
                      <div className="relative w-24 h-24 mx-auto mb-8">
                         <div className="absolute inset-0 rounded-full border-8 border-indigo-50"></div>
                         <div className="absolute inset-0 rounded-full border-8 border-indigo-600 border-t-transparent animate-spin"></div>
                      </div>
                      <h3 className="text-2xl font-black text-slate-800">Menghubungkan ke Mesin Audit...</h3>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Menganalisis Kepatuhan Juknis 2026</p>
                   </div>
                )}
                {aiAnalysis && !isAnalyzing && (
                  <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-200 space-y-12 animate-in zoom-in duration-500">
                     <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                           <div className="bg-indigo-600 p-3 rounded-2xl text-white">
                              <FileCheck size={28} />
                           </div>
                           <div>
                              <h4 className="font-black text-3xl text-slate-800 tracking-tight">Hasil Audit RKAS 2026</h4>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Metadata-Verified Report</p>
                           </div>
                        </div>
                        <div className={`px-6 py-2.5 rounded-2xl font-black text-sm border shadow-sm ${aiAnalysis.riskAssessment === 'Low' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : aiAnalysis.riskAssessment === 'Medium' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                           TINGKAT RISIKO: {aiAnalysis.riskAssessment.toUpperCase()}
                        </div>
                     </div>
                     <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                        <p className="text-xl font-medium text-slate-700 leading-relaxed italic">"{aiAnalysis.summary}"</p>
                     </div>
                     <div className="space-y-6">
                        <h5 className="font-black text-slate-400 text-xs uppercase tracking-[0.2em] ml-2">Daftar Rekomendasi Perbaikan</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {aiAnalysis.recommendations.map((r: string, i: number) => (
                              <div key={i} className="bg-white p-6 rounded-[28px] border border-slate-100 flex items-start gap-4 hover:shadow-lg hover:shadow-indigo-50/50 transition-all cursor-default">
                                 <div className="bg-indigo-600 text-white p-2 rounded-xl shrink-0 shadow-md shadow-indigo-100"><CheckCircle size={16} /></div>
                                 <p className="font-bold text-slate-700 text-sm leading-relaxed">{r}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="flex justify-center pt-8">
                        <button onClick={() => setAiAnalysis(null)} className="flex items-center gap-2 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-indigo-600 transition-colors">
                           <X size={14} />
                           Mulai Analisis Baru
                        </button>
                     </div>
                  </div>
                )}
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
