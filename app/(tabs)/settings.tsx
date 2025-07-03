import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, TouchableOpacity, Switch, Image, Modal, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK, initializeLocationTask } from '../../tasks/locationTask';
import { supabase, syncPendingLocations } from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  
  // New state variables for user preferences
  const [ageRange, setAgeRange] = useState<string>('Not specified');
  const [gender, setGender] = useState<string>('Not specified');
  const [commuteMode, setCommuteMode] = useState<string>('Not specified');
  
  // Modal states
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showCommuteModal, setShowCommuteModal] = useState(false);

  // Fetch token balance from profiles table
  const fetchTokenBalance = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('token_balance')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching token balance:', error);
        return null;
      }
      
      return data?.token_balance || 0;
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      initializeLocationTask();
      await syncPendingLocations();
      setIsTracking(await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK));
      
      // Get current user
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser({
          email: data.user.email || 'No email provided',
          id: data.user.id
        });
        
        // Fetch token balance
        const balance = await fetchTokenBalance(data.user.id);
        setTokenBalance(balance);
        
        // Load user preferences
        await loadUserPreferences(data.user.id);
      }
      setLoading(false);
    };
    init();
  }, []);
  
  // Load user preferences from profiles table
  const loadUserPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('age_range, gender, commute_mode')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user preferences:', error);
        return;
      }
      
      if (data) {
        setAgeRange(data.age_range || 'Not specified');
        setGender(data.gender || 'Not specified');
        setCommuteMode(data.commute_mode || 'Not specified');
      }
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
    }
  };
  
  // Save user preference to profiles table
  const saveUserPreference = async (field: string, value: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id);
      
      if (error) {
        console.error(`Error updating ${field}:`, error);
        Alert.alert('Error', `Failed to update ${field}`);
      }
    } catch (error) {
      console.error(`Failed to save ${field}:`, error);
      Alert.alert('Error', `Failed to save ${field}`);
    }
  };

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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Settings</Text>
      
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileImageContainer}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>
            {user?.email ? user.email[0].toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.headerText}>
            {loading ? 'Loading...' : (user?.email?.split('@')[0] || 'Anonymous User')}
          </Text>
          <Text style={styles.normalText}>
            {loading ? '' : (user?.email || 'No email available')}
          </Text>
        </View>
      </View>

      {/* Captur Token Card */}
      <View style={styles.profileCard}>
        <View style={styles.tokenIconContainer}>
          <Image 
            source={require('../../assets/images/capturlogo.png')} 
            style={styles.tokenIcon} 
            resizeMode="contain"
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.headerText}>Captur Tokens</Text>
          <View style={styles.tokenBalanceContainer}>
            <Text style={styles.headerText}>
              {loading ? '...' : tokenBalance !== null ? tokenBalance : '0'}
            </Text>
          </View>
        </View>
      </View>

      {/* Background Tracking Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.headerText}>Background tracking</Text>
          <Text style={styles.normalText}>
            Track your background location
          </Text>
        </View>
        <Switch
          value={isTracking}
          onValueChange={toggleTracking}
          trackColor={{ false: '#e4e4e4', true: '#007AFF' }}
          thumbColor="#ffffff"
          ios_backgroundColor="#e4e4e4"
        />
      </View>
      
      {/* Sync Pending Locations Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.headerText}>Sync locations</Text>
          <Text style={styles.normalText}>
            Upload saved locations to the cloud
          </Text>
        </View>
        <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
          <Text style={styles.syncButtonText}>Sync</Text>
        </TouchableOpacity>
      </View>
      
      {/* Age Range Picker */}
      <TouchableOpacity style={styles.settingRow} onPress={() => setShowAgeModal(true)}>
        <View style={styles.settingInfo}>
          <Text style={styles.headerText}>Age Range</Text>
          <Text style={styles.normalText}>{ageRange}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#8e8e93" />
      </TouchableOpacity>
      
      {/* Gender Picker */}
      <TouchableOpacity style={styles.settingRow} onPress={() => setShowGenderModal(true)}>
        <View style={styles.settingInfo}>
          <Text style={styles.headerText}>Gender</Text>
          <Text style={styles.normalText}>{gender}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#8e8e93" />
      </TouchableOpacity>
      
      {/* Commute Mode Picker */}
      <TouchableOpacity style={styles.settingRow} onPress={() => setShowCommuteModal(true)}>
        <View style={styles.settingInfo}>
          <Text style={styles.headerText}>Commute Mode</Text>
          <View style={styles.commuteContainer}>
            {commuteMode !== 'Not specified' && (
              <MaterialCommunityIcons 
                name={getCommuteIcon(commuteMode)} 
                size={20} 
                color="#007AFF" 
                style={styles.commuteIcon} 
              />
            )}
            <Text style={styles.normalText}>{commuteMode}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#8e8e93" />
      </TouchableOpacity>
      
      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
      
      {/* Age Range Modal */}
      <Modal
        visible={showAgeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAgeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Age Range</Text>
            <ScrollView style={styles.modalScrollView}>
              {['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.modalItem, ageRange === item && styles.selectedItem]}
                  onPress={() => {
                    setAgeRange(item);
                    saveUserPreference('age_range', item);
                    setShowAgeModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, ageRange === item && styles.selectedItemText]}>{item}</Text>
                  {ageRange === item && (
                    <MaterialCommunityIcons name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAgeModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            <ScrollView style={styles.modalScrollView}>
              {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.modalItem, gender === item && styles.selectedItem]}
                  onPress={() => {
                    setGender(item);
                    saveUserPreference('gender', item);
                    setShowGenderModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, gender === item && styles.selectedItemText]}>{item}</Text>
                  {gender === item && (
                    <MaterialCommunityIcons name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowGenderModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Commute Mode Modal */}
      <Modal
        visible={showCommuteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCommuteModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Commute Mode</Text>
            <ScrollView style={styles.modalScrollView}>
              {[
                { name: 'Walking', icon: 'walk' },
                { name: 'Bicycle', icon: 'bike' },
                { name: 'Car', icon: 'car' },
                { name: 'Bus', icon: 'bus' },
                { name: 'Train', icon: 'train' },
                { name: 'Subway', icon: 'subway-variant' },
                { name: 'Motorcycle', icon: 'motorbike' },
                { name: 'Other', icon: 'dots-horizontal' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.modalItem, commuteMode === item.name && styles.selectedItem]}
                  onPress={() => {
                    setCommuteMode(item.name);
                    saveUserPreference('commute_mode', item.name);
                    setShowCommuteModal(false);
                  }}
                >
                  <View style={styles.commuteModalItem}>
                    <MaterialCommunityIcons name={item.icon as IconName} size={24} color={commuteMode === item.name ? "#007AFF" : "#8e8e93"} style={styles.commuteModalIcon} />
                    <Text style={[styles.modalItemText, commuteMode === item.name && styles.selectedItemText]}>{item.name}</Text>
                  </View>
                  {commuteMode === item.name && (
                    <MaterialCommunityIcons name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCommuteModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Type for MaterialCommunityIcons names
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Helper function to get commute mode icon
const getCommuteIcon = (mode: string): IconName => {
  switch (mode) {
    case 'Walking': return 'walk';
    case 'Bicycle': return 'bike';
    case 'Car': return 'car';
    case 'Bus': return 'bus';
    case 'Train': return 'train';
    case 'Subway': return 'subway-variant';
    case 'Motorcycle': return 'motorbike';
    case 'Other': return 'dots-horizontal';
    default: return 'help-circle-outline';
  }
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 20, 
    paddingTop: 80,
    backgroundColor: '#f8f8f8' 
  },
  
  // Text styles - only 3 types
  headerTitle: { // Title style
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 24, 
    color: '#000' 
  },
  headerText: { // Header style
    fontSize: 16, 
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  normalText: { // Normal text style
    fontSize: 16,
    fontWeight: '400',
    color: '#8e8e93'
  },
  
  // Card styles
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  profileInfo: {
    flex: 1
  },
  
  // Token styles
  tokenIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  tokenIcon: {
    width: 60,
    height: 60
  },
  tokenBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  
  // Settings styles
  settingRow: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1
  },
  settingInfo: {
    flex: 1
  },
  
  // Button styles
  syncButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16
  },
  signOutButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 16
  },
  
  // Commute mode styles
  commuteContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  commuteIcon: {
    marginRight: 6
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center'
  },
  modalScrollView: {
    maxHeight: 400
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  selectedItem: {
    backgroundColor: '#f0f8ff'
  },
  modalItemText: {
    fontSize: 16,
    color: '#000'
  },
  selectedItemText: {
    color: '#007AFF',
    fontWeight: '500'
  },
  modalCancelButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    alignItems: 'center'
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  commuteModalItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  commuteModalIcon: {
    marginRight: 16
  }
});