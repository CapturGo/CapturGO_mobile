import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK, initializeLocationTask, logForegroundLocation } from '../../tasks/locationTask';
import { syncPendingLocations } from '../../utils/supabase';
import { useHexGrid } from '../../hooks/useHexGrid';
import Mapbox from '@rnmapbox/maps';

Mapbox.setAccessToken('');

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { getHexagonGeoJSON } = useHexGrid(location);
  const cameraRef = useRef<Mapbox.Camera>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        initializeLocationTask();
        await syncPendingLocations();
        
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Location permission denied');
          return;
        }

        // Always get current location for map display first
        const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(currentLocation);
        
        // Check if background tracking is active
        const isBackgroundActive = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        
        // If background tracking is not active, start it
        if (!isBackgroundActive) {
          const { status: bg } = await Location.requestBackgroundPermissionsAsync();
          if (bg === 'granted') {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 30000, // 30 seconds in background
              distanceInterval: 100,
              foregroundService: {
                notificationTitle: "Captur is tracking your location",
                notificationBody: "To earn tokens while you move",
              },
            });
          }
        }
        
        // Always set up foreground tracking when app is open
        // This is more efficient than background tracking
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 10,
          },
          (newLocation) => {
            // Always log foreground location when app is open
            logForegroundLocation(newLocation, (location) => {
              setLocation(location);
            });
          }
        );
      } catch (error) {
        console.error('Location setup error:', error);
        setErrorMsg('Failed to start location tracking');
      }
    })();

    return () => subscription?.remove();
  }, []);

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  const recenterMap = () => {
    if (location && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [location.coords.longitude, location.coords.latitude],
        zoomLevel: 16,
        animationDuration: 1000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView 
        style={styles.map}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={15}
          centerCoordinate={[location.coords.longitude, location.coords.latitude]}
          animationMode="flyTo"
          animationDuration={1000}
        />
      
      {/* Hexagon Grid Layer */}
      <Mapbox.ShapeSource 
        id="hexGrid" 
        shape={getHexagonGeoJSON() as any}
      >
        <Mapbox.FillLayer
          id="hexFill"
          style={{
            fillColor: ['case', ['get', 'visited'], 'rgba(0, 0, 0, 0)', 'rgba(147, 94, 255, 0.5)'],
            fillOpacity: 0.5,
          }}
        />
        <Mapbox.LineLayer
          id="hexOutline"
          style={{
            lineColor: 'rgba(147, 94, 255, 0.8)',
            lineWidth: 1,
          }}
        />
      </Mapbox.ShapeSource>
      
      {/* Custom user location marker using our existing location data */}
      <Mapbox.PointAnnotation
        id="userLocation"
        coordinate={[location.coords.longitude, location.coords.latitude]}
      >
        <View style={styles.locationMarker}>
          <View style={styles.locationMarkerCore} />
        </View>
      </Mapbox.PointAnnotation>
      </Mapbox.MapView>
      
      <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
        <Text style={styles.buttonIcon}>↑</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  locationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationMarkerCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
  },
  loadingText: { fontSize: 18 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center' },
  recenterButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  buttonIcon: {
    fontSize: 20,
  },
});