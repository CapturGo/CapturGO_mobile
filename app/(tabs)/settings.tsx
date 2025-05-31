import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK, initializeLocationTask } from '../../tasks/locationTask';
import { supabase } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      // Initialize location task (safe to call multiple times)
      initializeLocationTask();
      
      const tracking = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      setIsTracking(tracking);
    };
    checkStatus();
  }, []);

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        // Stop background tracking
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        setIsTracking(false);
        Alert.alert('Success', 'Background tracking stopped. Location will only be tracked when app is open.');
      } else {
        // Request permissions
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
          Alert.alert('Error', 'Location permission required.');
          return;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            'Background Permission Required', 
            'For continuous tracking when app is closed, please allow background location access.'
          );
          return;
        }

        // Start background tracking
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 50, // 50 meters
          deferredUpdatesInterval: 30000, // Batch updates
        });
        
        setIsTracking(true);
        Alert.alert('Success', 'Background tracking started. Location will be tracked even when app is closed.');
      }
    } catch (error) {
      console.error('Toggle tracking error:', error);
      Alert.alert('Error', 'Failed to toggle tracking.');
    }
  };
  
  const handleSignOut = async () => {
    try {
      // Stop tracking when signing out
      if (isTracking) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
      
      await AsyncStorage.clear();
      supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <Text style={styles.sectionTitle}>Background Location Tracking</Text>
      <Text style={styles.description}>
        {isTracking 
          ? "Background tracking is ON. Location is tracked even when app is closed."
          : "Background tracking is OFF. Location only tracked when app is open."
        }
      </Text>
      
      <TouchableOpacity 
        style={[
          styles.button, 
          { backgroundColor: isTracking ? '#FF3B30' : '#34C759' }
        ]} 
        onPress={toggleTracking}
      >
        <Text style={styles.buttonText}>
          {isTracking ? "Stop Background Tracking" : "Start Background Tracking"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#000',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  button: {
    width: 250,
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: '#666',
    marginTop: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});