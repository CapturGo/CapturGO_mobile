import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_PREFIX = 'appSettings:';
const DEBUG_OFFLINE_KEY = `${SETTINGS_PREFIX}debugOfflineMode`;

export const setDebugOffline = async (val: boolean) => {
  await AsyncStorage.setItem(DEBUG_OFFLINE_KEY, val ? 'true' : 'false');
};

export const getDebugOffline = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(DEBUG_OFFLINE_KEY);
  return value === 'true';
}; 