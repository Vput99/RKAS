
import { BudgetItem } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const LOCAL_STORAGE_KEYS = {
  ITEMS: 'rkas_items_v3',
  SETTINGS: 'rkas_settings_v3'
};

export const storageService = {
  // Load All Data with Fallback
  async loadAll() {
    let localItems: BudgetItem[] = [];
    let localSettings: any = null;

    // Load from LocalStorage first (as cache/fallback)
    try {
      const savedItems = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
      if (savedItems) localItems = JSON.parse(savedItems);
      
      const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
      if (savedSettings) localSettings = JSON.parse(savedSettings);
    } catch (e) {
      console.error("Error loading from localStorage", e);
    }

    // If Supabase is not configured, return local data immediately
    if (!isSupabaseConfigured || !supabase) {
      return { 
        items: localItems, 
        schoolData: localSettings ? { name: localSettings.name, npsn: localSettings.npsn, address: localSettings.address } : null, 
        totalPagu: localSettings?.total_pagu || 150000000, 
        studentCount: localSettings?.student_count || 450 
      };
    }

    try {
      // Fetch settings
      const { data: settings, error: settingsError } = await supabase
        .from('school_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.warn("Could not fetch cloud settings:", settingsError.message);
      }

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('budget_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.warn("Could not fetch cloud items:", itemsError.message);
      }

      // If we got cloud data, update local storage to stay in sync
      if (items && items.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS, JSON.stringify(items));
      }
      
      if (settings) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      }

      return {
        items: items || localItems,
        schoolData: settings ? {
          name: settings.name,
          npsn: settings.npsn,
          address: settings.address
        } : (localSettings ? { name: localSettings.name, npsn: localSettings.npsn, address: localSettings.address } : null),
        totalPagu: settings?.total_pagu || localSettings?.total_pagu || 150000000,
        studentCount: settings?.student_count || localSettings?.student_count || 450
      };
    } catch (error) {
      console.error("Supabase load error, falling back to local:", error);
      return { 
        items: localItems, 
        schoolData: localSettings ? { name: localSettings.name, npsn: localSettings.npsn, address: localSettings.address } : null, 
        totalPagu: localSettings?.total_pagu || 150000000, 
        studentCount: localSettings?.student_count || 450 
      };
    }
  },

  // Sync School Settings
  async saveSettings(name: string, npsn: string, address: string, pagu: number, students: number) {
    const settingsObj = { 
      name, 
      npsn, 
      address, 
      total_pagu: pagu, 
      student_count: students 
    };
    
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settingsObj));

    if (supabase) {
      try {
        const { error } = await supabase
          .from('school_settings')
          .upsert({ id: 1, ...settingsObj });
        if (error) throw error;
      } catch (error: any) {
        console.error("Cloud save failed:", error.message);
      }
    }
  },

  _updateLocalItems(items: BudgetItem[]) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },

  async addItem(item: BudgetItem) {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
    const items = saved ? JSON.parse(saved) : [];
    items.push(item);
    this._updateLocalItems(items);

    if (supabase) {
      try {
        const { error } = await supabase
          .from('budget_items')
          .insert([item]);
        if (error) throw error;
      } catch (error: any) {
        console.error("Cloud insert failed:", error.message);
      }
    }
  },

  async updateItem(item: BudgetItem) {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
    if (saved) {
      const items = JSON.parse(saved);
      const index = items.findIndex((i: BudgetItem) => i.id === item.id);
      if (index !== -1) {
        items[index] = item;
        this._updateLocalItems(items);
      }
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from('budget_items')
          .update(item)
          .eq('id', item.id);
        if (error) throw error;
      } catch (error: any) {
        console.error("Cloud update failed:", error.message);
      }
    }
  },

  async deleteItem(id: string) {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
    if (saved) {
      const items = JSON.parse(saved);
      const filtered = items.filter((i: BudgetItem) => i.id !== id);
      this._updateLocalItems(filtered);
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from('budget_items')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (error: any) {
        console.error("Cloud delete failed:", error.message);
      }
    }
  }
};
