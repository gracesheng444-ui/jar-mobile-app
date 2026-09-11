import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set — see .env.example.'
  );
}

// createClient throws synchronously on an empty URL, which would crash the app
// before React even renders. Fall back to a placeholder so it fails at the
// point of an actual network call instead — where our try/catch can show it.
export const supabase = createClient(supabaseUrl || 'https://not-configured.supabase.co', supabaseAnonKey || 'not-configured', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Only meaningful on web: lets a clicked password-reset email link (which lands back on this
    // origin with a recovery token in the URL) establish a session automatically.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
