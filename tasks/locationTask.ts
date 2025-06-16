import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { logLocationToDatabase } from '../utils/supabase';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

export const initializeLocationTask = () => {
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
};

export const logAndUpdateLocation = async (
  location: Location.LocationObject,
  onLocationUpdate?: (location: Location.LocationObject) => void
) => {
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

// Unified function to start location tracking (foreground or background)
export const startLocationTracking = async ({
  background,
  onLocationUpdate,
  foregroundOptions = {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 20,
  },
  backgroundOptions = {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000,
    distanceInterval: 100,
  },
}: {
  background: boolean;
  onLocationUpdate?: (location: Location.LocationObject) => void;
  foregroundOptions?: Location.LocationOptions;
  backgroundOptions?: Location.LocationTaskOptions;
}) => {
  if (background) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, backgroundOptions);
  } else {
    return await Location.watchPositionAsync(foregroundOptions, async (newLocation) => {
      await logAndUpdateLocation(newLocation, onLocationUpdate);
    });
  }
};