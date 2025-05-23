import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, StyleSheet, Button, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK } from '../../tasks/locationTask'; // Assuming this is correctly defined

const LOCATION_TASK_NAME = BACKGROUND_LOCATION_TASK;

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const requestPermissions = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === 'granted') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus === 'granted') {
        return true;
      }
    }
    console.warn('Location permissions not fully granted.');
    return false;
  };

  const startLocationTracking = async () => {
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      console.log('Cannot start tracking without permissions.');
      return;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
    });
    console.log('Started background location tracking.');
    setIsTracking(true);
  };

  const stopLocationTracking = async () => {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.log('Stopped background location tracking.');
    setIsTracking(false);
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopLocationTracking();
    } else {
      startLocationTracking();
    }
  };

  // Effect for foreground location updates (for UI display)
  useEffect(() => {
    let subscriber: Location.LocationSubscription | undefined;

    const watchLocation = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permissions might have been revoked or not yet requested by startLocationTracking
        // You could call requestPermissions() here again if desired
        return;
      }
      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
          console.log('Received new FOREGROUND location:', newLocation.coords);
        }
      );
    };

    watchLocation();

    return () => {
      console.log('useEffect cleanup');
      subscriber?.remove();
    };
  }, []);

  // Effect to check initial tracking state
  useEffect(() => {
    const checkStatus = async () => {
      const tracked = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      setIsTracking(tracked);
    };
    checkStatus();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.paragraph}>
        {location ? `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}` : 'Waiting for location...'}
      </Text>
      <Button onPress={toggleTracking} title={isTracking ? 'Stop Tracking' : 'Start Tracking'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  paragraph: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
});
