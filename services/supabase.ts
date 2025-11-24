import { createClient } from '@supabase/supabase-js';

// Fallback to provided keys if env vars are missing (for demo/dev purposes)
// In production, ensure these are set in the Vercel dashboard.
const FALLBACK_URL = 'https://lhgwnrwwhaalojdpkwuo.supabase.com';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoaGVkeWxyZXVseG9wdGl5cmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTY1MDcsImV4cCI6MjA3ODE3MjUwN30.lUsn5Y_-hwlq4JaLtdxhbsaVwlIOfCn1P8P6YAQbDyE';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Environment Variables');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
