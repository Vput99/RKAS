
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

    if (!isSupabaseConfigured || !supabase) {
      return { 
        items: localItems, 
        schoolData: localSettings ? { name: localSettings.name, npsn: localSettings.npsn, address: localSettings.address } : null, 
        totalPagu: localSettings?.total_pagu || 150000000, 
        studentCount: localSettings?.student_count || 450 
      };
    }

    try {
      const { data: settings } = await supabase
        .from('school_settings')
        .select('*')
        .single();

      const { data: items } = await supabase
        .from('budget_items')
        .select('*')
        .order('created_at', { ascending: true });

      // If we got cloud data, update local storage to stay in sync
      if (items) localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS, JSON.stringify(items));
      if (settings) localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

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
      console.error("Error loading data from Supabase, using local fallback:", error);
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
    
    // Always save to LocalStorage
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settingsObj));

    if (supabase) {
      const { error } = await supabase
        .from('school_settings')
        .upsert({ id: 1, ...settingsObj });
      if (error) console.error("Error saving settings to cloud:", error);
    }
  },

  // Update local storage items list
  _updateLocalItems(items: BudgetItem[]) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },

  // Individual Item Operations
  async addItem(item: BudgetItem) {
    // Get current local items and append
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
    const items = saved ? JSON.parse(saved) : [];
    items.push(item);
    this._updateLocalItems(items);

    if (supabase) {
      const { error } = await supabase
        .from('budget_items')
        .insert([item]);
      if (error) console.error("Error adding item to cloud:", error);
    }
  },

  async updateItem(item: BudgetItem) {
    // Update local storage
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
      const { error } = await supabase
        .from('budget_items')
        .update(item)
        .eq('id', item.id);
      if (error) console.error("Error updating item on cloud:", error);
    }
  },

  async deleteItem(id: string) {
    // Update local storage
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ITEMS);
    if (saved) {
      const items = JSON.parse(saved);
      const filtered = items.filter((i: BudgetItem) => i.id !== id);
      this._updateLocalItems(filtered);
    }

    if (supabase) {
      const { error } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', id);
      if (error) console.error("Error deleting item from cloud:", error);
    }
  }
};
