import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { initializeLocationTask, isLocationTaskRegistered, startLocationTracking, unregisterLocationTask } from '../../tasks/locationTask';
import { supabase, syncPendingLocations } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { setDebugOffline, getDebugOffline } from '../../debugConfig';

// Only clear location-related keys
const clearLocationStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const locationKeys = keys.filter(key => key.startsWith('pending_location_'));
  await AsyncStorage.multiRemove(locationKeys);
};

const getPendingLocationCount = async () => {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter(key => key.startsWith('pending_location_')).length;
};

export default function SettingsScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [debugOfflineMode, setDebugOfflineMode] = useState(false);

  // Initialize background task and check tracking status
  useEffect(() => {
    const initialize = async () => {
      initializeLocationTask();
      await syncPendingLocations();
      setIsTracking(await isLocationTaskRegistered());
      setPendingCount(await getPendingLocationCount());
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email || null);
      } catch {
        setUserEmail(null);
      }
      // Load debugOfflineMode from AsyncStorage
      const debugVal = await getDebugOffline();
      setDebugOfflineMode(debugVal);
    };
    initialize();
  }, []);

  // Refresh pending count after sync or actions
  const refreshPendingCount = async () => {
    setPendingCount(await getPendingLocationCount());
  };

  // Request permissions for background tracking
  const requestLocationPermissions = async () => {
    const fgResult = await Location.requestForegroundPermissionsAsync();
    const bgResult = await Location.requestBackgroundPermissionsAsync();
    if (fgResult.status !== 'granted') {
      Alert.alert('Permission Denied', 'Foreground location permission is required. Please enable it in your device settings.');
      return false;
    }
    if (bgResult.status !== 'granted') {
      Alert.alert('Permission Denied', 'Background location permission is required. Please enable it in your device settings.');
      return false;
    }
    return true;
  };

  // Start background tracking
  const startBackgroundTracking = useCallback(async () => {
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) return;
      try {
        await syncPendingLocations();
      } catch (err) {
        Alert.alert('Warning', 'Could not sync all locations before starting tracking.');
      }
      await startLocationTracking({ background: true });
      setIsTracking(await isLocationTaskRegistered());
      await refreshPendingCount();
      Alert.alert('Success', 'Background tracking started');
    } catch (error) {
      Alert.alert('Error', 'Failed to start background tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Stop background tracking
  const stopBackgroundTracking = useCallback(async () => {
    setLoading(true);
    try {
      await unregisterLocationTask();
      setIsTracking(await isLocationTaskRegistered());
      await refreshPendingCount();
      Alert.alert('Success', 'Background tracking stopped');
    } catch (error) {
      Alert.alert('Error', 'Failed to stop background tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle tracking state
  const toggleTracking = async () => {
    if (isTracking) {
      await stopBackgroundTracking();
    } else {
      await startBackgroundTracking();
    }
  };

  // Sync pending locations
  const handleSync = async () => {
    setLoading(true);
    try {
      await syncPendingLocations();
      await clearLocationStorage();
      await refreshPendingCount();
      Alert.alert('Success', 'Locations synced');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync locations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sign out and clean up
  const handleSignOut = async () => {
    setLoading(true);
    try {
      try {
        await syncPendingLocations();
      } catch (err) {
        Alert.alert('Warning', 'Could not sync all locations before signing out.');
      }
      if (isTracking) await unregisterLocationTask();
      await clearLocationStorage();
      await supabase.auth.signOut({ scope: 'local' });
      setUserEmail(null);
      setPendingCount(0);
      Alert.alert('Signed Out', 'You have been signed out successfully.');
      // Optionally, navigate to login screen here
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Debug toggle handler
  const handleDebugToggle = async () => {
    const newValue = !debugOfflineMode;
    await setDebugOffline(newValue);
    setDebugOfflineMode(newValue);
  };

  // App info
  const appVersion = Constants.expoConfig?.version || Constants.manifest?.version || 'Unknown';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.status}>
        Background tracking: {isTracking ? 'ON' : 'OFF'}
      </Text>
      <Text style={styles.info}>
        Pending locations to sync: {pendingCount}
      </Text>
      {userEmail && (
        <Text style={styles.info}>Signed in as: {userEmail}</Text>
      )}
      <Text style={styles.info}>App version: {appVersion}</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: isTracking ? '#FF3B30' : '#34C759' }]}
        onPress={toggleTracking}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {isTracking ? 'Stop' : 'Start'} Background Tracking
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.syncButton]}
        onPress={handleSync}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Sync Pending Locations</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.signOutButton]}
        onPress={handleSignOut}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.refreshButton]}
        onPress={refreshPendingCount}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: debugOfflineMode ? '#FFA500' : '#888' }]}
        onPress={handleDebugToggle}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          Debug: {debugOfflineMode ? 'Simulate Offline (ON)' : 'Simulate Offline (OFF)'}
        </Text>
      </TouchableOpacity>
      {loading && <Text style={styles.status}>Processing...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40, color: '#000' },
  status: { fontSize: 16, color: '#666', marginBottom: 10, textAlign: 'center' },
  info: { fontSize: 14, color: '#888', marginBottom: 10, textAlign: 'center' },
  button: { width: 200, padding: 15, marginBottom: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  syncButton: { backgroundColor: '#007AFF' },
  signOutButton: { backgroundColor: '#666', marginTop: 20 },
  refreshButton: { backgroundColor: '#6c6cff' },
});