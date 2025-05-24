import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK } from '../../tasks/locationTask';
import MapboxGL from '@rnmapbox/maps';

const LOCATION_TASK_NAME = BACKGROUND_LOCATION_TASK;

// Replace with your actual Mapbox token
MapboxGL.setAccessToken('pk.eyJ1IjoiYmh1bmFraXQiLCJhIjoiY204bXEzMGI1MGsyZDJqb21xczVwa2g2NSJ9.V7Rq9S46fNJNUI_YStsBCg');

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Start location tracking automatically when the component mounts
  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }
        
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          setErrorMsg('Background location permission denied');
          // Continue anyway with just foreground permissions
        }
        
        // Check if tracking is already active
        const isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        
        // Start background tracking if not already tracking
        if (!isTracking) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
          });
          console.log('Started background location tracking automatically');
        }
        
        // Start foreground location updates for the map
        let subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 5,
          },
          (newLocation) => {
            setLocation(newLocation);
            console.log('New foreground location:', newLocation.coords);
          }
        );
        
        return () => {
          // Clean up the foreground location subscription when unmounting
          subscription.remove();
        };
      } catch (error) {
        console.error('Error setting up location tracking:', error);
        setErrorMsg('Failed to start location tracking');
      }
    })();
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
        <MapboxGL.MapView style={styles.map}>
          <MapboxGL.Camera
            zoomLevel={16}
            centerCoordinate={[location.coords.longitude, location.coords.latitude]}
            animationMode="flyTo"
            animationDuration={1000}
          />
          <MapboxGL.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
          />
          {/* <MapboxGL.ShapeSource
            id="currentLocationSource"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Point',
                coordinates: [location.coords.longitude, location.coords.latitude]
              }
            }}
          >
            <MapboxGL.PointAnnotation
              id="currentLocation"
              coordinate={[location.coords.longitude, location.coords.latitude]}
            >
              <View style={{ width: 20, height: 20, backgroundColor: 'rgba(0, 0, 0, 0)' }} />
            </MapboxGL.PointAnnotation>
          </MapboxGL.ShapeSource> */}
        </MapboxGL.MapView>
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
