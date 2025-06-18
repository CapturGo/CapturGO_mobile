import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Location from 'expo-location';

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

export const logLocationToDatabase = async (location: Location.LocationObject): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('locations')
      .insert({
        user_id: user.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

    if (error) {
      console.error('DB log failed:', error.message);
      await storeLocationLocally(location, user.id);
      return false;
    }

    console.log('Location logged:', location.coords.latitude, location.coords.longitude);
    return true;
  } catch (error) {
    console.error('Log error:', error);
    return false;
  }
};

const storeLocationLocally = async (location: Location.LocationObject, userId: string) => {
  try {
    const key = `pending_location_${Date.now()}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      user_id: userId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
    }));
  } catch (error) {
    console.error('Local storage failed:', error);
  }
};

export const syncPendingLocations = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pendingKeys = keys.filter(key => key.startsWith('pending_location_'));
    
    for (const key of pendingKeys) {
      const locationData = await AsyncStorage.getItem(key);
      if (locationData) {
        const { error } = await supabase.from('locations').insert(JSON.parse(locationData));
        if (!error) await AsyncStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
};

export const fetchLocationHistory = async (limit: number = 1000) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('locations')
      .select('latitude, longitude, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(limit);

    return error ? [] : data || [];
  } catch (error) {
    console.error('Fetch history failed:', error);
    return [];
  }
};