import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = "https://wsdbqgftjponuhbidcqn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZGJxZ2Z0anBvbnVoYmlkY3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNDMzOTMsImV4cCI6MjA2MDYxOTM5M30.eFm9EX2yF07tz4o36zNq52got77ThJUyY3alav1pHIk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});