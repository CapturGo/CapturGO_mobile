import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// This function ensures the task is only defined when actually needed
export const initializeLocationTask = () => {
  // Check if task is already defined to avoid re-definition
  if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Background location task error:', error.message);
        return;
      }
      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        if (locations && locations.length > 0) {
          const latestLocation = locations[locations.length - 1];
          console.log('Location update:', latestLocation.coords);
          // Here you can handle the location data, e.g., send it to a server, store it locally, etc.
          // For now, we're just logging it.
        }
      }
    });
    console.log('Location task initialized');
  }
};

// Optional: Function to check if the task is registered
export const isLocationTaskRegistered = async () => {
  return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
};

// Optional: Function to unregister the task
export const unregisterLocationTask = async () => {
  if (await isLocationTaskRegistered()) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    console.log('Background location task unregistered');
  }
};