import fs from 'fs';
import path from 'path';

/**
 * Batch process ward GeoJSON and match to constituencies
 * Wards are already in WGS84 (lng, lat) format - no conversion needed
 */

// Input: Full wards GeoJSON file path
const WARDS_GEOJSON_PATH = process.argv[2] || './wards.geojson';

// Constituency data directory
const CONSTITUENCIES_DIR = '../src/data/constituencies';

// Check if point is inside polygon using ray casting algorithm
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

// Check if ward centroid is inside constituency
function wardInConstituency(wardGeometry, constituencyGeometry) {
  // Calculate ward centroid
  let sumLat = 0, sumLng = 0, count = 0;

  const wardCoords = wardGeometry.coordinates[0]; // First ring of polygon
  for (const [lng, lat] of wardCoords) {
    sumLng += lng;
    sumLat += lat;
    count++;
  }

  const centroid = [sumLng / count, sumLat / count];

  // Check if centroid is in any polygon of the constituency
  if (constituencyGeometry.type === 'MultiPolygon') {
    for (const polygon of constituencyGeometry.coordinates) {
      const ring = polygon[0]; // Outer ring
      if (pointInPolygon(centroid, ring)) {
        return true;
      }
    }
  } else if (constituencyGeometry.type === 'Polygon') {
    const ring = constituencyGeometry.coordinates[0]; // Outer ring
    return pointInPolygon(centroid, ring);
  }

  return false;
}

// Generate mock demographic data
function generateDemographics() {
  return {
    population: 8000 + Math.floor(Math.random() * 5000),
    voters: 6000 + Math.floor(Math.random() * 3000),
    medianAge: 35 + Math.floor(Math.random() * 30),
    medianIncome: 25000 + Math.floor(Math.random() * 20000),
    higherEducation: 25 + Math.floor(Math.random() * 40),
    employed: 55 + Math.floor(Math.random() * 30)
  };
}

// Convert ward GeoJSON to our format
function processWard(feature) {
  const properties = feature.properties;
  const geometry = feature.geometry;

  // Ward coordinates are already [lng, lat], convert to [lat, lng] for our format
  const boundary = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);

  // Calculate center
  let sumLat = 0, sumLng = 0, count = 0;
  for (const [lat, lng] of boundary) {
    sumLat += lat;
    sumLng += lng;
    count++;
  }
  const center = [sumLat / count, sumLng / count];

  return {
    id: properties.reference || properties.entity,
    name: properties.name,
    boundary: boundary,
    center: center,
    demographics: generateDemographics(),
    // Store geometry for spatial matching
    _geometry: geometry
  };
}

// Main processing
async function batchProcessWards() {
  console.log('=== Ward Batch Processor ===\n');

  // Check if wards file exists
  if (!fs.existsSync(WARDS_GEOJSON_PATH)) {
    console.error(`Error: Wards file not found: ${WARDS_GEOJSON_PATH}`);
    console.error('\nUsage: node batch-process-wards.js <path-to-wards-geojson>');
    console.error('Example: node batch-process-wards.js ./Wards_December_2024.geojson');
    process.exit(1);
  }

  // Check if constituencies directory exists
  if (!fs.existsSync(CONSTITUENCIES_DIR)) {
    console.error(`Error: Constituencies directory not found: ${CONSTITUENCIES_DIR}`);
    console.error('Please run batch-process-constituencies.js first');
    process.exit(1);
  }

  // Load wards GeoJSON
  console.log(`Loading: ${WARDS_GEOJSON_PATH}...`);
  const wardsGeoJSON = JSON.parse(fs.readFileSync(WARDS_GEOJSON_PATH, 'utf8'));

  if (!wardsGeoJSON.features || !Array.isArray(wardsGeoJSON.features)) {
    console.error('Error: Invalid GeoJSON format (no features array)');
    process.exit(1);
  }

  console.log(`Found ${wardsGeoJSON.features.length} wards\n`);

  // Load all constituency files
  const constituencyFiles = fs.readdirSync(CONSTITUENCIES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json');

  console.log(`Found ${constituencyFiles.length} constituencies\n`);

  const constituencies = {};
  for (const file of constituencyFiles) {
    const data = JSON.parse(
      fs.readFileSync(path.join(CONSTITUENCIES_DIR, file), 'utf8')
    );
    constituencies[file] = data;
  }

  // Process each ward and match to constituency
  console.log('Processing wards and matching to constituencies...\n');

  let matched = 0;
  let unmatched = 0;

  for (const wardFeature of wardsGeoJSON.features) {
    const ward = processWard(wardFeature);
    let foundMatch = false;

    // Try to match ward to constituency
    for (const [filename, constituencyData] of Object.entries(constituencies)) {
      if (!constituencyData.constituency.multiPolygonBoundary) continue;

      // Create geometry object for constituency
      const constituencyGeometry = {
        type: 'MultiPolygon',
        coordinates: constituencyData.constituency.multiPolygonBoundary.map(polygon =>
          polygon.map(ring =>
            ring.map(coord => [coord[1], coord[0]]) // Convert [lat,lng] to [lng,lat]
          )
        )
      };

      if (wardInConstituency(ward._geometry, constituencyGeometry)) {
        // Add ward to this constituency
        if (!constituencyData.wards) {
          constituencyData.wards = [];
        }

        // Remove temporary geometry property
        delete ward._geometry;

        // Check if ward already exists (avoid duplicates)
        const exists = constituencyData.wards.some(w => w.id === ward.id);
        if (!exists) {
          constituencyData.wards.push(ward);
          matched++;
          console.log(`✓ ${ward.name} → ${constituencyData.constituency.name}`);
        }

        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      unmatched++;
      console.log(`✗ ${ward.name} - no constituency match found`);
    }
  }

  console.log('\n=== Saving updated constituency files ===\n');

  // Save updated constituency files
  let updatedCount = 0;
  for (const [filename, constituencyData] of Object.entries(constituencies)) {
    if (constituencyData.wards && constituencyData.wards.length > 0) {
      // Replace placeholder wards with real ones
      const filepath = path.join(CONSTITUENCIES_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(constituencyData, null, 2));
      updatedCount++;
      console.log(`✓ Updated: ${filename} (${constituencyData.wards.length} wards)`);
    }
  }

  console.log(`\n=== Processing Complete ===`);
  console.log(`Wards matched: ${matched}`);
  console.log(`Wards unmatched: ${unmatched}`);
  console.log(`Constituencies updated: ${updatedCount}`);
  console.log(`Total wards processed: ${wardsGeoJSON.features.length}`);
}

// Run
batchProcessWards().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
