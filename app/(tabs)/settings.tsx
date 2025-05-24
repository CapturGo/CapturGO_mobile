import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK } from '../../tasks/locationTask';

export default function SettingsScreen() {
  const [isTracking, setIsTracking] = useState(false);

  // Check if tracking is active when component mounts
  useEffect(() => {
    const checkTrackingStatus = async () => {
      const tracking = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      setIsTracking(tracking);
    };
    
    checkTrackingStatus();
    
    // Set up an interval to check tracking status periodically
    const interval = setInterval(checkTrackingStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Function to stop location tracking
  const stopLocationTracking = async () => {
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Stopped background location tracking.');
      setIsTracking(false);
      Alert.alert('Success', 'Location tracking stopped successfully.');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      Alert.alert('Error', 'Failed to stop location tracking. Please try again.');
    }
  };

  // Function to restart location tracking
  const startLocationTracking = async () => {
    try {
      // First ensure we have permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for tracking.');
        return;
      }
      
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert('Warning', 'Background location permission denied. Tracking will only work when app is open.');
      }
      
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
      });
      console.log('Started background location tracking.');
      setIsTracking(true);
      Alert.alert('Success', 'Location tracking started successfully.');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Tracking Settings</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: <Text style={isTracking ? styles.activeText : styles.inactiveText}>
            {isTracking ? 'Active' : 'Inactive'}
          </Text>
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        {isTracking ? (
          <Button 
            title="Stop Location Tracking" 
            onPress={stopLocationTracking} 
            color="#FF3B30" 
          />
        ) : (
          <Button 
            title="Start Location Tracking" 
            onPress={startLocationTracking} 
            color="#34C759" 
          />
        )}
      </View>
      
      <Text style={styles.infoText}>
        When location tracking is active, your location will be tracked even when the app is in the background.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 20,
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  statusText: {
    fontSize: 18,
    textAlign: 'center',
  },
  activeText: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  inactiveText: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
});
