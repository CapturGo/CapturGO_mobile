import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { fetchLocationHistory } from '../utils/supabase';

interface LocationPoint {
  latitude: number;
  longitude: number;
  created_at: string;
}

export const useLocationHistory = () => {
  const [pathCoordinates, setPathCoordinates] = useState<number[][]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await fetchLocationHistory(); 
    const coordinates = history.map((point: LocationPoint) => [point.longitude, point.latitude]);
    setPathCoordinates(coordinates);
  };

  const addNewLocation = (location: Location.LocationObject) => {
    const newCoord = [location.coords.longitude, location.coords.latitude];
    setPathCoordinates(prev => [...prev, newCoord]);
  };

  const getGeoJSONLine = () => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: pathCoordinates,
    },
    properties: {},
  });

  return { pathCoordinates, addNewLocation, getGeoJSONLine, loadHistory };
};