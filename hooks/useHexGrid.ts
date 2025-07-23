import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { generateHexGrid, isPointInPolygon } from '../utils/hexGrid';
import * as turf from '@turf/turf';
import { fetchLocationHistory, rewardUserForNewHexagon } from '../services/supabase';

// Constants
const HEX_SIZE_KM = 0.1; // 100 meters per hexagon
const EXPANSION_THRESHOLD = 0.01; // Expand when within ~1km of edge
const EXPANSION_SIZE = 1; // Add 1km of hexagons when expanding

// Type for grid boundaries
type GridBounds = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

export const useHexGrid = (location: Location.LocationObject | null) => {
  // State for grid and visited hexagons
  const [hexGrid, setHexGrid] = useState<any>(null);
  const [visitedHexIds, setVisitedHexIds] = useState<Set<string>>(new Set());
  
  // Refs to track initialization and boundaries
  const gridInitialized = useRef(false);
  const gridBounds = useRef<GridBounds | null>(null);

  // Initialize grid on first location update
  useEffect(() => {
    if (location && !gridInitialized.current) {
      // Get user's starting position
      const { longitude, latitude } = location.coords;
      
      // Create initial 10km radius grid
      const radiusKm = 10;
      const degreeApprox = radiusKm / 111; // km to degrees conversion
      
      // Set initial boundaries
      gridBounds.current = {
        minLng: longitude - degreeApprox,
        maxLng: longitude + degreeApprox,
        minLat: latitude - degreeApprox,
        maxLat: latitude + degreeApprox
      };
      
      // Generate and set the hex grid
      const grid = generateHexGrid(longitude, latitude, radiusKm);
      setHexGrid(grid);
      gridInitialized.current = true;
      console.log('Grid initialized at:', longitude, latitude);
    }
  }, [location]);

  // Load historical locations and mark hexagons as visited
  useEffect(() => {
    if (!hexGrid) return;
    
    const loadHistoricalLocations = async () => {
      // Fetch location history from database
      const history = await fetchLocationHistory(500); // Limit to 500 points for performance
      
      // Process each historical location
      history.forEach((point: { latitude: number; longitude: number }) => {
        hexGrid.features.forEach((hex: any, index: number) => {
          if (isPointInPolygon(point.longitude, point.latitude, hex)) {
            setVisitedHexIds(prev => new Set(prev).add(String(index)));
          }
        });
      });
      
      console.log(`Processed ${history.length} historical locations`);
    };
    
    loadHistoricalLocations();
  }, [hexGrid]); // Only run when hexGrid is initialized
  
  // Process location updates: check boundaries and mark visited hexagons
  useEffect(() => {
    if (!location || !hexGrid || !gridBounds.current) return;
    
    const { longitude, latitude } = location.coords;
    const bounds = gridBounds.current;
    
    // Check if we need to expand the grid
    const needToExpandWest = longitude < bounds.minLng + EXPANSION_THRESHOLD;
    const needToExpandEast = longitude > bounds.maxLng - EXPANSION_THRESHOLD;
    const needToExpandSouth = latitude < bounds.minLat + EXPANSION_THRESHOLD;
    const needToExpandNorth = latitude > bounds.maxLat - EXPANSION_THRESHOLD;
    
    // Expand grid if user is near any edge
    if (needToExpandWest || needToExpandEast || needToExpandSouth || needToExpandNorth) {
      expandGrid({
        west: needToExpandWest,
        east: needToExpandEast,
        south: needToExpandSouth,
        north: needToExpandNorth
      });
    }
    
    // Mark current hexagon as visited and reward user if it's a new one
    hexGrid.features.forEach((hex: any, index: number) => {
      if (isPointInPolygon(longitude, latitude, hex)) {
        const hexId = String(index);
        // Check if this is a new hexagon
        if (!visitedHexIds.has(hexId)) {
          // Reward user with 1 token for discovering a new hexagon
          rewardUserForNewHexagon(1);
        }
        setVisitedHexIds(prev => new Set(prev).add(hexId));
      }
    });
  }, [location, hexGrid]);

  // Create GeoJSON for Mapbox
  const getHexagonGeoJSON = () => {
    if (!hexGrid) return { type: 'FeatureCollection', features: [] };
    
    return {
      type: 'FeatureCollection',
      features: hexGrid.features.map((hex: any, index: number) => ({
        ...hex,
        properties: {
          ...hex.properties,
          visited: visitedHexIds.has(String(index)),
        },
      })),
    };
  };

  // Expand the grid in specified directions
  const expandGrid = (directions: { west: boolean, east: boolean, south: boolean, north: boolean }) => {
    if (!gridBounds.current) return;
    
    // Convert expansion size from km to approximate degrees
    const degreeChange = EXPANSION_SIZE / 111;
    const bounds = gridBounds.current;
    
    // Expand boundaries in needed directions
    if (directions.west) {
      bounds.minLng -= degreeChange;
      console.log('Expanding grid westward');
    }
    if (directions.east) {
      bounds.maxLng += degreeChange;
      console.log('Expanding grid eastward');
    }
    if (directions.south) {
      bounds.minLat -= degreeChange;
      console.log('Expanding grid southward');
    }
    if (directions.north) {
      bounds.maxLat += degreeChange;
      console.log('Expanding grid northward');
    }
    
    // Create new grid with updated boundaries
    const bbox: [number, number, number, number] = [
      bounds.minLng, bounds.minLat, 
      bounds.maxLng, bounds.maxLat
    ];
    
    // Generate and set the expanded grid
    const newGrid = turf.hexGrid(bbox, HEX_SIZE_KM, { units: 'kilometers' });
    setHexGrid(newGrid);
  };

  return { getHexagonGeoJSON };
};
