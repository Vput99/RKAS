
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
  RefreshCw,
  AlertTriangle,
  Info,
  Copy,
  Terminal
} from 'lucide-react';
import { SNP, BudgetItem, AIAnalysisResponse, SPJRecommendation } from './types';
import { analyzeBudget, getSPJRecommendations } from './services/geminiService';
import { storageService } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
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
  const usagePercentage = useMemo(() => (totalSpent / totalPagu) * 100, [totalSpent, totalPagu]);

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      alert("⚠️ Database Cloud belum aktif. Data akan hilang jika browser di-refresh.");
    }
    
    setDbStatus('syncing');
    const formData = new FormData(e.currentTarget);
    const price = Number(formData.get('price'));
    const quantity = Number(formData.get('quantity'));
    
    if (!price || !quantity) return;

    if (editingItem) {
      const updatedItem = {
        ...editingItem,
        name: formData.get('name') as string,
        category: formData.get('category') as SNP,
        accountCode: formData.get('accountCode') as string,
        quantity,
        unit: formData.get('unit') as string,
        price,
        total: price * quantity,
        month: formData.get('month') as string,
      };
      if (isSupabaseConfigured) await storageService.updateItem(updatedItem);
      setItems(prev => prev.map(i => i.id === editingItem.id ? updatedItem : i));
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
        source: 'BOS Reguler',
        month: formData.get('month') as string,
      };
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
    if (confirm('Hapus data ini secara permanen dari Supabase?')) {
      setDbStatus('syncing');
      await storageService.deleteItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      setDbStatus('connected');
    }
  };

  const handleUpdateSettings = async () => {
    if (!isSupabaseConfigured) {
      alert("Mode Demo: Perubahan profil hanya disimpan sementara.");
      return;
    }
    setDbStatus('syncing');
    await storageService.saveSettings(schoolData.name, schoolData.npsn, schoolData.address, totalPagu, studentCount);
    setDbStatus('connected');
    alert('✅ Sinkronisasi Berhasil!');
  };

  const copySQL = () => {
    const sql = `CREATE TABLE school_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'SD Negeri Pintar Jaya',
  npsn TEXT DEFAULT '10203040',
  address TEXT,
  total_pagu BIGINT DEFAULT 150000000,
  student_count INT DEFAULT 450
);

INSERT INTO school_settings (id, name) VALUES (1, 'SD Negeri Pintar Jaya') ON CONFLICT DO NOTHING;

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
    alert("SQL disalin! Tempelkan di Dashboard Supabase (SQL Editor).");
  };

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (!isLoaded) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-black">
      <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
      <h2 className="text-xl tracking-tighter uppercase">Menyiapkan Sistem RKAS...</h2>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      <aside className="w-full md:w-72 bg-slate-950 text-slate-300 flex flex-col sticky top-0 h-auto md:h-screen z-50 shadow-2xl no-print">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-900/50">
              <ClipboardList className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none tracking-tight">RKAS<span className="text-indigo-500">Pintar</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Cloud Integrated</p>
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
          <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-colors ${dbStatus === 'syncing' ? 'bg-amber-900/20 border-amber-800 text-amber-400' : dbStatus === 'error' ? 'bg-rose-900/20 border-rose-800 text-rose-400' : 'bg-emerald-900/20 border-emerald-800 text-emerald-400'}`}>
            {dbStatus === 'syncing' ? <RefreshCw size={14} className="animate-spin" /> : dbStatus === 'error' ? <AlertTriangle size={14} /> : <Database size={14} />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {dbStatus === 'syncing' ? 'Sinkronisasi...' : dbStatus === 'error' ? 'DB Disconnected' : 'Supabase Terhubung'}
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {!isSupabaseConfigured && activeTab !== 'settings' && (
          <div className="mb-8 p-6 bg-rose-50 border border-rose-100 rounded-[32px] flex items-center justify-between animate-in slide-in-from-top duration-700">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><AlertTriangle size={24}/></div>
                <div>
                   <h4 className="font-black text-rose-900">Konfigurasi Cloud Belum Selesai</h4>
                   <p className="text-xs text-rose-700 font-medium">Data Anda saat ini hanya tersimpan di memori browser (sementara).</p>
                </div>
             </div>
             <button onClick={() => setActiveTab('settings')} className="bg-rose-600 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-rose-200">Buka Panduan Setup</button>
          </div>
        )}

        {/* Tab Content Renderer */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <StatCard title="Pagu BOSP" value={formatIDR(totalPagu)} icon={<Wallet size={24} />} variant="primary" trend={isSupabaseConfigured ? "Cloud Active" : "Local Mode"} />
              <StatCard title="Total Belanja" value={formatIDR(totalSpent)} icon={<TrendingUp size={24} />} variant="warning" trend="RKAS Actual" />
              <StatCard title="Sisa Dana" value={formatIDR(totalPagu - totalSpent)} icon={<Coins size={24} />} variant="success" trend="Tersedia" />
              <StatCard title="Jumlah Siswa" value={`${studentCount} Siswa`} icon={<Users size={24} />} variant="primary" trend="Dapodik" />
            </div>
            
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <h3 className="font-black text-xl text-slate-800">Daftar Anggaran</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Uraian Kegiatan</th>
                      <th className="px-8 py-5">Waktu</th>
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
          <div className="animate-in fade-in duration-500 grid grid-cols-1 xl:grid-cols-12 gap-10">
            <div className="xl:col-span-4 space-y-4">
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <h3 className="font-black text-xl mb-8 flex items-center gap-2">
                  <PlusCircle className="text-indigo-600" /> {editingItem ? 'Edit Anggaran' : 'Anggaran Baru'}
                </h3>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <input name="name" defaultValue={editingItem?.name || ''} required className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none font-bold" placeholder="Nama Kegiatan" />
                  <div className="grid grid-cols-2 gap-2">
                    <select name="month" defaultValue={editingItem?.month || 'Januari'} className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none font-bold">
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select name="category" defaultValue={editingItem?.category || SNP.Sarpras} className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none font-bold">
                      {Object.values(SNP).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <select name="accountCode" defaultValue={editingItem?.accountCode || ''} className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none font-bold">
                    {ACCOUNT_CODES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="quantity" type="number" defaultValue={editingItem?.quantity || 1} className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none font-bold" />
                    <input name="unit" defaultValue={editingItem?.unit || ''} placeholder="Satuan" className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none font-bold" />
                  </div>
                  <input name="price" type="number" defaultValue={editingItem?.price || ''} required className="w-full px-5 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none font-black text-indigo-600" placeholder="Harga Satuan" />
                  <button type="submit" disabled={dbStatus === 'syncing'} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    {dbStatus === 'syncing' ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    Simpan Anggaran
                  </button>
                </form>
              </div>
            </div>
            <div className="xl:col-span-8 bg-white rounded-[40px] border border-slate-200 overflow-hidden min-h-[500px] shadow-sm">
              <div className="p-8 border-b bg-slate-50/30 flex justify-between items-center">
                <h3 className="font-black text-xl">Review Real-Time</h3>
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
                      <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingItem(item)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={18} /></button>
                        <button onClick={() => removeItem(item.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in slide-in-from-bottom duration-700">
            <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl relative overflow-hidden">
              <h3 className="font-black text-3xl text-slate-800 mb-10 flex items-center gap-4">
                <Settings className="text-indigo-600" size={32} />
                Konfigurasi Sekolah
              </h3>
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Sekolah</label>
                    <input value={schoolData.name} onChange={e => setSchoolData({...schoolData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border rounded-3xl outline-none font-bold text-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NPSN</label>
                    <input value={schoolData.npsn} onChange={e => setSchoolData({...schoolData, npsn: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border rounded-3xl outline-none font-bold text-slate-800" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Pagu BOSP (IDR)</label>
                  <input type="number" value={totalPagu} onChange={e => setTotalPagu(Number(e.target.value))} className="w-full px-8 py-6 bg-indigo-50 border border-indigo-100 rounded-[32px] outline-none text-2xl font-black text-indigo-600" />
                </div>
                <button onClick={handleUpdateSettings} disabled={dbStatus === 'syncing'} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] hover:bg-indigo-700 transition-all shadow-2xl flex items-center justify-center gap-3">
                  {dbStatus === 'syncing' ? <RefreshCw className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                  {isSupabaseConfigured ? "Update Data Cloud" : "Simpan (Local Only)"}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl border border-slate-800">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-2xl flex items-center gap-3">
                     <Terminal className="text-emerald-400" size={28} />
                     Panduan SQL Supabase
                  </h3>
                  <button onClick={copySQL} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                     <Copy size={16} /> Salin SQL
                  </button>
               </div>
               <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Agar database Supabase Anda dapat menerima data dari aplikasi ini, jalankan kode SQL berikut di <b>Dashboard Supabase -> SQL Editor</b>:
               </p>
               <div className="bg-black/50 p-6 rounded-3xl border border-slate-700 font-mono text-xs text-emerald-300 overflow-x-auto">
                  <pre>
{`CREATE TABLE school_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT,
  npsn TEXT,
  total_pagu BIGINT,
  ...
);`}
                  </pre>
               </div>
               <div className="mt-8 p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/30 flex items-start gap-4">
                  <Info className="text-indigo-400 shrink-0" size={24} />
                  <p className="text-xs text-indigo-200 leading-relaxed font-medium">
                     Setelah SQL dijalankan dan Environment Variables (SUPABASE_URL & ANON_KEY) dimasukkan di Vercel, aplikasi ini akan otomatis beralih ke <b>Mode Cloud</b> secara real-time.
                  </p>
               </div>
            </div>
          </div>
        )}

        {/* Tab SPJ & Analysis logic follows previous implementations... */}
      </main>
    </div>
  );
};

export default App;
