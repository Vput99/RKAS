
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
  Check,
  Database,
  RefreshCw
} from 'lucide-react';
import { SNP, BudgetItem, AIAnalysisResponse, SPJRecommendation } from './types';
import { analyzeBudget, getSPJRecommendations } from './services/geminiService';
import { storageService } from './services/storageService';
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
  { code: "5.1.02.01.0027", name: "Belanja Bahan Penggandaan (Fotocopy)" },
  { code: "5.1.02.01.0038", name: "Belanja Makanan dan Minuman Kegiatan" },
  { code: "5.1.02.02.01.0026", name: "Belanja Langganan Internet (WiFi)" },
  { code: "5.2.02.05.01.0001", name: "Belanja Modal Komputer Unit" }
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
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');

  // --- Budget Items State ---
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- Initialization: Load from DB ---
  useEffect(() => {
    const data = storageService.loadAll();
    setItems(data.items);
    if (data.schoolData) setSchoolData(data.schoolData);
    setTotalPagu(data.totalPagu);
    setStudentCount(data.studentCount);
    setIsLoaded(true);
  }, []);

  // --- Auto-Sync Engine: Sync to DB on changes ---
  useEffect(() => {
    if (!isLoaded) return;
    setDbStatus('syncing');
    const timer = setTimeout(() => {
      storageService.saveItems(items);
      storageService.saveSchoolData(schoolData);
      storageService.savePagu(totalPagu);
      storageService.saveStudents(studentCount);
      setDbStatus('connected');
    }, 500); // Debounce
    return () => clearTimeout(timer);
  }, [items, schoolData, totalPagu, studentCount, isLoaded]);

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

  const removeItem = (id: string) => {
    if (confirm('Hapus item anggaran ini?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const startEditing = (item: BudgetItem) => {
    setEditingItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatIDR = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black text-2xl animate-pulse">MEMUAT DATABASE...</div>;

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

        <div className="mt-auto p-8 space-y-6">
          {/* Database Status Indicator */}
          <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-colors ${dbStatus === 'syncing' ? 'bg-amber-900/20 border-amber-800 text-amber-400' : 'bg-emerald-900/20 border-emerald-800 text-emerald-400'}`}>
            {dbStatus === 'syncing' ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {dbStatus === 'syncing' ? 'Menyinkronkan...' : 'Database Aktif'}
            </span>
          </div>

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
        {/* Main Content Areas (Keep your existing tab logic here) */}
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
          </div>
        </header>

        {/* --- Render Active Tab Content (Dashboard, Planner, etc. - keep existing logic) --- */}
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
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
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

           {activeTab === 'settings' && (
              <div className="space-y-10">
                 <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-5 space-y-6">
                       <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
                          <h3 className="font-black text-xl text-slate-800 mb-8 flex items-center gap-3">
                             <School className="text-indigo-600" size={24} />
                             Konfigurasi Sekolah
                          </h3>
                          <div className="space-y-5">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Instansi Sekolah</label>
                                <input 
                                   value={schoolData.name} 
                                   onChange={e => setSchoolData({...schoolData, name: e.target.value})}
                                   className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none text-sm font-bold text-slate-800"
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NPSN</label>
                                   <input value={schoolData.npsn} onChange={e => setSchoolData({...schoolData, npsn: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none text-sm font-bold text-slate-800" />
                                </div>
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Siswa</label>
                                   <input type="number" value={studentCount} onChange={e => setStudentCount(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] outline-none text-sm font-bold text-slate-800" />
                                </div>
                             </div>
                             <div className="space-y-1.5 pt-4">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Total Pagu BOSP (Rp)</label>
                                <input type="number" value={totalPagu} onChange={e => setTotalPagu(Number(e.target.value))} className="w-full px-5 py-5 bg-indigo-50/30 border border-indigo-100 rounded-[24px] outline-none text-lg font-black text-indigo-600" />
                             </div>
                             <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                <CheckCircle size={18} />
                                <span className="text-xs font-bold">Data Tersimpan Otomatis ke Database</span>
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="xl:col-span-7 space-y-6">
                       <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                          <h3 className="font-black text-xl text-slate-800 mb-8 flex items-center gap-3">
                             <BarChart3 className="text-indigo-600" size={24} />
                             Rekapitulasi Semester
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="bg-slate-50 p-6 rounded-[24px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Semester 1</p>
                                <p className="text-xl font-black text-slate-900">{formatIDR(budgetRecap.semester1)}</p>
                             </div>
                             <div className="bg-slate-50 p-6 rounded-[24px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Semester 2</p>
                                <p className="text-xl font-black text-slate-900">{formatIDR(budgetRecap.semester2)}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           )}

           {/* --- Tab Planner & Others (same logic as before) --- */}
           {activeTab === 'planner' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                 <div className="xl:col-span-4 space-y-4">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200">
                       <h3 className="font-black text-xl mb-8 flex items-center gap-2">
                          <PlusCircle className="text-indigo-600" /> Anggaran Baru
                       </h3>
                       <form onSubmit={handleAddItem} className="space-y-4">
                          <input name="name" required className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none" placeholder="Nama Kegiatan" />
                          <div className="grid grid-cols-2 gap-2">
                             <select name="month" className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none">
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                             <select name="category" className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none">
                                {Object.values(SNP).map(v => <option key={v} value={v}>{v}</option>)}
                             </select>
                          </div>
                          <select name="accountCode" className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none">
                             {ACCOUNT_CODES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                             <input name="quantity" type="number" defaultValue="1" className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none" />
                             <input name="unit" placeholder="Satuan" className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none" />
                          </div>
                          <input name="price" type="number" required className="w-full px-5 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none font-black text-indigo-600" placeholder="Harga Satuan" />
                          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all">Simpan Anggaran</button>
                       </form>
                    </div>
                 </div>
                 <div className="xl:col-span-8 bg-white rounded-[40px] border border-slate-200 overflow-hidden min-h-[500px]">
                    <div className="p-8 border-b bg-slate-50/30 flex justify-between items-center">
                       <h3 className="font-black text-xl">Review Rencana</h3>
                    </div>
                    <div className="divide-y">
                       {items.map(item => (
                          <div key={item.id} className="p-8 flex justify-between items-center group hover:bg-slate-50 transition-colors">
                             <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                                   {items.indexOf(item) + 1}
                                </div>
                                <div>
                                   <p className="font-black text-slate-800">{item.name}</p>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase">{item.month} • {item.accountCode}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                <p className="font-black text-lg">{formatIDR(item.total)}</p>
                                <button onClick={() => removeItem(item.id)} className="p-2 text-rose-300 hover:text-rose-600 transition-colors">
                                   <Trash2 size={18} />
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
