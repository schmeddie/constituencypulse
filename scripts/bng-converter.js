// BNG to WGS84 conversion using proj4 library
// This provides accurate coordinate transformation from British National Grid to WGS84

import proj4 from 'proj4';

// Define British National Grid (EPSG:27700) projection
// This is the official Ordnance Survey projection for the UK
proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894 +units=m +no_defs');

// WGS84 is already defined in proj4 as 'EPSG:4326'

/**
 * Convert BNG (British National Grid) coordinates to WGS84 lat/lng
 * @param {number} easting - BNG easting coordinate in meters
 * @param {number} northing - BNG northing coordinate in meters
 * @returns {Array} [latitude, longitude] in WGS84 degrees
 */
function bngToLatLng(easting, northing) {
  // proj4 expects [x, y] (easting, northing) and returns [lng, lat]
  const [lng, lat] = proj4('EPSG:27700', 'EPSG:4326', [easting, northing]);

  // Return as [lat, lng] to match our internal format
  return [lat, lng];
}

// Test the conversion with known points
const testPoints = [
  [552869.5, 175530.8],
  [547104.0552, 174490.495100001],
  [554090.8, 178048.800000001],
  [551101.4, 173827.35]
];

console.log('BNG to Lat/Lng conversions (using proj4):');
testPoints.forEach(point => {
  const [lat, lng] = bngToLatLng(point[0], point[1]);
  console.log(`BNG [${point[0]}, ${point[1]}] => Lat/Lng [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
});

export { bngToLatLng };
