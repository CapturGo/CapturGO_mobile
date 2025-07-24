import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered.']);
import '../tasks/locationTask';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Modal, Image } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK, logForegroundLocation } from '../tasks/locationTask';
import { syncPendingLocations } from '../utils/supabase';
import { useHexGrid } from '../hooks/useHexGrid';
import Mapbox from '@rnmapbox/maps';
import { MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { useFocusEffect } from '@react-navigation/native';
import type { FeatureCollection, Feature, Point } from 'geojson';

// Map report types to icon images
const reportTypeToImage: { [key: string]: any } = {
  'Crash': require('../assets/icons/crash.png'),
  'Congestion': require('../assets/icons/congestion.png'),
  'Police': require('../assets/icons/police.png'),
  'Roadworks': require('../assets/icons/roadworks.png'),
  'Lane closure': require('../assets/icons/lane_closure.png'),
  'Object on road': require('../assets/icons/object_on_road.png'),
};

// Register images for Mapbox SymbolLayer
const reportIconImages = {
  crash: require('../assets/icons/crash.png'),
  congestion: require('../assets/icons/congestion.png'),
  police: require('../assets/icons/police.png'),
  roadworks: require('../assets/icons/roadworks.png'),
  lane_closure: require('../assets/icons/lane_closure.png'),
  object_on_road: require('../assets/icons/object_on_road.png'),
};

// For the modal: report options with white PNG icons and improved colors
const reportOptions = [
  { type: 'Crash', icon: require('../assets/icons/crash.png'), color: '#D32F2F' }, // deeper red
  { type: 'Congestion', icon: require('../assets/icons/congestion.png'), color: '#FF7043' }, // orange-red
  { type: 'Police', icon: require('../assets/icons/police.png'), color: '#1976D2' }, // blue
  { type: 'Roadworks', icon: require('../assets/icons/roadworks.png'), color: '#FBC02D' }, // yellow
  { type: 'Lane closure', icon: require('../assets/icons/lane_closure.png'), color: '#FFA000' }, // amber
  { type: 'Object on road', icon: require('../assets/icons/object_on_road.png'), color: '#8D6E63' }, // brown/gray
];

// Map type to color for use in the map CircleLayer (match modal colors)
const typeColorMap = {
  'Crash': '#D32F2F',
  'Congestion': '#FF7043',
  'Police': '#1976D2',
  'Roadworks': '#FBC02D',
  'Lane closure': '#FFA000',
  'Object on road': '#8D6E63',
};

interface CommunityReport {
  id: number;
  type: string;
  createdAt: string;
  latitude: number;
  longitude: number;
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { getHexagonGeoJSON } = useHexGrid(location);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  // Add state for report validation modal
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  const fetchCommunityReports = async () => {
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          type,
          created_at,
          status,
          locations:location_id (
            latitude,
            longitude
          )
        `)
        .gte('created_at', sixHoursAgo)
        .eq('status', 'active')
      ;

      if (error) throw error;

      if (data) {
        const formattedReports: CommunityReport[] = data
          .filter(report => Array.isArray(report.locations) ? report.locations.length > 0 : !!report.locations)
          .map(report => {
            const loc = Array.isArray(report.locations) ? report.locations[0] : report.locations;
            return {
              id: report.id,
              type: report.type,
              createdAt: report.created_at,
              latitude: loc.latitude,
              longitude: loc.longitude,
            };
          });
        setCommunityReports(formattedReports);
      }
    } catch (err) {
      console.error('Error fetching community reports:', err);
      Alert.alert('Error', 'Could not fetch community reports.');
    }
  };

  const handleReport = async (type: string) => {
    if (!location) return;
    setSendingReport(true);
    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');

      // 2. Insert location
      const { coords } = location;
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .insert({
          user_id: user.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: coords.speed,
        })
        .select('id')
        .single();

      if (locationError) {
        console.error('Location insert error:', locationError.message, locationError);
        throw locationError;
      }

      // 3. Insert report with location_id and user_id
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          type,
          user_id: user.id,
          location_id: locationData.id,
        });

      if (reportError) {
        console.error('Report insert error:', reportError.message, reportError);
        throw reportError;
      }

      setReportModalVisible(false);
      Alert.alert('Report sent', `Your ${type} report has been submitted.`);
    } catch (err) {
      console.error('Report error:', err);
      Alert.alert('Error', 'Failed to send report.');
    } finally {
      setSendingReport(false);
    }
  };

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      try {
        await syncPendingLocations();
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Location permission denied');
          return;
        }
        const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(currentLocation);
        const isBackgroundActive = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (!isBackgroundActive) {
          const { status: bg } = await Location.requestBackgroundPermissionsAsync();
          if (bg === 'granted') {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 30000,
              distanceInterval: 100,
              foregroundService: {
                notificationTitle: "Captur is tracking your location",
                notificationBody: "To earn tokens while you move",
              },
            });
          }
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 10,
          },
          (newLocation) => {
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

  // Fetch reports on mount, every 60s, and on focus
  useEffect(() => {
    fetchCommunityReports();
    const interval = setInterval(fetchCommunityReports, 60000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchCommunityReports();
    }, [])
  );

  // Prepare GeoJSON for report markers
  const reportFeatures = communityReports.map(report => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [report.longitude, report.latitude],
    },
    properties: {
      id: report.id,
      type: report.type,
      icon: report.type.toLowerCase().replace(/ /g, '_'), 
      // e.g., 'crash', 'lane_closure'
    },
  }));
  const reportGeoJSON: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: reportFeatures as Feature<Point>[],
  };

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
      <View style={StyleSheet.absoluteFill}>
        <Mapbox.MapView style={StyleSheet.absoluteFill}>
          <Mapbox.Images images={reportIconImages} />
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={15}
            centerCoordinate={[location.coords.longitude, location.coords.latitude]}
            animationMode="flyTo"
            animationDuration={1000}
          />
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
          {/* Render community reports as icons using SymbolLayer */}
          <Mapbox.ShapeSource
            id="reportMarkers"
            shape={reportGeoJSON}
            onPress={(e: any) => {
              const feature = e.features && e.features[0];
              if (feature) {
                const report = communityReports.find(r => r.id === feature.properties.id);
                if (report) {
                  setSelectedReport(report);
                  setValidationModalVisible(true);
                }
              }
            }}
          >
            <Mapbox.SymbolLayer
              id="reportIcons"
              style={{
                iconImage: ['get', 'icon'],
                iconSize: 0.4,
                iconAllowOverlap: true,
              }}
            />
          </Mapbox.ShapeSource>
          <Mapbox.PointAnnotation
            id="userLocation"
            coordinate={[location.coords.longitude, location.coords.latitude]}
          >
            <View style={styles.locationMarker}>
              <View style={styles.locationMarkerCore} />
            </View>
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>
      </View>
      {/* Overlays as siblings, not children of MapView */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setReportModalVisible(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="report" size={28} color="#fff" />
      </TouchableOpacity>
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
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <MaterialIcons name="close" size={28} color="#888" />
              </TouchableOpacity>
            </View>
            <View style={styles.reportGrid}>
              {reportOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.reportOption, { backgroundColor: opt.color }]}
                  onPress={() => handleReport(opt.type)}
                  disabled={sendingReport}
                >
                  <Image source={opt.icon} style={{ width: 32, height: 32, tintColor: '#fff' }} resizeMode="contain" />
                  <Text style={styles.reportLabel}>{opt.type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      {/* Report validation modal */}
      <Modal
        visible={validationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setValidationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}> 
            <Text style={styles.modalTitle}>Is this report correct?</Text>
            {selectedReport && (
              <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <Image
                  source={reportOptions.find(opt => opt.type === selectedReport.type)?.icon}
                  style={{ width: 48, height: 48, tintColor: '#fff', marginBottom: 8 }}
                  resizeMode="contain"
                />
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>{selectedReport.type}</Text>
                <Text style={{ color: '#888', marginBottom: 8 }}>Reported at: {new Date(selectedReport.createdAt).toLocaleString()}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity
                style={[styles.voteButton, { backgroundColor: '#4CAF50' }]}
                disabled={validationLoading}
                onPress={async () => {
                  if (!selectedReport) return;
                  setValidationLoading(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('User not logged in');
                    // Insert validation
                    await supabase.from('report_validations').insert({
                      report_id: selectedReport.id,
                      user_id: user.id,
                      is_valid: true,
                    });
                    Alert.alert('Thank you!', 'Your feedback has been recorded.');
                  } catch (err) {
                    Alert.alert('Error', 'Could not submit your vote.');
                  } finally {
                    setValidationLoading(false);
                    setValidationModalVisible(false);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Correct</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteButton, { backgroundColor: '#E53935' }]}
                disabled={validationLoading}
                onPress={async () => {
                  if (!selectedReport) return;
                  setValidationLoading(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('User not logged in');
                    // Insert validation
                    await supabase.from('report_validations').insert({
                      report_id: selectedReport.id,
                      user_id: user.id,
                      is_valid: false,
                    });
                    // Count not correct votes
                    const { count } = await supabase
                      .from('report_validations')
                      .select('*', { count: 'exact', head: true })
                      .eq('report_id', selectedReport.id)
                      .eq('is_valid', false);
                    if ((count ?? 0) >= 3) {
                      // Disable the report
                      await supabase.from('reports').update({ status: 'disabled' }).eq('id', selectedReport.id);
                      fetchCommunityReports();
                    }
                    Alert.alert('Thank you!', 'Your feedback has been recorded.');
                  } catch (err) {
                    Alert.alert('Error', 'Could not submit your vote.');
                  } finally {
                    setValidationLoading(false);
                    setValidationModalVisible(false);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Not correct</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  fab: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'flex-end',
    
  },
  modalContent: {
    backgroundColor: '#fff',
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
    paddingBottom:40
  },
  modalTitle: {
    color: '#000',
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
    alignContent: 'center',
    elevation: 2,
  },
  reportLabel: {
    color: '#fff',
    fontSize: 15,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Add styles for vote buttons
  voteButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});