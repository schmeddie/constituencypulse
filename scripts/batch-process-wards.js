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
  // Calculate ward centroid from the original GeoJSON geometry
  let sumLat = 0, sumLng = 0, count = 0;

  const wardCoords = wardGeometry.coordinates[0]; // First ring of polygon
  // Ward coords are [lng, lat] in GeoJSON
  for (const [lng, lat] of wardCoords) {
    sumLng += lng;
    sumLat += lat;
    count++;
  }

  const centroid = [sumLng / count, sumLat / count]; // [lng, lat]

  // Check if centroid is in any polygon of the constituency
  if (constituencyGeometry.type === 'MultiPolygon') {
    for (const polygon of constituencyGeometry.coordinates) {
      const ring = polygon[0]; // Outer ring (already in [lng, lat] format)
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

// Generate placeholder events for a constituency based on its wards
function generateEventsForWards(wards) {
  const categories = ['healthcare', 'education', 'transport', 'housing', 'environment'];
  const eventTemplates = {
    healthcare: ['Surgery Expansion', 'Health Centre Opening', 'Hospital Campaign', 'Medical Consultation'],
    education: ['School Funding', 'College Open Day', 'Library Consultation', 'Education Meeting'],
    transport: ['Road Improvements', 'Bus Service Changes', 'Cycling Infrastructure', 'Parking Consultation'],
    housing: ['Development Proposal', 'Regeneration Meeting', 'Planning Consultation', 'Housing Forum'],
    environment: ['Flood Defence Review', 'Park Improvement', 'Recycling Initiative', 'Green Space Project']
  };

  const events = [];
  const eventCount = 6 + Math.floor(Math.random() * 4); // 6-10 events

  for (let i = 0; i < eventCount; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const templates = eventTemplates[category];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const ward = wards[Math.floor(Math.random() * wards.length)];

    events.push({
      id: `event_${String(i + 1).padStart(3, '0')}`,
      title: `${ward.name} ${template}`,
      category: category,
      coordinates: ward.center,
      date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      summary: `Local community event in ${ward.name}`
    });
  }

  return events;
}

// Convert ward GeoJSON to our format
function processWard(feature) {
  const properties = feature.properties;
  const geometry = feature.geometry;

  // Ward coordinates are already [lng, lat] in GeoJSON
  // Keep them as [lng, lat] for easier spatial operations
  const geoJsonBoundary = geometry.coordinates[0];

  // Convert to [lat, lng] for our storage format (to match constituencies)
  const boundary = geoJsonBoundary.map(coord => [coord[1], coord[0]]);

  // Calculate center from [lng, lat] coords
  let sumLat = 0, sumLng = 0, count = 0;
  for (const [lng, lat] of geoJsonBoundary) {
    sumLat += lat;
    sumLng += lng;
    count++;
  }
  const center = [sumLat / count, sumLng / count]; // [lat, lng] format

  return {
    id: properties.reference || properties.entity,
    name: properties.name,
    boundary: boundary,  // [lat, lng] format
    center: center,      // [lat, lng] format
    demographics: generateDemographics(),
    // Store original geometry for spatial matching (keeps [lng, lat] format)
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

    // IMPORTANT: Clear existing placeholder wards
    data.wards = [];

    constituencies[file] = data;
  }

  // Process each ward and match to constituency
  console.log('Processing wards and matching to constituencies...\n');

  let matched = 0;
  let unmatched = 0;
  const unmatchedWards = [];

  for (const wardFeature of wardsGeoJSON.features) {
    const ward = processWard(wardFeature);
    let foundMatch = false;

    // Try to match ward to constituency
    for (const [filename, constituencyData] of Object.entries(constituencies)) {
      if (!constituencyData.constituency.multiPolygonBoundary) continue;

      // Create geometry object for constituency
      // Constituencies are stored as [lat, lng], convert to [lng, lat] for GeoJSON/spatial operations
      const constituencyGeometry = {
        type: 'MultiPolygon',
        coordinates: constituencyData.constituency.multiPolygonBoundary.map(polygon =>
          polygon.map(ring =>
            ring.map(coord => [coord[1], coord[0]]) // Convert [lat,lng] to [lng,lat]
          )
        )
      };

      if (wardInConstituency(ward._geometry, constituencyGeometry)) {
        // Remove temporary geometry property
        delete ward._geometry;

        // Add ward to this constituency
        constituencyData.wards.push(ward);

        matched++;
        console.log(`✓ ${ward.name} → ${constituencyData.constituency.name}`);

        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      unmatched++;
      unmatchedWards.push(ward.name);
      if (unmatched <= 10) { // Only log first 10
        console.log(`✗ ${ward.name} - no constituency match found`);
      }
    }
  }

  if (unmatched > 10) {
    console.log(`... and ${unmatched - 10} more unmatched wards`);
  }

  console.log('\n=== Regenerating events for real wards ===\n');

  // Regenerate events for constituencies with real wards
  for (const [filename, constituencyData] of Object.entries(constituencies)) {
    if (constituencyData.wards.length > 0) {
      // Generate new events based on real wards
      constituencyData.events = generateEventsForWards(constituencyData.wards);
    }
  }

  console.log('=== Saving updated constituency files ===\n');

  // Save updated constituency files
  let updatedCount = 0;
  let emptyCount = 0;

  for (const [filename, constituencyData] of Object.entries(constituencies)) {
    const filepath = path.join(CONSTITUENCIES_DIR, filename);

    if (constituencyData.wards.length > 0) {
      // Has real wards, save it
      fs.writeFileSync(filepath, JSON.stringify(constituencyData, null, 2));
      updatedCount++;
      console.log(`✓ Updated: ${filename} (${constituencyData.wards.length} wards, ${constituencyData.events.length} events)`);
    } else {
      // No wards matched - this constituency will have empty wards array
      // Still save it to clear out placeholder wards
      fs.writeFileSync(filepath, JSON.stringify(constituencyData, null, 2));
      emptyCount++;
      console.log(`⚠ ${filename} has no matched wards`);
    }
  }

  console.log(`\n=== Processing Complete ===`);
  console.log(`Wards matched: ${matched}`);
  console.log(`Wards unmatched: ${unmatched}`);
  console.log(`Constituencies with wards: ${updatedCount}`);
  console.log(`Constituencies without wards: ${emptyCount}`);
  console.log(`Total wards processed: ${wardsGeoJSON.features.length}`);

  if (unmatchedWards.length > 0) {
    console.log(`\nFirst unmatched wards: ${unmatchedWards.slice(0, 5).join(', ')}`);
  }
}

// Run
batchProcessWards().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
