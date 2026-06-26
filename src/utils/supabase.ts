import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// Legacy global client (anonymous or based on async storage)
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Authenticated client using Clerk Token
export const createClerkSupabaseClient = (clerkToken: string | null) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: clerkToken ? `Bearer ${clerkToken}` : '',
      },
    },
  });
};
