import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// 1. SAFETY STORAGE WRAPPER
// Prevents "window is not defined" crashes on the server, while working on mobile
const ExpoStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Ignore write errors
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Ignore delete errors
    }
  },
};

// 2. INITIALIZE CLIENT
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 3. ZOMBIE TOKEN FIX (Critical)
// If the user was deleted in the DB but the phone still remembers them,
// this catches the error and forces a clean logout.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESH_NOT_UPDATED') {
    console.log('Session is dead. Logging out...');
    supabase.auth.signOut();
    // Force clear storage just in case
    AsyncStorage.clear();
  }
});

// 4. REDIRECT HELPER
export const getAuthRedirect = () => {
  if (Platform.OS === 'web') {
    // If on web, return the current website URL
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  }
  // If on mobile, return the app scheme
  return Linking.createURL('/');
};