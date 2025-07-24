import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { logLocationToDatabase } from '../utils/supabase';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Always define the background location task at the top level
if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background task error:', error.message);
      return;
    }
    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      for (const location of locations) {
        await logLocationToDatabase(location);
      }
    }
  });
}

// initializeLocationTask is now a no-op for compatibility
export const initializeLocationTask = () => {};

export const logForegroundLocation = async (location: Location.LocationObject, onLocationUpdate?: (location: Location.LocationObject) => void) => {
  await logLocationToDatabase(location);
  onLocationUpdate?.(location);
};

export const isLocationTaskRegistered = async () => {
  return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
};

export const unregisterLocationTask = async () => {
  if (await isLocationTaskRegistered()) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
};