
import { BudgetItem } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const storageService = {
  // Load All Data from Supabase
  async loadAll() {
    if (!isSupabaseConfigured || !supabase) {
      console.warn("Supabase is not configured. Returning default data.");
      return { items: [], schoolData: null, totalPagu: 150000000, studentCount: 450 };
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

      return {
        items: items || [],
        schoolData: settings ? {
          name: settings.name,
          npsn: settings.npsn,
          address: settings.address
        } : null,
        totalPagu: settings?.total_pagu || 150000000,
        studentCount: settings?.student_count || 450
      };
    } catch (error) {
      console.error("Error loading data from Supabase:", error);
      return { items: [], schoolData: null, totalPagu: 150000000, studentCount: 450 };
    }
  },

  // Sync School Settings
  async saveSettings(name: string, npsn: string, address: string, pagu: number, students: number) {
    if (!supabase) return;
    const { error } = await supabase
      .from('school_settings')
      .upsert({ 
        id: 1, 
        name, 
        npsn, 
        address, 
        total_pagu: pagu, 
        student_count: students 
      });
    if (error) console.error("Error saving settings:", error);
  },

  // Individual Item Operations
  async addItem(item: BudgetItem) {
    if (!supabase) return;
    const { error } = await supabase
      .from('budget_items')
      .insert([item]);
    if (error) console.error("Error adding item:", error);
  },

  async updateItem(item: BudgetItem) {
    if (!supabase) return;
    const { error } = await supabase
      .from('budget_items')
      .update(item)
      .eq('id', item.id);
    if (error) console.error("Error updating item:", error);
  },

  async deleteItem(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from('budget_items')
      .delete()
      .eq('id', id);
    if (error) console.error("Error deleting item:", error);
  }
};
