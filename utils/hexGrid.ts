import * as turf from '@turf/turf';

// Size of hexagons in kilometers
const HEX_SIZE = 0.1; // 100 meters

// Generate a grid of hexagons covering the viewport
export const generateHexGrid = (
  centerLng: number, 
  centerLat: number, 
  radiusKm: number = 1
) => {
  // Create a bounding box around the center point
  const bbox = [
    centerLng - radiusKm / 111, // approx conversion from km to degrees
    centerLat - radiusKm / 111,
    centerLng + radiusKm / 111,
    centerLat + radiusKm / 111,
  ];
  
  // Generate a hexagonal grid
  return turf.hexGrid(bbox, HEX_SIZE, {
    units: 'kilometers',
  });
};

// Check if a point is inside a polygon
export const isPointInPolygon = (longitude: number, latitude: number, polygon: any): boolean => {
  const point = turf.point([longitude, latitude]);
  return turf.booleanPointInPolygon(point, polygon);
};
