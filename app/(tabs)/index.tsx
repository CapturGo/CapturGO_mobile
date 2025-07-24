import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Pressable, Alert, SafeAreaView } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK, initializeLocationTask, logForegroundLocation } from '../../tasks/locationTask';
import { syncPendingLocations } from '../../utils/supabase';
import { useHexGrid } from '../../hooks/useHexGrid';
import Mapbox from '@rnmapbox/maps';
import { MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';

Mapbox.setAccessToken('pk.eyJ1Ijoic2FyaW51cHJldGkiLCJhIjoiY21kZzljdnlnMGp1cjJtcjV4d2ZmZThtciJ9.l1mcHPD84pBuetZwBmdEsA');

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { getHexagonGeoJSON } = useHexGrid(location);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  const reportOptions = [
    {
      type: 'Crash',
      icon: <MaterialCommunityIcons name="alert-circle" size={32} color="#fff" />, color: '#E53935',
    },
    {
      type: 'Congestion',
      icon: <MaterialIcons name="traffic" size={32} color="#fff" />, color: '#D32F2F',
    },
    {
      type: 'Police',
      icon: <MaterialCommunityIcons name="police-badge" size={32} color="#fff" />, color: '#1976D2',
    },
    {
      type: 'Roadworks',
      icon: <MaterialCommunityIcons name="road-variant" size={32} color="#fff" />, color: '#FBC02D',
    },
    {
      type: 'Lane closure',
      icon: <MaterialIcons name="block" size={32} color="#fff" />, color: '#FFA000',
    },
    {
      type: 'Object on road',
      icon: <FontAwesome5 name="exclamation-triangle" size={32} color="#fff" />, color: '#FFA000',
    },
  ];

  const handleReport = async (type: string) => {
    if (!location) return;
    setSendingReport(true);
    try {
      const { coords } = location;
      const timestamp = new Date().toISOString();
      const { error } = await supabase.from('reports').insert([
        {
          type,
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp,
        },
      ]);
      if (error) throw error;
      setReportModalVisible(false);
      Alert.alert('Report sent', `Your ${type} report has been submitted.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to send report.');
    } finally {
      setSendingReport(false);
    }
  };

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
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Mapbox.MapView 
          style={{ ...StyleSheet.absoluteFillObject }}
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
        {/* Recenter Button */}
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
          <Text style={styles.buttonIcon}>↑</Text>
        </TouchableOpacity>
        {/* Floating Action Button for Report - moved after recenter button for visibility */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setReportModalVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="report" size={28} color="#fff" />
        </TouchableOpacity>
        {/* Report Modal */}
        <Modal
          visible={reportModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add a report</Text>
                <Pressable onPress={() => setReportModalVisible(false)}>
                  <MaterialIcons name="close" size={28} color="#888" />
                </Pressable>
              </View>
              <View style={styles.reportGrid}>
                {reportOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.reportOption, { backgroundColor: opt.color }]}
                    onPress={() => handleReport(opt.type)}
                    disabled={sendingReport}
                  >
                    {opt.icon}
                    <Text style={styles.reportLabel}>{opt.type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
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
  fab: {
    position: 'absolute',
    bottom: 120, // increased for visibility and safe area
    right: 20,
    backgroundColor: '#00FF00', // bright green for visibility
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportOption: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  reportLabel: {
    color: '#fff',
    fontSize: 15,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
});