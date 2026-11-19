import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project credentials
// Get them from: https://supabase.com/dashboard -> your project -> Settings -> API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = () => {
  return !SUPABASE_URL.includes('placeholder') && !SUPABASE_ANON_KEY.includes('placeholder');
};
