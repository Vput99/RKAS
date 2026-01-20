
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  BrainCircuit, 
  Trash2, 
  Wallet, 
  TrendingUp, 
  ChevronRight, 
  Receipt, 
  Sparkles, 
  CheckCircle, 
  Coins, 
  Pencil, 
  Loader2, 
  Settings, 
  School, 
  Users, 
  Save, 
  RefreshCw, 
  Info, 
  Calendar,
  ShieldCheck,
  FileCheck,
  ArrowLeft,
  Layers,
  BarChart3,
  PieChart as PieIconLucide,
  Tag,
  Search,
  X,
  Database,
  Cloud,
  Terminal
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { SNP, BudgetItem, AIAnalysisResponse, SPJRecommendation, EvidenceItem } from './types';
import { analyzeBudget, getSPJRecommendations } from './services/geminiService';
import { storageService } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { StatCard } from './components/StatCard';

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const BOSP_ACCOUNT_CODES = [
  { code: '5.1.02.01.01.0001', label: 'Honorarium Guru/Tenaga Kependidikan', category: 'Honor' },
  { code: '5.1.02.01.01.0002', label: 'Honorarium Narasumber/Instruktur', category: 'Honor' },
  { code: '5.1.02.01.01.0024', label: 'Belanja Alat Tulis Kantor (ATK)', category: 'Barjas' },
  { code: '5.1.02.01.01.0025', label: 'Belanja Kertas dan Cover', category: 'Barjas' },
  { code: '5.1.02.01.01.0026', label: 'Belanja Bahan Cetak', category: 'Barjas' },
  { code: '5.1.02.01.01.0027', label: 'Belanja Penggandaan/Fotocopy', category: 'Barjas' },
  { code: '5.1.02.01.01.0030', label: 'Belanja Alat/Bahan Kebersihan', category: 'Barjas' },
  { code: '5.1.02.01.01.0031', label: 'Belanja Alat Listrik dan Elektronik', category: 'Barjas' },
  { code: '5.1.02.01.01.0038', label: 'Belanja Obat-obatan/P3K', category: 'Barjas' },
  { code: '5.1.02.01.01.0052', label: 'Belanja Makanan dan Minuman Rapat', category: 'Barjas' },
  { code: '5.1.02.01.01.0053', label: 'Belanja Makanan dan Minuman Tamu', category: 'Barjas' },
  { code: '5.1.02.01.01.0054', label: 'Belanja Makanan dan Minuman Kegiatan Siswa', category: 'Barjas' },
  { code: '5.1.02.02.01.0011', label: 'Belanja Langganan Listrik', category: 'Jasa' },
  { code: '5.1.02.02.01.0012', label: 'Belanja Langganan Air (PDAM)', category: 'Jasa' },
  { code: '5.1.02.02.01.0013', label: 'Belanja Internet/WiFi', category: 'Jasa' },
  { code: '5.1.02.02.01.0014', label: 'Belanja Langganan Telepon/Komunikasi', category: 'Jasa' },
  { code: '5.1.02.02.01.0033', label: 'Belanja Jasa Kebersihan (Outsourcing)', category: 'Jasa' },
  { code: '5.1.02.02.01.0034', label: 'Belanja Jasa Keamanan (SATPAM)', category: 'Jasa' },
  { code: '5.1.02.02.01.0061', label: 'Belanja Pemeliharaan Bangunan Gedung', category: 'Maint' },
  { code: '5.1.02.02.01.0063', label: 'Belanja Pemeliharaan Sarana (Mebeulair)', category: 'Maint' },
  { code: '5.1.02.02.01.0064', label: 'Belanja Pemeliharaan Alat Elektronik', category: 'Maint' },
  { code: '5.1.02.02.01.0067', label: 'Belanja Pemeliharaan Alat Angkutan', category: 'Maint' },
  { code: '5.1.02.04.01.0001', label: 'Belanja Perjalanan Dinas Dalam Kota', category: 'Dinas' },
  { code: '5.1.02.04.01.0003', label: 'Belanja Perjalanan Dinas Luar Kota', category: 'Dinas' },
  { code: '5.2.02.05.01.0001', label: 'Belanja Modal Komputer Unit (PC)', category: 'Modal' },
  { code: '5.2.02.05.01.0002', label: 'Belanja Modal Laptop/Chromebook', category: 'Modal' },
  { code: '5.2.02.05.01.0005', label: 'Belanja Modal Printer/Scanner', category: 'Modal' },
  { code: '5.2.02.05.02.0001', label: 'Belanja Modal Proyektor', category: 'Modal' },
  { code: '5.2.02.10.01.0002', label: 'Belanja Modal Buku Koleksi Perpustakaan', category: 'Modal' },
  { code: '5.2.02.15.02.0001', label: 'Belanja Modal Alat Peraga/Praktik', category: 'Modal' },
  { code: '5.2.05.01.01.0001', label: 'Belanja Modal Lisensi Software/Aplikasi', category: 'Modal' }
];

const SNP_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'analysis' | 'spj' | 'settings'>('dashboard');
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [schoolData, setSchoolData] = useState({
    name: 'SD Negeri Pintar Jaya',
    npsn: '10203040',
    address: 'Jl. Pendidikan No. 123, Kecamatan Cerdas, Kota Pintar',
  });
  const [totalPagu, setTotalPagu] = useState<number>(150000000);
  const [studentCount, setStudentCount] = useState<number>(450);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error'>('connected');
  const [isLoaded, setIsLoaded] = useState(false);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Planner Form States
  const [selectedFormMonths, setSelectedFormMonths] = useState<string[]>(['Januari']);
  const [searchAccount, setSearchAccount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<{code: string, label: string} | null>(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);

  // SPJ States
  const [activeSPJs, setActiveSPJs] = useState<Record<string, SPJRecommendation>>({});
  const [selectedSPJId, setSelectedSPJId] = useState<string | null>(null);
  const [isGeneratingSPJ, setIsGeneratingSPJ] = useState(false);
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) setIsScrolled(scrollRef.current.scrollTop > 20);
    };
    const currentRef = scrollRef.current;
    currentRef?.addEventListener('scroll', handleScroll);
    return () => currentRef?.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const initLoad = async () => {
      setDbStatus('syncing');
      const data = await storageService.loadAll();
      setItems(data.items || []);
      if (data.schoolData) setSchoolData(data.schoolData);
      setTotalPagu(data.totalPagu);
      setStudentCount(data.studentCount);
      
      const savedSPJs = localStorage.getItem('rkas_active_spjs_v3');
      if (savedSPJs) {
        try { setActiveSPJs(JSON.parse(savedSPJs)); } 
        catch (e) { console.error("Parse SPJ failed", e); }
      }
      setIsLoaded(true);
      setDbStatus(isSupabaseConfigured ? 'connected' : 'error');
    };
    initLoad();
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('rkas_active_spjs_v3', JSON.stringify(activeSPJs));
  }, [activeSPJs, isLoaded]);

  useEffect(() => {
    if (editingItem) {
      setSelectedFormMonths([editingItem.month]);
      const acc = BOSP_ACCOUNT_CODES.find(a => a.code === editingItem.accountCode);
      setSelectedAccount(acc ? {code: acc.code, label: acc.label} : {code: editingItem.accountCode, label: 'Custom Account'});
    } else {
      setSelectedFormMonths(['Januari']);
      setSelectedAccount(null);
    }
  }, [editingItem]);

  const totalSpent = useMemo(() => items.reduce((acc, item) => acc + item.total, 0), [items]);
  const usagePercentage = useMemo(() => Math.round((totalSpent / totalPagu) * 100) || 0, [totalSpent, totalPagu]);

  const chartData = useMemo(() => MONTHS.map(month => ({
    name: month.substring(0, 3),
    total: items.filter(i => i.month === month).reduce((acc, curr) => acc + curr.total, 0)
  })), [items]);

  const snpData = useMemo(() => Object.values(SNP).map(snp => ({
    name: snp.split(' ')[1] || snp,
    value: items.filter(i => i.category === snp).reduce((acc, curr) => acc + curr.total, 0)
  })).filter(d => d.value > 0), [items]);

  const filteredAccountCodes = useMemo(() => {
    if (!searchAccount) return BOSP_ACCOUNT_CODES;
    const lower = searchAccount.toLowerCase();
    return BOSP_ACCOUNT_CODES.filter(a => 
      a.label.toLowerCase().includes(lower) || a.code.includes(lower)
    );
  }, [searchAccount]);

  const toggleMonthSelection = (month: string) => {
    if (editingItem) {
      setSelectedFormMonths([month]);
      return;
    }
    setSelectedFormMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month) 
        : [...prev, month]
    );
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedFormMonths.length === 0) return alert("Pilih minimal satu bulan anggaran.");
    if (!selectedAccount) return alert("Pilih kode rekening belanja.");

    setDbStatus('syncing');
    const formData = new FormData(e.currentTarget);
    const price = Number(formData.get('price'));
    const quantity = Number(formData.get('quantity'));
    const category = formData.get('category') as SNP;
    const name = formData.get('name') as string;
    const unit = formData.get('unit') as string;

    const baseData = {
      name,
      category,
      accountCode: selectedAccount.code,
      quantity,
      unit,
      price,
      total: price * quantity,
      source: 'BOS Reguler'
    };

    if (editingItem) {
      const updated = { ...editingItem, ...baseData, month: selectedFormMonths[0] };
      await storageService.updateItem(updated);
      setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      setEditingItem(null);
    } else {
      const newItems: BudgetItem[] = [];
      for (const month of selectedFormMonths) {
        const newItem: BudgetItem = { id: Math.random().toString(36).substr(2, 9), ...baseData, month };
        await storageService.addItem(newItem);
        newItems.push(newItem);
      }
      setItems(prev => [...prev, ...newItems]);
    }
    
    setDbStatus(isSupabaseConfigured ? 'connected' : 'error');
    setSelectedFormMonths(['Januari']);
    setSelectedAccount(null);
    e.currentTarget.reset();
  };

  const removeItem = async (id: string) => {
    if (confirm('Hapus item anggaran?')) {
      setDbStatus('syncing');
      await storageService.deleteItem(id);
      setDbStatus(isSupabaseConfigured ? 'connected' : 'error');
      setItems(prev => prev.filter(item => item.id !== id));
      if (activeSPJs[id]) {
        setActiveSPJs(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
  };

  const createSPJForInitem = async (item: BudgetItem) => {
    if (activeSPJs[item.id]) {
        setSelectedSPJId(item.id);
        setIsLinkingModalOpen(false);
        return;
    }
    setIsGeneratingSPJ(true);
    setIsLinkingModalOpen(false);
    
    const recommendation = await getSPJRecommendations(item);
    if (recommendation) {
        setActiveSPJs(prev => ({ ...prev, [item.id]: { ...recommendation, activityId: item.id } }));
        setSelectedSPJId(item.id);
    } else {
        alert("AI Gemini sedang sibuk. Silakan coba beberapa saat lagi.");
    }
    setIsGeneratingSPJ(false);
  };

  const toggleChecklistItem = (activityId: string, evidenceId: string) => {
    setActiveSPJs(prev => {
        const spj = prev[activityId];
        if (!spj) return prev;
        const updatedChecklist: EvidenceItem[] = spj.checklist.map((ev): EvidenceItem => 
          ev.id === evidenceId ? { ...ev, status: (ev.status === 'ready' ? 'pending' : 'ready') as 'pending' | 'ready' } : ev
        );
        return { ...prev, [activityId]: { ...spj, checklist: updatedChecklist } };
    });
  };

  const getSPJProgress = (activityId: string) => {
    const spj = activeSPJs[activityId];
    if (!spj || !spj.checklist || spj.checklist.length === 0) return 0;
    const ready = spj.checklist.filter(ev => ev.status === 'ready').length;
    return Math.round((ready / spj.checklist.length) * 100);
  };

  const runAIAnalysis = async () => {
    if (items.length === 0) return alert("Belum ada data perencanaan.");
    setIsAnalyzing(true);
    const result = await analyzeBudget(items, totalPagu);
    if (result) setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (!isLoaded) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
      <h2 className="text-xl font-black tracking-widest uppercase animate-pulse">Menghubungkan Database...</h2>
    </div>
  );

  const SQL_SCHEMA = `
-- 1. Tabel Profil Sekolah
CREATE TABLE school_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  name TEXT,
  npsn TEXT,
  address TEXT,
  total_pagu BIGINT,
  student_count INT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Anggaran (RKAS)
CREATE TABLE budget_items (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  accountCode TEXT,
  quantity NUMERIC,
  unit TEXT,
  price NUMERIC,
  total NUMERIC,
  source TEXT,
  month TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`.trim();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-slate-950 text-slate-300 flex flex-col lg:sticky lg:top-0 h-auto lg:h-screen z-50 no-print transition-all duration-500">
        <div className="p-10">
          <div className="flex items-center gap-4 mb-16 group">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/20 rotate-3 group-hover:rotate-0 transition-transform">
              <ClipboardList className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-none tracking-tight">RKAS<span className="text-indigo-500">Pintar</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sistem Cerdas BOSP</p>
            </div>
          </div>
          <nav className="space-y-3">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'planner', icon: PlusCircle, label: 'Perencanaan' },
              { id: 'analysis', icon: BrainCircuit, label: 'Audit AI' },
              { id: 'spj', icon: Receipt, label: 'SPJ Digital' },
              { id: 'settings', icon: Settings, label: 'Konfigurasi' },
            ].map((nav) => (
              <button 
                key={nav.id}
                onClick={() => setActiveTab(nav.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[22px] transition-all duration-500 group ${activeTab === nav.id ? 'sidebar-item-active' : 'hover:bg-white/5 hover:text-white'}`}
              >
                <nav.icon size={20} className={activeTab === nav.id ? 'text-indigo-600' : 'group-hover:text-indigo-400'} />
                <span className="font-bold text-sm tracking-wide">{nav.label}</span>
                {activeTab === nav.id && <ChevronRight size={14} className="ml-auto opacity-50" />}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-10">
          <div className={`p-5 rounded-[28px] border flex items-center gap-4 transition-all duration-700 ${dbStatus === 'syncing' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : dbStatus === 'error' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
            <div className={`w-3 h-3 rounded-full ${dbStatus === 'syncing' ? 'animate-spin border-t-2 border-current bg-transparent' : 'bg-current shadow-[0_0_10px_currentcolor]'}`}></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Database</span>
              <span className="text-[11px] font-bold opacity-70 mt-1 uppercase tracking-tighter">{isSupabaseConfigured ? 'Cloud Connected' : 'Local Fallback'}</span>
            </div>
          </div>
        </div>
      </aside>

      <main ref={scrollRef} className="flex-1 overflow-y-auto relative scroll-smooth">
        <header className={`sticky top-0 z-40 transition-all duration-500 ease-in-out px-6 lg:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 ${isScrolled ? 'py-4 glass-card shadow-lg bg-white/70 border-b border-slate-200/50' : 'py-8 lg:py-12 bg-transparent'}`}>
          <div>
            <h2 className={`font-black text-slate-900 tracking-tighter transition-all duration-500 ${isScrolled ? 'text-xl' : 'text-4xl'}`}>
              <span className={isScrolled ? 'text-slate-500' : 'text-slate-900'}>Halo, </span>
              <span className="text-indigo-600">{schoolData.name}</span>
            </h2>
          </div>
          <div className={`flex items-center gap-4 bg-white p-2 rounded-[20px] shadow-sm border border-slate-100 transition-all ${isScrolled ? 'scale-90 origin-right' : 'scale-100'}`}>
             <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar size={18} /></div>
             <div className="pr-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tahun Anggaran</p>
                <p className="font-black text-slate-800 text-xs">2026/2027</p>
             </div>
          </div>
        </header>

        <div className="px-6 lg:px-12 pb-20 mt-6">
          <div className="animate-fade-in">
            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Pagu BOSP" value={formatIDR(totalPagu)} icon={<Wallet size={24} />} variant="primary" trend="BOS REGULER" />
                  <StatCard title="Dana Terpakai" value={formatIDR(totalSpent)} icon={<TrendingUp size={24} />} variant="warning" progress={usagePercentage} />
                  <StatCard title="Sisa Anggaran" value={formatIDR(totalPagu - totalSpent)} icon={<Coins size={24} />} variant="success" trend="SURPLUS" />
                  <StatCard title="Target Siswa" value={`${studentCount}`} icon={<Users size={24} />} variant="primary" trend="DAPODIK" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group">
                    <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black text-slate-900">Alur Pengeluaran</h3><BarChart3 size={20} className="text-slate-400" /></div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <Tooltip contentStyle={{borderRadius: '15px', border: 'none'}} />
                          <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={0.1} fill="#6366f1" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="lg:col-span-4 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm group">
                     <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black">Distribusi SNP</h3><PieIconLucide size={20} className="text-slate-400" /></div>
                     <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={snpData} innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value">
                            {snpData.map((_, index) => <Cell key={`cell-${index}`} fill={SNP_COLORS[index % SNP_COLORS.length]} stroke="none" />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PLANNER */}
            {activeTab === 'planner' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-5 space-y-8">
                  <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl relative overflow-hidden group">
                    <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4"><PlusCircle className="text-indigo-600" size={32} /> {editingItem ? 'Edit Item' : 'Tambah RKAS'}</h3>
                    <form onSubmit={handleAddItem} className="space-y-8">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Bulan Anggaran</label>
                        {!editingItem && (
                          <div className="flex justify-end mb-2">
                            <button type="button" onClick={() => setSelectedFormMonths(selectedFormMonths.length === 12 ? [] : [...MONTHS])} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">
                              {selectedFormMonths.length === 12 ? 'Hapus Semua' : 'Pilih Semua Bulan'}
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {MONTHS.map(m => (
                            <button key={m} type="button" onClick={() => toggleMonthSelection(m)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedFormMonths.includes(m) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}>
                              {m.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Deskripsi Kegiatan</label>
                          <input name="name" defaultValue={editingItem?.name || ''} required className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-2xl font-bold" placeholder="Contoh: Pembayaran Listrik Sekolah" />
                        </div>

                        <div className="space-y-2 relative">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Rekening Belanja (Juknis 2026)</label>
                          <div 
                            onClick={() => setIsAccountPickerOpen(!isAccountPickerOpen)}
                            className={`w-full px-6 py-4 bg-slate-50 border rounded-2xl cursor-pointer flex justify-between items-center transition-all ${selectedAccount ? 'border-indigo-200 bg-indigo-50/20' : 'border-transparent'}`}
                          >
                            {selectedAccount ? (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-indigo-500 uppercase">{selectedAccount.code}</span>
                                <span className="text-sm font-black text-slate-800">{selectedAccount.label}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold">Pilih Kode Rekening...</span>
                            )}
                            <Tag className={selectedAccount ? 'text-indigo-500' : 'text-slate-300'} size={18} />
                          </div>

                          {isAccountPickerOpen && (
                            <div className="absolute z-[60] top-full mt-2 left-0 right-0 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 animate-fade-in overflow-hidden max-h-[400px] flex flex-col">
                              <div className="relative mb-4 shrink-0">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input autoFocus className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm" placeholder="Cari kode atau nama rekening..." value={searchAccount} onChange={(e) => setSearchAccount(e.target.value)} />
                                {searchAccount && <button onClick={() => setSearchAccount('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-300" /></button>}
                              </div>
                              <div className="overflow-y-auto space-y-1 pr-2">
                                {filteredAccountCodes.map((acc) => (
                                  <button key={acc.code} type="button" onClick={() => { setSelectedAccount({code: acc.code, label: acc.label}); setIsAccountPickerOpen(false); }} className={`w-full p-4 rounded-2xl text-left flex justify-between items-center transition-all hover:bg-slate-50 group ${selectedAccount?.code === acc.code ? 'bg-indigo-50 border-indigo-100 border' : 'border border-transparent'}`}>
                                    <div><p className="text-[10px] font-black text-indigo-400">{acc.code}</p><p className="text-sm font-black text-slate-700">{acc.label}</p></div>
                                    <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{acc.category}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Standar SNP</label>
                          <select name="category" defaultValue={editingItem?.category || SNP.Sarpras} className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-2xl font-bold">
                            {Object.values(SNP).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Volume</label>
                            <input name="quantity" type="number" defaultValue={editingItem?.quantity || 1} className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-2xl font-bold" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Satuan</label>
                            <input name="unit" defaultValue={editingItem?.unit || 'Unit'} className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-2xl font-bold" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Satuan</label>
                          <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-400">Rp</span>
                            <input name="price" type="number" defaultValue={editingItem?.price || ''} required className="w-full pl-14 pr-6 py-6 bg-indigo-50 border border-indigo-100 rounded-2xl text-2xl font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="0" />
                          </div>
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl flex items-center justify-center gap-3">
                        <Save size={24} /> 
                        {editingItem ? 'Perbarui Anggaran' : 'Simpan Anggaran'}
                      </button>
                    </form>
                  </div>
                </div>
                
                <div className="xl:col-span-7 bg-white rounded-[48px] border border-slate-100 overflow-hidden shadow-sm flex flex-col">
                  <div className="p-8 border-b bg-slate-50/20 flex justify-between items-center">
                    <h3 className="text-2xl font-black">Histori Perencanaan</h3>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} Entri</div>
                  </div>
                  <div className="divide-y max-h-[700px] overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="p-20 text-center opacity-20 font-black uppercase text-sm">Belum ada data perencanaan</div>
                    ) : (
                      [...items].reverse().map((item) => (
                        <div key={item.id} className="p-8 flex justify-between items-center group hover:bg-slate-50 transition-all">
                          <div className="flex gap-6 items-center">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black relative overflow-hidden shrink-0">
                              <span className="relative z-10">{item.month.substring(0, 3)}</span>
                              <div className="absolute inset-0 bg-indigo-500/5 rotate-12 scale-150" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-lg leading-tight">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded border uppercase tracking-widest flex items-center gap-1">
                                  <Tag size={10} /> {item.accountCode}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                             <div className="text-right">
                                <p className="font-black text-lg text-slate-800">{formatIDR(item.total)}</p>
                             </div>
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                               <button onClick={() => setEditingItem(item)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Pencil size={18} /></button>
                               <button onClick={() => removeItem(item.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Trash2 size={18} /></button>
                             </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SPJ */}
            {activeTab === 'spj' && (
              <div className="space-y-10 animate-fade-in">
                {selectedSPJId && activeSPJs[selectedSPJId] ? (
                  <div className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl">
                    <button onClick={() => setSelectedSPJId(null)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold mb-8">
                      <ArrowLeft size={16} /> Kembali
                    </button>
                    <h3 className="text-3xl font-black mb-6">{items.find(i => i.id === selectedSPJId)?.name}</h3>
                    <div className="space-y-4">
                      {activeSPJs[selectedSPJId].checklist.map(ev => (
                        <div key={ev.id} onClick={() => toggleChecklistItem(selectedSPJId, ev.id)} className={`p-6 rounded-3xl border flex items-center justify-between cursor-pointer ${ev.status === 'ready' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            {ev.status === 'ready' ? <CheckCircle className="text-emerald-500" /> : <div className="w-6 h-6 rounded-lg bg-white border-2" />}
                            <div>
                              <p className="font-black text-sm">{ev.label}</p>
                              <p className="text-xs text-slate-400">{ev.description}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-slate-400">{ev.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-black">Pelaporan SPJ</h3>
                      <button onClick={() => setIsLinkingModalOpen(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black">Buat SPJ Baru</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(activeSPJs).map(([id, spj]) => {
                        const item = items.find(i => i.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} onClick={() => setSelectedSPJId(id)} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm cursor-pointer hover:shadow-lg transition-all">
                            <h4 className="font-black text-lg mb-4">{item.name}</h4>
                            <div className="w-full bg-slate-100 h-2 rounded-full mb-2">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${getSPJProgress(id)}%` }} />
                            </div>
                            <p className="text-[10px] font-black uppercase text-indigo-600">{getSPJProgress(id)}% Selesai</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {isLinkingModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 overflow-hidden flex flex-col max-h-[80vh]">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black">Pilih Anggaran</h3>
                        <button onClick={() => setIsLinkingModalOpen(false)} className="p-2 bg-slate-100 rounded-xl"><X size={20} /></button>
                      </div>
                      <div className="overflow-y-auto space-y-4">
                        {items.map(item => (
                          <div key={item.id} onClick={() => createSPJForInitem(item)} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-600 cursor-pointer">
                            <p className="font-black">{item.name}</p>
                            <p className="text-xs text-slate-400 uppercase font-bold">{item.month} - {formatIDR(item.total)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: AUDIT AI */}
            {activeTab === 'analysis' && (
              <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
                <div className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl text-center">
                   <div className="inline-flex p-8 bg-indigo-50 text-indigo-600 rounded-[40px] mb-8"><BrainCircuit size={48} /></div>
                   <h3 className="text-4xl font-black text-slate-900 mb-4">Audit AI Gemini</h3>
                   <p className="text-slate-400 font-bold max-w-lg mx-auto mb-10">Menganalisis efisiensi penggunaan dana BOSP berdasarkan SNP.</p>
                   <button onClick={runAIAnalysis} disabled={isAnalyzing} className="px-12 py-5 bg-slate-900 text-white rounded-[32px] font-black uppercase flex items-center gap-4 mx-auto hover:bg-indigo-600 transition-all">
                     {isAnalyzing ? <RefreshCw className="animate-spin" /> : <Sparkles />} {isAnalyzing ? "Menganalisis..." : "Jalankan Audit"}
                   </button>
                </div>
                {aiAnalysis && (
                  <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-lg animate-fade-in">
                    <h4 className="text-2xl font-black mb-6">Hasil Analisis</h4>
                    <p className="text-slate-600 mb-8">{aiAnalysis.summary}</p>
                    <div className="space-y-4">
                      {aiAnalysis.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700">
                          <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0">{i+1}</div>
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
                <div className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl">
                  <div className="flex items-center gap-5 mb-12"><div className="p-4 bg-indigo-50 text-indigo-600 rounded-[28px]"><Settings size={32} /></div><h3 className="text-3xl font-black text-slate-900 tracking-tight">Profil Sekolah</h3></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Satdik</label><input value={schoolData.name} onChange={e => setSchoolData({...schoolData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-transparent border rounded-[24px] font-bold" /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">NPSN</label><input value={schoolData.npsn} onChange={e => setSchoolData({...schoolData, npsn: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-transparent border rounded-[24px] font-bold" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagu BOSP 2026</label><input type="number" value={totalPagu} onChange={e => setTotalPagu(Number(e.target.value))} className="w-full px-8 py-5 bg-indigo-50 border-transparent border focus:bg-white focus:border-indigo-200 rounded-[28px] outline-none text-xl font-black text-indigo-600" /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Siswa</label><input type="number" value={studentCount} onChange={e => setStudentCount(Number(e.target.value))} className="w-full px-8 py-5 bg-slate-50 border-transparent border focus:bg-white focus:border-indigo-200 rounded-[28px] outline-none text-xl font-bold" /></div>
                  </div>
                  <button onClick={() => { storageService.saveSettings(schoolData.name, schoolData.npsn, schoolData.address, totalPagu, studentCount); alert('Profil Tersimpan!'); }} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[32px] hover:bg-indigo-700 shadow-2xl flex items-center justify-center gap-4"><Save size={24} /> Simpan Profil</button>
                </div>

                <div className="bg-slate-900 p-12 rounded-[56px] shadow-2xl relative overflow-hidden group">
                   <div className="relative z-10">
                      <div className="flex items-center gap-5 mb-8">
                         <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-[28px] border border-indigo-500/30"><Database size={32} /></div>
                         <div><h3 className="text-2xl font-black text-white">Panduan Supabase Cloud</h3><p className="text-slate-400 font-bold text-sm">Amankan data Anda agar tidak hilang saat refresh.</p></div>
                      </div>
                      <div className="space-y-6">
                         <div className="p-8 bg-black/40 rounded-[32px] border border-white/10">
                            <h4 className="flex items-center gap-3 text-amber-400 font-black text-xs uppercase tracking-widest mb-6"><Terminal size={16} /> SQL Schema</h4>
                            <div className="relative">
                               <pre className="p-6 bg-slate-950 rounded-2xl text-[10px] font-mono text-indigo-300 overflow-x-auto border border-indigo-500/20 max-h-[200px]">{SQL_SCHEMA}</pre>
                               <button onClick={() => { navigator.clipboard.writeText(SQL_SCHEMA); alert('Schema disalin!'); }} className="absolute top-4 right-4 p-2 bg-indigo-600 text-white rounded-lg"><ClipboardList size={14} /></button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
