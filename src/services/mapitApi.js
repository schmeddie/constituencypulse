/**
 * MapIt API Service
 * https://mapit.mysociety.org/
 * 50 free API calls per day without a key
 */

const MAPIT_BASE_URL = 'https://mapit.mysociety.org';

/**
 * Fetch constituency boundary data by code
 * @param {string} code - Constituency code (e.g., 'WMC:65711' for Loughborough)
 * @returns {Promise<Object>} Constituency data with GeoJSON
 */
export const fetchConstituencyBoundary = async (code) => {
  try {
    // Remove the prefix if it exists (WMC:65711 -> 65711)
    const id = code.replace(/^WMC:/, '');

    const response = await fetch(`${MAPIT_BASE_URL}/area/${id}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch constituency: ${response.statusText}`);
    }
    const data = await response.json();

    // Fetch the actual boundary geometry
    const geometryResponse = await fetch(`${MAPIT_BASE_URL}/area/${id}.geojson`);
    if (!geometryResponse.ok) {
      throw new Error(`Failed to fetch geometry: ${geometryResponse.statusText}`);
    }
    const geometry = await geometryResponse.json();

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      codes: data.codes,
      geometry: geometry,
    };
  } catch (error) {
    console.error('Error fetching constituency boundary:', error);
    throw error;
  }
};

/**
 * Fetch wards within a constituency
 * @param {string} code - Constituency code
 * @returns {Promise<Array>} Array of ward data with boundaries
 */
export const fetchConstituencyWards = async (code) => {
  try {
    const id = code.replace(/^WMC:/, '');

    // Get children (wards) of the constituency
    const response = await fetch(`${MAPIT_BASE_URL}/area/${id}/children.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch wards: ${response.statusText}`);
    }
    const wardsData = await response.json();

    // Fetch geometry for each ward
    const wards = await Promise.all(
      Object.entries(wardsData).map(async ([wardId, wardInfo]) => {
        try {
          const geometryResponse = await fetch(`${MAPIT_BASE_URL}/area/${wardId}.geojson`);
          if (!geometryResponse.ok) {
            console.warn(`Failed to fetch geometry for ward ${wardId}`);
            return null;
          }
          const geometry = await geometryResponse.json();

          return {
            id: parseInt(wardId),
            name: wardInfo.name,
            type: wardInfo.type,
            codes: wardInfo.codes,
            geometry: geometry,
          };
        } catch (error) {
          console.warn(`Error fetching ward ${wardId}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed ward fetches
    return wards.filter(ward => ward !== null);
  } catch (error) {
    console.error('Error fetching constituency wards:', error);
    throw error;
  }
};

/**
 * Search for a constituency by name or postcode
 * @param {string} query - Search query (name or postcode)
 * @returns {Promise<Array>} Array of matching constituencies
 */
export const searchConstituency = async (query) => {
  try {
    // Check if it's a postcode (simple check)
    if (/^[A-Z]{1,2}[0-9]{1,2}/.test(query.toUpperCase())) {
      // Search by postcode
      const response = await fetch(`${MAPIT_BASE_URL}/postcode/${encodeURIComponent(query)}.json`);
      if (!response.ok) {
        throw new Error(`Postcode not found: ${response.statusText}`);
      }
      const data = await response.json();
      return data.areas ? Object.values(data.areas).filter(area => area.type === 'WMC') : [];
    } else {
      // Search by name - MapIt doesn't have a direct name search,
      // so we'd need to use a different approach or maintain a local list
      throw new Error('Name search not supported by MapIt API directly');
    }
  } catch (error) {
    console.error('Error searching constituency:', error);
    throw error;
  }
};

/**
 * Convert GeoJSON to Leaflet polygon coordinates
 * @param {Object} geojson - GeoJSON object
 * @returns {Array} Array of coordinate arrays for Leaflet
 */
export const geojsonToLeafletCoords = (geojson) => {
  if (!geojson || !geojson.geometry) return [];

  const { type, coordinates } = geojson.geometry;

  if (type === 'Polygon') {
    // Polygon: [[[lng, lat], ...]]
    // Leaflet uses [lat, lng], so we need to swap
    return coordinates.map(ring =>
      ring.map(coord => [coord[1], coord[0]])
    );
  } else if (type === 'MultiPolygon') {
    // MultiPolygon: [[[[lng, lat], ...]]]
    // Return the largest polygon
    return coordinates.map(polygon =>
      polygon.map(ring =>
        ring.map(coord => [coord[1], coord[0]])
      )
    )[0]; // Take first polygon for simplicity
  }

  return [];
};

/**
 * Get center point from GeoJSON
 * @param {Object} geojson - GeoJSON object
 * @returns {Array} [lat, lng]
 */
export const getGeojsonCenter = (geojson) => {
  if (!geojson || !geojson.geometry || !geojson.geometry.coordinates) {
    return [52.6489, -1.0698]; // Default to Loughborough
  }

  const { type, coordinates } = geojson.geometry;

  let allCoords = [];

  if (type === 'Polygon') {
    allCoords = coordinates[0]; // Outer ring
  } else if (type === 'MultiPolygon') {
    allCoords = coordinates[0][0]; // First polygon's outer ring
  }

  if (allCoords.length === 0) {
    return [52.6489, -1.0698];
  }

  // Calculate centroid
  const lngs = allCoords.map(c => c[0]);
  const lats = allCoords.map(c => c[1]);

  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

  return [centerLat, centerLng];
};
