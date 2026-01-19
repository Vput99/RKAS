
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
  Database, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  Copy, 
  Terminal,
  Search,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart as BarIcon,
  Calendar,
  Download,
  MapPin,
  ShieldCheck,
  FileCheck,
  ArrowLeft,
  Filter,
  Layers
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
  Cell,
  BarChart,
  Bar
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

  // SPJ States
  const [activeSPJs, setActiveSPJs] = useState<Record<string, SPJRecommendation>>({});
  const [selectedSPJId, setSelectedSPJId] = useState<string | null>(null);
  const [isGeneratingSPJ, setIsGeneratingSPJ] = useState(false);
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setIsScrolled(scrollRef.current.scrollTop > 20);
      }
    };
    const currentRef = scrollRef.current;
    currentRef?.addEventListener('scroll', handleScroll);
    return () => currentRef?.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const initLoad = async () => {
      if (!isSupabaseConfigured) {
        setDbStatus('error');
        setIsLoaded(true);
        return;
      }
      setDbStatus('syncing');
      const data = await storageService.loadAll();
      setItems(data.items);
      if (data.schoolData) setSchoolData(data.schoolData);
      setTotalPagu(data.totalPagu);
      setStudentCount(data.studentCount);
      
      // Load SPJs from local storage if any (or just init empty)
      const savedSPJs = localStorage.getItem('rkas_active_spjs');
      if (savedSPJs) setActiveSPJs(JSON.parse(savedSPJs));

      setIsLoaded(true);
      setDbStatus('connected');
    };
    initLoad();
  }, []);

  // Save SPJs to local storage whenever they change
  useEffect(() => {
    if (Object.keys(activeSPJs).length > 0) {
      localStorage.setItem('rkas_active_spjs', JSON.stringify(activeSPJs));
    }
  }, [activeSPJs]);

  const totalSpent = useMemo(() => items.reduce((acc, item) => acc + item.total, 0), [items]);
  const usagePercentage = useMemo(() => Math.round((totalSpent / totalPagu) * 100) || 0, [totalSpent, totalPagu]);

  const chartData = useMemo(() => {
    return MONTHS.map(month => ({
      name: month.substring(0, 3),
      total: items.filter(i => i.month === month).reduce((acc, curr) => acc + curr.total, 0)
    }));
  }, [items]);

  const snpData = useMemo(() => {
    return Object.values(SNP).map(snp => ({
      name: snp.split(' ')[1] || snp,
      value: items.filter(i => i.category === snp).reduce((acc, curr) => acc + curr.total, 0)
    })).filter(d => d.value > 0);
  }, [items]);

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDbStatus('syncing');
    const formData = new FormData(e.currentTarget);
    const price = Number(formData.get('price'));
    const quantity = Number(formData.get('quantity'));
    
    const itemData = {
      name: formData.get('name') as string,
      category: formData.get('category') as SNP,
      accountCode: formData.get('accountCode') as string,
      quantity,
      unit: formData.get('unit') as string,
      price,
      total: price * quantity,
      month: formData.get('month') as string,
      source: 'BOS Reguler'
    };

    if (editingItem) {
      const updated = { ...editingItem, ...itemData };
      if (isSupabaseConfigured) await storageService.updateItem(updated);
      setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      setEditingItem(null);
    } else {
      const newItem = { id: Math.random().toString(36).substr(2, 9), ...itemData };
      if (isSupabaseConfigured) await storageService.addItem(newItem);
      setItems(prev => [...prev, newItem]);
    }
    setDbStatus(isSupabaseConfigured ? 'connected' : 'error');
    e.currentTarget.reset();
  };

  const removeItem = async (id: string) => {
    if (!isSupabaseConfigured) {
      setItems(prev => prev.filter(item => item.id !== id));
      return;
    }
    if (confirm('Hapus data ini?')) {
      setDbStatus('syncing');
      await storageService.deleteItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      setDbStatus('connected');
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
        setActiveSPJs(prev => ({
            ...prev,
            [item.id]: {
                ...recommendation,
                activityId: item.id
            }
        }));
        setSelectedSPJId(item.id);
    } else {
        alert("Gagal menghubungi AI. Silakan coba lagi.");
    }
    setIsGeneratingSPJ(false);
  };

  const toggleChecklistItem = (activityId: string, evidenceId: string) => {
    setActiveSPJs(prev => {
        const spj = prev[activityId];
        const updatedChecklist = spj.checklist.map(ev => 
            ev.id === evidenceId ? { ...ev, status: ev.status === 'ready' ? 'pending' : 'ready' } : ev
        );
        return {
            ...prev,
            [activityId]: { ...spj, checklist: updatedChecklist }
        };
    });
  };

  const getSPJProgress = (activityId: string) => {
    const spj = activeSPJs[activityId];
    if (!spj || !spj.checklist.length) return 0;
    const ready = spj.checklist.filter(ev => ev.status === 'ready').length;
    return Math.round((ready / spj.checklist.length) * 100);
  };

  const handleUpdateSettings = async () => {
    if (!isSupabaseConfigured) {
      alert("⚠️ Database Cloud belum aktif. Perubahan tidak akan tersimpan permanen.");
      return;
    }
    setDbStatus('syncing');
    await storageService.saveSettings(schoolData.name, schoolData.npsn, schoolData.address, totalPagu, studentCount);
    setDbStatus('connected');
    alert('✅ Pengaturan berhasil diperbarui di Cloud!');
  };

  const runAIAnalysis = async () => {
    if (items.length === 0) return alert("Tambahkan item anggaran terlebih dahulu.");
    setIsAnalyzing(true);
    const result = await analyzeBudget(items, totalPagu);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const copySQL = () => {
    const sql = `CREATE TABLE school_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT,
  npsn TEXT,
  address TEXT,
  total_pagu BIGINT,
  student_count INT
);
CREATE TABLE budget_items (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  account_code TEXT,
  quantity DECIMAL,
  unit TEXT,
  price DECIMAL,
  total DECIMAL,
  source TEXT,
  month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;
    navigator.clipboard.writeText(sql);
    alert("SQL disalin ke clipboard!");
  };

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (!isLoaded) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="relative">
        <Loader2 size={64} className="animate-spin text-indigo-500 opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-indigo-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      <h2 className="mt-8 text-xl font-black tracking-tighter uppercase animate-pulse">Inisialisasi Sistem</h2>
      <p className="text-slate-500 text-xs mt-2 uppercase tracking-[0.3em]">RKAS Pintar Cloud v2.5</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* Sidebar - Same as before */}
      <aside className="w-full lg:w-80 bg-slate-950 text-slate-300 flex flex-col lg:sticky lg:top-0 h-auto lg:h-screen z-50 no-print transition-all duration-500 overflow-hidden">
        <div className="p-10">
          <div className="flex items-center gap-4 mb-16 group">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-2xl shadow-indigo-500/40 rotate-3 group-hover:rotate-0 transition-transform duration-500">
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
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[22px] transition-all duration-500 group ${activeTab === item.id ? 'sidebar-item-active' : 'hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-indigo-600' : 'group-hover:text-indigo-400'} />
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
                {activeTab === item.id && <ChevronRight size={14} className="ml-auto opacity-50" />}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-10">
          <div className={`p-5 rounded-[28px] border flex items-center gap-4 transition-all duration-700 ${dbStatus === 'syncing' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : dbStatus === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
            <div className={`w-3 h-3 rounded-full ${dbStatus === 'syncing' ? 'animate-spin border-t-2 border-current bg-transparent' : 'bg-current shadow-[0_0_10px_currentcolor]'}`}></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Status Awan</span>
              <span className="text-[11px] font-bold opacity-70 mt-1">{dbStatus === 'syncing' ? 'Sinkronisasi...' : dbStatus === 'error' ? 'Terputus' : 'Terhubung'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto relative scroll-smooth">
        <header className={`sticky top-0 z-40 transition-all duration-500 ease-in-out px-6 lg:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 ${isScrolled ? 'py-4 glass-card shadow-lg bg-white/70 border-b border-slate-200/50' : 'py-8 lg:py-12 bg-transparent'}`}>
          <div className="transition-all duration-500">
            {!isScrolled && <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tim Manajemen BOS Aktif</p>}
            <h2 className={`font-black text-slate-900 tracking-tighter transition-all duration-500 ${isScrolled ? 'text-xl' : 'text-4xl'}`}>
              <span className={isScrolled ? 'text-slate-500' : 'text-slate-900'}>Halo, </span>
              <span className="text-indigo-600 font-black">{schoolData.name}</span>
            </h2>
          </div>
          <div className={`flex items-center gap-4 bg-white p-2 rounded-[20px] shadow-sm border border-slate-100 transition-all duration-500 ${isScrolled ? 'scale-90 origin-right' : 'scale-100'}`}>
             <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar size={18} /></div>
             <div className="pr-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Tahun Anggaran</p>
                <p className="font-black text-slate-800 text-xs">2026/2027</p>
             </div>
          </div>
        </header>

        <div className="px-6 lg:px-12 pb-20">
          <div className="animate-fade-in">
            
            {/* Dashboard Tab */}
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
                    <div className="flex justify-between items-center mb-10">
                      <div><h3 className="text-xl font-black text-slate-900">Alur Pengeluaran</h3></div>
                      <BarIcon size={20} className="text-slate-400" />
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <YAxis hide />
                          <Tooltip contentStyle={{borderRadius: '15px'}} />
                          <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={0.1} fill="#6366f1" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="lg:col-span-4 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm group overflow-hidden">
                     <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black">Distribusi SNP</h3><PieIcon size={20} className="text-slate-400" /></div>
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

            {/* Planner Tab - Same as before */}
            {activeTab === 'planner' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-5 space-y-8">
                  <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl relative overflow-hidden group">
                    <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4"><PlusCircle className="text-indigo-600" size={32} /> {editingItem ? 'Edit Item' : 'Tambah Anggaran'}</h3>
                    <form onSubmit={handleAddItem} className="space-y-6">
                      <input name="name" defaultValue={editingItem?.name || ''} required className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Nama Kegiatan" />
                      <div className="grid grid-cols-2 gap-4">
                        <select name="month" defaultValue={editingItem?.month || 'Januari'} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                        <select name="category" defaultValue={editingItem?.category || SNP.Sarpras} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold">{Object.values(SNP).map(v => <option key={v} value={v}>{v}</option>)}</select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input name="quantity" type="number" defaultValue={editingItem?.quantity || 1} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold" />
                        <input name="unit" defaultValue={editingItem?.unit || 'Unit'} className="w-full px-6 py-4 bg-slate-50 border rounded-2xl font-bold" />
                      </div>
                      <input name="price" type="number" defaultValue={editingItem?.price || ''} required className="w-full px-6 py-6 bg-indigo-50 border-indigo-100 rounded-2xl text-2xl font-black text-indigo-600" placeholder="Harga Satuan" />
                      <button type="submit" className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"><Save size={24} /> Simpan Anggaran</button>
                    </form>
                  </div>
                </div>
                <div className="xl:col-span-7 bg-white rounded-[48px] border border-slate-100 overflow-hidden shadow-sm">
                  <div className="p-8 border-b bg-slate-50/20"><h3 className="text-2xl font-black">Histori Perencanaan</h3></div>
                  <div className="divide-y max-h-[700px] overflow-y-auto">
                    {items.map((item, idx) => (
                      <div key={item.id} className="p-8 flex justify-between items-center group hover:bg-slate-50 transition-all">
                        <div className="flex gap-6 items-center">
                          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">{idx + 1}</div>
                          <div><p className="font-black text-slate-900 text-lg">{item.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{item.month} • {item.category}</p></div>
                        </div>
                        <div className="flex items-center gap-6"><div className="text-right"><p className="font-black text-lg">{formatIDR(item.total)}</p></div><div className="flex gap-1"><button onClick={() => setEditingItem(item)} className="p-2 text-indigo-400"><Pencil size={18} /></button><button onClick={() => removeItem(item.id)} className="p-2 text-rose-400"><Trash2 size={18} /></button></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SPJ Tab - UPDATED FUNCTIONALITY */}
            {activeTab === 'spj' && (
              <div className="space-y-10 animate-fade-in">
                {selectedSPJId ? (
                   /* Detail View for selected SPJ */
                   <div className="space-y-8 pb-20">
                      <button onClick={() => setSelectedSPJId(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-sm transition-colors mb-6">
                        <ArrowLeft size={16} /> Kembali ke Daftar SPJ
                      </button>

                      <div className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-12 opacity-5"><Receipt size={160} /></div>
                         <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                               <div>
                                  <h3 className="text-3xl font-black text-slate-900 mb-2">{items.find(i => i.id === selectedSPJId)?.name}</h3>
                                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                     <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">{items.find(i => i.id === selectedSPJId)?.month}</span>
                                     <span>•</span>
                                     <span>{items.find(i => i.id === selectedSPJId)?.category}</span>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Dana SPJ</p>
                                  <p className="text-3xl font-black text-indigo-600">{formatIDR(items.find(i => i.id === selectedSPJId)?.total || 0)}</p>
                               </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                               <div className="lg:col-span-8 space-y-8">
                                  <div className="flex justify-between items-center">
                                     <h4 className="text-xl font-black flex items-center gap-3"><ClipboardList className="text-indigo-600" /> Checklist Bukti Fisik</h4>
                                     <span className="text-[11px] font-black text-emerald-500 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-widest">
                                        Progres: {getSPJProgress(selectedSPJId)}%
                                     </span>
                                  </div>
                                  <div className="space-y-4">
                                     {activeSPJs[selectedSPJId].checklist.map(evidence => (
                                        <div 
                                          key={evidence.id} 
                                          onClick={() => toggleChecklistItem(selectedSPJId, evidence.id)}
                                          className={`p-6 rounded-3xl border transition-all cursor-pointer flex items-center justify-between group ${evidence.status === 'ready' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}
                                        >
                                           <div className="flex items-center gap-6">
                                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${evidence.status === 'ready' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                                 {evidence.status === 'ready' ? <CheckCircle size={18} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                                              </div>
                                              <div>
                                                 <p className={`font-black text-sm ${evidence.status === 'ready' ? 'text-emerald-900 line-through opacity-50' : 'text-slate-800'}`}>{evidence.label}</p>
                                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{evidence.description}</p>
                                              </div>
                                           </div>
                                           <span className="text-[9px] font-black px-3 py-1 bg-white/50 border rounded-lg text-slate-400 uppercase tracking-tighter">{evidence.type}</span>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                               <div className="lg:col-span-4 space-y-8">
                                  <div className="p-8 bg-slate-900 rounded-[40px] text-white">
                                     <h4 className="font-black text-lg mb-4 flex items-center gap-2 text-indigo-400"><ShieldCheck size={20} /> Dasar Hukum</h4>
                                     <p className="text-xs leading-relaxed text-slate-400 font-medium italic">"{activeSPJs[selectedSPJId].legalBasis}"</p>
                                     <div className="mt-8 pt-8 border-t border-white/10">
                                        <h4 className="font-black text-sm mb-4 text-amber-400 flex items-center gap-2"><Sparkles size={16} /> Tips Audit AI</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">{activeSPJs[selectedSPJId].tips}</p>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                ) : (
                  /* List View for SPJ dashboard */
                  <div className="space-y-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                       <div>
                          <h3 className="text-3xl font-black text-slate-900">Pelaporan SPJ</h3>
                          <p className="text-sm text-slate-400 font-bold mt-1">Kelola bukti fisik dan administrasi BOSP secara digital.</p>
                       </div>
                       <button 
                        onClick={() => setIsLinkingModalOpen(true)}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 flex items-center gap-3 transition-all active:scale-95"
                       >
                          <Layers size={18} /> Mulai SPJ Baru
                       </button>
                    </div>

                    {isGeneratingSPJ && (
                      <div className="bg-indigo-50 p-12 rounded-[40px] border border-indigo-100 flex flex-col items-center justify-center animate-pulse">
                         <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                         <p className="font-black text-indigo-900 uppercase tracking-widest text-sm">Menghubungkan ke Gemini AI...</p>
                         <p className="text-xs text-indigo-400 font-bold mt-2">Menganalisis Juknis BOSP 2026 untuk kegiatan Anda</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {Object.keys(activeSPJs).length > 0 ? (
                        // Fix: Explicitly cast to [string, SPJRecommendation][] to resolve unknown type error on spj
                        (Object.entries(activeSPJs) as [string, SPJRecommendation][]).map(([itemId, spj]) => {
                          const item = items.find(i => i.id === itemId);
                          if (!item) return null;
                          return (
                            <div 
                              key={itemId} 
                              onClick={() => setSelectedSPJId(itemId)}
                              className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group relative overflow-hidden"
                            >
                               <div className="flex justify-between items-start mb-8">
                                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[24px] group-hover:scale-110 transition-transform">
                                    <FileCheck size={28} />
                                  </div>
                                  <div className="text-right">
                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulan</span>
                                     <p className="text-sm font-black text-slate-800">{item.month}</p>
                                  </div>
                               </div>
                               <h4 className="text-xl font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">{formatIDR(item.total)}</p>
                               
                               <div className="space-y-3">
                                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                     <span className="text-slate-400 tracking-wider">Kelengkapan Berkas</span>
                                     <span className="text-indigo-600">{getSPJProgress(itemId)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                                     <div 
                                        className="bg-gradient-to-r from-indigo-500 to-blue-400 h-full transition-all duration-1000"
                                        style={{ width: `${getSPJProgress(itemId)}%` }}
                                     />
                                  </div>
                               </div>

                               <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{spj.checklist.length} Dokumen Wajib</p>
                                  <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                               </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-40 text-center opacity-20">
                           <Layers size={80} className="mx-auto mb-6" />
                           <p className="font-black text-2xl uppercase tracking-[0.3em]">Belum Ada SPJ Aktif</p>
                           <p className="text-xs font-bold uppercase mt-2">Klik 'Mulai SPJ Baru' untuk mengaitkan item anggaran</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Linking Modal */}
                {isLinkingModalOpen && (
                   <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in">
                      <div className="bg-white w-full max-w-2xl rounded-[60px] p-12 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
                         <div className="flex justify-between items-center mb-10 shrink-0">
                            <div>
                               <h3 className="text-2xl font-black">Pilih Item Anggaran</h3>
                               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Item yang sudah direncanakan di RKAS</p>
                            </div>
                            <button onClick={() => setIsLinkingModalOpen(false)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                               <PlusCircle size={20} className="rotate-45" />
                            </button>
                         </div>
                         
                         <div className="space-y-4 overflow-y-auto pr-4 custom-scrollbar">
                            {items.length > 0 ? (
                               items.map(item => (
                                  <div 
                                    key={item.id} 
                                    onClick={() => createSPJForInitem(item)}
                                    className={`p-6 rounded-[32px] border transition-all cursor-pointer flex justify-between items-center group hover:bg-indigo-50 hover:border-indigo-100 ${activeSPJs[item.id] ? 'opacity-50 border-emerald-100 bg-emerald-50/20' : 'bg-slate-50 border-slate-100'}`}
                                  >
                                     <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 font-black shadow-sm group-hover:bg-white group-hover:text-indigo-600">
                                           {item.month.substring(0,3)}
                                        </div>
                                        <div>
                                           <p className="font-black text-slate-800 text-sm">{item.name}</p>
                                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatIDR(item.total)}</p>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-4">
                                        {activeSPJs[item.id] && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter bg-white px-3 py-1 rounded-full">Sudah Dibuat</span>}
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                           <PlusCircle size={18} />
                                        </div>
                                     </div>
                                  </div>
                               ))
                            ) : (
                               <div className="py-20 text-center opacity-20 font-black uppercase text-sm">Belum ada perencanaan anggaran</div>
                            )}
                         </div>

                         <div className="mt-10 pt-8 border-t border-slate-50 shrink-0">
                            <p className="text-[10px] text-slate-400 font-bold text-center leading-relaxed">
                               Item anggaran di atas berasal dari tab **Perencanaan**. <br/>Memilih item akan memicu AI untuk menyiapkan checklist dokumen pendukung.
                            </p>
                         </div>
                      </div>
                   </div>
                )}
              </div>
            )}

            {/* Analysis & Settings Tabs - Same as before but consistent */}
            {activeTab === 'analysis' && (
              <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">
                <div className="bg-white p-12 rounded-[60px] border border-slate-100 shadow-xl text-center">
                   <div className="inline-flex p-8 bg-indigo-50 text-indigo-600 rounded-[40px] mb-8"><BrainCircuit size={48} /></div>
                   <h3 className="text-4xl font-black text-slate-900 mb-4">Audit Anggaran AI</h3>
                   <p className="text-slate-400 font-bold max-w-lg mx-auto mb-10">Gunakan kecerdasan buatan Gemini untuk menganalisis efisiensi dan kepatuhan anggaran sekolah Anda.</p>
                   <button onClick={runAIAnalysis} disabled={isAnalyzing} className="px-12 py-5 bg-slate-900 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center gap-4 mx-auto hover:bg-indigo-600 transition-all">
                     {isAnalyzing ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />} {isAnalyzing ? "Menganalisis Anggaran..." : "Mulai Audit Sekarang"}
                   </button>
                </div>
                {aiAnalysis && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
                    <div className="md:col-span-2 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                       <h4 className="text-2xl font-black mb-6 flex items-center gap-3"><Info className="text-indigo-600" /> Ringkasan Analisis</h4>
                       <p className="text-slate-600 leading-relaxed font-medium">{aiAnalysis.summary}</p>
                    </div>
                    <div className="bg-slate-900 p-10 rounded-[48px] text-white">
                       <h4 className="text-xl font-black mb-10 text-center">Tingkat Risiko</h4>
                       <div className="flex flex-col items-center justify-center py-10">
                          <div className={`text-6xl font-black mb-4 ${aiAnalysis.riskAssessment === 'Low' ? 'text-emerald-400' : aiAnalysis.riskAssessment === 'Medium' ? 'text-amber-400' : 'text-rose-400'}`}>{aiAnalysis.riskAssessment}</div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
                <div className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className="flex items-center gap-5 mb-12"><div className="p-4 bg-indigo-50 text-indigo-600 rounded-[28px]"><Settings size={32} /></div><h3 className="text-3xl font-black text-slate-900 tracking-tight">Konfigurasi Sekolah</h3></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Satuan Pendidikan</label><input value={schoolData.name} onChange={e => setSchoolData({...schoolData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-100 border rounded-[24px] outline-none font-bold text-slate-800 transition-all" /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">NPSN</label><input value={schoolData.npsn} onChange={e => setSchoolData({...schoolData, npsn: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-100 border rounded-[24px] outline-none font-bold text-slate-800 transition-all" /></div>
                  </div>
                  <div className="space-y-2 mb-10"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Lengkap</label><textarea value={schoolData.address} onChange={e => setSchoolData({...schoolData, address: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-100 border rounded-[24px] outline-none font-bold text-slate-800 transition-all h-24" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Pagu BOSP (IDR)</label><input type="number" value={totalPagu} onChange={e => setTotalPagu(Number(e.target.value))} className="w-full px-8 py-5 bg-indigo-50 border-transparent focus:bg-white border focus:border-indigo-200 rounded-[28px] outline-none text-xl font-black text-indigo-600 transition-all" /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah Peserta Didik</label><input type="number" value={studentCount} onChange={e => setStudentCount(Number(e.target.value))} className="w-full px-8 py-5 bg-slate-50 border-transparent focus:bg-white border focus:border-indigo-200 rounded-[28px] outline-none text-xl font-bold text-slate-800 transition-all" /></div>
                  </div>
                  <button onClick={handleUpdateSettings} disabled={dbStatus === 'syncing'} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[32px] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-4 active:scale-95 duration-200">{dbStatus === 'syncing' ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />} {isSupabaseConfigured ? "Update Database Cloud" : "Simpan Profil (Local)"}</button>
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
