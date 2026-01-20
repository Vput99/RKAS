
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, PlusCircle, ClipboardList, BrainCircuit, Wallet, 
  TrendingUp, ChevronRight, Receipt, Sparkles, CheckCircle, Coins, 
  Settings, School, Users, Save, RefreshCw, Calendar, 
  FileCheck, ArrowLeft, Tag, Search, X, Database, Terminal, CircleDashed,
  AlertCircle, ArrowDownCircle, Info, ArrowUpRight, Lightbulb, TrendingDown,
  Loader2, CheckSquare, Square, Pencil, Trash2, Printer, ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, 
  Tooltip, BarChart, Bar
} from 'recharts';
import { SNP, BudgetItem, AIAnalysisResponse, SPJRecommendation } from './types';
import { analyzeBudget, getSPJRecommendations } from './services/geminiService';
import { storageService } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { StatCard } from './components/StatCard';

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const BOSP_ACCOUNT_CODES = [
  { code: '5.1.02.01.01.0001', label: 'Honorarium Guru/Tendik', category: 'Honor' },
  { code: '5.1.02.01.01.0002', label: 'Honorarium Narasumber/Instruktur', category: 'Honor' },
  { code: '5.1.02.01.01.0024', label: 'Belanja Alat Tulis Kantor (ATK)', category: 'Barjas' },
  { code: '5.1.02.01.01.0052', label: 'Belanja Makan Minum Rapat', category: 'Barjas' },
  { code: '5.1.02.02.01.0011', label: 'Belanja Langganan Listrik', category: 'Jasa' },
  { code: '5.1.02.02.01.0013', label: 'Belanja Internet/WiFi', category: 'Jasa' },
  { code: '5.1.02.02.01.0061', label: 'Belanja Pemeliharaan Gedung', category: 'Maint' },
  { code: '5.2.02.05.01.0002', label: 'Belanja Modal Laptop/Chromebook', category: 'Modal' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'analysis' | 'spj' | 'settings'>('dashboard');
  const [schoolData, setSchoolData] = useState({ name: 'SD Negeri Pintar', npsn: '102030', address: 'Kota Pintar' });
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [totalPagu, setTotalPagu] = useState(150000000);
  const [studentCount, setStudentCount] = useState(450);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGeneratingSPJ, setIsGeneratingSPJ] = useState(false);
  const [spjSelectedMonth, setSpjSelectedMonth] = useState("Januari");
  const [activeSPJs, setActiveSPJs] = useState<Record<string, SPJRecommendation>>({});
  const [selectedSPJId, setSelectedSPJId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Realization & Reallocation State
  const [realizationInput, setRealizationInput] = useState<string>("");
  const [prefilledPlanner, setPrefilledPlanner] = useState<{name: string, price: number} | null>(null);

  // Planner States
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [selectedFormMonths, setSelectedFormMonths] = useState<string[]>(['Januari']);
  const [selectedAccount, setSelectedAccount] = useState<typeof BOSP_ACCOUNT_CODES[0] | null>(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [searchAccount, setSearchAccount] = useState('');

  useEffect(() => {
    const init = async () => {
      const data = await storageService.loadAll();
      setItems(data.items || []);
      if (data.schoolData) setSchoolData(data.schoolData);
      setTotalPagu(data.totalPagu);
      setStudentCount(data.studentCount);
      const saved = localStorage.getItem('rkas_spjs_v5');
      if (saved) setActiveSPJs(JSON.parse(saved));
      setIsLoaded(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('rkas_spjs_v5', JSON.stringify(activeSPJs));
  }, [activeSPJs, isLoaded]);

  const filteredAccountCodes = useMemo(() => {
    return BOSP_ACCOUNT_CODES.filter(a => a.label.toLowerCase().includes(searchAccount.toLowerCase()) || a.code.includes(searchAccount));
  }, [searchAccount]);

  const filteredItemsByMonth = useMemo(() => items.filter(i => i.month === spjSelectedMonth), [items, spjSelectedMonth]);
  const totalSpentActual = useMemo(() => items.reduce((a, b) => a + (b.realization || 0), 0), [items]);
  const totalSiLPA = useMemo(() => items.reduce((a, b) => {
    if (b.realization !== undefined && b.realization > 0) {
      const diff = b.total - b.realization;
      return diff > 0 ? a + diff : a;
    }
    return a;
  }, 0), [items]);

  const formatIDR = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  const toggleMonth = (month: string) => {
    if (editingItem) {
        setSelectedFormMonths([month]);
    } else {
        setSelectedFormMonths(prev => 
            prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
        );
    }
  };

  const selectAllMonths = () => {
    if (editingItem) return;
    if (selectedFormMonths.length === MONTHS.length) {
      setSelectedFormMonths([]);
    } else {
      setSelectedFormMonths([...MONTHS]);
    }
  };

  const startEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setSelectedFormMonths([item.month]);
    const acc = BOSP_ACCOUNT_CODES.find(a => a.code === item.accountCode);
    setSelectedAccount(acc || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus perencanaan ini?")) return;
    await storageService.deleteItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (activeSPJs[id]) {
        const newSPJs = { ...activeSPJs };
        delete newSPJs[id];
        setActiveSPJs(newSPJs);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setSelectedAccount(null);
    setSelectedFormMonths(['Januari']);
  };

  const handleSubmitPlanner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAccount) return alert("Pilih kode rekening!");
    if (selectedFormMonths.length === 0) return alert("Pilih minimal satu bulan anggaran!");
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const price = Number(formData.get('price'));
    const quantity = Number(formData.get('quantity'));
    const name = formData.get('name') as string;
    const unit = formData.get('unit') as string || 'Unit';

    if (editingItem) {
        const updated: BudgetItem = {
            ...editingItem,
            name,
            accountCode: selectedAccount.code,
            quantity,
            unit,
            price,
            total: price * quantity,
            month: selectedFormMonths[0]
        };
        await storageService.updateItem(updated);
        setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
        setEditingItem(null);
        alert("Anggaran berhasil diperbarui!");
    } else {
        const newEntries: BudgetItem[] = selectedFormMonths.map(month => ({
            id: Math.random().toString(36).substr(2, 9),
            name,
            category: SNP.Pembiayaan,
            accountCode: selectedAccount.code,
            quantity,
            unit,
            price,
            total: price * quantity,
            realization: 0,
            source: 'BOS Reguler',
            month
        }));

        for (const item of newEntries) {
            await storageService.addItem(item);
        }
        setItems(prev => [...prev, ...newEntries]);
        alert(`Berhasil menambahkan ${newEntries.length} entri anggaran!`);
    }

    form.reset();
    setSelectedAccount(null);
    setSelectedFormMonths(['Januari']);
    setPrefilledPlanner(null);
  };

  const triggerSPJ = async (item: BudgetItem) => {
    setIsGeneratingSPJ(true);
    const res = await getSPJRecommendations(item);
    if (res) {
      setActiveSPJs(prev => ({ ...prev, [item.id]: { ...res, activityId: item.id } }));
      setSelectedSPJId(item.id);
      setRealizationInput(item.realization?.toString() || "");
    }
    setIsGeneratingSPJ(false);
  };

  const handleSaveRealization = async () => {
    if (!selectedSPJId) return;
    const item = items.find(i => i.id === selectedSPJId);
    if (!item) return;

    const val = Number(realizationInput);
    const updatedItem = { ...item, realization: val };
    
    await storageService.updateItem(updatedItem);
    setItems(prev => prev.map(i => i.id === selectedSPJId ? updatedItem : i));
    alert("Realisasi anggaran berhasil disimpan.");
  };

  const handleReallocate = (itemName: string, amount: number) => {
    setPrefilledPlanner({
      name: `Re-alokasi SiLPA: ${itemName}`,
      price: amount
    });
    setActiveTab('planner');
    setSelectedSPJId(null);
    alert(`Sisa anggaran Rp${amount.toLocaleString()} siap dialokasikan ke kegiatan baru.`);
  };

  const runAudit = async () => {
    if (items.length === 0) return alert("Belum ada data anggaran untuk diaudit.");
    setIsAnalyzing(true);
    const res = await analyzeBudget(items, totalPagu);
    if (res) setAiAnalysis(res);
    setIsAnalyzing(false);
  };

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse tracking-widest uppercase">Memuat RKAS Pintar...</div>;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-slate-950 text-slate-400 p-10 flex flex-col gap-10 no-print">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-500/20"><ClipboardList size={28} /></div>
          <div>
            <h1 className="text-white font-black text-2xl leading-none tracking-tighter">RKAS<span className="text-indigo-500">Pintar</span></h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Smart BOSP System</p>
          </div>
        </div>
        <nav className="space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'planner', icon: PlusCircle, label: 'Perencanaan' },
            { id: 'analysis', icon: BrainCircuit, label: 'Audit AI' },
            { id: 'spj', icon: Receipt, label: 'SPJ Digital' },
            { id: 'settings', icon: Settings, label: 'Konfigurasi' }
          ].map(n => (
            <button 
              key={n.id} 
              onClick={() => setActiveTab(n.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[22px] font-bold transition-all duration-300 ${activeTab === n.id ? 'bg-white text-indigo-600 shadow-xl scale-105' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <n.icon size={20} /> <span className="text-sm">{n.label}</span>
              {activeTab === n.id && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-14 overflow-y-auto">
        <header className="mb-14 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{schoolData.name}</h2>
            <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.3em] mt-2 flex items-center gap-2">
              <School size={14} /> NPSN: {schoolData.npsn} • TAHUN 2026/2027
            </p>
          </div>
          <div className="bg-white px-6 py-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
             <Calendar className="text-indigo-500" size={20} />
             <div className="font-black text-slate-800 text-xs uppercase tracking-widest">RKAS Aktif</div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard title="Pagu Anggaran" value={formatIDR(totalPagu)} icon={<Wallet size={24}/>} variant="primary" trend="BOSP" />
              <StatCard title="Realisasi Dana" value={formatIDR(totalSpentActual)} icon={<TrendingUp size={24}/>} variant="warning" progress={Math.round((totalSpentActual/totalPagu)*100)} />
              <StatCard title="Tabungan SiLPA" value={formatIDR(totalSiLPA)} icon={<Coins size={24}/>} variant="success" trend="EFISIENSI" />
              <StatCard title="Dana Belum Terserap" value={formatIDR(totalPagu - totalSpentActual)} icon={<TrendingDown size={24}/>} variant="danger" trend="SISA" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Performa Penyerapan & Efisiensi</h3>
                  <div className="px-4 py-2 bg-indigo-50 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12}/> Monitoring SiLPA
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MONTHS.map(m => {
                        const monthItems = items.filter(i => i.month === m);
                        const silpa = monthItems.reduce((a, b) => (b.realization && b.realization > 0) ? a + (b.total - b.realization) : a, 0);
                        const realized = monthItems.reduce((a, b) => a + (b.realization || 0), 0);
                        return { name: m.substring(0,3), silpa, realized };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} 
                      />
                      <Bar dataKey="realized" fill="#6366f1" radius={[10, 10, 0, 0]} name="Terpakai" />
                      <Bar dataKey="silpa" fill="#10b981" radius={[10, 10, 0, 0]} name="Sisa (SiLPA)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-10 rounded-[48px] shadow-2xl flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-white/10 rounded-[28px] text-indigo-400"><Lightbulb size={32}/></div>
                      <h3 className="text-xl font-black">AI Audit Insight</h3>
                   </div>
                   <div className="space-y-6">
                      <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Kesehatan Kas</p>
                        <p className="text-2xl font-black text-emerald-400">OPTIMAL</p>
                      </div>
                      <p className="text-sm font-medium text-slate-400 leading-relaxed italic">
                        "Sekolah telah melakukan penghematan sebesar {formatIDR(totalSiLPA)}. Dana ini direkomendasikan untuk dialokasikan kembali pada kegiatan peningkatan mutu guru."
                      </p>
                   </div>
                </div>
                <button onClick={() => setActiveTab('analysis')} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all">Jalankan Full Audit</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 animate-fade-in">
            <div className="xl:col-span-5 bg-white p-12 rounded-[56px] shadow-xl border border-slate-100 relative overflow-hidden h-fit">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                    {editingItem ? <Pencil className="text-amber-500" size={32} /> : <PlusCircle className="text-indigo-600" size={32} />} 
                    {editingItem ? 'Edit Anggaran' : prefilledPlanner ? 'Re-alokasi SiLPA' : 'Perencanaan Baru'}
                  </h3>
                  {(prefilledPlanner || editingItem) && (
                    <button onClick={() => { setPrefilledPlanner(null); setEditingItem(null); setSelectedAccount(null); }} className="p-2 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-100 transition-all"><X size={16}/></button>
                  )}
                </div>

                {editingItem && (
                   <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-[32px] flex items-start gap-4 animate-fade-in shadow-sm">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200"><Pencil size={20}/></div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Mode Perubahan Data</p>
                      <p className="text-xs font-bold text-slate-600 leading-snug">Sedang mengedit: {editingItem.name}</p>
                      <button onClick={cancelEdit} className="text-[9px] font-black text-amber-600 uppercase mt-2 hover:underline">Batal Edit</button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitPlanner} className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Bulan Anggaran</label>
                      {!editingItem && (
                        <button 
                            type="button" 
                            onClick={selectAllMonths}
                            className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter flex items-center gap-1 hover:underline"
                        >
                            {selectedFormMonths.length === MONTHS.length ? <><CheckSquare size={12}/> Hapus Semua</> : <><Square size={12}/> Pilih Semua</>}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {MONTHS.map(m => (
                        <button 
                          key={m} 
                          type="button" 
                          onClick={() => toggleMonth(m)}
                          className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedFormMonths.includes(m) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}
                        >
                          {m.substring(0,3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Deskripsi Kegiatan</label>
                    <input name="name" required defaultValue={editingItem?.name || prefilledPlanner?.name || ""} className="w-full px-6 py-5 bg-slate-50 border-transparent border focus:border-indigo-100 focus:bg-white rounded-3xl font-bold transition-all outline-none" placeholder="Contoh: Pengadaan Modul Ajar" />
                  </div>

                  <div className="space-y-3 relative">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Rekening</label>
                    <div onClick={() => setIsAccountPickerOpen(!isAccountPickerOpen)} className={`w-full px-6 py-5 bg-slate-50 border rounded-3xl cursor-pointer flex justify-between items-center transition-all ${selectedAccount ? 'border-indigo-200 bg-indigo-50/20' : 'border-transparent hover:border-slate-200'}`}>
                      {selectedAccount ? (
                        <div className="flex flex-col"><span className="text-[10px] font-black text-indigo-500 uppercase">{selectedAccount.code}</span><span className="text-sm font-black text-slate-800">{selectedAccount.label}</span></div>
                      ) : (
                        <span className="text-slate-400 font-bold text-sm">Cari Kode Rekening...</span>
                      )}
                      <Tag className={selectedAccount ? 'text-indigo-500' : 'text-slate-300'} size={20} />
                    </div>

                    {isAccountPickerOpen && (
                      <div className="absolute z-50 top-full mt-4 left-0 right-0 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 animate-fade-in max-h-[350px] flex flex-col overflow-hidden">
                        <input autoFocus className="w-full px-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm mb-4" placeholder="Ketik nama belanja..." value={searchAccount} onChange={e => setSearchAccount(e.target.value)} />
                        <div className="overflow-y-auto space-y-2 pr-2">
                          {filteredAccountCodes.map(acc => (
                            <button key={acc.code} type="button" onClick={() => { setSelectedAccount(acc); setIsAccountPickerOpen(false); }} className="w-full p-4 rounded-2xl text-left hover:bg-slate-50 transition-all flex justify-between items-center group">
                              <div><p className="text-[10px] font-black text-indigo-400">{acc.code}</p><p className="text-sm font-black text-slate-700">{acc.label}</p></div>
                              <ChevronRight className="text-slate-200 group-hover:text-indigo-400 transition-colors" size={16} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Kuantitas</label>
                        <input name="quantity" type="number" required defaultValue={editingItem?.quantity || "1"} className="w-full px-6 py-5 bg-slate-50 border-transparent border focus:border-indigo-100 rounded-3xl font-bold outline-none" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Satuan</label>
                        <input name="unit" required defaultValue={editingItem?.unit || "Unit"} className="w-full px-6 py-5 bg-slate-50 border-transparent border focus:border-indigo-100 rounded-3xl font-bold outline-none" />
                     </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagu Anggaran (per Bulan)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-400">Rp</span>
                      <input name="price" type="number" required defaultValue={editingItem?.price || prefilledPlanner?.price || ""} className="w-full pl-14 pr-6 py-6 bg-indigo-50 border-indigo-100 border rounded-3xl text-2xl font-black text-indigo-600 outline-none" />
                    </div>
                  </div>

                  <button type="submit" className={`w-full ${editingItem ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white py-6 rounded-3xl font-black shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95`}>
                    <Save size={24} /> {editingItem ? 'PERBARUI ANGGARAN' : 'SIMPAN KE RKAS'}
                  </button>
                </form>
              </div>
            </div>

            <div className="xl:col-span-7 bg-white rounded-[56px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-10 border-b flex justify-between items-center bg-slate-50/30">
                <h3 className="text-2xl font-black text-slate-900">Histori RKAS Digital</h3>
                <span className="px-4 py-2 bg-white rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm border">Total {items.length} Entri</span>
              </div>
              <div className="divide-y overflow-y-auto max-h-[800px]">
                {items.length === 0 ? (
                  <div className="p-20 text-center opacity-20 flex flex-col items-center"><Database size={64} className="mb-4 text-slate-300" /><p className="font-black uppercase tracking-widest text-slate-400">Belum ada data perencanaan</p></div>
                ) : (
                  [...items].reverse().map(item => (
                    <div key={item.id} className={`p-8 hover:bg-slate-50 transition-all flex justify-between items-center group ${editingItem?.id === item.id ? 'bg-amber-50/50' : ''}`}>
                      <div className="flex gap-6 items-center">
                        <div className={`w-14 h-14 bg-white border border-slate-100 ${editingItem?.id === item.id ? 'text-amber-600 border-amber-200' : 'text-indigo-600'} rounded-2xl flex items-center justify-center font-black shrink-0 text-[10px] uppercase shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all`}>{item.month.substring(0,3)}</div>
                        <div>
                          <p className="font-black text-slate-900 leading-tight">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{item.accountCode}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="font-black text-slate-800">{formatIDR(item.total)}</p>
                            {item.realization && item.realization > 0 && (
                            <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Realized</span>
                            )}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => startEdit(item)} 
                                className="p-3 bg-white border border-slate-100 text-amber-500 rounded-2xl hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm"
                                title="Edit"
                            >
                                <Pencil size={18} />
                            </button>
                            <button 
                                onClick={() => handleDeleteItem(item.id)} 
                                className="p-3 bg-white border border-slate-100 text-rose-500 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                                title="Hapus"
                            >
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

        {activeTab === 'analysis' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fade-in text-center">
             <div className="bg-white p-14 rounded-[64px] border border-slate-100 shadow-xl">
                <div className="inline-flex p-10 bg-indigo-50 text-indigo-600 rounded-[48px] mb-10 shadow-lg shadow-indigo-100/50"><BrainCircuit size={64} /></div>
                <h3 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Audit Perencanaan AI</h3>
                <p className="text-slate-400 font-bold max-w-lg mx-auto mb-12 leading-relaxed">Panggil asisten auditor AI untuk menganalisis RKAS Anda. AI akan mengevaluasi kewajaran harga, kepatuhan juknis, dan efisiensi anggaran secara profesional.</p>
                <button onClick={runAudit} disabled={isAnalyzing} className="px-14 py-6 bg-slate-950 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center gap-4 mx-auto hover:bg-indigo-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                  {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} 
                  {isAnalyzing ? "PROSES AUDIT..." : "JALANKAN AUDIT SEKARANG"}
                </button>
             </div>
             
             {aiAnalysis && (
               <div className="bg-white p-14 rounded-[56px] border border-slate-100 shadow-lg text-left animate-fade-in">
                  <div className="flex justify-between items-center mb-10">
                     <h4 className="text-2xl font-black text-slate-900">Hasil Audit Auditor AI</h4>
                     <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${aiAnalysis.riskAssessment === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' : aiAnalysis.riskAssessment === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                       Risiko Audit: {aiAnalysis.riskAssessment}
                     </span>
                  </div>
                  <div className="p-8 bg-slate-50 rounded-[40px] mb-12 italic font-bold text-slate-600 border border-slate-100 leading-relaxed tracking-tight text-lg">"{aiAnalysis.summary}"</div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">Butir Rekomendasi</p>
                    {aiAnalysis.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-6 p-8 bg-white border border-slate-100 rounded-[32px] font-black text-slate-700 hover:bg-indigo-50 transition-all shadow-sm group">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">{i+1}</div>
                        <span className="text-sm leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
               </div>
             )}
          </div>
        )}

        {activeTab === 'spj' && (
          <div className="space-y-12 animate-fade-in pb-20">
            {selectedSPJId && activeSPJs[selectedSPJId] ? (
              <div className="max-w-5xl mx-auto space-y-10">
                <div className="flex justify-between items-center no-print">
                    <button onClick={() => setSelectedSPJId(null)} className="flex items-center gap-3 font-black text-sm text-slate-400 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={18} /> Kembali ke Daftar Realisasi
                    </button>
                    <button onClick={() => window.print()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all active:scale-95">
                        <Printer size={16}/> Cetak Checklist SPJ
                    </button>
                </div>

                <div className="bg-white p-14 rounded-[64px] border border-slate-100 shadow-2xl relative">
                  <div className="mb-14 grid grid-cols-1 md:grid-cols-2 gap-12 border-b pb-14 border-slate-100">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 mb-3">{items.find(i => i.id === selectedSPJId)?.name}</h3>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pagu Terencana: {formatIDR(items.find(i => i.id === selectedSPJId)?.total || 0)}</p>
                      <div className="mt-8 flex gap-4 no-print">
                         <div className="px-4 py-2 bg-indigo-50 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-tighter border border-indigo-100">BOS Reguler</div>
                         <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-tighter border border-slate-100">{items.find(i => i.id === selectedSPJId)?.accountCode}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-6 no-print">
                      <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[40px] shadow-sm">
                        <label className="text-[10px] font-black text-indigo-600 uppercase mb-4 block flex items-center gap-2"><ArrowDownCircle size={14} /> Realisasi Pengeluaran Nyata</label>
                        <div className="relative">
                           <span className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-indigo-400 text-xl">Rp</span>
                           <input type="number" value={realizationInput} onChange={(e) => setRealizationInput(e.target.value)} className="w-full pl-12 bg-transparent border-b-2 border-indigo-200 outline-none font-black text-3xl text-indigo-700 py-2 focus:border-indigo-600 transition-colors" />
                        </div>
                        <button onClick={handleSaveRealization} className="mt-6 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Simpan Laporan Realisasi</button>
                      </div>

                      {Number(realizationInput) > 0 && (items.find(i => i.id === selectedSPJId)?.total || 0) > Number(realizationInput) && (
                        <div className="p-8 rounded-[40px] border border-emerald-100 bg-emerald-50 flex flex-col gap-6 animate-fade-in shadow-sm">
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Potensi Sisa Anggaran (SiLPA)</p>
                                 <p className="font-black text-3xl text-emerald-600">{formatIDR((items.find(i => i.id === selectedSPJId)?.total || 0) - Number(realizationInput))}</p>
                              </div>
                              <div className="p-3 bg-white rounded-2xl shadow-sm"><Info size={24} className="text-emerald-500" /></div>
                           </div>
                           <button 
                             onClick={() => handleReallocate(items.find(i => i.id === selectedSPJId)?.name || "", (items.find(i => i.id === selectedSPJId)?.total || 0) - Number(realizationInput))}
                             className="w-full py-4 bg-white border border-emerald-200 text-emerald-600 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 hover:bg-emerald-600 hover:text-white transition-all shadow-md active:scale-95"
                           >
                             <ArrowUpRight size={14} /> Pindahkan Sisa ke Anggaran Lain
                           </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Dokumen Kelengkapan SPJ</p>
                            <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-tighter">Juknis BOSP 2026</span>
                        </div>
                        {activeSPJs[selectedSPJId].checklist.map(ev => (
                        <div key={ev.id} onClick={() => {
                            const updated = activeSPJs[selectedSPJId].checklist.map(e => e.id === ev.id ? { ...e, status: e.status === 'ready' ? 'pending' : 'ready' } : e);
                            setActiveSPJs(p => ({ ...p, [selectedSPJId]: { ...p[selectedSPJId], checklist: updated } }));
                        }} className={`p-6 rounded-[32px] border flex items-center justify-between cursor-pointer transition-all ${ev.status === 'ready' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}>
                            <div className="flex items-center gap-6">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${ev.status === 'ready' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 border text-slate-200'} transition-all`}>{ev.status === 'ready' ? <CheckCircle size={20} /> : <CircleDashed size={20}/>}</div>
                            <div>
                                <p className={`font-black text-sm ${ev.status === 'ready' ? 'line-through opacity-40 text-slate-400' : 'text-slate-700'}`}>{ev.label}</p>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{ev.description}</p>
                            </div>
                            </div>
                            <span className="text-[8px] font-black px-3 py-1 bg-slate-50 rounded-full text-slate-400 uppercase border tracking-tighter shadow-sm">{ev.type}</span>
                        </div>
                        ))}
                    </div>

                    <div className="space-y-8">
                        <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                            <div className="flex items-center gap-3 mb-4 text-indigo-600">
                                <ShieldCheck size={20} />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Dasar Hukum</h4>
                            </div>
                            <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                {activeSPJs[selectedSPJId].legalBasis}
                            </p>
                        </div>

                        <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100">
                            <div className="flex items-center gap-3 mb-4 text-amber-600">
                                <Sparkles size={20} />
                                <h4 className="text-[10px] font-black uppercase tracking-widest">Tips Auditor</h4>
                            </div>
                            <p className="text-xs font-bold text-slate-600 leading-relaxed">
                                {activeSPJs[selectedSPJId].tips}
                            </p>
                        </div>

                        <div className="p-8 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4 no-print">
                            <Receipt size={32} className="text-slate-300" />
                            <p className="text-[10px] font-black text-slate-400 uppercase leading-relaxed">Upload scan berkas fisik (Opsional)</p>
                            <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Pilih File</button>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Realisasi & SPJ Digital</h3>
                  <div className="flex gap-2 p-2 bg-white border border-slate-100 rounded-3xl overflow-x-auto max-w-full no-print shadow-md">
                    {MONTHS.map(m => (
                      <button key={m} onClick={() => setSpjSelectedMonth(m)} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${spjSelectedMonth === m ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>{m}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {filteredItemsByMonth.length > 0 ? filteredItemsByMonth.map(item => {
                    const spj = activeSPJs[item.id];
                    const isRealized = item.realization && item.realization > 0;
                    return (
                      <div key={item.id} className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all flex flex-col h-full group">
                        <div className="flex justify-between mb-8">
                           <div className={`p-4 rounded-2xl ${isRealized ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300'} transition-colors shadow-sm`}>
                             {isRealized ? <FileCheck size={24} /> : <CircleDashed size={24} />}
                           </div>
                           {isRealized && item.total > item.realization! && (
                              <span className="bg-emerald-100 text-emerald-600 text-[9px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-sm border border-emerald-200"><Coins size={10}/> Efisiensi</span>
                           )}
                        </div>
                        <h4 className="font-black text-xl text-slate-900 mb-2 leading-tight flex-grow">{item.name}</h4>
                        <div className="space-y-1 mb-8">
                           <p className="text-[10px] font-black text-slate-400 uppercase">Pagu RKAS: {formatIDR(item.total)}</p>
                           {isRealized && <p className="text-lg font-black text-emerald-600">Terpakai: {formatIDR(item.realization!)}</p>}
                        </div>
                        <button onClick={() => triggerSPJ(item)} className={`w-full py-5 rounded-[28px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${spj ? (isRealized ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100') : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'} hover:scale-105 active:scale-95`}>
                          {spj ? (isRealized ? "Edit Laporan" : "Update Realisasi") : <><Sparkles size={16} /> Aktifkan Laporan</>}
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="col-span-full py-32 text-center opacity-20 flex flex-col items-center"><Receipt size={64} className="mx-auto mb-4 text-slate-300" /><p className="font-black uppercase tracking-widest text-slate-400">Belum ada perencanaan di bulan {spjSelectedMonth}</p></div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-14 animate-fade-in pb-20">
             <div className="bg-white p-14 rounded-[64px] border border-slate-100 shadow-xl">
                <div className="flex items-center gap-6 mb-12">
                   <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl border border-indigo-100 shadow-sm"><Settings size={36} /></div>
                   <h3 className="text-3xl font-black text-slate-900 tracking-tight">Konfigurasi Satdik</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                   <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Sekolah</label>
                   <input value={schoolData.name} onChange={e=>setSchoolData({...schoolData, name: e.target.value})} className="w-full px-6 py-5 bg-slate-50 border-transparent border rounded-3xl font-bold outline-none focus:border-indigo-100 focus:bg-white transition-all shadow-sm" /></div>
                   <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">NPSN</label>
                   <input value={schoolData.npsn} onChange={e=>setSchoolData({...schoolData, npsn: e.target.value})} className="w-full px-6 py-5 bg-slate-50 border-transparent border rounded-3xl font-bold outline-none focus:border-indigo-100 focus:bg-white transition-all shadow-sm" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                   <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagu BOSP 2026</label>
                   <input type="number" value={totalPagu} onChange={e=>setTotalPagu(Number(e.target.value))} className="w-full px-6 py-5 bg-indigo-50 border-indigo-100 border rounded-3xl font-black text-xl text-indigo-600 outline-none shadow-sm" /></div>
                   <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah Siswa</label>
                   <input type="number" value={studentCount} onChange={e=>setStudentCount(Number(e.target.value))} className="w-full px-6 py-5 bg-slate-50 border-transparent border rounded-3xl font-black text-xl outline-none focus:border-indigo-100 shadow-sm" /></div>
                </div>
                <button onClick={async () => { await storageService.saveSettings(schoolData.name, schoolData.npsn, schoolData.address, totalPagu, studentCount); alert('Profil Satdik Berhasil Diperbarui!'); }} className="w-full bg-slate-950 text-white py-6 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 hover:bg-indigo-600 transition-all active:scale-95"><Save size={24}/> Simpan Konfigurasi</button>
             </div>
          </div>
        )}
      </main>

      {/* Loading Overlay for SPJ Generation */}
      {isGeneratingSPJ && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-10 text-center">
          <div className="w-24 h-24 border-8 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-10 shadow-[0_0_50px_rgba(79,70,229,0.3)]" />
          <h2 className="text-white text-3xl font-black tracking-tighter mb-4 italic">Kecerdasan Buatan Sedang Bekerja</h2>
          <p className="text-indigo-300 font-bold uppercase tracking-[0.3em] text-[11px] animate-pulse">Menyiapkan Dokumen & Regulasi BOSP...</p>
        </div>
      )}
    </div>
  );
};

export default App;
