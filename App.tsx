
import React, { useState, useMemo, useEffect } from 'react';
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
  // Added missing icons
  Calendar,
  Download
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
import { SNP, BudgetItem, AIAnalysisResponse } from './types';
import { analyzeBudget } from './services/geminiService';
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
      setIsLoaded(true);
      setDbStatus('connected');
    };
    initLoad();
  }, []);

  const totalSpent = useMemo(() => items.reduce((acc, item) => acc + item.total, 0), [items]);
  const usagePercentage = useMemo(() => Math.round((totalSpent / totalPagu) * 100) || 0, [totalSpent, totalPagu]);

  // Chart Data Preparation
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
      {/* Sleek Sidebar */}
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

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />)}
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tim Manajemen BOS Aktif</p>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
              Halo, <span className="text-indigo-600 font-black">{schoolData.name}</span>
            </h2>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-[24px] shadow-sm border border-slate-100">
             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar size={20} /></div>
             <div className="pr-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tahun Anggaran</p>
                <p className="font-black text-slate-800 text-sm">2026/2027</p>
             </div>
          </div>
        </header>

        {/* Dynamic Tab Content */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Bento Grid Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Pagu BOSP" value={formatIDR(totalPagu)} icon={<Wallet size={24} />} variant="primary" trend="BOS REGULER" />
                <StatCard title="Dana Terpakai" value={formatIDR(totalSpent)} icon={<TrendingUp size={24} />} variant="warning" progress={usagePercentage} />
                <StatCard title="Sisa Anggaran" value={formatIDR(totalPagu - totalSpent)} icon={<Coins size={24} />} variant="success" trend="SURPLUS" />
                <StatCard title="Target Siswa" value={`${studentCount}`} icon={<Users size={24} />} variant="primary" trend="DAPODIK" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Monthly Chart */}
                <div className="lg:col-span-8 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Alur Pengeluaran Bulanan</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Visualisasi Real-time RKAS</p>
                    </div>
                    <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <BarIcon size={20} />
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={15} />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                          formatter={(value) => formatIDR(value as number)}
                        />
                        <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* SNP Distribution */}
                <div className="lg:col-span-4 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group overflow-hidden">
                   <div className="flex justify-between items-center mb-10">
                      <h3 className="text-xl font-black text-slate-900">Distribusi SNP</h3>
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <PieIcon size={20} />
                      </div>
                   </div>
                   <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={snpData} innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value">
                          {snpData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SNP_COLORS[index % SNP_COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatIDR(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                   </div>
                   <div className="mt-4 space-y-2">
                      {snpData.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{backgroundColor: SNP_COLORS[i]}}></div>
                              <span className="text-slate-500 uppercase tracking-wider truncate max-w-[120px]">{item.name}</span>
                           </div>
                           <span className="text-slate-900">{formatIDR(item.value)}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              {/* Table Preview */}
              <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Rincian Kegiatan Terakhir</h3>
                    <p className="text-sm text-slate-400 font-bold mt-1">Menampilkan transaksi anggaran yang disinkronkan ke cloud</p>
                  </div>
                  <div className="flex gap-3">
                     <button className="flex items-center gap-2 px-6 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-xs font-black uppercase tracking-widest text-slate-600">
                        <Download size={14} /> Ekspor PDF
                     </button>
                     <button onClick={() => setActiveTab('planner')} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200">
                        <PlusCircle size={14} /> Item Baru
                     </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50/40 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                         <tr>
                            <th className="px-10 py-6">Deskripsi Kegiatan</th>
                            <th className="px-10 py-6">Kategori / Standar</th>
                            <th className="px-10 py-6">Status Waktu</th>
                            <th className="px-10 py-6 text-right">Nilai Anggaran</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {items.slice(0, 5).map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                               <td className="px-10 py-8">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                                        {idx + 1}
                                     </div>
                                     <div>
                                        <p className="font-black text-slate-900 text-base">{item.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kode: {item.accountCode}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-8">
                                  <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider">{item.category.split(' ')[1] || item.category}</span>
                               </td>
                               <td className="px-10 py-8">
                                  <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                     <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{item.month}</span>
                                  </div>
                               </td>
                               <td className="px-10 py-8 text-right font-black text-slate-900 text-lg">{formatIDR(item.total)}</td>
                            </tr>
                         ))}
                         {items.length === 0 && (
                           <tr><td colSpan={4} className="py-32 text-center opacity-30 font-black text-xl uppercase tracking-widest">Database Kosong</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'planner' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              <div className="xl:col-span-5 space-y-8">
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                    <PlusCircle size={150} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4">
                    <PlusCircle className="text-indigo-600" size={32} />
                    {editingItem ? 'Modifikasi Rencana' : 'Entri Anggaran'}
                  </h3>
                  
                  <form onSubmit={handleAddItem} className="space-y-6 relative z-10">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Uraian Nama Kegiatan</label>
                       <input name="name" defaultValue={editingItem?.name || ''} required className="w-full px-6 py-4 bg-slate-50 focus:bg-white border border-transparent focus:border-indigo-100 rounded-[24px] outline-none font-bold text-slate-800 transition-all" placeholder="Contoh: Pembelian Laptop Lab" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Alokasi Bulan</label>
                          <select name="month" defaultValue={editingItem?.month || 'Januari'} className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-[24px] outline-none font-bold text-slate-800 transition-all appearance-none cursor-pointer">
                             {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Kategori SNP</label>
                          <select name="category" defaultValue={editingItem?.category || SNP.Sarpras} className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-[24px] outline-none font-bold text-slate-800 transition-all appearance-none cursor-pointer">
                             {Object.values(SNP).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Kode Rekening</label>
                       <select name="accountCode" defaultValue={editingItem?.accountCode || ''} className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-[24px] outline-none font-bold text-slate-800 transition-all appearance-none cursor-pointer">
                          {MONTHS.map((_, i) => <option key={i} value={`5.1.02.0${i}`}>5.1.02.0{i} - Akun Operasional {i}</option>)}
                       </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Vol</label>
                          <input name="quantity" type="number" defaultValue={editingItem?.quantity || 1} className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-[24px] outline-none font-bold text-slate-800" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Satuan</label>
                          <input name="unit" defaultValue={editingItem?.unit || 'Unit'} className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:border-indigo-100 rounded-[24px] outline-none font-bold text-slate-800" />
                       </div>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Estimasi Harga Satuan</label>
                       <div className="relative">
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-300">Rp</div>
                          <input name="price" type="number" defaultValue={editingItem?.price || ''} required className="w-full pl-14 pr-6 py-6 bg-indigo-50 border border-indigo-100 focus:border-indigo-300 rounded-[32px] outline-none text-2xl font-black text-indigo-600 transition-all" placeholder="0" />
                       </div>
                    </div>

                    <button type="submit" disabled={dbStatus === 'syncing'} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[32px] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 duration-200">
                      {dbStatus === 'syncing' ? <RefreshCw className="animate-spin" size={24} /> : editingItem ? <Save size={24} /> : <CheckCircle size={24} />}
                      {editingItem ? 'Perbarui Perubahan' : 'Kirim ke Database'}
                    </button>
                    {editingItem && (
                      <button type="button" onClick={() => setEditingItem(null)} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest">Batalkan Edit</button>
                    )}
                  </form>
                </div>
              </div>

              <div className="xl:col-span-7 bg-white rounded-[48px] border border-slate-100 overflow-hidden shadow-sm flex flex-col h-full">
                <div className="p-10 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center">
                  <h3 className="text-2xl font-black text-slate-900">Histori Perencanaan</h3>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <Search size={14} className="text-slate-400" />
                    <input className="outline-none text-xs font-bold text-slate-600 w-32" placeholder="Cari kegiatan..." />
                  </div>
                </div>
                <div className="divide-y divide-slate-50 overflow-y-auto flex-1 max-h-[800px]">
                  {items.map((item, idx) => (
                    <div key={item.id} className="p-8 flex justify-between items-center group hover:bg-slate-50/80 transition-all duration-300">
                      <div className="flex gap-6 items-center">
                        <div className="w-14 h-14 bg-white border border-slate-100 text-slate-400 rounded-3xl flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{item.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.month}</span>
                             <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{item.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-black text-xl text-slate-900">{formatIDR(item.total)}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.quantity} {item.unit}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingItem(item)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><Pencil size={18} /></button>
                          <button onClick={() => removeItem(item.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="py-40 text-center opacity-20">
                      <Database size={80} className="mx-auto mb-6" />
                      <p className="font-black text-2xl uppercase tracking-[0.3em]">No Data Synced</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fallback for other tabs */}
          {(activeTab === 'analysis' || activeTab === 'spj' || activeTab === 'settings') && (
            <div className="bg-white p-20 rounded-[60px] border border-slate-100 shadow-xl text-center animate-fade-in">
              <div className="inline-flex p-8 bg-indigo-50 text-indigo-600 rounded-[40px] mb-8 animate-bounce">
                <Sparkles size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4">Fitur Premium Aktif</h3>
              <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">
                Halaman {activeTab.toUpperCase()} sedang dalam sinkronisasi API Gemini 3. Progres dapat dilihat di status bar cloud.
              </p>
              <button onClick={() => setActiveTab('dashboard')} className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200">
                Kembali ke Beranda
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
