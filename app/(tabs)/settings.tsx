import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK, initializeLocationTask } from '../../tasks/locationTask';
import { supabase, syncPendingLocations } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    const init = async () => {
      initializeLocationTask();
      await syncPendingLocations();
      setIsTracking(await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK));
    };
    init();
  }, []);

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        setIsTracking(false);
        Alert.alert('Success', 'Background tracking stopped');
      } else {
        const { status: fg } = await Location.requestForegroundPermissionsAsync();
        const { status: bg } = await Location.requestBackgroundPermissionsAsync();
        
        if (fg !== 'granted' || bg !== 'granted') {
          Alert.alert('Error', 'Location permissions required');
          return;
        }

        await syncPendingLocations();
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 100,
        });
        
        setIsTracking(true);
        Alert.alert('Success', 'Background tracking started');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle tracking');
    }
  };
  
  const handleSignOut = async () => {
    try {
      await syncPendingLocations();
      if (isTracking) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      await AsyncStorage.clear();
      supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSync = async () => {
    await syncPendingLocations();
    Alert.alert('Success', 'Locations synced');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <Text style={styles.status}>
        Background tracking: {isTracking ? 'ON' : 'OFF'}
      </Text>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: isTracking ? '#FF3B30' : '#34C759' }]} 
        onPress={toggleTracking}
      >
        <Text style={styles.buttonText}>
          {isTracking ? 'Stop' : 'Start'} Background Tracking
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.syncButton]} onPress={handleSync}>
        <Text style={styles.buttonText}>Sync Pending Locations</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40, color: '#000' },
  status: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
  button: { width: 200, padding: 15, marginBottom: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  syncButton: { backgroundColor: '#007AFF' },
  signOutButton: { backgroundColor: '#666', marginTop: 20 },
});