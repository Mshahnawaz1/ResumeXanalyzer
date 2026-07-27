import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const isPlaceholder = (url: string, key: string) => {
  return !url || !key || url.includes('your-project-id') || key.includes('your-supabase-anon-key') || key.includes('your-supabase-publishable-key');
};

export const isMockAuth = isPlaceholder(supabaseUrl, supabaseAnonKey);

if (isMockAuth) {
  console.warn(
    'Supabase credentials are not configured or are placeholders. Falling back to local mock authentication.'
  );
}

export const supabase = isMockAuth
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);
