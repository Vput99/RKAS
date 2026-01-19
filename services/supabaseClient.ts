
import { createClient } from '@supabase/supabase-js';

// Menangani kasus di mana environment variable mungkin terbaca sebagai string "undefined"
const getEnv = (key: string) => {
  const val = process.env[key];
  return (val && val !== "undefined" && val !== "") ? val : null;
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null;
