import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK, initializeLocationTask } from '../../tasks/locationTask';
import Mapbox from '@rnmapbox/maps';

Mapbox.setAccessToken('pk.eyJ1IjoiYmh1bmFraXQiLCJhIjoiY204bXEzMGI1MGsyZDJqb21xczVwa2g2NSJ9.V7Rq9S46fNJNUI_YStsBCg');

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        // Initialize location task only when actually needed (after auth)
        initializeLocationTask();
        
        // Request permissions first
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        // Check if background tracking is active
        const isBackgroundTracking = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        
        if (isBackgroundTracking) {
          // If background tracking is active, just get current position once
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setLocation(currentLocation);
          console.log('Using existing background tracking');
        } else {
          // Only start foreground tracking if background tracking is not active
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 2000,
              distanceInterval: 10,
            },
            (newLocation) => {
              setLocation(newLocation);
              console.log('Location update:', newLocation.coords);
            }
          );
          console.log('Started foreground tracking (no background tracking active)');
        }
      } catch (error) {
        console.error('Error setting up location tracking:', error);
        setErrorMsg('Failed to start location tracking');
      }
    })();

    return () => {
      if (subscription) {
        subscription.remove();
        console.log('Cleaned up foreground tracking');
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : !location ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      ) : (
        <Mapbox.MapView style={styles.map}>
          <Mapbox.Camera
            zoomLevel={16}
            centerCoordinate={[location.coords.longitude, location.coords.latitude]}
            animationMode="flyTo"
            animationDuration={1000}
          />
          <Mapbox.LocationPuck
            visible={true}
            puckBearingEnabled={true}
            puckBearing="heading"
          />
        </Mapbox.MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});