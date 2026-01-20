
import { BudgetItem } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const LOCAL_STORAGE_KEYS = {
  ITEMS: 'rkas_items_v3',
  SETTINGS: 'rkas_settings_v3'
};

export const storageService = {
  // Load All Data with robust Fallback
  async loadAll() {
    let localItems: BudgetItem[] = [];
    let localSettings: any = null;

    // 1. Ambil dari LocalStorage sebagai cadangan utama
    try {
      const savedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
      if (savedItems) localItems = JSON.parse(savedItems);
      
      const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
      if (savedSettings) localSettings = JSON.parse(savedSettings);
    } catch (e) {
      console.error("Gagal membaca LocalStorage", e);
    }

    // 2. Jika Supabase tidak aktif, langsung kembalikan data lokal
    if (!isSupabaseConfigured || !supabase) {
      return { 
        items: localItems, 
        schoolData: localSettings ? { name: localSettings.name, npsn: localSettings.npsn, address: localSettings.address } : null, 
        totalPagu: localSettings?.total_pagu || 150000000, 
        studentCount: localSettings?.student_count || 450 
      };
    }

    // 3. Jika Supabase aktif, coba sinkronkan
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('school_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      const { data: items, error: itemsError } = await supabase
        .from('budget_items')
        .select('*')
        .order('created_at', { ascending: true });

      // Jika cloud memiliki data, perbarui cache lokal
      if (items && items.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS, JSON.stringify(items));
      }
      if (settings) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      }

      return {
        items: (items && items.length > 0) ? items : localItems,
        schoolData: settings ? {
          name: settings.name,
          npsn: settings.npsn,
          address: settings.address
        } : (localSettings ? { name: localSettings.name, npsn: localSettings.npsn, address: localSettings.address } : null),
        totalPagu: settings?.total_pagu || localSettings?.total_pagu || 150000000,
        studentCount: settings?.student_count || localSettings?.student_count || 450
      };
    } catch (error) {
      console.warn("Gagal sinkron Cloud, menggunakan data lokal:", error);
      return { 
        items: localItems, 
        schoolData: localSettings ? { name: localSettings.name, npsn: localSettings.npsn, address: localSettings.address } : null, 
        totalPagu: localSettings?.total_pagu || 150000000, 
        studentCount: localSettings?.student_count || 450 
      };
    }
  },

  async saveSettings(name: string, npsn: string, address: string, pagu: number, students: number) {
    const settingsObj = { name, npsn, address, total_pagu: pagu, student_count: students };
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settingsObj));

    if (supabase) {
      try {
        await supabase.from('school_settings').upsert({ id: 1, ...settingsObj });
      } catch (e) { console.error("Cloud settings save failed", e); }
    }
  },

  async addItem(item: BudgetItem) {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
    const items = saved ? JSON.parse(saved) : [];
    items.push(item);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS, JSON.stringify(items));

    if (supabase) {
      try { await supabase.from('budget_items').insert([item]); } 
      catch (e) { console.error("Cloud insert failed", e); }
    }
  },

  async updateItem(item: BudgetItem) {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
    if (saved) {
      const items = JSON.parse(saved);
      const index = items.findIndex((i: BudgetItem) => i.id === item.id);
      if (index !== -1) {
        items[index] = item;
        localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS, JSON.stringify(items));
      }
    }

    if (supabase) {
      try { await supabase.from('budget_items').update(item).eq('id', item.id); }
      catch (e) { console.error("Cloud update failed", e); }
    }
  },

  async deleteItem(id: string) {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
    if (saved) {
      const items = JSON.parse(saved);
      const filtered = items.filter((i: BudgetItem) => i.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS, JSON.stringify(filtered));
    }

    if (supabase) {
      try { await supabase.from('budget_items').delete().eq('id', id); }
      catch (e) { console.error("Cloud delete failed", e); }
    }
  }
};
