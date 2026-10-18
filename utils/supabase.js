import { createClient } from '@supabase/supabase-js';

// Nanti kamu ganti dengan URL dan Anon Key dari dashboard Supabase kamu
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'URL_SUPABASE_KAMU';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'KEY_SUPABASE_KAMU';

export const supabase = createClient(supabaseUrl, supabaseKey);