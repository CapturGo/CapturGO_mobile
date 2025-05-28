import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK } from '../../tasks/locationTask';
import { supabase } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const tracking = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      setIsTracking(tracking);
    };
    checkStatus();
  }, []);

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        setIsTracking(false);
        Alert.alert('Success', 'Tracking stopped.');
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Error', 'Location permission required.');
          return;
        }
        await Location.requestBackgroundPermissionsAsync();
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
        });
        setIsTracking(true);
        Alert.alert('Success', 'Tracking started.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle tracking.');
    }
  };
  
  const handleSignOut = async () => {
    try {
      // Just clear local session without waiting for server
      await AsyncStorage.clear();
      supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
        <Text style={styles.sectionTitle}>Location Tracking</Text>
        <TouchableOpacity 
          style={[
            styles.button, 
            { backgroundColor: isTracking ? '#FF3B30' : '#34C759' }
          ]} 
          onPress={toggleTracking}
        >
          <Text style={styles.buttonText}>
            {isTracking ? "Stop Tracking" : "Start Tracking"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
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
  section: {
    width: '100%',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#000',
    textAlign: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#FF3B30',
    width: 200,
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});