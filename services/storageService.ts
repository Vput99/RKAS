
import { BudgetItem } from "../types";

const STORAGE_KEYS = {
  ITEMS: 'rkas_items',
  SCHOOL_DATA: 'rkas_school_data',
  PAGU: 'rkas_total_pagu',
  STUDENTS: 'rkas_student_count'
};

export const storageService = {
  // Load All Data
  loadAll() {
    return {
      items: JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS) || '[]'),
      schoolData: JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOL_DATA) || 'null'),
      totalPagu: Number(localStorage.getItem(STORAGE_KEYS.PAGU)) || 150000000,
      studentCount: Number(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || 450
    };
  },

  // Save specific datasets
  saveItems(items: BudgetItem[]) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },

  saveSchoolData(data: any) {
    localStorage.setItem(STORAGE_KEYS.SCHOOL_DATA, JSON.stringify(data));
  },

  savePagu(val: number) {
    localStorage.setItem(STORAGE_KEYS.PAGU, val.toString());
  },

  saveStudents(val: number) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, val.toString());
  }
};
